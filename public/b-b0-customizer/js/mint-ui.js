// js/mint-ui.js — the visible half of the mint flow.
//
// This file OWNS no logic about money or the chain — it only draws things and
// calls into mint.js. It adds itself to the page at runtime, so none of your
// nine original customizer files are modified.
//
// It puts a MINT button in the same left-hand column main.js builds for
// Snapshot / Export GLB / Reset, and opens a panel styled to match the
// customizer's terminal look.

import { mintCurrentRobot, checkPromo, mintStatus, quoteMintFor } from "./mint.js";
import {
  account, activeWallet, chainOk, connectWallet, onWalletChange,
  listWallets, forgetWallet, ensureChain,
} from "./wallet.js";
import { IS_DEPLOYED, CHAIN, txURL, openSeaURL } from "./chain-config.js";

// --------------------------------------------------------------------------
// small helpers
// --------------------------------------------------------------------------
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const $ = (sel) => document.querySelector(sel);

// main.js builds .buttons-side inside its own DOMContentLoaded handler, so it
// may not exist the instant this module runs. Wait for it rather than guess.
function waitFor(selector, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const found = $(selector);
    if (found) return resolve(found);
    const started = Date.now();
    const timer = setInterval(() => {
      const node = $(selector);
      if (node || Date.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(node || null);
      }
    }, 100);
  });
}

// parts.json sits next to index.html. NOTE the "./" — a bare "/parts.json"
// would look at the site root, where the file does not live.
let PARTS = null;
async function loadParts() {
  if (PARTS) return PARTS;
  const res = await fetch("./parts.json");
  if (!res.ok) throw new Error("Could not load parts.json");
  PARTS = await res.json();
  return PARTS;
}

const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");

// The customizer's own globals, read defensively — `typeof` on an undeclared
// name is safe, so this cannot throw even if a file is missing.
function collidingMap() {
  try {
    return typeof collidingAccessories === "undefined" ? {} : collidingAccessories;
  } catch { return {}; }
}
function selectionsMap() {
  try {
    return typeof currentSelections === "undefined" ? {} : currentSelections;
  } catch { return {}; }
}

// --------------------------------------------------------------------------
// the build summary (display only — the contract sets the real price)
// --------------------------------------------------------------------------
const ACCESSORY_KEYS = { 4: "clothes", 5: "face", 6: "head" };

async function describeBuild() {
  const parts = await loadParts();
  const cfg = window.BB0.getConfigArray();
  const colliding = collidingMap();
  const selections = selectionsMap();
  const rows = [];
  let total = 0;

  parts.categories.forEach((cat, i) => {
    const part = cat.parts.find((p) => p.id === cfg[i]);
    if (!part) return;
    total += Number(part.pricePOL);

    // Was something chosen but dropped because it collides? Say so plainly.
    let note = "";
    const subKey = ACCESSORY_KEYS[i];
    if (subKey && colliding[subKey] && selections[`accessories-${subKey}`] > 0) {
      note = "not minted — it collides";
    }
    rows.push({ label: cat.label, name: part.name, price: part.pricePOL, note });
  });

  return { cfg, rows, total };
}

// --------------------------------------------------------------------------
// the panel
// --------------------------------------------------------------------------
let panel, statusLine, mintBtn, promoInput, promoNote, walletLine, buildList,
    totalLine, batchLine, resultBox, busy = false;

