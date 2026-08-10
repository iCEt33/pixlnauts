// js/upgrade.js — plan §6.4 — changing the parts on a robot you already own.
//
// v2.8: the same ordering fix as mint.js. The picture is signed before the
// wallet prompt and uploaded only after the transaction confirms, so a
// cancelled upgrade stores nothing. And no GLB is produced at all -- the
// renderer rebuilds the model from the new config the moment it lands, which
// is why an upgrade now needs no model upload whatsoever.
//
// It is mint.js with four substitutions, and nothing else:
//   * the price comes from quoteUpgrade(tokenId, cfg) instead of quoteMint
//   * the stamp says action "upgrade" and carries the real token number
//   * the write call is upgrade(...) instead of mint(...)
//   * success is read from the TokenUpgraded event instead of TokenMinted
//
// THE RULE THAT MAKES UPGRADES CHEAP: the contract charges only for parts this
// robot has NEVER owned. Every part it has ever worn stays in its wardrobe
// forever, so putting an old part back on costs nothing but the network fee.
// A build with no changes at all is refused outright ("No changes").
//
// As in mint.js, the price is never computed here. The contract is the only
// thing allowed to say what something costs (Decision #9).

import { parseEventLogs } from "https://esm.sh/viem@2.37.5";
import { API, IS_DEPLOYED } from "./chain-config.js";
import {
  publicClient, walletClient, account, contract, connectWallet, ensureChain,
} from "./wallet.js";

async function readError(res, fallback) {
  try {
    const j = await res.json();
    return j.error || fallback;
  } catch {
    return fallback;
  }
}

// Signs the picture without storing it, and returns its permanent address.
async function prepareUpload(blob, name, type) {
  const res = await fetch(
    `${API}/api/upload?mode=prepare&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}` +
    `&action=upgrade&wallet=${encodeURIComponent(account || "")}`,
    { method: "POST", body: blob }
  );
  if (!res.ok) throw new Error(await readError(res, "Upload failed"));
  return await res.json();   // { uri, item }
}

// Stores the SAME signed bytes, once the chain says this token points at them.
async function commitUpload(item, tokenId, uri) {
  const res = await fetch(`${API}/api/upload?mode=commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, tokenId: Number(tokenId), uri }),
  });
  if (!res.ok) throw new Error(await readError(res, "Storing the picture failed"));
}

/** True when two 7-part builds are identical — the contract refuses that case. */
export function sameConfig(a, b) {
  if (!a || !b) return false;
  for (let i = 0; i < 7; i++) if (Number(a[i]) !== Number(b[i])) return false;
  return true;
}

/**
 * What would this change cost? Read-only, signs nothing, costs nothing.
 * Returns wei as a bigint. 0 means a free swap between parts already owned.
 */
export async function quoteUpgradeFor(tokenId, cfg) {
  return await publicClient.readContract({
    ...contract, functionName: "quoteUpgrade", args: [BigInt(tokenId), cfg],
  });
}

/**
 * Apply whatever the customizer is currently showing to a robot you own.
 * The robot keeps its number: #7 stays #7 forever. Its parts, its picture and
 * its 3D model are replaced in place.
 *
 * @param {number|bigint} tokenId
 * @param {function} onStatus  called with a short human sentence at each step
 * @returns {{tokenId: bigint, hash: string, cost: bigint}}
 */
export async function upgradeRobot(tokenId, onStatus = console.log) {
  if (!IS_DEPLOYED) {
    throw new Error(
      "The contract isn't deployed yet. This happens in Phase 4 — then " +
      "CONTRACT_ADDRESS goes into js/chain-config.js and this button goes live."
    );
  }
  if (!account) await connectWallet();
  await ensureChain();
  if (window.BB0.isBusy()) {
    throw new Error("Hold on — the robot is still updating. Try again in a second.");
  }

  const id = BigInt(tokenId);
  const cfg = window.BB0.getConfigArray();

  // 0. Fail early and clearly rather than letting the wallet show a raw revert.
  const currentOwner = await publicClient.readContract({
    ...contract, functionName: "ownerOf", args: [id],
  });
  if (currentOwner.toLowerCase() !== account.toLowerCase()) {
    throw new Error(`B-b0 #${id} isn't in this wallet any more.`);
  }
  const onChain = await publicClient.readContract({
    ...contract, functionName: "getConfig", args: [id],
  });
  if (sameConfig(cfg, Array.from(onChain).map(Number))) {
    throw new Error("Nothing has changed — pick a different part first.");
  }

  // 1. Ask the contract for the EXACT cost. This is the number we pay.
  onStatus("Checking what's changed…");
  const cost = await quoteUpgradeFor(id, cfg);

  // 2. Render the new picture and have it SIGNED — not stored. No model is
  //    produced: animation_url is built from the config, so the 3D view
  //    follows the upgrade by itself.
  onStatus("Rendering your B-b0…");
  const png = await window.BB0.getSnapshotBlob();
  onStatus("Preparing…");
  const { uri: imageURI, item } = await prepareUpload(png, "preview.png", "image/png");

  // 3. The stamp, binding files ↔ parts ↔ this wallet ↔ THIS token.
  onStatus("Stamping…");
  const stampRes = await fetch(`${API}/api/stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upgrade", tokenId: Number(id), wallet: account,
      config: cfg, imageURI,
    }),
  });
  if (!stampRes.ok) throw new Error(await readError(stampRes, "Stamping failed"));
  const { stamp, deadline } = await stampRes.json();

  // 4. Send it, attaching exactly the quoted cost (0 for a free swap).
  onStatus(cost === 0n ? "Free swap — confirm in your wallet…" : "Confirm in your wallet…");
  const hash = await walletClient.writeContract({
    ...contract,
    functionName: "upgrade",
    args: [id, cfg, imageURI, BigInt(deadline), stamp],
    value: cost,
  });

  onStatus("Waiting for the network…");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("The transaction was reverted by the network.");
  }
  const [ev] = parseEventLogs({
    abi: contract.abi, logs: receipt.logs, eventName: "TokenUpgraded",
  });
  const pricePaid = ev ? ev.args.pricePaid : cost;

  // 5. Now store the new picture. The robot's 3D model already shows the new
  //    build — only the thumbnail is outstanding, so a failure here is not
  //    worth throwing at someone who has already paid.
  let imageStored = true;
  if (item) {
    try {
      onStatus("Storing your picture…");
      await commitUpload(item, id, imageURI);
    } catch (e) {
      imageStored = false;
      console.error("commitUpload failed - the upgrade is fine, the thumbnail is missing:", e);
    }
  }

  onStatus(
    imageStored
      ? `Done — B-b0 #${id} has been rebuilt.`
      : `Done — B-b0 #${id} has been rebuilt. The new picture is still uploading.`
  );
  return { tokenId: id, hash, cost: pricePaid, imageStored };
}
