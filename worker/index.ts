import { Hono } from "hono";
import type { Env, TerritoryRow } from "./types";
import { territoriesRoute } from "./routes/territories";
import { checkoutRoute } from "./routes/checkout";
import { webhookRoute } from "./routes/webhook";
import { adminRoute } from "./routes/admin";
import { uploadRoute } from "./routes/upload";
import { renderTerritoryHtml, renderOgImageSvg } from "./og";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/territories", territoriesRoute);
app.route("/api/checkout", checkoutRoute);
app.route("/api/webhooks", webhookRoute);
app.route("/api/admin", adminRoute);
app.route("/api/uploads", uploadRoute);

app.get("/api/config", (c) =>
  c.json({ stripePublishableKey: c.env.STRIPE_PUBLISHABLE_KEY ?? "" })
);

app.get("/api/og-image/:slugWithExt", async (c) => {
  const slug = c.req.param("slugWithExt").replace(/\.svg$/, "");
  const row = await c.env.DB.prepare(`SELECT * FROM territories WHERE slug = ?1`)
    .bind(slug)
    .first<TerritoryRow>();
  return renderOgImageSvg(row, slug);
});

app.get("/territory/:slug", async (c) => {
  const slug = c.req.param("slug");
  const row = await c.env.DB.prepare(`SELECT * FROM territories WHERE slug = ?1`)
    .bind(slug)
    .first<TerritoryRow>();
  return renderTerritoryHtml(c.req.raw, c.env, row ?? null, slug);
});

app.notFound((c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env) {
    // Release reservations for checkouts that were started but never
    // completed within the pending window.
    await env.DB.prepare(
      `UPDATE territories
       SET status = 'available',
           pending_until = NULL,
           updated_at = datetime('now')
       WHERE status = 'pending' AND pending_until IS NOT NULL AND pending_until < datetime('now')`
    ).run();
  },
};
