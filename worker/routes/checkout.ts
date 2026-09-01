import { Hono } from "hono";
import type { Env, TerritoryRow } from "../types";
import { computeNextPricePence, toPublicTerritory } from "../types";
import { claimSchema } from "../lib/validation";
import { getStripe } from "../lib/stripe";
import { rateLimit, clientIp } from "../lib/ratelimit";

export const checkoutRoute = new Hono<{ Bindings: Env }>();

const PENDING_MINUTES = 30;

checkoutRoute.post("/", async (c) => {
  const ip = clientIp(c.req.raw);
  const withinLimit = await rateLimit(c.env, `checkout:${ip}`, 10, 60);
  if (!withinLimit) {
    return c.json({ error: "Too many requests. Please try again shortly." }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data;

  const existing = await c.env.DB.prepare(`SELECT * FROM territories WHERE slug = ?1`)
    .bind(input.slug)
    .first<TerritoryRow>();

  if (!existing) {
    return c.json({ error: "Territory not found" }, 404);
  }

  // The price to charge is always computed from D1, never the client:
  // the base gradient price while never-claimed, or a step-up over the
  // current price when taking over an already-sold territory.
  const chargePence = computeNextPricePence(existing);

  const pendingUntil = new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString();

  // Atomically reserve a "challenge slot" on this territory — first claim
  // or takeover, doesn't matter. Only succeeds if nobody else has an active
  // (non-expired) challenge in flight. The current owner_* columns (if any)
  // are untouched: the challenger's info goes into pending_* until the
  // webhook confirms payment, so an outbid attempt can never wipe a live
  // listing before it's actually paid for.
  const claim = await c.env.DB.prepare(
    `UPDATE territories
     SET pending_owner_name = ?1,
         pending_company_name = ?2,
         pending_owner_description = ?3,
         pending_website_url = ?4,
         pending_logo_url = ?5,
         pending_until = ?6,
         stripe_checkout_session_id = NULL,
         updated_at = datetime('now')
     WHERE slug = ?7
       AND (pending_until IS NULL OR pending_until < datetime('now'))`
  )
    .bind(
      input.ownerName,
      input.companyName || null,
      input.description,
      input.websiteUrl || null,
      input.logoUrl || null,
      pendingUntil,
      input.slug
    )
    .run();

  if (!claim.meta.changes) {
    return c.json(
      { error: "Someone else is currently trying to claim this territory. Try again shortly." },
      409
    );
  }

  const siteUrl = c.env.PUBLIC_SITE_URL || new URL(c.req.url).origin;
  const actionLabel = existing.status === "sold" ? "Take over" : "Claim";

  try {
    const stripe = getStripe(c.env);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: chargePence,
            product_data: {
              name: `${existing.name} Territory — Startup Board`,
              description: `${actionLabel} the ${existing.name} territory on Startup Board.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        territory_id: String(existing.id),
        territory_slug: existing.slug,
      },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cancelled?slug=${existing.slug}`,
    });

    await c.env.DB.prepare(
      `UPDATE territories SET stripe_checkout_session_id = ?1, updated_at = datetime('now') WHERE slug = ?2`
    )
      .bind(session.id, existing.slug)
      .run();

    return c.json({ checkoutUrl: session.url });
  } catch (err) {
    // Roll back the reservation if Stripe session creation failed — clears
    // the challenge slot without touching the current owner (if any).
    await c.env.DB.prepare(
      `UPDATE territories
       SET pending_owner_name = NULL,
           pending_company_name = NULL,
           pending_owner_description = NULL,
           pending_website_url = NULL,
           pending_logo_url = NULL,
           pending_until = NULL,
           updated_at = datetime('now')
       WHERE slug = ?1`
    )
      .bind(existing.slug)
      .run();
    console.error("Stripe checkout session creation failed", err);
    return c.json({ error: "Unable to start checkout. Please try again." }, 502);
  }
});

checkoutRoute.get("/session/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const row = await c.env.DB.prepare(
    `SELECT * FROM territories WHERE stripe_checkout_session_id = ?1`
  )
    .bind(sessionId)
    .first<TerritoryRow>();

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  // Still awaiting webhook confirmation (pending_until set) → show the
  // challenger's own submitted info as a preview. Once confirmed, the
  // webhook has copied it into the live owner_* columns and cleared
  // pending_until, so fall back to those instead.
  const stillPending = row.pending_until !== null;

  // Knowing the Stripe session ID (only ever shared with the purchaser via
  // the success-page redirect) acts as a capability token, so it's safe to
  // reveal the listing even while still awaiting webhook confirmation.
  return c.json({
    territory: {
      ...toPublicTerritory(row),
      ownerName: stillPending ? row.pending_owner_name : row.owner_name,
      companyName: stillPending ? row.pending_company_name : row.company_name,
      ownerDescription: stillPending ? row.pending_owner_description : row.owner_description,
      websiteUrl: stillPending ? row.pending_website_url : row.website_url,
      logoUrl: stillPending ? row.pending_logo_url : row.logo_url,
    },
    status: stillPending ? "pending" : "sold",
  });
});
