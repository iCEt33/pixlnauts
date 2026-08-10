// js/admin-ui.js — the owner's panel.
//
// It lives INSIDE the collection dialog rather than in its own admin.html.
// Two reasons: the wallet is already connected by the time you can reach it
// (which removes the CHOOSE_WALLET bug admin.html has had since Session D),
// and there is no separate URL to stumble onto.
//
// WHAT IS AND IS NOT IN HERE
//
// In:  everything reversible and done often — promo codes, batches, pause,
//      withdraw, the description, per-token notes, the renderer address.
// Out: setPartInfo, setSigner, repairAssets. Those stay on Polygonscan ON
//      PURPOSE. A wrong setSigner stops every mint including yours; a wrong
//      setPartInfo silently rewrites what existing robots are wearing; and
//      repairAssets overwrites one token's picture. Pasting each argument
//      deliberately into Polygonscan is the point, not an inconvenience.
//
// The button that opens this is only shown to the address the CONTRACT says
// owns it — read live, never hardcoded, so it cannot drift after a transfer
// or a re-deploy. That is tidiness, not security: every write below is
// onlyOwner on-chain, so the panel is a convenience and nothing more.

import { formatEther, parseEther, keccak256, toHex } from "https://esm.sh/viem@2.37.5";
import { publicClient, walletClient, account, contract, chainOk, ensureChain } from "./wallet.js";
import {
  CONTRACT_ADDRESS, DEPLOY_BLOCK, CHAIN, txURL, addressURL, toViewableURL,
} from "./chain-config.js";

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "—");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let overlay, body, status, busy = false;

// ---------------------------------------------------------------------------
// is this wallet the owner? asked of the CONTRACT, every time.
// ---------------------------------------------------------------------------
export async function isOwner() {
  if (!account) return false;
  try {
    const owner = await publicClient.readContract({ ...contract, functionName: "owner" });
    return owner.toLowerCase() === account.toLowerCase();
  } catch {
    return false;   // can't read the chain -> don't offer the button
  }
}

function setStatus(msg, kind = "") {
  if (!status) return;
  status.className = "bb0-adm-status" + (kind ? " bb0-" + kind : "");
  status.textContent = msg || "";
}

