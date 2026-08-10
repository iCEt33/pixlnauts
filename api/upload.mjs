// api/upload.mjs
//
// TWO MODES (v2.8).
//
//   ?mode=prepare   POST raw file bytes.  SIGNS a data item and returns its
//                   permanent address plus the signed bytes. Stores NOTHING
//                   and spends NOTHING. Safe to abandon.
//
//   ?mode=commit    POST { item, tokenId, uri }.  Uploads the already-signed
//                   bytes -- but ONLY if a token exists on-chain whose
//                   imageURI is exactly this address.
//
// Why the split. Previously this endpoint stored a file the moment it was
// called, before the buyer had agreed to anything. Two consequences:
//
//   1. Cancelling at the wallet prompt left paid-for, undeletable files with
//      no token pointing at them.
//   2. The endpoint was reachable by anyone with no wallet, no payment and no
//      auth. On Pinata that burned a free-tier count. On Turbo it would spend
//      real credits, permanently.
//
// Both dissolve here. Preparing costs CPU, not credits. Committing requires a
// token that already exists and already points at these exact bytes -- which
// means somebody paid for a mint first. Nobody can spend your credits without
// buying a robot.
//
// Pinata keeps the old single-shot behaviour: its addresses cannot be known
// before upload the way an Arweave data item's can. Call without ?mode and it
// behaves exactly as it did.

import { uploadToStorage, signForLater, uploadSigned } from "./_lib/storage.mjs";
import { rateLimit, clientIP } from "./_lib/ratelimit.mjs";
import { createPublicClient, http } from "viem";
import { polygon, polygonAmoy, hardhat } from "viem/chains";

// Same env vars the rest of the server already uses. CHAIN_ID=137 is mainnet.
// RPC_URL is optional -- without it viem falls back to the chain's public
// endpoint, which is fine for a single read but worth setting for launch
// (see COMPLETE_TECHNICAL_DOCUMENTATION §11.1).
// 31337 is a local Hardhat node -- included so the Turbo path (sign -> mint ->
// commit) can be exercised end to end against a local chain without spending
// mainnet gas. Without this the commit gate cannot be tested at all before
// launch, because it is the only step that reads the chain.
const CHAIN =
  Number(process.env.CHAIN_ID) === 137   ? polygon :
  Number(process.env.CHAIN_ID) === 31337 ? hardhat  : polygonAmoy;
const IMAGE_URI_ABI = [{
  name: "imageURI", type: "function", stateMutability: "view",
  inputs: [{ type: "uint256" }], outputs: [{ type: "string" }],
}];

const ALLOWED_TYPES = ["image/png", "image/jpeg"];   // v2.8: no GLB is uploaded
const MAX_BYTES = 4 * 1024 * 1024;                   // Vercel's own limit is 4.5 MB

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

/** Read imageURI(tokenId) straight off the chain. This is the gate. */
async function onChainImageURI(tokenId) {
  const client = createPublicClient({ chain: CHAIN, transport: http(process.env.RPC_URL) });
  return await client.readContract({
    address: process.env.CONTRACT_ADDRESS,
    abi: IMAGE_URI_ABI,
    functionName: "imageURI",
    args: [BigInt(tokenId)],
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const mode = String(req.query.mode || "");

  // ---------------- COMMIT ----------------
  // Deliberately NOT rate-limited by IP: it can only ever store bytes that a
  // paid-for token already points at, so there is nothing here to abuse.
  if (mode === "commit") {
    try {
      const { item, tokenId, uri } = req.body || {};
      if (typeof item !== "string" || !item.length) {
        return res.status(400).json({ error: "Missing signed item" });
      }
      const tid = Number(tokenId);
      if (!Number.isInteger(tid) || tid <= 0) {
        return res.status(400).json({ error: "Bad tokenId" });
      }

      // THE GATE: the token must exist and must already point at this address.
      let stored;
      try {
        stored = await onChainImageURI(tid);
      } catch {
        return res.status(400).json({ error: "Token not found on chain" });
      }
      if (!stored || stored !== uri) {
        return res.status(403).json({ error: "That token does not point at this file" });
      }

      const bytes = Buffer.from(item, "base64");
      if (bytes.length > MAX_BYTES + 4096) {   // + data item header allowance
        return res.status(413).json({ error: "File too large" });
      }

      // THE SECOND GATE: these bytes must BE the file the token points at.
      // Checked before the upload, because the upload is what costs credits.
      // The gate above only checks WHICH bytes, never HOW MANY TIMES -- one
      // paid mint otherwise makes this endpoint replayable forever.
      {
        const { DataItem } = await import("@dha-team/arbundles");
        if (`ar://${new DataItem(bytes).id}` !== uri) {
          return res.status(403).json({ error: "Those bytes are not this file" });
        }
      }

      const finalUri = await uploadSigned(bytes);
      if (finalUri !== uri) {
        // Cannot normally happen -- the id is derived from the bytes. If it
        // does, something re-signed instead of forwarding, and the token would
        // point at nothing.
        console.error("commit id mismatch", { expected: uri, got: finalUri });
        return res.status(500).json({ error: "Address mismatch - not stored" });
      }
      return res.status(200).json({ uri: finalUri });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Storing failed" });
    }
  }

  // ---------------- PREPARE (and the legacy Pinata path) ----------------
  const perHour = Number(process.env.UPLOAD_LIMIT_PER_HOUR || 60);
  if (!rateLimit(`upload:${clientIP(req)}`, perHour, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many uploads from this address - try again later" });
  }

  try {
    const name = String(req.query.name || "file");
    const type = String(req.query.type || "");
    if (!ALLOWED_TYPES.includes(type)) return res.status(400).json({ error: "Bad file type" });

    // Spec §1.8. Both are INDEX HINTS, not proof: prepare runs before the
    // stamp, so nothing here is verified. Action comes from a whitelist of
    // two, so it cannot be junk. Wallet is whatever the caller claims and is
    // dropped unless it looks like an address. Defaults keep every existing
    // caller -- including turbo-test.mjs -- working unchanged.
    const action = req.query.action === "upgrade" ? "upgrade" : "mint";
    const wallet = /^0x[0-9a-fA-F]{40}$/.test(String(req.query.wallet || ""))
      ? String(req.query.wallet) : "";

    const buffer = await readRawBody(req);
    if (buffer.length === 0) return res.status(400).json({ error: "Empty file" });
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: "File too large" });

    // Real PNG/JPEG files begin with fixed signature bytes -- reject mislabeled
    // content. (Whether the picture DEPICTS the parts is policed via
    // repairAssets, §11.)
    const okSig =
      (type === "image/png"  && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") ||
      (type === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8);
    if (!okSig) return res.status(400).json({ error: "File content does not match its type" });

    // Arweave: sign now, hand back the address AND the bytes. Nothing stored.
    const tags = [
      { name: "App-Name", value: "Pixlnauts-BB0" },
      { name: "Action",   value: action },
      { name: "Asset",    value: "preview" },
    ];
    if (wallet) tags.push({ name: "Wallet", value: wallet });
    const prepared = await signForLater(buffer, type, tags);
    if (prepared) {
      return res.status(200).json({
        uri: prepared.uri,
        item: prepared.bytes.toString("base64"),
      });
    }

    // Pinata: no separable signing step, so store immediately as before and
    // return item: null. mint.js sees the null and skips the commit call.
    const uri = await uploadToStorage(buffer, name, type);
    return res.status(200).json({ uri, item: null });
  } catch (e) {
    console.error(e);
    return res.status(e.code === 413 ? 413 : 500).json({
      error: e.code === 413 ? "File too large" : "Upload failed",
    });
  }
}
