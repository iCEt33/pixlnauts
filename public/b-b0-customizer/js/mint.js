// js/mint.js — plan §6.3 — the whole mint flow.
//
// The order never changes:
//   ask the contract the price → make + store the two files → get the stamp
//   → send the transaction with EXACTLY the quoted amount → read the token
//   number out of the receipt.
//
// The price is never computed here. Decision #9: the contract is the only
// thing allowed to say what a build costs.

import { parseEventLogs } from "https://esm.sh/viem@2.37.5";
import { API, IS_DEPLOYED } from "./chain-config.js";
import { publicClient, walletClient, account, contract, connectWallet, ensureChain } from "./wallet.js";

// ---- glue to the customizer — resolved in Phase 0 by mint-adapter.js ----
// mint-adapter.js is a classic script loaded before this module, so window.BB0
// is guaranteed to exist by the time anything here runs. None of the original
// nine customizer files were modified.
function getCurrentConfigArray() {
  return window.BB0.getConfigArray();        // colliding accessories report as 0 ("None")
}
async function getSnapshotBlob() {
  return await window.BB0.getSnapshotBlob(); // standardized pose, same as the Snapshot button
}
async function getMergedGlbBlob() {
  return await window.BB0.getMergedGlbBlob(); // the merged GLB loader.js already produces
}
// -------------------------------------------------------------------------

async function readError(res, fallback) {
  try {
    const j = await res.json();
    return j.error || fallback;
  } catch {
    return fallback;
  }
}

async function uploadFile(blob, name, type) {
  const res = await fetch(
    `${API}/api/upload?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
    { method: "POST", body: blob }
  );
  if (!res.ok) throw new Error(await readError(res, "Upload failed"));
  return (await res.json()).uri; // "ipfs://…" or "ar://…" — we never care which
}

/**
 * Mint whatever the customizer is currently showing.
 * @param {string}   promoCode  optional, "" for none
 * @param {function} onStatus   called with a short human sentence at each step
 * @returns {{tokenId: bigint, hash: string}}
 */
export async function mintCurrentRobot(promoCode = "", onStatus = console.log) {
  if (!IS_DEPLOYED) {
    throw new Error(
      "The contract isn't deployed yet. This happens in Phase 4 — then " +
      "CONTRACT_ADDRESS goes into js/chain-config.js and this button goes live."
    );
  }
  if (!account) await connectWallet();
  // Confirm the network here rather than at connect time — a wallet that
  // can't add an unknown testnet should still be able to connect and look.
  await ensureChain();
  if (window.BB0.isBusy()) {
    throw new Error("Hold on — the robot is still updating. Try again in a second.");
  }

  const cfg = getCurrentConfigArray();

  // 0. Refuse early if the batch is sold out or minting is paused, so nobody
  //    uploads files and pays gas just to be rejected by the contract.
  const open = await publicClient.readContract({ ...contract, functionName: "isMintOpen" });
  if (!open) throw new Error("Minting is closed right now (batch sold out or paused).");

  // 1. Ask the contract for the EXACT price. This is the number we pay. Nothing else.
  onStatus("Checking price…");
  const [finalPrice, promoOk] = await publicClient.readContract({
    ...contract, functionName: "quoteMint", args: [cfg, promoCode, account],
  });
  if (promoCode && !promoOk) {
    throw new Error("That promo code can't be used (invalid, used up, or wallet limit reached).");
  }

  // 2. Produce and store the two files
  onStatus("Rendering your B-b0…");
  const png = await getSnapshotBlob();
  const glb = await getMergedGlbBlob();
  onStatus("Storing files…");
  const imageURI = await uploadFile(png, "preview.png", "image/png");
  const modelURI = await uploadFile(glb, "robot.glb", "model/gltf-binary");

  // 3. Get the stamp binding files ↔ parts ↔ this wallet, for 10 minutes
  onStatus("Stamping…");
  const stampRes = await fetch(`${API}/api/stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mint", tokenId: 0, wallet: account, config: cfg, imageURI, modelURI }),
  });
  if (!stampRes.ok) throw new Error(await readError(stampRes, "Stamping failed"));
  const { stamp, deadline } = await stampRes.json();

  // 4. Mint — attach exactly the quoted amount
  onStatus("Confirm in your wallet…");
  const hash = await walletClient.writeContract({
    ...contract,
    functionName: "mint",
    args: [cfg, imageURI, modelURI, BigInt(deadline), stamp, promoCode],
    value: finalPrice,
  });

  // 5. Wait, then read the number the CONTRACT assigned — the first moment
  //    anyone, including this website, knows it.
  onStatus("Waiting for the network…");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("The transaction was reverted by the network.");
  }
  const [minted] = parseEventLogs({ abi: contract.abi, logs: receipt.logs, eventName: "TokenMinted" });
  const tokenId = minted.args.tokenId;

  onStatus(`Minted! Say hello to B-b0 #${tokenId}`);
  return { tokenId, hash };
}

/** Read-only promo check for the "Check code" button — costs nothing, signs nothing. */
export async function checkPromo(code, wallet) {
  const [valid, discountPercent, remainingGlobal, remainingForWallet] =
    await publicClient.readContract({
      ...contract, functionName: "checkPromoCode", args: [code, wallet],
    });
  return { valid, discountPercent, remainingGlobal, remainingForWallet };
}

/** Batch counters for the "N of 100 left in this batch" line. */
export async function mintStatus() {
  const [minted, max, batch, available, open] = await Promise.all([
    publicClient.readContract({ ...contract, functionName: "currentTokenId" }),
    publicClient.readContract({ ...contract, functionName: "maxSupply" }),
    publicClient.readContract({ ...contract, functionName: "currentBatch" }),
    publicClient.readContract({ ...contract, functionName: "availableInCurrentBatch" }),
    publicClient.readContract({ ...contract, functionName: "isMintOpen" }),
  ]);
  return { minted, max, batch, available, open };
}