function buildPanel() {
  panel = el("div", "bb0-mint-overlay");
  panel.innerHTML = `
    <div class="bb0-mint-panel" role="dialog" aria-label="Mint your B-b0">
      <button class="bb0-close" title="Close">×</button>
      <h2 class="bb0-title">MINT YOUR B-b0</h2>
      <div class="bb0-batch"></div>
      ${IS_DEPLOYED ? "" : `<div class="bb0-warn">
        Contract not deployed yet — this is Phase 4. The button below stays off
        until an address is filled into <code>js/chain-config.js</code>.
      </div>`}
      <div class="bb0-build"></div>
      <div class="bb0-total"></div>
      <div class="bb0-promo">
        <input class="bb0-promo-input" type="text" placeholder="PROMO CODE (optional)" autocomplete="off">
        <button class="bb0-promo-check">Check</button>
      </div>
      <div class="bb0-promo-note"></div>
      <div class="bb0-wallet"></div>
      <button class="bb0-mint-go">MINT THIS B-b0</button>
      <div class="bb0-status"></div>
      <div class="bb0-result"></div>
      <div class="bb0-fineprint">
        The price is calculated by the contract itself.
        ${CHAIN.testnet
          ? `You also pay a network fee — free test POL on ${CHAIN.name}.`
          : `You also pay the network's gas fee.`}
      </div>
    </div>`;
  document.body.appendChild(panel);

  buildList   = panel.querySelector(".bb0-build");
  totalLine   = panel.querySelector(".bb0-total");
  batchLine   = panel.querySelector(".bb0-batch");
  promoInput  = panel.querySelector(".bb0-promo-input");
  promoNote   = panel.querySelector(".bb0-promo-note");
  walletLine  = panel.querySelector(".bb0-wallet");
  mintBtn     = panel.querySelector(".bb0-mint-go");
  statusLine  = panel.querySelector(".bb0-status");
  resultBox   = panel.querySelector(".bb0-result");

  panel.querySelector(".bb0-close").onclick = closePanel;
  panel.addEventListener("click", (e) => { if (e.target === panel && !busy) closePanel(); });
  panel.querySelector(".bb0-promo-check").onclick = onCheckPromo;
  mintBtn.onclick = onMint;

  onWalletChange(drawWallet);
}

function drawWallet() {
  if (!walletLine) return;
  walletLine.innerHTML = "";

  if (account) {
    const who = activeWallet?.name ? `${activeWallet.name} · ` : "";
    walletLine.append(el("span", "bb0-ok", `${who}${shortAddr(account)}`));

    // One action, not two: forgetting and re-picking reopens the wallet's own
    // account chooser as well, so this covers "wrong wallet" AND "wrong account".
    const swap = el("button", "bb0-link", "Switch wallet");
    swap.onclick = async () => {
      await forgetWallet();
      showWalletPicker(true);
    };
    walletLine.append(swap);

    if (!chainOk) {
      const row = el("div", "bb0-network-warn");
      row.append(el("span", null, `Wallet is not on ${CHAIN.name}. `));
      const fix = el("button", "bb0-link", `Switch to ${CHAIN.name}`);
      fix.onclick = async () => {
        setStatus("");
        try { await ensureChain(); }
        catch (e) { setStatus(e.message, "bad"); }
      };
      row.append(fix);
      walletLine.append(row);
    }
    return;
  }

  const b = el("button", "bb0-connect", "Connect wallet");
  b.onclick = tryConnect;
  walletLine.append(b);
}

// Connect straight away when there is no real choice to make; otherwise ask.
async function tryConnect() {
  try {
    await connectWallet();
    setStatus("");
  } catch (e) {
    if (e.code === "CHOOSE_WALLET") return showWalletPicker();
    setStatus(e.message, "bad");
  }
}

// The picker. Every installed wallet answers with its own name and icon, so
// choosing MetaMask genuinely gives you MetaMask.
async function showWalletPicker(forceAccountPicker = false) {
  walletLine.innerHTML = "";
  const box = el("div", "bb0-wallet-list", '<div class="bb0-wallet-head">Choose a wallet</div>');
  walletLine.append(box);

  const wallets = await listWallets();
  if (!wallets.length) {
    box.append(el("div", "bb0-bad", "No wallet extension found. Install MetaMask, then reload."));
    return;
  }

  wallets.forEach((w) => {
    const row = el("button", "bb0-wallet-option");
    if (w.icon) {
      const img = document.createElement("img");
      img.src = w.icon;
      img.alt = "";
      img.className = "bb0-wallet-icon";
      row.append(img);
    }
    row.append(el("span", null, w.name));
    row.onclick = async () => {
      box.querySelectorAll("button").forEach((x) => (x.disabled = true));
      setStatus(`Opening ${w.name}…`);
      try {
        await connectWallet(w.rdns, { forceAccountPicker });
        setStatus("");
      } catch (e) {
        if (e.code !== "CANCELLED") setStatus(e.message, "bad");
        drawWallet();
      }
    };
    box.append(row);
  });

  const cancel = el("button", "bb0-link", "Cancel");
  cancel.onclick = drawWallet;
  box.append(cancel);
}

async function drawBuild() {
  const { rows, total } = await describeBuild();
  buildList.innerHTML = rows.map((r) => `
    <div class="bb0-row${r.note ? " bb0-row-muted" : ""}">
      <span class="bb0-cat">${r.label}</span>
      <span class="bb0-name">${r.name}${r.note ? ` <em>(${r.note})</em>` : ""}</span>
      <span class="bb0-price">${Number(r.price).toFixed(2)}</span>
    </div>`).join("");
  totalLine.innerHTML =
    `<div class="bb0-total-row"><span>ESTIMATED TOTAL</span><span>${total.toFixed(2)} POL</span></div>`;
}

async function drawBatch() {
  if (!IS_DEPLOYED) { batchLine.textContent = ""; return; }
  try {
    const s = await mintStatus();
    batchLine.textContent = s.open
      ? `Batch #${s.batch} · ${s.available} still available`
      : "Minting is closed right now.";
    if (!s.open) mintBtn.disabled = true;
  } catch {
    batchLine.textContent = "";
  }
}

