// js/robot-guard.js — safety net for the 3D robot, plus the "tell us" channel.
// A plain script ON PURPOSE, loaded FIRST, so it is still running when
// anything else on the page fails to arrive.
//
// WHAT IT DOES
//  1. Notices when the robot cannot be shown: a library file that did not
//     download (3D viewer, three.js, part-merging library), a part file that
//     could not be read, the viewer refusing the merged model, or simply
//     nothing appearing for a long time.
//  2. Replaces the empty black box with a warning triangle, one plain sentence
//     about what went wrong, a RELOAD button and a REPORT button.
//  3. Sends a short automatic report to /api/report, which api/report.mjs
//     turns into a Discord DM to you (and always writes to Vercel's function
//     log). One report per page load, and never twice within ten minutes from
//     the same browser. Open the page with ?bb0test to send a harmless test.
//  4. Also reports (without an overlay — mint-guard.js draws that) when the
//     MINT / MY COLLECTION code fails to start.
//
// HOW IT KNOWS, WITHOUT TOUCHING THE ORIGINAL FILES
//  - A <script> that fails to download or parse fires an "error" event on its
//    own tag. Those do not bubble, but a capture-phase listener on window sees
//    them, as long as it exists BEFORE the tag is reached. Hence: load first.
//  - utils.js log() appends every message as a <div> to #debug-panel (hidden).
//    A MutationObserver on that panel reads loader.js / scene.js's own
//    "ERROR: ..." lines the moment they are written.
//  - The robot counts as shown once <model-viewer> fires "load" or its src
//    becomes a blob: address (loader.js sets exactly that).
//
// Nothing here is needed for a working page. If this file itself fails to
// load, the page behaves exactly as before.

