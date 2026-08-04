// js/collection-ui.js — the visible half of My Collection and the upgrade flow.
//
// Like mint-ui.js, this file owns no logic about money or the chain. It draws
// things and calls into collection.js / upgrade.js. It adds itself to the page
// at runtime, so none of the original customizer files are modified.
//
// THREE PIECES:
//
//  1. A MY COLLECTION button, top-RIGHT, in a shared vertical stack. Anything
//     we add later (the admin panel) drops into the same stack underneath it
//     rather than choosing its own corner. The site's RETURN TO PIXLNAUTS
//     button is drawn by the React app OUTSIDE this iframe, so we cannot reuse
//     its CSS class — collection.css copies its look on purpose.
//
//  2. A panel: the robots this wallet owns, and a detail view for one of them.
//
//  3. UPGRADE MODE. Not a modal — the whole customizer becomes the upgrade
//     screen, because the carousels are the thing you need to touch. The green
//     MINT bar is swapped for an upgrade bar, and every carousel grows a tag
//     showing whether the part in front of you is EQUIPPED, already OWNED
//     (free), or new (costs money).

import {
  listMyTokenIds, loadRobots, loadRobot, loadWardrobe, describeConfig, loadParts,
} from "./collection.js";
import { upgradeRobot, sameConfig } from "./upgrade.js";
import {
  account, activeWallet, connectWallet, onWalletChange, listWallets, forgetWallet,
} from "./wallet.js";
import { IS_DEPLOYED, CHAIN, txURL, openSeaURL, addressURL } from "./chain-config.js";

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const $ = (sel) => document.querySelector(sel);
const shortAddr = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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

// The customizer's own state, handed over explicitly by mint-adapter.js rather
// than reached for by bare name. Both work in a browser; only this one can be
// tested outside of one.
function collidingMap() {
  try { return window.BB0?.getCollisions?.() || {}; } catch { return {}; }
}
function selectionsMap() {
  try { return window.BB0?.getSelections?.() || {}; } catch { return {}; }
}

// Category index → the key the customizer uses for its accessory carousels.
const ACCESSORY_KEYS = { 4: "clothes", 5: "face", 6: "head" };
// Category index → the data-category attribute on the carousel in index.html.
const CAROUSEL_KEYS = [
  "body", "face", "screen", "specs",
  "accessories-clothes", "accessories-face", "accessories-head",
];

// --------------------------------------------------------------------------
// state
// --------------------------------------------------------------------------
let panel, panelBody, walletLine, statusLine;
let view = "grid";              // "grid" | "detail"
let detailToken = null;
let busy = false;

// upgrade mode
let upgrade = null;             // { tokenId, onChainConfig, wardrobe, parts }
let upgradeBar = null;
let tagPoll = null;

// --------------------------------------------------------------------------
// the panel shell
// --------------------------------------------------------------------------
function buildPanel() {
  panel = el("div", "bb0-col-overlay");
  panel.innerHTML = `
    <div class="bb0-col-panel" role="dialog" aria-label="My B-b0 collection">
      <button class="bb0-col-close" title="Close">×</button>
      <h2 class="bb0-col-title">MY COLLECTION</h2>
      ${IS_DEPLOYED ? "" : `<div class="bb0-warn">
        Contract not deployed yet — this is Phase 4. Once an address is filled
        into <code>js/chain-config.js</code>, your robots appear here.
      </div>`}
      <div class="bb0-col-wallet"></div>
      <div class="bb0-col-status"></div>
      <div class="bb0-col-body"></div>
    </div>`;
  document.body.appendChild(panel);

  walletLine = panel.querySelector(".bb0-col-wallet");
  statusLine = panel.querySelector(".bb0-col-status");
  panelBody  = panel.querySelector(".bb0-col-body");

  panel.querySelector(".bb0-col-close").onclick = closePanel;
  panel.addEventListener("click", (e) => { if (e.target === panel && !busy) closePanel(); });

  // Redraw whenever the wallet changes underneath us — a different account
  // owns different robots.
  onWalletChange(() => {
    if (!panel.classList.contains("bb0-open")) return;
    drawWallet();
    if (view === "grid") drawGrid();
  });
}

