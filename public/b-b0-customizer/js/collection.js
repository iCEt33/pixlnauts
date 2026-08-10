// js/collection.js — plan §6.5 — "which B-b0s does this wallet own, and what
// are they wearing?"
//
// This file talks to the chain and returns plain data. It draws nothing.
// collection-ui.js is the visible half.
//
// TWO WAYS TO FIND SOMEONE'S ROBOTS, and the order matters:
//
//   1. THE CHAIN ITSELF (always available, always correct). Ask the contract
//      how many robots exist, then ask who owns each one — batched into a
//      single network round-trip by multicall. This is the path that runs
//      today, with no API key and nothing deployed, so it is the one that gets
//      tested. It is comfortable to a few hundred robots.
//
//   2. ALCHEMY'S NFT INDEX (optional accelerator). One request instead of N.
//      Used ONLY when ALCHEMY_KEY is filled in, and if it fails for any reason
//      we fall straight back to path 1 without telling the person off.
//
// The details (picture, build) always come from the contract either way — the
// chain is the source of truth about what a robot is wearing, never an index.

import { publicClient, contract } from "./wallet.js";
import {
  toViewableURL, CONTRACT_ADDRESS, IS_DEPLOYED, ALCHEMY_NFT_BASE,
} from "./chain-config.js";

// parts.json sits next to index.html. NOTE the "./" — a bare "/parts.json"
// points at the site root, where the file does not live.
let PARTS = null;
export async function loadParts() {
  if (PARTS) return PARTS;
  const res = await fetch("./parts.json");
  if (!res.ok) throw new Error("Could not load parts.json");
  PARTS = await res.json();
  return PARTS;
}

function requireDeployed() {
  if (!IS_DEPLOYED) {
    throw new Error(
      "The contract isn't deployed yet. Your collection will appear here once " +
      "an address is filled into js/chain-config.js (that happens in Phase 4)."
    );
  }
}

// ---------------------------------------------------------------------------
// step 1 — which token ids belong to this wallet
// ---------------------------------------------------------------------------

/** The accelerator. Returns null (not an error) whenever it can't be used. */
async function tokenIdsViaAlchemy(address) {
  if (!ALCHEMY_NFT_BASE) return null;
  try {
    const ids = [];
    let pageKey = null;
    // Alchemy pages at 100; loop until it stops handing us a key. The cap is a
    // seatbelt so a bad response can never spin forever.
    for (let page = 0; page < 25; page++) {
      const url =
        `${ALCHEMY_NFT_BASE}/getNFTsForOwner?owner=${address}` +
        `&contractAddresses[]=${CONTRACT_ADDRESS}` +
        `&withMetadata=false&pageSize=100` +
        (pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : "");
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      for (const nft of json.ownedNfts || []) {
        // tokenId arrives as a decimal string; hex is also legal, so be lenient.
        const raw = String(nft.tokenId);
        ids.push(raw.startsWith("0x") ? BigInt(raw) : BigInt(raw));
      }
      pageKey = json.pageKey || null;
      if (!pageKey) break;
    }
    return ids.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  } catch {
    return null; // any trouble at all → fall back to the chain
  }
}

/** The always-works path: ask the contract who owns each id, in one batch. */
async function tokenIdsViaChain(address) {
  const total = await publicClient.readContract({
    ...contract, functionName: "currentTokenId",
  });
  if (total === 0n) return [];

  const calls = [];
  for (let id = 1n; id <= total; id++) {
    calls.push({ ...contract, functionName: "ownerOf", args: [id] });
  }
  // allowFailure so a single odd id can never take the whole page down.
  const owners = await publicClient.multicall({ contracts: calls, allowFailure: true });

  const me = address.toLowerCase();
  const mine = [];
  for (let i = 0; i < owners.length; i++) {
    const who = owners[i].status === "success" ? owners[i].result : null;
    if (who && who.toLowerCase() === me) mine.push(BigInt(i + 1));
  }
  return mine;
}

/**
 * Every token id this wallet owns.
 * @returns {{ ids: bigint[], via: "alchemy"|"chain" }}
 */
export async function listMyTokenIds(address) {
  requireDeployed();
  const fast = await tokenIdsViaAlchemy(address);
  if (fast) return { ids: fast, via: "alchemy" };
  return { ids: await tokenIdsViaChain(address), via: "chain" };
}

