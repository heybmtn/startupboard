import { Hono } from "hono";
import type { Env, TerritoryRow } from "../types";
import { toPublicTerritory } from "../types";
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

  const pendingUntil = new Date(Date.now() + PENDING_MINUTES * 60_000).toISOString();

  // Atomically reserve the territory: only succeeds if it's still available,
  // or was pending but that reservation has expired.
  const claim = await c.env.DB.prepare(
    `UPDATE territories
     SET status = 'pending',
         owner_name = ?1,
         company_name = ?2,
         owner_description = ?3,
         website_url = ?4,
         logo_url = ?5,
         pending_until = ?6,
         stripe_checkout_session_id = NULL,
         updated_at = datetime('now')
     WHERE slug = ?7
       AND (status = 'available' OR (status = 'pending' AND pending_until < datetime('now')))`
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
    return c.json({ error: "This territory is no longer available." }, 409);
  }

  const siteUrl = c.env.PUBLIC_SITE_URL || new URL(c.req.url).origin;

  try {
    const stripe = getStripe(c.env);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: existing.price_pence, // price is read from D1, never trusted from the client
            product_data: {
              name: `${existing.name} Territory — Startup Board`,
              description: `Own the ${existing.name} territory on Startup Board.`,
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
    // Roll back the reservation if Stripe session creation failed.
    await c.env.DB.prepare(
      `UPDATE territories
       SET status = 'available', pending_until = NULL, updated_at = datetime('now')
       WHERE slug = ?1 AND status = 'pending'`
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

  // Knowing the Stripe session ID (only ever shared with the purchaser via
  // the success-page redirect) acts as a capability token, so it's safe to
  // reveal the listing even while still "pending" webhook confirmation.
  return c.json({
    territory: {
      ...toPublicTerritory(row),
      ownerName: row.owner_name,
      companyName: row.company_name,
      ownerDescription: row.owner_description,
      websiteUrl: row.website_url,
      logoUrl: row.logo_url,
    },
    status: row.status,
  });
});
