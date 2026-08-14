// mint-adapter.js — the "glue" from BUILD_A_BEEBO_PLAN_V2 §13 (items 2 & 3).
//
// WHAT THIS IS, in plain words:
// Your customizer scripts (utils.js, loader.js, scene.js...) are old-style
// scripts that share one big common room of variables. The NEW mint files
// from the plan (mint.js etc.) are modern "module" scripts that live in
// their own room and can only reach things deliberately placed on the
// window. This file stands in the doorway: it reads your customizer's
// existing variables and hands the three things the mint flow needs to
// window.BB0, without changing any of your existing files.
//
// It must be loaded AFTER utils.js, scene.js and loader.js (see the
// index.html change in the harmonization report).
//
// Exposes:
//   window.BB0.getConfigArray()   -> [body, face, screen, specs, clothes, faceAcc, headAcc]
//   window.BB0.getSnapshotBlob()  -> the preview PNG (standardized pose), as a Blob
//   window.BB0.getMergedGlbBlob() -> the merged robot GLB, as a Blob
//   window.BB0.isBusy()           -> true while models/collision checks are still loading
//   window.BB0.waitUntilIdle()    -> resolves once isBusy() is false again
//   window.BB0.applyConfigArray() -> load a SAVED build back INTO the customizer
//                                    (Phase 3B: the upgrade screen needs this)
//   window.BB0.getSelections()    -> a copy of currentSelections
//   window.BB0.getCollisions()    -> a copy of collidingAccessories
//   window.BB0.refreshPrices()    -> ask the customizer to redraw its price panel