// ---------------------------------------------------------------------------
// step 2 — what each of those robots looks like
// ---------------------------------------------------------------------------

/**
 * Picture + build for a list of token ids, in one batched call.
 * @returns {Array<{tokenId: bigint, image: string, config: number[]}>}
 */
export async function loadRobots(ids) {
  if (!ids.length) return [];
  const calls = ids.flatMap((id) => ([
    { ...contract, functionName: "imageURI", args: [id] },
    { ...contract, functionName: "getConfig", args: [id] },
  ]));
  const out = await publicClient.multicall({ contracts: calls, allowFailure: true });

  return ids.map((id, i) => {
    const img = out[i * 2];
    const cfg = out[i * 2 + 1];
    return {
      tokenId: id,
      image: img.status === "success" ? toViewableURL(img.result) : "",
      config: cfg.status === "success" ? Array.from(cfg.result).map(Number) : null,
    };
  }).filter((r) => r.config);
}

/** Everything the detail view shows about one robot. */
export async function loadRobot(tokenId) {
  requireDeployed();
  const id = BigInt(tokenId);
  // v2.8: there is no per-token model any more. The 3D view is a RENDERER
  // PAGE built from rendererURI + the seven config numbers, exactly as
  // tokenURI builds animation_url. modelURIOverride is normally "" and only
  // wins when someone has deliberately pointed one token elsewhere.
  const [owner, image, override, renderer, config] = await publicClient.multicall({
    contracts: [
      { ...contract, functionName: "ownerOf",          args: [id] },
      { ...contract, functionName: "imageURI",         args: [id] },
      { ...contract, functionName: "modelURIOverride", args: [id] },
      { ...contract, functionName: "rendererURI" },
      { ...contract, functionName: "getConfig",        args: [id] },
    ],
    allowFailure: false,
  });

  const cfg = Array.from(config).map(Number);
  const modelRef =
    override && override.length ? override
    : renderer && renderer.length ? `${renderer}?config=${cfg.join(",")}`
    : "";

  // An override MIGHT still be a plain .glb file, so say which kind this is
  // rather than making the UI guess. A page goes in an iframe; a file goes in
  // <model-viewer>. Putting a page into <model-viewer> renders nothing at all.
  const modelIsPage = /\.html(\?|$)/i.test(modelRef) || modelRef.includes("?config=");

  return {
    tokenId: id,
    owner,
    image: toViewableURL(image),
    model: toViewableURL(modelRef),
    modelIsPage,
    config: cfg,
  };
}

/**
 * Turn a 7-id build into readable rows for the detail view.
 * Costs nothing extra — parts.json already holds every name and price.
 */
export async function describeConfig(config) {
  const parts = await loadParts();
  return parts.categories.map((cat, i) => {
    const part = cat.parts.find((p) => p.id === config[i]);
    return {
      category: cat.label,
      categoryIndex: cat.index,
      partId: config[i],
      name: part ? part.name : `Unknown (#${config[i]})`,
      pricePOL: part ? Number(part.pricePOL) : 0,
    };
  });
}

// ---------------------------------------------------------------------------
// step 3 — the wardrobe (plan §6.4)
// ---------------------------------------------------------------------------

/**
 * Which parts has THIS robot ever owned? Once a part is unlocked for a token
 * it stays unlocked forever, so re-equipping it later is free — that is the
 * whole point of the OWNED badge.
 *
 * One batched call for all 149 parts, not 149 calls.
 * @returns {Object<number, Set<number>>} owned[categoryIndex] = Set of part ids
 */
export async function loadWardrobe(tokenId) {
  requireDeployed();
  const parts = await loadParts();
  const id = BigInt(tokenId);

  const calls = [];
  for (const cat of parts.categories) {
    for (const p of cat.parts) {
      calls.push({ ...contract, functionName: "unlocked", args: [id, cat.index, p.id] });
    }
  }
  const results = await publicClient.multicall({ contracts: calls, allowFailure: true });

  const owned = {};
  let i = 0;
  for (const cat of parts.categories) {
    owned[cat.index] = new Set();
    for (const p of cat.parts) {
      const r = results[i++];
      if (r.status === "success" && r.result === true) owned[cat.index].add(p.id);
    }
  }
  return owned;
}