// Every write goes through here: one place for the busy flag, the transaction
// link, and the read-back afterwards.
async function send(label, fn, readBack) {
  if (busy) return;
  busy = true;
  setStatus(`${label} — confirm in your wallet…`);
  try {
    // The panel always writes to Polygon; the wallet may be on any chain.
    // mint.js and upgrade.js both do this — the panel was missing it.
    await ensureChain();
    const hash = await fn();
    setStatus(`${label} — waiting for the network…`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Reverted by the network");
    // Read the value back rather than assuming. Today's session produced four
    // separate cases where something looked right and was not.
    let confirmed = "";
    if (readBack) {
      try { confirmed = " · now: " + (await readBack()); } catch { /* non-fatal */ }
    }
    setStatus(`${label} — done${confirmed}`, "ok");
    await refresh();
    return hash;
  } catch (e) {
    setStatus(`${label} failed: ${e.shortMessage || e.message}`, "err");
  } finally {
    busy = false;
  }
}

// Typing the word, not clicking through a dialog. Only used where a mis-click
// during a live mint would actually hurt.
function confirmByTyping(word) {
  const typed = prompt(`This is not reversible by clicking again.\n\nType ${word} to continue:`);
  return typed === word;
}

// ---------------------------------------------------------------------------
export function openAdmin() {
  if (!overlay) build();
  overlay.classList.add("bb0-open");
  refresh();
}
function close() { overlay.classList.remove("bb0-open"); }

function build() {
  overlay = el("div", "bb0-adm-overlay");
  overlay.innerHTML = `
    <div class="bb0-adm-panel" role="dialog" aria-label="Admin panel">
      <button class="bb0-adm-close" title="Close">×</button>
      <h2 class="bb0-adm-title">ADMIN PANEL</h2>
      <div class="bb0-adm-status"></div>
      <div class="bb0-adm-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  body = overlay.querySelector(".bb0-adm-body");
  status = overlay.querySelector(".bb0-adm-status");
  overlay.querySelector(".bb0-adm-close").onclick = close;
  overlay.addEventListener("click", (e) => { if (e.target === overlay && !busy) close(); });
}

// ---------------------------------------------------------------------------
// READ EVERYTHING the contract will tell us, in one pass
// ---------------------------------------------------------------------------
async function readAll() {
  const one = (functionName, args = []) =>
    publicClient.readContract({ ...contract, functionName, args }).catch(() => null);

  const [
    name, symbol, owner, signer, paused, minted, maxSupply, batch, available,
    open, description, rendererURI, collectionURI, balance,
  ] = await Promise.all([
    one("name"), one("symbol"), one("owner"), one("signer"), one("paused"),
    one("currentTokenId"), one("maxSupply"), one("currentBatch"),
    one("availableInCurrentBatch"), one("isMintOpen"), one("description"),
    one("rendererURI"), one("collectionURI"),
    publicClient.getBalance({ address: CONTRACT_ADDRESS }).catch(() => null),
  ]);
  return { name, symbol, owner, signer, paused, minted, maxSupply, batch,
           available, open, description, rendererURI, collectionURI, balance };
}

// Promo codes are only knowable from events — the contract stores them by
// hash, so the plain text exists nowhere on-chain. DEPLOY_BLOCK is what makes
// this scan possible without walking the whole history of Polygon.
async function readPromoCodes() {
  const [created, killed] = await Promise.all([
    publicClient.getContractEvents({
      ...contract, eventName: "PromoCodeCreated", fromBlock: DEPLOY_BLOCK, toBlock: "latest",
    }),
    publicClient.getContractEvents({
      ...contract, eventName: "PromoCodeDeactivated", fromBlock: DEPLOY_BLOCK, toBlock: "latest",
    }),
  ]);

  const seen = new Map();
  for (const e of created) {
    seen.set(e.args.code, {
      code: e.args.code,
      discount: Number(e.args.discountPercent),
      perWallet: Number(e.args.maxUsesPerWallet),
      global: Number(e.args.maxUsesGlobal),
    });
  }
  for (const e of killed) if (seen.has(e.args.code)) seen.get(e.args.code).killed = true;

  // The event is only history. Ask the contract for the live state of each.
  const rows = [...seen.values()];
  await Promise.all(rows.map(async (r) => {
    try {
      const h = keccak256(toHex(r.code));
      const [discount, perWallet, globalMax, usedGlobal, active] =
        await publicClient.readContract({ ...contract, functionName: "promoCodes", args: [h] });
      r.discount = Number(discount);
      r.perWallet = Number(perWallet);
      r.global = Number(globalMax);
      r.used = Number(usedGlobal);
      r.active = active;
    } catch { r.active = !r.killed; }
  }));
  return rows;
}

// ---------------------------------------------------------------------------
async function refresh() {
  if (!body) return;
  body.innerHTML = `<div class="bb0-adm-loading">Reading the contract…</div>`;
  let info, promos;
  try {
    info = await readAll();
    promos = await readPromoCodes().catch(() => null);
  } catch (e) {
    body.innerHTML = "";
    body.append(el("div", "bb0-err", `Could not read the contract: ${esc(e.message)}`));
    return;
  }
  body.innerHTML = "";
  // Wrong-network banner, same shape as mint-ui.js. The panel writes to
  // Polygon; the wallet may be anywhere. Yellow styling comes from mint.css.
  if (!chainOk) {
    const row = el("div", "bb0-network-warn");
    row.append(el("span", null, `Wallet is not on ${CHAIN.name}. Nothing here will work. `));
    const fix = el("button", "bb0-link", `Switch to ${CHAIN.name}`);
    fix.onclick = async () => {
      setStatus("");
      try { await ensureChain(); await refresh(); }
      catch (e) { setStatus(e.message, "err"); }
    };
    row.append(fix);
    body.append(row);
  }
  body.append(sectionInfo(info));
  body.append(sectionMinting(info));
  body.append(sectionPromos(promos));
  body.append(sectionText(info));
  body.append(sectionMoney(info));
  body.append(sectionElsewhere());
}

const row = (k, v, mono = true) => {
  const r = el("div", "bb0-adm-row");
  r.append(el("span", "bb0-adm-k", esc(k)));
  r.append(el("span", "bb0-adm-v" + (mono ? " bb0-mono" : ""), v == null ? "—" : esc(v)));
  return r;
};
const section = (title) => {
  const s = el("section", "bb0-adm-sec");
  s.append(el("h3", "bb0-adm-h", esc(title)));
  return s;
};

// ---- 1. what this contract IS ----------------------------------------------
function sectionInfo(i) {
  const s = section("Contract");
  s.append(row("Address", CONTRACT_ADDRESS));
  s.append(row("Network", `${CHAIN.name} (${CHAIN.id})`));
  s.append(row("Name / symbol", `${i.name ?? "—"} / ${i.symbol ?? "—"}`));
  s.append(row("Owner", `${short(i.owner)}  ${i.owner?.toLowerCase() === account?.toLowerCase() ? "(you)" : ""}`));
  s.append(row("Stamp signer", short(i.signer)));
  s.append(row("Renderer", i.rendererURI || "(not set)"));
  s.append(row("Collection URI", i.collectionURI || "(not set)"));
  if (i.rendererURI) {
    const a = el("a", "bb0-link", "open the renderer");
    a.href = toViewableURL(i.rendererURI) + "?config=0,0,0,0,0,0,0";
    a.target = "_blank"; a.rel = "noopener";
    const r = el("div", "bb0-adm-row"); r.append(el("span", "bb0-adm-k", "")); r.append(a);
    s.append(r);
  }
  return s;
}

// ---- 2. supply, batches, pause ---------------------------------------------
function sectionMinting(i) {
  const s = section("Minting");
  s.append(row("Minted", `${i.minted ?? "—"}`));
  s.append(row("Max supply", `${i.maxSupply ?? "—"}`));
  s.append(row("Batch", `${i.batch ?? "—"} · ${i.available ?? "—"} left in it`));
  s.append(row("Open to buyers", i.open ? "YES" : "no"));
  s.append(row("Paused", i.paused ? "YES — nobody can mint" : "no"));

  const acts = el("div", "bb0-adm-acts");

  const pauseBtn = el("button", "bb0-adm-btn" + (i.paused ? "" : " bb0-adm-danger"),
                      i.paused ? "Unpause" : "Pause minting");
  pauseBtn.onclick = () => {
    if (!i.paused && !confirmByTyping("PAUSE")) return;
    send(i.paused ? "Unpause" : "Pause",
      () => walletClient.writeContract({ ...contract, functionName: i.paused ? "unpause" : "pause" }),
      async () => (await publicClient.readContract({ ...contract, functionName: "paused" })) ? "paused" : "live");
  };
  acts.append(pauseBtn);

  const next = el("button", "bb0-adm-btn", "Unlock next batch (+100)");
  next.onclick = () => send("Unlock next batch",
    () => walletClient.writeContract({ ...contract, functionName: "unlockNextBatch" }),
    async () => `max supply ${await publicClient.readContract({ ...contract, functionName: "maxSupply" })}`);
  acts.append(next);

  const nBox = el("input", "bb0-adm-in"); nBox.type = "number"; nBox.min = "1"; nBox.value = "1";
  nBox.style.width = "70px";
  const many = el("button", "bb0-adm-btn", "Unlock N batches");
  many.onclick = () => {
    const n = BigInt(nBox.value || "0");
    if (n < 1n) return setStatus("Pick a number of batches first", "err");
    send(`Unlock ${n} batches`,
      () => walletClient.writeContract({ ...contract, functionName: "unlockMultipleBatches", args: [n] }),
      async () => `max supply ${await publicClient.readContract({ ...contract, functionName: "maxSupply" })}`);
  };
  acts.append(nBox); acts.append(many);
  s.append(acts);
  return s;
}

// ---- 3. promo codes ---------------------------------------------------------
function sectionPromos(promos) {
  const s = section("Promo codes");

  if (!promos) {
    s.append(el("div", "bb0-warn",
      "Could not scan promo events. Check DEPLOY_BLOCK in chain-config.js — " +
      "scanning from block 0 is usually what makes this fail."));
  } else if (promos.length === 0) {
    s.append(el("div", "bb0-adm-empty", "None created yet."));
  } else {
    const t = el("table", "bb0-adm-table");
    t.innerHTML = `<tr><th>Code</th><th>Off</th><th>Per wallet</th><th>Used / total</th><th>State</th><th></th></tr>`;
    for (const p of promos) {
      const tr = el("tr");
      tr.innerHTML =
        `<td class="bb0-mono">${esc(p.code)}</td>` +
        `<td>${p.discount}%</td>` +
        `<td>${p.perWallet === 0 ? "∞" : p.perWallet}</td>` +
        `<td>${p.used ?? "?"} / ${p.global === 0 ? "∞" : p.global}</td>` +
        `<td class="${p.active ? "bb0-ok" : "bb0-dim"}">${p.active ? "active" : "off"}</td>`;
      const td = el("td");
      if (p.active) {
        const k = el("button", "bb0-adm-btn bb0-adm-small", "Deactivate");
        k.onclick = () => send(`Deactivate ${p.code}`,
          () => walletClient.writeContract({ ...contract, functionName: "deactivatePromoCode", args: [p.code] }));
        td.append(k);
      }
      tr.append(td);
      t.append(tr);
    }
    s.append(t);
  }

  const f = el("div", "bb0-adm-form");
  const code = el("input", "bb0-adm-in"); code.placeholder = "CODE";
  const pct  = el("input", "bb0-adm-in"); pct.type = "number"; pct.min = "1"; pct.max = "100"; pct.placeholder = "% off";
  // BOTH caps must be at least 1 -- the contract has require(> 0, "Zero cap").
  // There is no unlimited option; use a large number if you want one.
  const per  = el("input", "bb0-adm-in"); per.type = "number"; per.min = "1"; per.value = "1";  per.placeholder = "per wallet";
  const tot  = el("input", "bb0-adm-in"); tot.type = "number"; tot.min = "1"; tot.value = "50"; tot.placeholder = "total uses";
  const mk = el("button", "bb0-adm-btn", "Create");
  mk.onclick = () => {
    const c = code.value.trim().toUpperCase();     // UPPERCASE ONLY — Session A
    if (!c) return setStatus("Give the code a name", "err");
    const d = Number(pct.value);
    if (!(d >= 1 && d <= 100)) return setStatus("Discount must be 1–100", "err");
    const w = Number(per.value), g = Number(tot.value);
    if (!(w >= 1) || !(g >= 1)) {
      return setStatus("Both caps must be at least 1 — the contract rejects zero", "err");
    }
    send(`Create ${c}`, () => walletClient.writeContract({
      ...contract, functionName: "createPromoCode",
      args: [c, BigInt(d), BigInt(w), BigInt(g)],
    }), async () => {
      const [, , remGlobal] = await publicClient.readContract({
        ...contract, functionName: "checkPromoCode", args: [c, account],
      });
      return `${remGlobal} uses left`;
    });
  };
  code.oninput = () => { code.value = code.value.toUpperCase(); };
  f.append(code, pct, per, tot, mk);
  s.append(f);
  s.append(el("div", "bb0-adm-note",
    "<b>Two caps, both required.</b> <i>Per wallet</i> is how many times one " +
    "address may use it; <i>total</i> is how many times everyone combined may. " +
    "Both must be at least 1 — there is no unlimited setting, so use a big " +
    "number instead.<br>" +
    "The code is hashed exactly as typed, so <code>launch50</code> and " +
    "<code>LAUNCH50</code> are different codes. This box forces uppercase.<br>" +
    "Re-creating an existing code tops it up but <b>KEEPS its used counter</b> — " +
    "re-issuing a 50-use code after 30 uses gives you 20 more, not 50."));
  return s;
}

// ---- 4. description, notes, renderer ----------------------------------------
function sectionText(i) {
  const s = section("Text and the renderer");

  const d = el("textarea", "bb0-adm-area");
  d.value = i.description || "";
  d.rows = 6;
  s.append(el("div", "bb0-adm-note",
    "Stored exactly as typed. Use \\n\\n (backslash n, twice) for a paragraph " +
    "break — a REAL line break is illegal in the metadata and the contract " +
    "will refuse it. Double quotes and stray backslashes are refused too."));
  s.append(d);
  const dBtn = el("button", "bb0-adm-btn", "Save description (every token)");
  dBtn.onclick = () => {
    if (!d.value.trim()) return setStatus("The description cannot be empty", "err");
    send("Save description",
      () => walletClient.writeContract({ ...contract, functionName: "setDescription", args: [d.value] }),
      async () => `${(await publicClient.readContract({ ...contract, functionName: "description" })).length} chars stored`);
  };
  s.append(dBtn);

  const nid = el("input", "bb0-adm-in"); nid.type = "number"; nid.min = "1"; nid.placeholder = "token #";
  const ntx = el("input", "bb0-adm-in"); ntx.placeholder = "note — shown ABOVE the description"; ntx.style.minWidth = "260px";
  const load = el("button", "bb0-adm-btn bb0-adm-small", "Load");
  load.onclick = async () => {
    try {
      ntx.value = await publicClient.readContract({ ...contract, functionName: "tokenNote", args: [BigInt(nid.value || 0)] });
      setStatus(`Loaded the note on #${nid.value}` + (ntx.value ? "" : " (empty)"), "ok");
    } catch (e) { setStatus("No such token", "err"); }
  };
  const nBtn = el("button", "bb0-adm-btn", "Save note");
  nBtn.onclick = () => {
    if (!nid.value) return setStatus("Which token?", "err");
    send(`Note on #${nid.value}`,
      () => walletClient.writeContract({ ...contract, functionName: "setTokenNote", args: [BigInt(nid.value), ntx.value] }),
      async () => {
        const v = await publicClient.readContract({ ...contract, functionName: "tokenNote", args: [BigInt(nid.value)] });
        return v ? `"${v.slice(0, 40)}"` : "cleared";
      });
  };
  const nf = el("div", "bb0-adm-form");
  nf.append(nid, load, ntx, nBtn);
  s.append(nf);
  s.append(el("div", "bb0-adm-note", "An empty note clears it. Notes never appear in the token's name."));

  const r = el("input", "bb0-adm-in");
  r.value = i.rendererURI || "";
  r.placeholder = "ar://<manifest>/renderer.html";
  r.style.minWidth = "320px";
  const rBtn = el("button", "bb0-adm-btn", "Set renderer");
  rBtn.onclick = () => {
    const v = r.value.trim();
    if (!v) return setStatus("Paste the renderer address first", "err");
    send("Set renderer",
      () => walletClient.writeContract({ ...contract, functionName: "setRendererURI", args: [v] }),
      async () => await publicClient.readContract({ ...contract, functionName: "rendererURI" }));
  };
  const rf = el("div", "bb0-adm-form");
  rf.append(r, rBtn);
  s.append(rf);
  s.append(el("div", "bb0-adm-note",
    "Changes how EVERY robot's 3D model renders, in one transaction. Check the " +
    "new address in a browser first — see PARTS_HANDBOOK §A2."));
  return s;
}

