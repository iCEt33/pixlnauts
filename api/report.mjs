// api/report.mjs — receives "the customizer didn't load" reports from
// public/b-b0-customizer/js/robot-guard.js and sends them to you as a
// Discord DM, through your own bot.
//
// NEEDS (Vercel → Settings → Environment Variables):
//   DISCORD_BOT_TOKEN   your bot's token. Secret: lives here and nowhere else,
//                       exactly like SIGNER_PRIVATE_KEY.
//   DISCORD_USER_ID     your Discord user id (Developer Mode → Copy User ID).
// The bot must share a server with you, and your privacy settings must allow
// DMs from members of that server — that is Discord's rule for bots.
//
// WHAT IT DOES
//  1. Always writes the report to Vercel's function log (Project → Logs).
//  2. Sends it as a DM: first asks Discord for the DM channel with you
//     (POST /users/@me/channels), then posts the message there.
//
// WHAT IT REFUSES
//  - anything but a small JSON POST
//  - more than REPORT_LIMIT_PER_HOUR from one address, or more than
//    REPORT_LIMIT_GLOBAL_PER_HOUR in total. In-memory, per server instance:
//    a speed bump so nobody can flood your DMs, same philosophy as the
//    upload/stamp brakes. Not a fortress.
//
// It answers 204 no matter what, so it leaks nothing and gives a spammer
// nothing to read. Nothing it receives can reach the chain or the storage.

const MAX_BODY_BYTES = 8 * 1024;
const REPORT_LIMIT_PER_HOUR = Number(process.env.REPORT_LIMIT_PER_HOUR || 5);
const REPORT_LIMIT_GLOBAL_PER_HOUR = Number(process.env.REPORT_LIMIT_GLOBAL_PER_HOUR || 60);
const DISCORD_API = process.env.DISCORD_API_BASE || "https://discord.com/api/v10";

// ---- the brake -------------------------------------------------------------
const perIp = new Map();      // ip -> [timestamps]
let globalHits = [];

function allow(ip) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  globalHits = globalHits.filter((t) => t > hourAgo);
  if (globalHits.length >= REPORT_LIMIT_GLOBAL_PER_HOUR) return false;
  const mine = (perIp.get(ip) || []).filter((t) => t > hourAgo);
  if (mine.length >= REPORT_LIMIT_PER_HOUR) { perIp.set(ip, mine); return false; }
  mine.push(now);
  perIp.set(ip, mine);
  globalHits.push(now);
  if (perIp.size > 5000) for (const [k, v] of perIp) if (!v.some((t) => t > hourAgo)) perIp.delete(k);
  return true;
}

// ---- the report ------------------------------------------------------------
const str = (v, max) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);

/** Keep only the fields we expect, each cut to a sane length. Everything in
 *  here came from a visitor's browser: data, never instructions. */
function sanitize(body) {
  const b = body && typeof body === "object" ? body : {};
  const list = (arr, n, f) => (Array.isArray(arr) ? arr.slice(0, n).map(f) : []);
  return {
    page: str(b.page, 300),
    at: str(b.at, 40),
    browser: str(b.browser, 200),
    assembled: b.assembled === true,
    failures: list(b.failures, 10, (x) => ({ kind: str(x && x.kind, 40), detail: str(x && x.detail, 200) })),
    errors: list(b.errors, 5, (x) => ({ kind: str(x && x.kind, 40), detail: str(x && x.detail, 200) })),
    log: list(b.log, 12, (x) => str(x, 160)),
  };
}

function messageFor(r, ip) {
  const isTest = r.failures.some((f) => f.kind === "test");
  const lines = [
    isTest ? "B-b0 customizer: TEST message (someone opened the page with ?bb0test)"
           : "B-b0 customizer: a visitor's page did not load properly",
    "",
    "What failed:",
    ...(r.failures.length ? r.failures.map((f) => `  - ${f.kind}: ${f.detail}`) : ["  (no details)"]),
    "",
    `Page: ${r.page}`,
    `When: ${r.at}`,
    `Browser: ${r.browser}`,
    `From: ${ip}`,
    `Robot ever shown: ${r.assembled ? "yes" : "no"}`,
  ];
  if (r.log.length) lines.push("", "Last log lines:", ...r.log.map((l) => `  ${l}`));
  if (r.errors.length) lines.push("", "Runtime errors:", ...r.errors.map((e) => `  - ${e.kind}: ${e.detail}`));
  return lines.join("\n");
}

// ---- Discord ---------------------------------------------------------------
let dmChannelId = null;   // remembered per server instance; re-asked after a cold start

async function discord(path, body, token) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(DISCORD_API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bot ${token}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

// Plain English for the two Discord errors people actually hit.
function explain(status, json) {
  const code = json && json.code;
  if (status === 401) return "Discord rejected the bot token (401): check DISCORD_BOT_TOKEN in Vercel.";
  if (code === 50007) return "Discord says the bot cannot DM you (50007): the bot must share a server with you, and your privacy settings must allow DMs from server members.";
  if (code === 10013) return "Discord does not know that user id (10013): check DISCORD_USER_ID in Vercel.";
  if (status === 429) return "Discord rate limit (429): this one message was dropped.";
  return `Discord answered ${status}${code ? " (code " + code + ")" : ""}${json && json.message ? ": " + json.message : ""}.`;
}

/** Sends the text as a DM. Returns a one-line outcome for the log. */
async function sendDM(text) {
  const token = (process.env.DISCORD_BOT_TOKEN || "").trim();
  const userId = (process.env.DISCORD_USER_ID || "").trim();
  if (!token || !userId) return "no DISCORD_BOT_TOKEN / DISCORD_USER_ID set: logged only";

  try {
    if (!dmChannelId) {
      const r = await discord("/users/@me/channels", { recipient_id: userId }, token);
      if (!r.ok || !r.json || !r.json.id) return explain(r.status, r.json);
      dmChannelId = r.json.id;
    }
    // Discord renders markdown; a code block keeps the report as plain
    // monospace text, and backticks inside it are neutralised first.
    const content = "```\n" + text.replace(/`/g, "'").slice(0, 1900) + "\n```";
    const r = await discord(`/channels/${dmChannelId}/messages`,
      { content, allowed_mentions: { parse: [] } }, token);
    if (r.ok) return "sent";
    if (r.status === 404 || r.status === 403) dmChannelId = null;   // channel gone: re-ask next time
    return explain(r.status, r.json);
  } catch (e) {
    return `could not reach Discord: ${e && e.message}`;
  }
}

// ---- the request ------------------------------------------------------------
async function readBody(req) {
  if (req.body !== undefined) return req.body;          // Vercel parsed JSON for us
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return null; }
}

export default async function handler(req, res) {
  // Same-origin in practice (the customizer and /api share the domain), so
  // CORS never applies. Set only when configured: Node 22 throws on an
  // undefined header value.
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();
  if (!allow(ip)) return res.status(204).end();           // quietly dropped

  const raw = await readBody(req);
  if (!raw || typeof raw !== "object") return res.status(204).end();
  if (JSON.stringify(raw).length > MAX_BODY_BYTES) return res.status(204).end();

  const report = sanitize(raw);
  const text = messageFor(report, ip);

  // 1. the log, always
  console.log("[bb0-report]\n" + text);

  // 2. the DM
  const outcome = await sendDM(text);
  if (outcome !== "sent") console.warn("[bb0-report] DM not sent: " + outcome);

  return res.status(204).end();
}
