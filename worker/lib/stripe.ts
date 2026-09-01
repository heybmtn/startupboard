import Stripe from "stripe";
import type { Env } from "../types";

export function getStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function constructStripeEvent(
  env: Env,
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe(env);
  return stripe.webhooks.constructEventAsync(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
    undefined,
    Stripe.createSubtleCryptoProvider()
  );
}
