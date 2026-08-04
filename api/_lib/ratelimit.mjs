// api/_lib/ratelimit.mjs — the spam brake (Decision #18).
// In-memory, per server instance: it resets on cold starts and each warm
// instance counts separately, so this is a speed bump that stops naive
// spam scripts cold — not a fortress. The fortress, if ever needed, is
// Vercel's dashboard firewall (Project → Firewall), no code changes.
// Limits are tunable in Vercel env vars without touching code.

const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  // prune expired entries occasionally so memory can't creep up
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now - b.start >= windowMs) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now - b.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIP(req) {
  const fwd = req.headers["x-forwarded-for"]; // set by Vercel, first entry = real client
  return (typeof fwd === "string" && fwd.split(",")[0].trim()) || "unknown";
}
