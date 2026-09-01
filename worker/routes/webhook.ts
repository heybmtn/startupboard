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

    if (!territorySlug) {
      console.error("Webhook missing territory_slug metadata", event.id);
      return c.json({ received: true });
    }

    // Atomic: only flips a still-available/pending territory tied to *this*
    // checkout session to sold. Guarantees a territory can never sell twice,
    // even under concurrent/duplicate webhook delivery.
    const result = await c.env.DB.prepare(
      `UPDATE territories
       SET status = 'sold',
           stripe_payment_intent_id = ?1,
           purchased_at = datetime('now'),
           pending_until = NULL,
           updated_at = datetime('now')
       WHERE slug = ?2
         AND stripe_checkout_session_id = ?3
         AND status != 'sold'`
    )
      .bind(paymentIntentId ?? null, territorySlug, session.id)
      .run();

    if (!result.meta.changes) {
      console.warn("Webhook checkout.session.completed did not match a claimable territory", {
        eventId: event.id,
        territorySlug,
        sessionId: session.id,
      });
    }
  }

  return c.json({ received: true });
});