function setStatus(msg, kind = "") {
  statusLine.className = "bb0-status" + (kind ? " bb0-" + kind : "");
  statusLine.textContent = msg || "";
}

// Put the total block back to the plain estimate — no code, or a rejected one.
function resetTotal() {
  drawBuild().catch(() => {});
}

// The revised total after a VALID code. BOTH numbers are quoteMint reads, and
// the discount is the difference between them — never a percentage applied in
// JavaScript (Decision #9).
async function drawDiscount(code, percent) {
  const full = await quoteMintFor("", account);
  const now  = await quoteMintFor(code, account);
  const saved = full.pol - now.pol;
  totalLine.innerHTML = `
    <div class="bb0-total-row"><span>ESTIMATED TOTAL</span><span>${full.pol.toFixed(2)} POL</span></div>
    <div class="bb0-total-row bb0-discount"><span>Discount (${percent}%)</span><span>-${saved.toFixed(2)} POL</span></div>
    <div class="bb0-total-row"><span>YOU PAY</span><span>${now.pol.toFixed(2)} POL</span></div>`;
}

async function onCheckPromo() {
  const code = promoInput.value.trim().toUpperCase();
  promoInput.value = code;
  promoNote.className = "bb0-promo-note";
  if (!code) { promoNote.textContent = ""; resetTotal(); return; }
  if (!IS_DEPLOYED) {
    promoNote.textContent = "Can't check codes until the contract is deployed.";
    return;
  }
  if (!account) {
    promoNote.textContent = "Connect your wallet first, codes are counted per wallet.";
    return;
  }
  promoNote.textContent = "Checking…";
  try {
    const r = await checkPromo(code, account);
    if (r.valid) {
      promoNote.className = "bb0-promo-note bb0-ok";
      promoNote.textContent =
        `${r.discountPercent}% off · ${r.remainingForWallet} use(s) left for you`;
      await drawDiscount(code, r.discountPercent);          // ← ADD THIS
    } else {
      promoNote.className = "bb0-promo-note bb0-bad";
      promoNote.textContent = "That code isn't usable (invalid, used up, or wallet limit reached).";
      resetTotal();
    }
  } catch (e) {
    promoNote.className = "bb0-promo-note bb0-bad";
    promoNote.textContent = "Couldn't check that code right now.";
    resetTotal(); 
  }
}

