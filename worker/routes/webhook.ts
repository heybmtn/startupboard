import { Hono } from "hono";
import type Stripe from "stripe";
import type { Env } from "../types";
import { constructStripeEvent } from "../lib/stripe";

export const webhookRoute = new Hono<{ Bindings: Env }>();

webhookRoute.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400);
  }

  const payload = await c.req.text();

  let event: Stripe.Event;
  try {
    event = await constructStripeEvent(c.env, payload, signature);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  // Idempotency: record the event id first. UNIQUE constraint rejects replays.
  try {
    await c.env.DB.prepare(
      `INSERT INTO stripe_events (stripe_event_id, event_type) VALUES (?1, ?2)`
    )
      .bind(event.id, event.type)
      .run();
  } catch {
    // Already processed this event — acknowledge and stop.
    return c.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const territorySlug = session.metadata?.territory_slug;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    const amountPaid = session.amount_total;

    if (!territorySlug || amountPaid == null) {
      console.error("Webhook missing territory_slug metadata or amount", event.id);
      return c.json({ received: true });
    }

    // Atomic: promotes the challenger who made *this* checkout session into
    // the live owner — first sale or a takeover, doesn't matter, the
    // pending_* -> owner_* copy is the same either way. Matching on
    // stripe_checkout_session_id (only set for the currently active
    // challenge on this territory) means a stale/replayed session can never
    // resell a territory that's since moved on to a new challenge.
    const result = await c.env.DB.prepare(
      `UPDATE territories
       SET status = 'sold',
           owner_name = pending_owner_name,
           company_name = pending_company_name,
           owner_description = pending_owner_description,
           website_url = pending_website_url,
           logo_url = pending_logo_url,
           price_pence = ?1,
           stripe_payment_intent_id = ?2,
           purchased_at = datetime('now'),
           pending_until = NULL,
           pending_owner_name = NULL,
           pending_company_name = NULL,
           pending_owner_description = NULL,
           pending_website_url = NULL,
           pending_logo_url = NULL,
           updated_at = datetime('now')
       WHERE slug = ?3
         AND stripe_checkout_session_id = ?4`
    )
      .bind(amountPaid, paymentIntentId ?? null, territorySlug, session.id)
      .run();

    if (!result.meta.changes) {
      console.warn("Webhook checkout.session.completed did not match an active challenge", {
        eventId: event.id,
        territorySlug,
        sessionId: session.id,
      });
    }
  }

  return c.json({ received: true });
});
