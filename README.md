# Startup Board

An interactive digital game board where startups, businesses and projects pay
to own a territory. Built on Cloudflare Workers, D1, R2, React, and Stripe
Checkout.

## Stack

- Cloudflare Workers (Hono) — API + serves the static SPA + OG meta rewriting
- Cloudflare D1 — territories & Stripe event storage
- Cloudflare R2 — logo uploads
- React + TypeScript + Vite + Tailwind CSS
- Stripe Checkout — payment
- Zod — input validation

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in Stripe test keys + a strong ADMIN_SECRET
npm run db:migrate:local         # create tables + seed the 24 territories

# terminal 1: the Worker API (D1/R2 bindings, Stripe, webhooks)
npm run dev:worker

# terminal 2: the Vite dev server (proxies /api to the worker on :8787)
npm run dev
```

Visit http://localhost:5173.

To test the Stripe webhook locally, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:8787/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `.dev.vars` as `STRIPE_WEBHOOK_SECRET`.

## Deployment

1. Create the D1 database and R2 bucket, then update `wrangler.toml` with the
   real `database_id`:

   ```bash
   npx wrangler d1 create startup-board
   npx wrangler r2 bucket create startup-board-logos
   ```

2. Apply migrations to the remote database:

   ```bash
   npm run db:migrate:remote
   ```

3. Set secrets:

   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put STRIPE_PUBLISHABLE_KEY
   npx wrangler secret put ADMIN_SECRET
   ```

4. Build and deploy:

   ```bash
   npm run deploy
   ```

5. In the Stripe Dashboard, add a webhook endpoint pointing at
   `https://<your-worker>/api/webhooks/stripe` listening for
   `checkout.session.completed`, and update `STRIPE_WEBHOOK_SECRET` with its
   signing secret.

6. Update `PUBLIC_SITE_URL` in `wrangler.toml` to your production URL (used
   for Stripe redirect URLs and Open Graph canonical links).

## How it works

- **Territories** live in D1 (`territories` table) with a fixed
  `price_pence` per tile, set by an admin — never trusted from the client.
- **Claiming** a territory reserves it (`status = 'pending'`, 30-minute
  `pending_until` window) and creates a Stripe Checkout Session with the
  territory id/slug in `metadata`.
- **Ownership is only confirmed by the `checkout.session.completed`
  webhook**, verified via Stripe signature and made idempotent through the
  `stripe_events` table plus an atomic conditional `UPDATE` — a territory can
  never be sold twice, even under duplicate webhook delivery.
- A **scheduled Worker** (cron, every 10 minutes) releases expired pending
  reservations back to `available`.
- `/territory/:slug` is rewritten server-side (via `HTMLRewriter`) with
  accurate `<title>`/Open Graph/Twitter meta tags and a generated SVG share
  image, so link previews and crawlers see per-territory content without a
  full SSR React setup.
- `/admin` is protected by a shared secret (`ADMIN_SECRET`) sent as an
  `x-admin-secret` header — no login system, per the MVP scope.

## What's intentionally not built

Per the MVP brief: no accounts/login, no social features, no dynamic
pricing/auctions, no virtual currency. The loop is strictly
territory + promotional listing + Stripe payment.