async function onMint() {
  if (busy) return;
  busy = true;
  mintBtn.disabled = true;
  resultBox.innerHTML = "";
  try {
    // v2.8 returns a THIRD value. The robot is minted and its 3D model works
    // the moment the transaction confirms — animation_url is built from the
    // config, so nothing was waiting on an upload. Only the thumbnail is, and
    // it is stored AFTER the mint. If that step fails the token is still
    // perfectly valid, so say so plainly instead of showing a bare success.
    const { tokenId, hash, imageStored } = await mintCurrentRobot(
      promoInput.value.trim().toUpperCase(),
      (m) => setStatus(m)
    );
    setStatus("");
    resultBox.innerHTML = `
      <div class="bb0-success">
        <div class="bb0-success-title">B-b0 #${tokenId} is yours.</div>
        <a href="${txURL(hash)}" target="_blank" rel="noopener">View the transaction</a>
        <a href="${openSeaURL(tokenId)}" target="_blank" rel="noopener">See it on OpenSea</a>
        <div class="bb0-fineprint">
          ${imageStored === false
            ? "Your robot is minted and safe, and its 3D model already works. " +
              "The picture did not finish uploading — it can be attached later, " +
              "so nothing is lost. Let us know the number above."
            : "The picture can take a minute to appear on marketplaces."}
        </div>
      </div>`;
    // The mint is done — a live MINT button under a success panel reads as if
    // it didn't work. Reopening the panel brings the button back (openPanel).
    mintBtn.style.display = "none";
    drawBatch();
    // The code has just been spent once. Re-read it so the "N use(s) left"
    // line reflects the chain rather than the count from before the mint.
    onCheckPromo();
  } catch (e) {
    // Two wallet extensions installed and none chosen yet: wallet.js refuses
    // to guess and throws CHOOSE_WALLET. Open the picker this file already
    // has, instead of printing the code as a dead-end error.
    if (e.code === "CHOOSE_WALLET") {
      setStatus("Pick which wallet to mint from, then press MINT again.");
      showWalletPicker();
    } else {
      // viem puts the useful sentence in shortMessage; the contract's own
      // reasons ("Current batch sold out", "Bad stamp") arrive there too.
      setStatus(e.shortMessage || e.message || "Something went wrong.", "bad");
    }
  } finally {
    busy = false;
    mintBtn.disabled = !IS_DEPLOYED;
  }
}

async function openPanel() {
  if (!panel) buildPanel();
  panel.classList.add("bb0-open");
  setStatus("");
  resultBox.innerHTML = "";
  mintBtn.style.display = "";
  mintBtn.disabled = !IS_DEPLOYED;
  drawWallet();
  try {
    await drawBuild();
  } catch (e) {
    buildList.innerHTML = `<div class="bb0-bad">Could not read parts.json — is it in the customizer folder?</div>`;
  }
  drawBatch();
}

function closePanel() {
  if (panel) panel.classList.remove("bb0-open");
}

// --------------------------------------------------------------------------
// the button under the price panel
// --------------------------------------------------------------------------
async function addMintButton() {
  const pricePanel = await waitFor(".price-panel");
  if (!pricePanel) {
    console.warn("[mint-ui] .price-panel never appeared — Mint button not added.");
    return;
  }

  const btn = el("button", "bb0-mint-bar", "MINT B-b0");
  btn.id = "mint-side";
  btn.onclick = openPanel;
  // sits directly under the TOTAL line, matching the panel's width
  pricePanel.insertAdjacentElement("afterend", btn);

  // Grey the button out while models are merging or a collision check is
  // still deciding — minting mid-update could commit a build that is about
  // to change (plan §7: isBusy guards the mint button).
  setInterval(() => {
    let b = false;
    try { b = window.BB0?.isBusy?.() === true; } catch { b = false; }
    btn.disabled = b;
    btn.title = b ? "Still updating your robot…" : "Mint this build as an NFT";
  }, 250);
}

addMintButton();
