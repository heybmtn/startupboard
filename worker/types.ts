export interface Env {
  DB: D1Database;
  LOGOS: R2Bucket;
  ASSETS: Fetcher;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
  ADMIN_SECRET: string;
  PUBLIC_SITE_URL?: string;
}

export type TerritoryStatus = "available" | "pending" | "sold";

export interface TerritoryRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_pence: number;
  colour: string;
  position: number;
  status: TerritoryStatus;
  owner_name: string | null;
  company_name: string | null;
  owner_description: string | null;
  website_url: string | null;
  logo_url: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  pending_until: string | null;
  purchased_at: string | null;
  // Challenger's submitted info while a takeover payment is in flight —
  // kept separate from the live owner_* columns so the current owner's
  // listing stays untouched unless/until the webhook confirms payment.
  pending_owner_name: string | null;
  pending_company_name: string | null;
  pending_owner_description: string | null;
  pending_website_url: string | null;
  pending_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A sold territory can be taken over by paying more than its current price.
 * The step-up is at least 20%, or £1, whichever is larger, rounded up to
 * the nearest 50p so it's always strictly more than the current price.
 */
export function computeNextPricePence(t: TerritoryRow): number {
  if (t.status !== "sold") return t.price_pence;
  const increment = Math.max(100, Math.ceil(t.price_pence * 0.2));
  const raw = t.price_pence + increment;
  return Math.ceil(raw / 50) * 50;
}

/** Shape returned to public clients — never leaks internal Stripe IDs or challenger info. */
export function toPublicTerritory(t: TerritoryRow) {
  const isSold = t.status === "sold";
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    pricePence: t.price_pence,
    nextPricePence: computeNextPricePence(t),
    colour: t.colour,
    position: t.position,
    status: t.status,
    ownerName: isSold ? t.owner_name : null,
    companyName: isSold ? t.company_name : null,
    ownerDescription: isSold ? t.owner_description : null,
    websiteUrl: isSold ? t.website_url : null,
    logoUrl: isSold ? t.logo_url : null,
    purchasedAt: isSold ? t.purchased_at : null,
  };
}