(() => {
  // Contract category order (plan §4.1):
  // 0=Body 1=Face 2=Screen 3=Specs 4=Clothes 5=Face Accessory 6=Head Accessory
  const ORDER = [
    "body",
    "face",
    "screen",
    "specs",
    "accessories-clothes",
    "accessories-face",
    "accessories-head",
  ];

  // 1) The current build as the 7-number array the contract expects.
  //    Part id == its position in the models.js list (verified by parts.json).
  //    IMPORTANT: an accessory marked as COLLIDING is not shown on the robot
  //    and not counted in the price (see ui.js updatePrices and loader.js
  //    loadAllModels, which both skip it) — so here it must count as
  //    0 = "None" too. Otherwise the buyer would be charged on-chain for a
  //    part that is not in the picture.
  function getConfigArray() {
    return ORDER.map((key) => {
      if (key.startsWith("accessories-")) {
        const sub = key.split("-")[1];
        if (collidingAccessories[sub]) return 0;
      }
      return currentSelections[key];
    });
  }

  // Wait for the camera to ACTUALLY ARRIVE instead of guessing at a duration.
  // model-viewer interpolates asymptotically toward a new cameraOrbit, so a
  // fixed setTimeout is a race: a big spin takes longer to settle than a small
  // one, and the picture could be taken mid-glide. This watches the realtime
  // orbit and returns once it has stopped moving -- the animation is still
  // there, we just stop taking the picture during it.
  async function waitForCameraToSettle(mv, timeoutMs = 3000) {
    const readFov = () =>
      (typeof mv.getFieldOfView === "function" ? mv.getFieldOfView() : 0);

    const started = performance.now();
    let last = mv.getCameraOrbit();
    let lastFov = readFov();
    let quiet = 0;

    while (performance.now() - started < timeoutMs) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = mv.getCameraOrbit();
      const fov = readFov();
      const moved =
        Math.abs(now.theta  - last.theta)  +
        Math.abs(now.phi    - last.phi)    +
        Math.abs(now.radius - last.radius) +
        Math.abs(fov - lastFov) * 0.01;
      last = now;
      lastFov = fov;
      quiet = moved < 1e-4 ? quiet + 1 : 0;
      if (quiet >= 3) return true;      // three still frames = it has arrived
    }
    return false;                       // timed out -- take the shot anyway
  }

  // 2) The preview picture as a Blob, in the SAME standardized pose as the
  //    Snapshot button (this mirrors takeHighResSnapshot in snapshot.js,
  //    minus the download). Every minted B-b0 gets the same camera angle,
  //    so the collection looks consistent on OpenSea.
  async function getSnapshotBlob() {
    if (!modelViewer || !modelViewer.src) {
      throw new Error("No model loaded to snapshot");
    }
    // The try starts BEFORE applyCaptureFraming, and savedFraming is declared
    // outside it, so the finally can restore whether or not framing was ever
    // applied. Same reasoning as before: a failed snapshot must not leave the
    // viewer frozen at capture framing until a page reload.
    let savedFraming = null;
    try {
      savedFraming = applyCaptureFraming();

      // jumpCameraToGoal has already put the camera on its mark, so this
      // returns in a few frames. Kept as a backstop, not as the mechanism.
      await waitForCameraToSettle(modelViewer);

      // idealAspect:true cropped the PNG to the MODEL's proportions, so a
      // hatted robot came out narrower than a bare one and the grid looked
      // ragged. false keeps the viewer's aspect -- same shape every build.
      return await modelViewer.toBlob({
        idealAspect: false,
        mimeType: "image/png",
        qualityArgument: 1.0,
      });
    } finally {
      restoreViewFraming(savedFraming);
    }
  }

  // 3) The merged robot GLB as a Blob. loader.js already builds ONE merged
  //    GLB and stores it as a blob URL in currentGLB (scene.js) — fetching
  //    that URL returns the exact bytes, so nothing in loader.js changes.
  async function getMergedGlbBlob() {
    if (!currentGLB) {
      throw new Error("No model loaded to export");
    }
    const res = await fetch(currentGLB);
    return await res.blob();
  }

  // 4) True while the viewer is still merging models or a collision check
  //    is running. The mint button should refuse to start while this is
  //    true, so a half-finished collision check can never sneak a wrong
  //    config into a mint.
  function isBusy() {
    const stillLoading =
      typeof isCurrentlyLoading !== "undefined" && isCurrentlyLoading;
    const checkRunning = !!document.querySelector(".carousel-current.loading");
    return stillLoading || checkRunning;
  }

  // 5) Wait for the customizer to go quiet. Used on both sides of
  //    applyConfigArray so we never start on top of a merge that is still
  //    running, and so callers can await "the robot is on screen now".
  //    The timeout is a safety net, not a schedule: it resolves false rather
  //    than hanging a button forever if something upstream gets stuck.
  function waitUntilIdle(timeoutMs = 30000) {
    return new Promise((resolve) => {
      if (!isBusy()) return resolve(true);
      const started = Date.now();
      const timer = setInterval(() => {
        const stillBusy = isBusy();
        if (!stillBusy || Date.now() - started > timeoutMs) {
          clearInterval(timer);
          resolve(!stillBusy);
        }
      }, 100);
    });
  }

  // How many parts each category actually has, so a saved build that names a
  // part this copy of the site does not have fails loudly instead of rendering
  // something wrong. (Ids are append-only by rule, so this should never fire —
  // but "should never" is exactly what silent corruption is made of.)
  function categoryLength(key) {
    if (key.startsWith("accessories-")) {
      const sub = key.split("-")[1];
      return (modelDefinitions.accessories[sub] || []).length;
    }
    return (modelDefinitions[key] || []).length;
  }

  // 6) Push a SAVED build (a token's seven part ids) back into the customizer,
  //    so the upgrade screen can show a robot as it is and let the person edit
  //    it in the normal carousels.
  //
  //    This is modelled on utils.js's resetAllModels(), which is the proven
  //    sequence for "change every selection at once". Same steps, writing the
  //    token's ids instead of zeros, plus two additions that matter:
  //
  //      * wait for any in-flight merge to finish first, and
  //      * clear the collision flags before loading.
  //
  //    Why the collision clear is not optional: collidingAccessories survives
  //    everything. If the person was wearing a colliding hat a moment ago, the
  //    flag is still true, loader.js skips that whole category, and the token
  //    renders without a part it actually owns — while getConfigArray() reports
  //    that part as 0 ("None"). Upgrading from that state would quietly take
  //    the hat off the robot. resetSelectionStyles() (utils.js line 60) clears
  //    the flags, the red carousel styling and the warning banner in one call.
  //
  //    ORDER MATTERS: resetSelectionStyles() strips the "active" class from
  //    accessory carousels on the assumption everything is going back to None.
  //    So it runs BEFORE updateAllCarousels(), which then re-applies the right
  //    styling for whatever this token is actually wearing. resetAllModels()
  //    calls them the other way round, which is correct there and wrong here.
  async function applyConfigArray(cfg) {
    if (!Array.isArray(cfg) || cfg.length !== 7) {
      throw new Error("applyConfigArray needs an array of exactly 7 part ids");
    }
    const ids = cfg.map((v) => Number(v));
    ORDER.forEach((key, i) => {
      const n = ids[i];
      if (!Number.isInteger(n) || n < 0 || n >= categoryLength(key)) {
        throw new Error(
          `This B-b0 uses a part this page does not know about ` +
          `(category "${key}", id ${cfg[i]}). The site's model list may be out of date.`
        );
      }
    });

    await waitUntilIdle();

    resetSelectionStyles();                                   // flags + styling + banner
    ORDER.forEach((key, i) => { currentSelections[key] = ids[i]; });
    updateAllCarousels();
    loadedModels.latestRequests = {};
    loadAllModels();
    updatePrices();

    // Resolve only once the robot is actually rendered, so the caller can show
    // an honest "loading your B-b0…" instead of guessing.
    await waitUntilIdle();
    return getConfigArray();
  }

  // 7) Plain copies of the two pieces of customizer state the UI needs to read.
  //
  //    A module script CAN reach a classic script's top-level `const` — module
  //    scope is a sub-scope of script scope — so reading `currentSelections`
  //    directly from mint-ui.js does work in a browser. But it depends on a
  //    subtlety no one should have to hold in their head, and it cannot be
  //    reproduced outside a browser, which makes it untestable. This file is
  //    already standing in that scope, so it hands the values over explicitly.
  //
  //    Copies, not the live objects: nothing outside the customizer should be
  //    able to reach in and change what the robot is wearing.
  function getSelections() { return { ...currentSelections }; }
  function getCollisions() { return { ...collidingAccessories }; }

  // Ask the customizer to repaint its own price panel. The upgrade screen
  // rewrites that panel while it is open and needs a way to hand it back.
  function refreshPrices() { updatePrices(); }

  window.BB0 = {
    getConfigArray, getSnapshotBlob, getMergedGlbBlob, isBusy,
    waitUntilIdle, applyConfigArray, getSelections, getCollisions, refreshPrices,
  };
})();
