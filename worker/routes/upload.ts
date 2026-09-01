import { Hono } from "hono";
import type { Env } from "../types";
import { rateLimit, clientIp } from "../lib/ratelimit";

export const uploadRoute = new Hono<{ Bindings: Env }>();

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

uploadRoute.post("/logo", async (c) => {
  const ip = clientIp(c.req.raw);
  const withinLimit = await rateLimit(c.env, `upload:${ip}`, 15, 60);
  if (!withinLimit) {
    return c.json({ error: "Too many uploads. Please try again shortly." }, 429);
  }

  const body = await c.req.parseBody();
  const file = body["logo"];

  if (!(file instanceof File)) {
    return c.json({ error: "No logo file provided" }, 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: "Logo must be a PNG, JPEG, or WebP image" }, 400);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return c.json({ error: "Logo must be smaller than 2MB" }, 400);
  }

  const buffer = await file.arrayBuffer();

  // Minimal magic-byte sniff so a renamed non-image can't sneak past the
  // declared Content-Type.
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const looksLikePng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const looksLikeJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const looksLikeWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  if (!looksLikePng && !looksLikeJpeg && !looksLikeWebp) {
    return c.json({ error: "File does not look like a valid image" }, 400);
  }

  const ext = EXT_BY_TYPE[file.type];
  const key = `logos/${crypto.randomUUID()}.${ext}`;

  await c.env.LOGOS.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ logoUrl: `/api/uploads/${key}` });
});

uploadRoute.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  if (!key.startsWith("logos/")) {
    return c.json({ error: "Not found" }, 404);
  }

  const object = await c.env.LOGOS.get(key);
  if (!object) {
    return c.json({ error: "Not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});
