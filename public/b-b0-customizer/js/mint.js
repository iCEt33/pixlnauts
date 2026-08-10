// js/mint.js — plan §6.3 — the whole mint flow.
//
// The order never changes:
//   ask the contract the price → render + SIGN the picture (not uploaded yet)
//   → get the stamp → send the transaction → upload the already-signed file
//   → read the token number out of the receipt.
//
// v2.8: the upload happens AFTER the wallet confirms. Cancel at the prompt and
// nothing was stored, because nothing needed to be. The address is known in
// advance because an Arweave data item's id is the hash of its signature —
// signing it is what produces the address, and uploading is a separate step.
//
// There is only ONE file now. The 3D model is derived from the seven config
// numbers by the renderer, so nothing about it is uploaded or stored.
//
// The price is never computed here. Decision #9: the contract is the only
// thing allowed to say what a build costs.

import { parseEventLogs, formatEther } from "https://esm.sh/viem@2.37.5";
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
// getMergedGlbBlob() is deliberately NOT used any more — see the header.
// -------------------------------------------------------------------------

async function readError(res, fallback) {
  try {
    const j = await res.json();
    return j.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Step one of two. The server SIGNS a data item and returns its address plus
 * the signed bytes. NOTHING is stored yet and nothing has been paid for.
 * @returns {{uri: string, item: string|null}} item is base64, null on Pinata
 */
async function prepareUpload(blob, name, type) {
  const res = await fetch(
    `${API}/api/upload?mode=prepare&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}` +
    `&action=mint&wallet=${encodeURIComponent(account || "")}`,
    { method: "POST", body: blob }
  );
  if (!res.ok) throw new Error(await readError(res, "Upload failed"));
  return await res.json();   // { uri, item }
}

/**
 * Step two. Hands the SAME signed bytes back to be stored. The address cannot
 * drift, because these are the exact bytes whose signature produced it.
 * Only called once the mint has confirmed on-chain.
 */
async function commitUpload(item, tokenId, uri) {
  const res = await fetch(`${API}/api/upload?mode=commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, tokenId: Number(tokenId), uri }),
  });
  if (!res.ok) throw new Error(await readError(res, "Storing the picture failed"));
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
    throw new Error("Hold on! The robot is still updating. Try again in a second.");
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

  // 2. Render the picture and have it SIGNED — not stored. This is the whole
  //    ordering fix: we learn the permanent address without paying for it, so
  //    a cancelled mint at step 4 costs nothing.
  onStatus("Rendering your B-b0…");
  const png = await getSnapshotBlob();
  onStatus("Preparing…");
  const { uri: imageURI, item } = await prepareUpload(png, "preview.png", "image/png");

  // 3. Get the stamp binding file ↔ parts ↔ this wallet, for 10 minutes
  onStatus("Stamping…");
  const stampRes = await fetch(`${API}/api/stamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mint", tokenId: 0, wallet: account, config: cfg, imageURI }),
  });
  if (!stampRes.ok) throw new Error(await readError(stampRes, "Stamping failed"));
  const { stamp, deadline } = await stampRes.json();

  // 4. Mint — attach exactly the quoted amount
  onStatus("Confirm in your wallet…");
  const hash = await walletClient.writeContract({
    ...contract,
    functionName: "mint",
    args: [cfg, imageURI, BigInt(deadline), stamp, promoCode],
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

  // 6. NOW store the picture. The robot already exists and its 3D model
  //    already works — animation_url is built from the config, so nothing was
  //    waiting on this. Only the thumbnail is.
  //
  //    If this fails the token is still valid and still renders; the picture
  //    can be attached later. That is why it does not throw: a stored robot
  //    with a missing thumbnail is a far better outcome than an error thrown
  //    at someone who has already paid.
  let imageStored = true;
  if (item) {
    try {
      onStatus("Storing your picture…");
      await commitUpload(item, tokenId, imageURI);
    } catch (e) {
      imageStored = false;
      console.error("commitUpload failed - token is fine, thumbnail is missing:", e);
    }
  }

  onStatus(
    imageStored
      ? `Minted! Say hello to B-b0 #${tokenId}`
      : `Minted B-b0 #${tokenId}! The picture is still uploading - it will appear shortly.`
  );
  return { tokenId, hash, imageStored };
}

/**
 * What does this build cost according to the CONTRACT, with this code applied?
 * Read-only, signs nothing, costs nothing. Pass "" for no code.
 *
 * Decision #9: the contract is the only thing allowed to say what a build
 * costs. The panel must never work a discount out in JavaScript.
 */
export async function quoteMintFor(promoCode = "", wallet) {
  const cfg = getCurrentConfigArray();
  const [finalPrice, promoOk] = await publicClient.readContract({
    ...contract, functionName: "quoteMint", args: [cfg, promoCode, wallet],
  });
  return { wei: finalPrice, pol: Number(formatEther(finalPrice)), promoOk };
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
