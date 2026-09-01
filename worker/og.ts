import type { Env, TerritoryRow } from "./types";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

class MetaRewriter {
  constructor(
    private attr: "content" | "href",
    private value: string
  ) {}
  element(element: Element) {
    element.setAttribute(this.attr, this.value);
  }
}

class TextRewriter {
  constructor(private value: string) {}
  element(element: Element) {
    element.setInnerContent(this.value);
  }
}

/**
 * Serves the SPA shell for /territory/:slug but rewrites <title> and the
 * Open Graph / Twitter / canonical tags server-side, so link previews and
 * crawlers (which don't execute JS) see accurate per-territory metadata.
 */
export async function renderTerritoryHtml(
  request: Request,
  env: Env,
  territory: TerritoryRow | null,
  slug: string
): Promise<Response> {
  const assetUrl = new URL("/", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (!assetResponse.ok) return assetResponse;

  const siteUrl = env.PUBLIC_SITE_URL || new URL(request.url).origin;
  const canonical = `${siteUrl}/territory/${slug}`;

  const isSold = territory?.status === "sold";
  const title = isSold
    ? `${territory!.name} Territory — ${territory!.company_name ?? territory!.owner_name} | Startup Board`
    : `${territory ? territory.name : slug} Territory | Startup Board`;
  const description = isSold
    ? territory!.owner_description ?? `${territory!.name} territory on Startup Board.`
    : `This territory is available to claim on Startup Board — own a piece of the board and get seen.`;
  const ogImage = `${siteUrl}/api/og-image/${slug}.svg`;

  const rewriter = new HTMLRewriter()
    .on("title", new TextRewriter(escapeHtml(title)))
    .on('meta[name="description"]', new MetaRewriter("content", description))
    .on('meta[property="og:title"]', new MetaRewriter("content", title))
    .on('meta[property="og:description"]', new MetaRewriter("content", description))
    .on('meta[property="og:image"]', new MetaRewriter("content", ogImage))
    .on('meta[property="og:type"]', new MetaRewriter("content", "website"))
    .on('meta[name="twitter:card"]', new MetaRewriter("content", "summary_large_image"));

  const withOgUrl = new HTMLRewriter()
    .on("head", {
      element(element: Element) {
        element.append(
          `<meta property="og:url" content="${escapeHtml(canonical)}" /><link rel="canonical" href="${escapeHtml(canonical)}" />`,
          { html: true }
        );
      },
    });

  const rewritten = rewriter.transform(assetResponse);
  const finalResponse = withOgUrl.transform(rewritten);

  return new Response(finalResponse.body, {
    status: 200,
    headers: finalResponse.headers,
  });
}

/** A lightweight branded SVG used as the per-territory share image. */
export function renderOgImageSvg(territory: TerritoryRow | null, slug: string): Response {
  const name = territory?.name ?? slug;
  const isSold = territory?.status === "sold";
  const owner = isSold ? territory?.company_name || territory?.owner_name || "" : "";
  const status = isSold ? "OWNED" : "AVAILABLE";
  const colour = territory?.colour ?? "#6366f1";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1020" />
        <stop offset="100%" stop-color="#161f45" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect x="60" y="60" width="1080" height="510" rx="24" fill="none" stroke="${colour}" stroke-width="6" />
    <rect x="60" y="60" width="220" height="510" fill="${colour}" opacity="0.15" />
    <text x="110" y="200" font-family="Arial, sans-serif" font-size="26" fill="${colour}" font-weight="700" letter-spacing="4">STARTUP BOARD</text>
    <text x="110" y="300" font-family="Arial, sans-serif" font-size="76" fill="#ffffff" font-weight="700">${escapeHtml(name)}</text>
    ${owner ? `<text x="110" y="370" font-family="Arial, sans-serif" font-size="40" fill="#c7d2fe">${escapeHtml(owner)}</text>` : ""}
    <text x="110" y="470" font-family="Arial, sans-serif" font-size="28" fill="${isSold ? "#f87171" : "#4ade80"}" font-weight="700" letter-spacing="2">${status}</text>
    <text x="110" y="560" font-family="Arial, sans-serif" font-size="22" fill="#64748b">Own a piece of the board. Get seen.</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
