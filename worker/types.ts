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
  created_at: string;
  updated_at: string;
}

/** Shape returned to public clients — never leaks internal Stripe IDs. */
export function toPublicTerritory(t: TerritoryRow) {
  const isSold = t.status === "sold";
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    pricePence: t.price_pence,
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
