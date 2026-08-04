// api/stamp.js — POST JSON:
// { action: "mint"|"upgrade", tokenId: 0, wallet: "0x…",
//   config: [bodyId, faceId, screenId, specsId, clothesId, faceAccId, headAccId],
//   imageURI: "ipfs://…", modelURI: "ipfs://…" }
import { keccak256, encodePacked, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";
import { rateLimit, clientIP } from "./_lib/ratelimit.mjs";

// createRequire is the reliable way to load JSON on Vercel's bundler
const require = createRequire(import.meta.url);
const parts = require("./_lib/parts.json");

const account = privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Spam brake (Decision #18): per-IP ceiling, tunable in Vercel env.
  const perHour = Number(process.env.STAMP_LIMIT_PER_HOUR || 120);
  if (!rateLimit(`stamp:${clientIP(req)}`, perHour, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many requests from this address - try again later" });
  }

  try {
    const { action, tokenId, wallet, config, imageURI, modelURI } = req.body || {};

    // ---- refuse anything the customizer could not have produced ----
    if (!Array.isArray(config) || config.length !== 7) {
      return res.status(400).json({ error: "Bad config" });
    }
    // A malformed wallet/tokenId must read as "your request is wrong" (400),
    // not "the server broke" (500) — otherwise Phase 3 debugging chases ghosts.
    if (typeof wallet !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      return res.status(400).json({ error: "Bad wallet address" });
    }
    const tid = Number(tokenId ?? 0);
    if (!Number.isInteger(tid) || tid < 0) {
      return res.status(400).json({ error: "Bad tokenId" });
    }
    for (let cat = 0; cat < 7; cat++) {
      const known = parts.categories[cat].parts.some(p => p.id === config[cat]);
      if (!known) return res.status(400).json({ error: `Unknown part in category ${cat}` });
    }
    const okUri = u => typeof u === "string" && (u.startsWith("ipfs://") || u.startsWith("ar://"));
    if (!okUri(imageURI) || !okUri(modelURI)) {
      return res.status(400).json({ error: "Bad file address" });
    }
    const actionCode = action === "mint" ? 1 : action === "upgrade" ? 2 : 0;
    if (actionCode === 0) return res.status(400).json({ error: "Bad action" });

    // ---- build the exact digest the contract rebuilds in _verifyStamp ----
    // Staged hashing (cfgHash, filesHash) MUST mirror the contract's
    // _hashCfg / _hashFiles — this pairing is compile-verified.
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // valid 10 minutes
    const cfgHash = keccak256(encodePacked(
      ["uint8", "uint8", "uint8", "uint8", "uint8", "uint8", "uint8"],
      config
    ));
    const filesHash = keccak256(encodePacked(
      ["bytes32", "bytes32"],
      [keccak256(stringToBytes(imageURI)), keccak256(stringToBytes(modelURI))]
    ));
    const digest = keccak256(encodePacked(
      ["address", "uint256", "uint8", "address", "uint256", "bytes32", "bytes32", "uint256"],
      [
        process.env.CONTRACT_ADDRESS,
        BigInt(process.env.CHAIN_ID),
        actionCode,
        wallet,
        BigInt(tid),
        cfgHash,
        filesHash,
        deadline,
      ]
    ));

    const stamp = await account.signMessage({ message: { raw: digest } });
    return res.status(200).json({ stamp, deadline: deadline.toString() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Stamping failed" });
  }
}
