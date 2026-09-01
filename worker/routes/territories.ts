import { Hono } from "hono";
import type { Env, TerritoryRow } from "../types";
import { toPublicTerritory } from "../types";

export const territoriesRoute = new Hono<{ Bindings: Env }>();

territoriesRoute.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM territories ORDER BY position ASC`
  ).all<TerritoryRow>();

  return c.json({
    territories: (results ?? []).map(toPublicTerritory),
  });
});

territoriesRoute.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await c.env.DB.prepare(`SELECT * FROM territories WHERE slug = ?1`)
    .bind(slug)
    .first<TerritoryRow>();

  if (!row) {
    return c.json({ error: "Territory not found" }, 404);
  }

  return c.json({ territory: toPublicTerritory(row) });
});