// ---- 5. money ---------------------------------------------------------------
function sectionMoney(i) {
  const s = section("Money");
  s.append(row("Held by the contract", i.balance == null ? "—" : `${formatEther(i.balance)} POL`));
  const w = el("button", "bb0-adm-btn bb0-adm-danger", "Withdraw everything to the owner");
  w.disabled = !i.balance || i.balance === 0n;
  w.onclick = () => {
    if (!confirmByTyping("WITHDRAW")) return;
    send("Withdraw",
      () => walletClient.writeContract({ ...contract, functionName: "withdraw" }),
      async () => `${formatEther(await publicClient.getBalance({ address: CONTRACT_ADDRESS }))} POL left`);
  };
  s.append(w);
  return s;
}

// ---- 6. the things that deliberately are not here ---------------------------
function sectionElsewhere() {
  const s = section("Not in this panel — on purpose");
  s.append(el("div", "bb0-adm-note",
    "<b>setPartInfo</b> — a wrong id silently rewrites what existing robots are " +
    "wearing, permanently. Parts are APPEND ONLY.<br>" +
    "<b>setSigner</b> — a wrong value stops every mint, including yours.<br>" +
    "<b>repairAssets</b> — overwrites one token's picture.<br><br>" +
    "These want the friction of pasting each argument by hand."));
  const a = el("a", "bb0-adm-btn", "Open the contract on Polygonscan →");
  a.href = addressURL(CONTRACT_ADDRESS) + "#writeContract";
  a.target = "_blank"; a.rel = "noopener";
  s.append(a);
  return s;
}