function setStatus(msg, kind = "") {
  if (!statusLine) return;
  statusLine.className = "bb0-col-status" + (kind ? " bb0-" + kind : "");
  statusLine.textContent = msg || "";
}

// --------------------------------------------------------------------------
// wallet section — same behaviour as the mint panel: never guess which wallet
// --------------------------------------------------------------------------
function drawWallet() {
  if (!walletLine) return;
  walletLine.innerHTML = "";

  if (account) {
    const who = activeWallet?.name ? `${activeWallet.name} · ` : "";
    walletLine.append(el("span", "bb0-ok", `${who}${shortAddr(account)}`));
    const swap = el("button", "bb0-link", "Switch wallet");
    swap.onclick = async () => { await forgetWallet(); showWalletPicker(true); };
    walletLine.append(swap);
    return;
  }
  const b = el("button", "bb0-connect", "Connect wallet to see your B-b0s");
  b.onclick = tryConnect;
  walletLine.append(b);
}

async function tryConnect() {
  try {
    await connectWallet();
    setStatus("");
    drawGrid();
  } catch (e) {
    if (e.code === "CHOOSE_WALLET") return showWalletPicker();
    setStatus(e.message, "bad");
  }
}

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
      img.src = w.icon; img.alt = ""; img.className = "bb0-wallet-icon";
      row.append(img);
    }
    row.append(el("span", null, w.name));
    row.onclick = async () => {
      box.querySelectorAll("button").forEach((x) => (x.disabled = true));
      setStatus(`Opening ${w.name}…`);
      try {
        await connectWallet(w.rdns, { forceAccountPicker });
        setStatus("");
        drawWallet();
        drawGrid();
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

// --------------------------------------------------------------------------
// the grid of robots
// --------------------------------------------------------------------------
async function drawGrid() {
  view = "grid";
  detailToken = null;
  panel.querySelector(".bb0-col-title").textContent = "MY COLLECTION";

  if (!IS_DEPLOYED) { panelBody.innerHTML = ""; return; }
  if (!account) {
    panelBody.innerHTML = `<div class="bb0-col-empty">Connect a wallet above to see the B-b0s it owns.</div>`;
    return;
  }

  panelBody.innerHTML = `<div class="bb0-col-empty">Looking up your B-b0s…</div>`;
  try {
    const { ids } = await listMyTokenIds(account);
    if (!ids.length) {
      panelBody.innerHTML = `
        <div class="bb0-col-empty">
          No B-b0s in this wallet yet.<br>
          <span class="bb0-fineprint">Build one in the customizer and press MINT B-b0.</span>
        </div>`;
      return;
    }
    const robots = await loadRobots(ids);
    panelBody.innerHTML = `<div class="bb0-col-grid"></div>`;
    const grid = panelBody.querySelector(".bb0-col-grid");

    for (const r of robots) {
      // A div, not a button — the two actions below are buttons and a button
      // cannot legally contain another one.
      const card = el("div", "bb0-col-card");
      card.tabIndex = 0;
      card.setAttribute("role", "group");
      card.setAttribute("aria-label", `B-b0 #${r.tokenId}`);
      card.innerHTML = `
        <div class="bb0-col-thumb">
          ${r.image
            ? `<img src="${esc(r.image)}" alt="B-b0 #${r.tokenId}" loading="lazy">`
            : `<span class="bb0-col-nopic">no picture</span>`}
          <div class="bb0-col-actions">
            <button class="bb0-col-act bb0-col-act-view">VIEW</button>
            <button class="bb0-col-act bb0-col-act-up">UPGRADE</button>
          </div>
        </div>
        <div class="bb0-col-cardname">B-b0 #${r.tokenId}</div>`;

      // Clicking the picture itself still opens the detail view. That is the
      // fallback for touch screens, where "hover" does not exist.
      card.onclick = () => drawDetail(r.tokenId);
      card.onkeydown = (e) => { if (e.key === "Enter") drawDetail(r.tokenId); };

      card.querySelector(".bb0-col-act-view").onclick = (e) => {
        e.stopPropagation();
        drawDetail(r.tokenId);
      };
      card.querySelector(".bb0-col-act-up").onclick = (e) => {
        // Straight into the builder — no need to read the detail page first.
        e.stopPropagation();
        enterUpgradeMode(r.tokenId, r.config);
      };
      grid.append(card);
    }
  } catch (e) {
    panelBody.innerHTML = `<div class="bb0-bad">${esc(e.message || "Could not read your collection.")}</div>`;
  }
}

// --------------------------------------------------------------------------
// one robot, in detail
// --------------------------------------------------------------------------
async function drawDetail(tokenId) {
  view = "detail";
  detailToken = tokenId;
  panel.querySelector(".bb0-col-title").textContent = `B-b0 #${tokenId}`;
  panelBody.innerHTML = `<div class="bb0-col-empty">Loading B-b0 #${tokenId}…</div>`;

  try {
    const robot = await loadRobot(tokenId);
    const rows = await describeConfig(robot.config);
    const isMine = account && robot.owner.toLowerCase() === account.toLowerCase();

    panelBody.innerHTML = `
      <button class="bb0-link bb0-col-back">← back to all my B-b0s</button>
      <div class="bb0-col-detail">
        <div class="bb0-col-stage">
          <img class="bb0-col-big" src="${esc(robot.image)}" alt="B-b0 #${tokenId}">
          ${robot.model ? `<button class="bb0-col-3d">View in 3D</button>` : ""}
        </div>
        <div class="bb0-col-facts">
          <div class="bb0-col-attrs">
            ${rows.map((r) => `
              <div class="bb0-row">
                <span class="bb0-cat">${esc(r.category)}</span>
                <span class="bb0-name">${esc(r.name)}</span>
              </div>`).join("")}
          </div>
          <div class="bb0-col-owner">
            Owner: <a href="${addressURL(robot.owner)}" target="_blank" rel="noopener">${shortAddr(robot.owner)}</a>
            ${isMine ? `<span class="bb0-ok"> · that's you</span>` : ""}
          </div>
          <div class="bb0-col-links">
            <a href="${openSeaURL(tokenId)}" target="_blank" rel="noopener">See it on OpenSea</a>
            <a href="${addressURL(robot.owner)}" target="_blank" rel="noopener">Owner on ${esc(CHAIN.name)}</a>
          </div>
          ${isMine
            ? `<button class="bb0-col-upgrade">UPGRADE THIS B-b0</button>
               <div class="bb0-fineprint">
                 Its build loads into the carousels. It keeps its number —
                 #${tokenId} stays #${tokenId} forever. You only pay for parts
                 it has never owned.
               </div>`
            : `<div class="bb0-fineprint">Only the owner can change this robot's parts.</div>`}
        </div>
      </div>`;

    panelBody.querySelector(".bb0-col-back").onclick = drawGrid;

    const btn3d = panelBody.querySelector(".bb0-col-3d");
    if (btn3d) {
      // Deliberately on CLICK, not hover: each model is megabytes, and hovering
      // down a row of robots would download every one of them.
      btn3d.onclick = () => {
        const stage = panelBody.querySelector(".bb0-col-stage");
        stage.innerHTML =
          `<model-viewer class="bb0-col-big" src="${esc(robot.model)}"
             poster="${esc(robot.image)}" camera-controls touch-action="pan-y"
             shadow-intensity="1" environment-image="neutral" exposure="1"
             camera-orbit="-28deg 90deg 6.5m" field-of-view="40deg"></model-viewer>`;
      };
    }

    const up = panelBody.querySelector(".bb0-col-upgrade");
    if (up) up.onclick = () => enterUpgradeMode(tokenId, robot.config);
  } catch (e) {
    panelBody.innerHTML =
      `<button class="bb0-link bb0-col-back">← back</button>
       <div class="bb0-bad">${esc(e.message || "Could not load that B-b0.")}</div>`;
    panelBody.querySelector(".bb0-col-back").onclick = drawGrid;
  }
}

// --------------------------------------------------------------------------
// UPGRADE MODE
// --------------------------------------------------------------------------
async function enterUpgradeMode(tokenId, onChainConfig) {
  busy = true;
  setStatus(`Loading B-b0 #${tokenId} into the builder…`);
  try {
    const [wardrobe, parts] = await Promise.all([loadWardrobe(tokenId), loadParts()]);
    // Push the saved build into the carousels and the 3D view.
    await window.BB0.applyConfigArray(onChainConfig);

    upgrade = { tokenId, onChainConfig: onChainConfig.map(Number), wardrobe, parts };
    closePanel();
    // Clear the busy flag BEFORE the first paint. Otherwise the bar's opening
    // frame shows a disabled button still labelled "APPLY CHANGES", which reads
    // as broken for the quarter-second before the next poll corrects it.
    busy = false;
    showUpgradeBar();
    showTags();
    takeOverPricePanel();
    startTagPoll();
  } catch (e) {
    setStatus(e.message || "Could not load that B-b0 into the builder.", "bad");
  } finally {
    busy = false;
  }
}

function exitUpgradeMode() {
  upgrade = null;
  stopTagPoll();
  removeTags();
  releasePricePanel();
  if (upgradeBar) { upgradeBar.remove(); upgradeBar = null; }
  const mintBtn = document.getElementById("mint-side");
  if (mintBtn) mintBtn.style.display = "";
}

// --------------------------------------------------------------------------
// THE PRICE PANEL, DURING UPGRADE
//
// The customizer's own panel lists what a fresh mint would cost. During an
// upgrade that is the wrong number — and showing "TOTAL: 34.00 POL" above an
// "UPGRADE COST: 3.00 POL" was the confusing part. So rather than adding a
// second list of numbers, this rewrites the panel that is already there:
//
//   * a part the robot already wears  → EQUIPPED   (nothing to pay)
//   * a part it owns but isn't wearing → OWNED · free
//   * a part it has never owned        → its price
//   * TOTAL                            → what this upgrade costs
//
// ui.js redraws the panel on every carousel click and calls
// window.BB0_onPricesUpdated when it does, so this repaints straight after it
// with no polling and no flicker.
// --------------------------------------------------------------------------
const MAIN_PRICE_IDS = ["body-price", "face-price", "screen-price", "specs-price"];
const ACC_LABEL = { 4: "- Clothes:", 5: "- Face:", 6: "- Head:" };
let savedPriceTitle = null;

function takeOverPricePanel() {
  const title = document.querySelector(".price-panel .price-title");
  if (title && savedPriceTitle === null) savedPriceTitle = title.textContent;
  window.BB0_onPricesUpdated = () => { if (upgrade) paintUpgradePrices(); };
  paintUpgradePrices();
}

function releasePricePanel() {
  window.BB0_onPricesUpdated = null;
  const title = document.querySelector(".price-panel .price-title");
  if (title && savedPriceTitle !== null) title.textContent = savedPriceTitle;
  savedPriceTitle = null;
  document.querySelectorAll(".price-panel .price-value").forEach((n) =>
    n.classList.remove("bb0-pv-equipped", "bb0-pv-owned", "bb0-pv-new"));
  // Let the customizer put its own numbers back.
  try { window.BB0?.refreshPrices?.(); } catch { /* leaving the page */ }
}

/** What one category should read as, and which colour it gets. */
function priceCellFor(catIndex, chosenId) {
  const { onChainConfig, wardrobe, parts } = upgrade;
  const cat = parts.categories[catIndex];
  if (chosenId === onChainConfig[catIndex]) return { text: "EQUIPPED", cls: "bb0-pv-equipped" };
  if (wardrobe[cat.index]?.has(chosenId))    return { text: "OWNED · free", cls: "bb0-pv-owned" };
  const part = cat.parts.find((p) => p.id === chosenId);
  return { text: `${Number(part?.pricePOL || 0).toFixed(2)} POL`, cls: "bb0-pv-new" };
}

function setCell(node, cell) {
  if (!node) return;
  node.textContent = cell.text;
  node.classList.remove("bb0-pv-equipped", "bb0-pv-owned", "bb0-pv-new");
  node.classList.add(cell.cls);
}

function paintUpgradePrices() {
  if (!upgrade) return;
  const cfg = window.BB0.getConfigArray();
  const sel = selectionsMap();

  const title = document.querySelector(".price-panel .price-title");
  if (title) title.textContent = `Upgrading B-b0 #${upgrade.tokenId}`;

  MAIN_PRICE_IDS.forEach((id, i) =>
    setCell(document.getElementById(id), priceCellFor(i, cfg[i])));

  // The accessory rows are built fresh by ui.js on every redraw, so find them
  // by the label it writes rather than holding a reference.
  document.querySelectorAll(".price-panel .accessory-price-breakdown").forEach((row) => {
    const label = row.querySelector(".price-label")?.textContent || "";
    for (const [catIndex, prefix] of Object.entries(ACC_LABEL)) {
      if (!label.includes(prefix)) continue;
      const i = Number(catIndex);
      const sub = ACCESSORY_KEYS[i];
      const shown = sel[`accessories-${sub}`] ?? cfg[i];
      setCell(row.querySelector(".price-value"), priceCellFor(i, shown));
    }
  });

  const total = document.getElementById("total-price");
  if (total) {
    const { total: cost } = computeChange();
    total.textContent = `${cost.toFixed(2)} POL`;
  }
}

function showUpgradeBar() {
  // The mint bar and the upgrade bar occupy the same spot under the TOTAL
  // line, and only one of them makes sense at a time.
  const mintBtn = document.getElementById("mint-side");
  if (mintBtn) mintBtn.style.display = "none";

  const pricePanel = document.querySelector(".price-panel");
  if (!pricePanel) return;

  upgradeBar = el("div", "bb0-upgrade-bar");
  upgradeBar.innerHTML = `
    <div class="bb0-up-head">
      <span class="bb0-up-token">UPGRADING B-b0 #${upgrade.tokenId}</span>
      <button class="bb0-link bb0-up-cancel">Cancel</button>
    </div>
    <div class="bb0-up-lines"></div>
    <div class="bb0-up-warn"></div>
    <button class="bb0-up-go">UPGRADE NOW</button>
    <div class="bb0-up-status"></div>
    <div class="bb0-up-result"></div>`;
  pricePanel.insertAdjacentElement("afterend", upgradeBar);

  upgradeBar.querySelector(".bb0-up-cancel").onclick = () => {
    if (busy) return;
    exitUpgradeMode();
  };
  upgradeBar.querySelector(".bb0-up-go").onclick = onApply;
}

/**
 * What the change costs, worked out the same way the contract works it out:
 * a part costs money only if it is DIFFERENT from what the robot wears now AND
 * this robot has never owned it. Everything else is free.
 *
 * Doing this locally means the numbers update instantly as the carousels spin,
 * with no network call per click. The contract is still asked for the real
 * figure at the moment of paying (upgrade.js) — this is the display, not the bill.
 */
function computeChange() {
  const cfg = window.BB0.getConfigArray();
  const { onChainConfig, wardrobe, parts } = upgrade;
  const lines = [];
  let total = 0;

  parts.categories.forEach((cat, i) => {
    const newId = cfg[i];
    const oldId = onChainConfig[i];
    if (newId === oldId) return;                       // unchanged, nothing to say
    const part = cat.parts.find((p) => p.id === newId);
    const owned = wardrobe[cat.index]?.has(newId);
    const price = owned ? 0 : Number(part?.pricePOL || 0);
    total += price;
    lines.push({
      category: cat.label,
      name: part ? part.name : `#${newId}`,
      price, owned,
    });
  });

  return { cfg, lines, total, unchanged: sameConfig(cfg, onChainConfig) };
}

/**
 * A part the person chose but which collides is not rendered, not priced, and
 * reported to the contract as "None". For minting that is exactly right — you
 * get what you see. For upgrading it deserves a sentence, because it means a
 * part comes OFF the robot. It is not lost: the wardrobe is permanent.
 */
function collisionNotice() {
  const colliding = collidingMap();
  const sel = selectionsMap();
  const notices = [];
  for (const [catIndex, sub] of Object.entries(ACCESSORY_KEYS)) {
    if (!colliding[sub]) continue;
    const chosen = sel[`accessories-${sub}`];
    if (!chosen) continue;
    const cat = upgrade.parts.categories[Number(catIndex)];
    const part = cat.parts.find((p) => p.id === chosen);
    notices.push(part ? part.name : cat.label);
  }
  if (!notices.length) return "";
  return `${notices.map(esc).join(" and ")} ${notices.length > 1 ? "are" : "is"} ` +
         `hidden by something else on the robot, so ${notices.length > 1 ? "they" : "it"} ` +
         `won't be equipped. Nothing is lost — anything this B-b0 has ever owned ` +
         `stays in its wardrobe and costs nothing to put back on later.`;
}

function drawUpgradeBar() {
  if (!upgrade || !upgradeBar) return;
  const { cfg, total, unchanged } = computeChange();

  // The per-part costs are in the price panel above now. The only thing the
  // panel CANNOT show is a part being taken OFF, because ui.js draws no row
  // for "None" — so that is the one line kept here.
  const removed = [];
  upgrade.parts.categories.forEach((cat, i) => {
    if (cfg[i] === 0 && upgrade.onChainConfig[i] !== 0) {
      const was = cat.parts.find((p) => p.id === upgrade.onChainConfig[i]);
      removed.push(was ? was.name : cat.label);
    }
  });
  upgradeBar.querySelector(".bb0-up-lines").innerHTML = removed.length
    ? `Taking off: ${removed.map(esc).join(", ")} — kept in this B-b0's wardrobe.`
    : "";

  const warn = upgradeBar.querySelector(".bb0-up-warn");
  const notice = collisionNotice();
  warn.innerHTML = notice ? esc(notice) : "";
  warn.style.display = notice ? "" : "none";

  const go = upgradeBar.querySelector(".bb0-up-go");
  if (busy) {
    go.disabled = true;
  } else if (unchanged) {
    go.disabled = true;
    go.textContent = "NO CHANGES YET";
  } else {
    go.disabled = !IS_DEPLOYED || window.BB0.isBusy();
    go.textContent = total === 0 ? "UPGRADE NOW — FREE SWAP" : `UPGRADE NOW — ${total.toFixed(2)} POL`;
  }
}

// --------------------------------------------------------------------------
// the tags beside each carousel
// --------------------------------------------------------------------------
function showTags() {
  CAROUSEL_KEYS.forEach((key, i) => {
    const container = document.querySelector(`.carousel-current[data-category="${key}"]`)?.closest(".carousel-container");
    if (!container) return;
    const tag = el("div", "bb0-tag-row");
    tag.setAttribute("data-bb0-tag", String(i));
    container.insertAdjacentElement("afterend", tag);
  });
}

function removeTags() {
  document.querySelectorAll("[data-bb0-tag]").forEach((n) => n.remove());
}

function drawTags() {
  if (!upgrade) return;
  const cfg = window.BB0.getConfigArray();
  const sel = selectionsMap();
  const { onChainConfig, wardrobe, parts } = upgrade;

  parts.categories.forEach((cat, i) => {
    const node = document.querySelector(`[data-bb0-tag="${i}"]`);
    if (!node) return;

    // For accessories, show the tag for what is SELECTED in the carousel, even
    // if a collision means it will not actually be equipped — otherwise the tag
    // would silently describe "None" while the carousel shows a hat.
    const sub = ACCESSORY_KEYS[i];
    const shown = sub ? (sel[`accessories-${sub}`] ?? cfg[i]) : cfg[i];

    const owned = wardrobe[cat.index]?.has(shown);
    const equipped = shown === onChainConfig[i];
    const part = cat.parts.find((p) => p.id === shown);
    const price = Number(part?.pricePOL || 0);

    if (equipped) {
      node.className = "bb0-tag-row bb0-tag-equipped";
      node.textContent = "EQUIPPED";
    } else if (owned) {
      node.className = "bb0-tag-row bb0-tag-owned";
      node.textContent = "OWNED · free to re-equip";
    } else {
      node.className = "bb0-tag-row bb0-tag-new";
      node.textContent = `NEW · +${price.toFixed(2)} POL`;
    }
  });
}

// One timer drives both the tags and the bar. The customizer has no event to
// subscribe to when a selection changes, and polling is the pattern already
// proven here by the mint button's busy-guard.
function startTagPoll() {
  stopTagPoll();
  drawTags(); drawUpgradeBar();
  tagPoll = setInterval(() => {
    if (!upgrade) return stopTagPoll();
    try {
      // mint-ui.js adds the MINT bar asynchronously (it waits for .price-panel).
      // If it happens to finish AFTER upgrade mode started, hiding it once at
      // the start would have missed it and both bars would show at once.
      const mintBtn = document.getElementById("mint-side");
      if (mintBtn && mintBtn.style.display !== "none") mintBtn.style.display = "none";
      drawTags();
      drawUpgradeBar();
    } catch (e) { console.warn("[collection-ui]", e); }
  }, 250);
}
function stopTagPoll() {
  if (tagPoll) { clearInterval(tagPoll); tagPoll = null; }
}

// --------------------------------------------------------------------------
// applying the upgrade
// --------------------------------------------------------------------------
async function onApply() {
  if (busy || !upgrade) return;
  busy = true;
  const status = upgradeBar.querySelector(".bb0-up-status");
  const result = upgradeBar.querySelector(".bb0-up-result");
  const go = upgradeBar.querySelector(".bb0-up-go");
  go.disabled = true;
  result.innerHTML = "";
  status.className = "bb0-up-status";

  try {
    const { tokenId, hash, cost } = await upgradeRobot(upgrade.tokenId, (m) => {
      status.className = "bb0-up-status";
      status.textContent = m;
    });
    status.textContent = "";
    result.innerHTML = `
      <div class="bb0-success">
        <div class="bb0-success-title">B-b0 #${tokenId} has been rebuilt.</div>
        <a href="${txURL(hash)}" target="_blank" rel="noopener">View the transaction</a>
        <a href="${openSeaURL(tokenId)}" target="_blank" rel="noopener">See it on OpenSea</a>
        <div class="bb0-fineprint">
          ${cost === 0n ? "A free swap — you only paid the network fee. " : ""}
          The new picture can take a minute to appear on marketplaces.
        </div>
      </div>`;

    // The robot's on-chain build and wardrobe have both moved on. Re-read them
    // so the bar and tags describe reality rather than the state we started in.
    upgrade.onChainConfig = window.BB0.getConfigArray().map(Number);
    upgrade.wardrobe = await loadWardrobe(upgrade.tokenId);
  } catch (e) {
    status.className = "bb0-up-status bb0-bad";
    status.textContent = e.shortMessage || e.message || "Something went wrong.";
  } finally {
    busy = false;
    drawUpgradeBar();
  }
}

// --------------------------------------------------------------------------
// opening and closing
// --------------------------------------------------------------------------
async function openPanel() {
  if (!panel) buildPanel();
  panel.classList.add("bb0-open");
  setStatus("");
  drawWallet();
  await drawGrid();
}

function closePanel() {
  if (panel) panel.classList.remove("bb0-open");
}

// --------------------------------------------------------------------------
// the button, top-right, in a stack shared with whatever comes later
// --------------------------------------------------------------------------

/**
 * The one column that every button we add lives in. Idempotent on purpose:
 * whichever file happens to load first creates it, the rest find it. That way
 * admin-ui.js can call the same thing without needing to load in a set order.
 */
export function ensureButtonStack() {
  let stack = document.getElementById("bb0-button-stack");
  if (!stack) {
    stack = el("div", "bb0-button-stack");
    stack.id = "bb0-button-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

async function addCollectionButton() {
  await waitFor(".price-panel");   // proves the customizer has finished starting
  const btn = el("button", "bb0-collection-button", "MY COLLECTION");
  btn.id = "bb0-collection-side";
  btn.onclick = openPanel;
  ensureButtonStack().appendChild(btn);
}

addCollectionButton();

// Exposed so the test suite (and the admin panel in the next delivery) can
// drive this without synthesising DOM clicks for everything.
window.BB0_COLLECTION = {
  ensureButtonStack, paintUpgradePrices,
  openPanel, closePanel, drawGrid, drawDetail,
  enterUpgradeMode, exitUpgradeMode, computeChange, collisionNotice,
  isUpgrading: () => !!upgrade,
};
