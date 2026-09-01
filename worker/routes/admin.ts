import { Hono } from "hono";
import type { Env, TerritoryRow } from "../types";
import { adminUpdateSchema } from "../lib/validation";

export const adminRoute = new Hono<{ Bindings: Env }>();

adminRoute.use("*", async (c, next) => {
  const provided = c.req.header("x-admin-secret") ?? "";
  const expected = c.env.ADMIN_SECRET ?? "";
  if (!expected || provided !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

adminRoute.get("/territories", async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM territories ORDER BY position ASC`).all<TerritoryRow>();
  return c.json({ territories: results ?? [] });
});

adminRoute.patch("/territories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "Invalid territory id" }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }
  const input = parsed.data;

  const fields: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    price_pence: input.pricePence,
    colour: input.colour,
    status: input.status,
    owner_name: input.ownerName,
    company_name: input.companyName,
    owner_description: input.ownerDescription,
    website_url: input.websiteUrl,
    logo_url: input.logoUrl,
  };

  for (const [column, value] of Object.entries(map)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }

  // Marking a territory available again (e.g. removing an inappropriate
  // listing) should clear the previous purchase/reservation data too.
  if (input.status === "available") {
    fields.push(
      "owner_name = NULL",
      "company_name = NULL",
      "owner_description = NULL",
      "website_url = NULL",
      "logo_url = NULL",
      "stripe_checkout_session_id = NULL",
      "stripe_payment_intent_id = NULL",
      "pending_until = NULL",
      "purchased_at = NULL",
      "pending_owner_name = NULL",
      "pending_company_name = NULL",
      "pending_owner_description = NULL",
      "pending_website_url = NULL",
      "pending_logo_url = NULL"
    );
  }

  if (fields.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await c.env.DB.prepare(`UPDATE territories SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await c.env.DB.prepare(`SELECT * FROM territories WHERE id = ?1`).bind(id).first<TerritoryRow>();
  if (!updated) {
    return c.json({ error: "Territory not found" }, 404);
  }

  return c.json({ territory: updated });
});

adminRoute.get("/stats", async (c) => {
  const totals = await c.env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold,
       SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       COALESCE(SUM(CASE WHEN status = 'sold' THEN price_pence ELSE 0 END), 0) AS revenuePence
     FROM territories`
  ).first<{
    total: number;
    sold: number;
    available: number;
    pending: number;
    revenuePence: number;
  }>();

  const recent = await c.env.DB.prepare(
    `SELECT name, slug, owner_name, company_name, price_pence, purchased_at
     FROM territories
     WHERE status = 'sold'
     ORDER BY purchased_at DESC
     LIMIT 20`
  ).all();

  return c.json({
    totals,
    recentPurchases: recent.results ?? [],
  });
});