(() => {
  // ---- settings -----------------------------------------------------------
  // Where the REPORT button sends people. Leave "" to make it copy the
  // details to the clipboard instead (for pasting into any contact channel).
  const CONTACT_EMAIL = "";
  // The automatic report goes here. Root-relative: same domain as the page.
  const REPORT_URL = "/api/report";
  // How long a robot may take to appear before we say something (ms).
  const WATCHDOG_MS = 45000;
  // Files whose absence does NOT blank the robot. They are still reported.
  const NOT_CRITICAL = new Set([
    "mint-ui.js", "collection-ui.js", "mint-adapter.js", "mint-guard.js",
    "diag.js", "dpr-fix.js", "GLTFExporter.js",
  ]);
  // What loader.js / scene.js write to the log when the robot cannot be built.
  const FATAL_LOG = [
    /^ERROR: Failed to load gltf-transform/,                 // loader.js initLoader
    /^ERROR: gltf-transform or extensions failed to load/,   // models.js loadDefaultModels gave up
    /^ERROR: Failed to merge models/,                        // loader.js loadAllModels
    /^ERROR: the merged model failed to display/,            // loader.js errorHandler
    /^Model-viewer error/,                                   // scene.js
  ];

  // ---- state ----------------------------------------------------------------
  const state = {
    version: 1,
    assembled: false,
    failures: [],      // [{ kind, detail, at }]
    errors: [],        // last few runtime errors, for the report only
    overlay: null,
    reported: false,
    reportOk: null,    // true once /api/report accepted it
  };
  window.BB0_GUARD = state;

  const now = () => new Date().toISOString();
  const fileOf = (src) => {
    try { return new URL(src, location.href).pathname.split("/").pop() || src; }
    catch { return String(src); }
  };

  // ---- 1. scripts that never arrived ----------------------------------------
  window.addEventListener("error", (e) => {
    const t = e.target;
    if (!t || t === window || e.message) {
      // a runtime error, not a missing file — keep a few for the report
      if (e.message) remember({ kind: "runtime-error", detail: String(e.message).slice(0, 200) });
      return;
    }
    const src = t.src || t.href;
    if (!src || !(t.tagName === "SCRIPT" || t.tagName === "LINK")) return;
    const file = fileOf(src);
    // A module script fails as a group: the tag's own file may be fine and one
    // of its imports missing (that is exactly what happened with esm.sh).
    const isModule = t.tagName === "SCRIPT" && t.type === "module";
    fail("file-missing",
         isModule
           ? `${file} could not start: it, or a file it imports, did not download or has an error`
           : `${file} did not download or could not be read`,
         t.tagName === "SCRIPT" && !NOT_CRITICAL.has(file));
  }, true);

  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    remember({ kind: "unhandled-promise", detail: String(r && (r.message || r)).slice(0, 200) });
  });

  // ---- 2. the customizer's own ERROR lines ----------------------------------
  function watchLog() {
    const panel = document.getElementById("debug-panel");
    if (!panel) return;
    new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        const text = (n.textContent || "").trim();
        if (FATAL_LOG.some((re) => re.test(text))) {
          fail("robot-error", text.slice(0, 200), !state.assembled);
        }
      }
    }).observe(panel, { childList: true });
  }

  // ---- 3. did a robot ever appear? ------------------------------------------
  function viewer() { return document.getElementById("model-viewer"); }
  // If the model-viewer library never arrived, <model-viewer> is an empty
  // unknown tag: loader.js can still set src on it, but nothing is drawn.
  function viewerDefined() {
    try { return !!customElements.get("model-viewer"); } catch { return false; }
  }
  function robotShown() {
    const mv = viewer();
    if (!mv || !viewerDefined()) return false;
    const src = (mv.src || mv.getAttribute("src") || "");
    return typeof src === "string" && src.startsWith("blob:");
  }
  function watchViewer() {
    const mv = viewer();
    if (mv) mv.addEventListener("load", () => markAssembled());
    const timer = setInterval(() => {
      if (state.assembled || robotShown()) { markAssembled(); clearInterval(timer); }
    }, 1000);
    setTimeout(() => {
      if (!state.assembled && !robotShown()) {
        fail("robot-timeout", `no robot after ${WATCHDOG_MS / 1000} seconds`, true);
      }
    }, WATCHDOG_MS);
  }
  function markAssembled() {
    state.assembled = true;
    // A late success beats a stale warning. Take the overlay down.
    if (state.overlay) { state.overlay.remove(); state.overlay = null; }
  }

  // ---- 4. the mint side (mint-guard.js draws its own bar) --------------------
  function watchMint() {
    setTimeout(() => {
      if (document.getElementById("mint-side-fallback")) {
        fail("mint-missing", "MINT button never appeared (mint-guard fallback is showing)", false);
      }
    }, 6500);  // mint-guard decides at 5 s
  }

  // ---- bookkeeping ----------------------------------------------------------
  function remember(entry) {
    state.errors.push({ ...entry, at: now() });
    if (state.errors.length > 8) state.errors.shift();
  }

  function fail(kind, detail, blanksRobot) {
    state.failures.push({ kind, detail, at: now() });
    console.error(`[robot-guard] ${kind}: ${detail}`);
    if (blanksRobot && !state.assembled) showOverlay(kind, detail);
    sendReport();
  }

  // ---- the overlay ----------------------------------------------------------
  const WHY = {
    "file-missing":  "A file the 3D viewer needs didn't download.",
    "robot-error":   "The robot's parts couldn't be put together.",
    "robot-timeout": "The robot is taking far longer than usual to appear.",
  };

  function showOverlay(kind, detail) {
    if (state.overlay) return;
    const mv = viewer();
    if (!mv) return;
    injectStyle();

    const box = document.createElement("div");
    box.id = "bb0-robot-guard";
    box.setAttribute("role", "alert");
    box.innerHTML = `
      <svg viewBox="0 0 120 108" width="96" height="86" aria-hidden="true">
        <path d="M60 8 L112 98 L8 98 Z" fill="#000" stroke="#ff0" stroke-width="7" stroke-linejoin="round"/>
        <rect x="55" y="38" width="10" height="34" rx="2" fill="#ff0"/>
        <rect x="55" y="80" width="10" height="10" rx="2" fill="#ff0"/>
      </svg>
      <div class="bb0-guard-title">B-b0 couldn't load</div>
      <div class="bb0-guard-why"></div>
      <div class="bb0-guard-buttons">
        <button type="button" class="toggle-button bb0-guard-reload">RELOAD</button>
        <button type="button" class="toggle-button bb0-guard-report">REPORT</button>
      </div>
      <div class="bb0-guard-note">Reloading fixes most hiccups. If it keeps happening, REPORT sends us the details.</div>
      <div class="bb0-guard-sent"></div>`;
    box.querySelector(".bb0-guard-why").textContent = WHY[kind] || "Something went wrong.";
    box.querySelector(".bb0-guard-reload").onclick = () => location.reload();
    box.querySelector(".bb0-guard-report").onclick = () => manualReport(box);
    box.title = detail;   // the exact reason, for anyone who hovers
    mv.appendChild(box);  // inside the viewer box, so it covers exactly that
    state.overlay = box;
    paintSentLine();
  }

  function paintSentLine() {
    const line = state.overlay && state.overlay.querySelector(".bb0-guard-sent");
    if (!line) return;
    line.textContent = state.reportOk ? "Our side has been notified automatically." : "";
  }

  function injectStyle() {
    if (document.getElementById("bb0-robot-guard-style")) return;
    const s = document.createElement("style");
    s.id = "bb0-robot-guard-style";
    s.textContent = `
      #bb0-robot-guard { position:absolute; inset:0; z-index:300; display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:10px; padding:24px; box-sizing:border-box;
        background:rgba(0,0,0,0.94); color:#0f0; font-family:monospace; text-align:center; pointer-events:auto; }
      #bb0-robot-guard .bb0-guard-title { font-size:22px; font-weight:bold; color:#ff0; letter-spacing:1px; margin-top:4px; }
      #bb0-robot-guard .bb0-guard-why { font-size:15px; max-width:380px; line-height:1.5; }
      #bb0-robot-guard .bb0-guard-buttons { display:flex; gap:10px; margin-top:6px; }
      #bb0-robot-guard .toggle-button { font-family:monospace; font-size:15px; font-weight:bold; letter-spacing:1px; padding:10px 18px; }
      #bb0-robot-guard .bb0-guard-note { font-size:12px; color:#6a6; max-width:380px; line-height:1.5; }
      #bb0-robot-guard .bb0-guard-sent { font-size:12px; color:#7f7; min-height:16px; }
      #bb0-robot-guard .bb0-guard-copied { color:#ff0; }`;
    document.head.appendChild(s);
  }

  // ---- the report -----------------------------------------------------------
  function logLines(n) {
    const panel = document.getElementById("debug-panel");
    if (!panel) return [];
    return Array.from(panel.children).slice(-n).map((d) => (d.textContent || "").trim().slice(0, 160));
  }

  function buildReport() {
    return {
      v: state.version,
      page: location.href.slice(0, 300),
      at: now(),
      browser: navigator.userAgent.slice(0, 200),
      assembled: state.assembled,
      failures: state.failures.slice(0, 10),
      errors: state.errors.slice(-5),
      log: logLines(12),
    };
  }

  function reportText() {
    const r = buildReport();
    return [
      "B-b0 customizer: something didn't load",
      "",
      "What failed:",
      ...r.failures.map((f) => `  - ${f.kind}: ${f.detail}`),
      "",
      `Page: ${r.page}`,
      `When: ${r.at}`,
      `Browser: ${r.browser}`,
      "",
      "Last log lines:",
      ...r.log.map((l) => `  ${l}`),
    ].join("\n");
  }

  // Automatic. Fire-and-forget; a failure here is only noted in the console.
  // Waits two seconds after the first failure so the ones that arrive in the
  // same burst (several files, then the MINT bar) end up in one report.
  function sendReport() {
    if (state.reported) return;
    state.reported = true;
    setTimeout(() => { doSend().catch(() => {}); }, 2000);
  }
  async function doSend() {
    try {
      const last = Number(sessionStorage.getItem("bb0-guard-reported") || 0);
      if (Date.now() - last < 10 * 60 * 1000) return;   // a reload loop is not ten reports
      sessionStorage.setItem("bb0-guard-reported", String(Date.now()));
    } catch { /* storage unavailable: still send */ }
    try {
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildReport()),
        keepalive: true,
      });
      state.reportOk = res.ok;
      if (!res.ok) console.warn(`[robot-guard] /api/report answered ${res.status}`);
    } catch (e) {
      state.reportOk = false;
      console.warn("[robot-guard] could not send the automatic report:", e && e.message);
    }
    paintSentLine();
  }

  // The REPORT button: email if an address is configured, otherwise copy.
  async function manualReport(box) {
    const text = reportText();
    if (CONTACT_EMAIL) {
      const subject = encodeURIComponent("B-b0 customizer didn't load");
      const body = encodeURIComponent(text.slice(0, 1500));
      location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }
    const line = box.querySelector(".bb0-guard-sent");
    try {
      await navigator.clipboard.writeText(text);
      line.innerHTML = '<span class="bb0-guard-copied">Details copied. Paste them to us anywhere you like.</span>';
    } catch {
      // No clipboard access (older browser or insecure page): show the text.
      const ta = document.createElement("textarea");
      ta.readOnly = true;
      ta.value = text;
      ta.style.cssText = "width:100%;max-width:420px;height:120px;background:#000;color:#0f0;border:1px solid #0f0;font-family:monospace;font-size:11px;";
      line.innerHTML = "";
      line.appendChild(ta);
      ta.select();
    }
  }

  // ---- a way to test the whole chain without breaking anything ---------------
  // Open the customizer with ?bb0test on the end of the address and a report
  // marked "test" goes out exactly the way a real one would. No overlay.
  function testSwitch() {
    let on = false;
    try { on = new URLSearchParams(location.search).has("bb0test"); } catch { on = false; }
    if (on) fail("test", "test message from the ?bb0test switch, nothing is wrong", false);
  }

  // ---- start ----------------------------------------------------------------
  function start() {
    watchLog();
    watchViewer();
    watchMint();
    testSwitch();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
