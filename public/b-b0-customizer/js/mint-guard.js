// js/mint-guard.js — safety net for the MINT button. A plain script ON PURPOSE.
//
// WHY THIS EXISTS (1 Nov 2026): mint-ui.js and collection-ui.js are "modules".
// A module only starts if EVERY file it pulls in arrives intact. One failed
// file (a 404, a 500, a typo) and the browser skips the whole group without a
// word: no MINT bar, no MY COLLECTION button, one red line in the console.
// That day it was esm.sh answering "500" for viem's /chains file.
//
// This file is not a module, so it still runs when they don't. If the MINT bar
// has not appeared WAIT_MS after the page finished loading, it puts a yellow
// bar in its place telling the visitor to reload, and prints what to check in
// the console.
//
// The browser holds back "page finished loading" (DOMContentLoaded) until the
// module files have either run or failed, so a slow connection cannot set this
// off: by the time the timer starts, the real button is already there. Should
// it ever turn up late anyway, the yellow bar removes itself.
//
// It only ever ADDS a bar of its own. It never touches the real MINT button,
// and upgrade mode only hides that button (it stays on the page), so upgrade
// mode cannot set this off.

(() => {
  const WAIT_MS = 5000;
  let fallback = null;

  const has = (id) => !!document.getElementById(id);

  function check() {
    if (!has("bb0-collection-side")) {
      console.error(
        "[mint-guard] The MY COLLECTION button never appeared: js/collection-ui.js did not start. " +
        "Scroll UP for a red 'Failed to load resource' or 'SyntaxError' line and click its link."
      );
    }

    if (has("mint-side")) return;                 // mint-ui.js started: all good
    const pricePanel = document.querySelector(".price-panel");
    if (!pricePanel) return;

    fallback = document.createElement("button");
    fallback.id = "mint-side-fallback";
    fallback.className = "bb0-mint-bar";          // same size and font as the MINT bar
    fallback.style.cssText =
      "background:#111;color:#ff0;border-color:#ff0;box-shadow:none;font-size:16px;letter-spacing:1px;";
    fallback.textContent = "MINT DIDN'T LOAD. CLICK TO RELOAD.";
    fallback.title = "Part of the page failed to download. Reloading usually fixes it.";
    fallback.onclick = () => location.reload();
    pricePanel.insertAdjacentElement("afterend", fallback);

    console.error(
      "[mint-guard] The MINT button never appeared: js/mint-ui.js did not start.\n" +
      "Something it loads failed. Scroll UP for a red 'Failed to load resource' or " +
      "'SyntaxError' line and click its link: that names the broken file.\n" +
      "Usual causes: a file missing from js/ or js/vendor/ on the server, or a " +
      "typo in a .js file that was just edited."
    );

    // A slow connection can bring the real button in late. Step aside if so.
    const timer = setInterval(() => {
      if (has("mint-side")) {
        if (fallback) { fallback.remove(); fallback = null; }
        clearInterval(timer);
      }
    }, 1000);
  }

  const start = () => setTimeout(check, WAIT_MS);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
