// api/upload.js — POST raw file bytes; query: ?name=preview.png&type=image/png
import { uploadToStorage } from "./_lib/storage.mjs";
import { rateLimit, clientIP } from "./_lib/ratelimit.mjs";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "model/gltf-binary"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB safety ceiling (Vercel's own request limit is 4.5 MB)

// Vercel may hand us the body already read (as a Buffer) for some content
// types, or leave it as a stream for others — this covers both, so the
// endpoint works regardless of runtime behavior.
async function readRawBody(req) {
  if (req.body != null) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body, "binary");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error("File too large"), { code: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN); // your domain only
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Spam brake (Decision #18): per-IP ceiling, tunable in Vercel env.
  const perHour = Number(process.env.UPLOAD_LIMIT_PER_HOUR || 60);
  if (!rateLimit(`upload:${clientIP(req)}`, perHour, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many uploads from this address - try again later" });
  }

  try {
    const name = String(req.query.name || "file");
    const type = String(req.query.type || "");
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: "Bad file type" });

    const buffer = await readRawBody(req);
    if (buffer.length === 0) return res.status(400).json({ error: "Empty file" });
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: "File too large" });

    // Real PNG/JPEG/GLB files begin with fixed signature bytes — reject mislabeled content.
    // (Content-TRUTH — does the picture depict the parts? — is policed via repairAssets, §11.)
    const okSig =
      (type === "image/png"  && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") ||
      (type === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8) ||
      (type === "model/gltf-binary" && buffer.subarray(0, 4).toString("latin1") === "glTF");
    if (!okSig) return res.status(400).json({ error: "File content does not match its type" });

    const uri = await uploadToStorage(buffer, name, type);
    return res.status(200).json({ uri });
  } catch (e) {
    console.error(e);
    return res.status(e.code === 413 ? 413 : 500).json({ error: e.code === 413 ? "File too large" : "Upload failed" });
  }
}
