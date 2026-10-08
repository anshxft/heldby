import "server-only";

const hits = new Map<string, { count: number; reset: number }>();

// ponytail: per-instance memory, so each serverless instance counts separately; move to Upstash/KV if abuse gets real.
/** Fixed-window limiter keyed by caller IP. Returns seconds to wait, or 0 if the request may proceed. */
export function rateLimit(request: Request, bucket: string, max: number, windowMs: number): number {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k); // keep the map small
    return 0;
  }
  entry.count++;
  return entry.count > max ? Math.ceil((entry.reset - now) / 1000) : 0;
}

export const tooMany = (wait: number) =>
  Response.json({ error: `Too many requests. Try again in ${wait}s.` }, { status: 429, headers: { "Retry-After": String(wait) } });

/** Browsers send Origin on cross-site POSTs; refuse those so other sites can't drive our APIs from a visitor's tab. */
export function crossSite(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false; // same-origin GETs and server-to-server calls (still rate limited)
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

export const forbidden = () => Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
