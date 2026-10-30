/**
 * Fixed-window rate limit per client key, kept in memory.
 * On serverless hosts each instance keeps its own counts, so this caps bursts rather than
 * enforcing a global quota; it is enough to stop one client hammering the extractor.
 */
export type Limiter = { check: (key: string, now?: number) => { ok: boolean; retryAfter: number } };

export function createLimiter(limit: number, windowMs: number, maxKeys = 10_000): Limiter {
  const hits = new Map<string, { count: number; start: number }>();
  return {
    check(key, now = Date.now()) {
      const h = hits.get(key);
      if (!h || now - h.start >= windowMs) {
        // Forget the oldest client rather than grow without bound.
        if (!h && hits.size >= maxKeys) hits.delete(hits.keys().next().value!);
        hits.set(key, { count: 1, start: now });
        return { ok: true, retryAfter: 0 };
      }
      h.count += 1;
      if (h.count <= limit) return { ok: true, retryAfter: 0 };
      return { ok: false, retryAfter: Math.ceil((h.start + windowMs - now) / 1000) };
    },
  };
}

/**
 * The caller's address. On Cloudflare, `cf-connecting-ip` is set by the edge on every request and a
 * client cannot forge it; `x-forwarded-for` there keeps whatever the client sent, so it is only a
 * fallback for local development, where no proxy sets either.
 */
export function clientKey(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "anonymous"
  );
}
