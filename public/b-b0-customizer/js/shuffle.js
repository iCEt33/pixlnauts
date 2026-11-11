// js/shuffle.js — the SHUFFLE B-b0 button.
//
// WHAT IT DOES, in plain words:
// Picks a random part in every category and puts the result on the robot.
// Accessories are only combined when the collision table PROVES they don't
// clash, so a shuffled robot is always one you could have built by hand:
// nothing red, nothing hidden, nothing charged for that isn't on screen.
//
// HOW IT FITS IN, without changing the original customizer files:
// Like mint-ui.js, it adds its own button at runtime, into the same column
// main.js builds, just above Reset B-b0. The random build goes onto the robot
// through window.BB0.applyConfigArray() in mint-adapter.js, the same proven
// path the upgrade screen uses to load a saved robot. So the carousels, the
// price panel, the MINT bar and the upgrade screen all update exactly as they
// do for a hand-picked build. Works in upgrade mode too: the price panel then
// shows what the shuffled outfit would cost that robot.
//
// WHEN THE TABLE CAN'T ANSWER:
// lookupCollision() answers true (clash), false (proven safe) or null (it
// doesn't know: the table didn't load, or an accessory was added without
// re-baking). Only a proven "false" counts as safe here. If the table is
// missing, shuffling still works but the robot wears one accessory at most.
// Plainer, never wrong.
//
// Load AFTER collision-table.js and mint-adapter.js (index.html does).

(() => {
  // The three accessory carousels, as modelDefinitions.accessories names them.
  const ACCESSORY_SLOTS = ["clothes", "face", "head"];

  const randomIndex = (n) => Math.floor(Math.random() * n);

  // A shuffled copy (Fisher–Yates), so no accessory slot always picks first.
  function inRandomOrder(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // True only when the baked table PROVES these two can be worn together.
  function provenSafe(partA, partB) {
    if (!partA.filename || !partB.filename) return true;   // "None" never clashes
    if (typeof lookupCollision !== "function") return false;
    return lookupCollision(partA.filename, partB.filename) === false;
  }

  // One random build, as the seven part ids the contract uses:
  // [body, face, screen, specs, clothes, face accessory, head accessory]
  function pickRandomBuild() {
    const body   = randomIndex(modelDefinitions.body.length);
    const face   = randomIndex(modelDefinitions.face.length);
    const screen = randomIndex(modelDefinitions.screen.length);
    const specs  = randomIndex(modelDefinitions.specs.length);

    const chosen = {};     // slot -> part id
    const worn = [];       // the accessory parts picked so far
    for (const slot of inRandomOrder(ACCESSORY_SLOTS)) {
      const list = modelDefinitions.accessories[slot];
      const fits = [];
      list.forEach((part, id) => {
        if (worn.every((other) => provenSafe(part, other))) fits.push(id);
      });
      // Never empty: id 0 is "None", which fits with anything.
      const id = fits[randomIndex(fits.length)];
      chosen[slot] = id;
      worn.push(list[id]);
    }

    return [body, face, screen, specs, chosen.clothes, chosen.face, chosen.head];
  }

  // The part-merging library arrives a moment after the page. Until it has,
  // the robot cannot be rebuilt, so the button waits.
  function libraryReady() {
    try {
      return typeof gltfTransform !== "undefined" && !!gltfTransform && !!window.gltfExtensions;
    } catch { return false; }
  }

  let button = null;
  let running = false;

  // Grey the button out while a shuffle is running, while the robot is still
  // merging or a collision check is deciding (same rule as the MINT button),
  // and before the library has arrived.
  function refresh() {
    if (!button) return;
    let busy = false;
    try { busy = window.BB0?.isBusy?.() === true; } catch { busy = false; }
    const off = running || busy || !libraryReady() || !window.BB0?.applyConfigArray;
    button.disabled = off;
    button.style.opacity = off ? "0.5" : "";
    button.style.cursor = off ? "default" : "";
    button.title = off ? "Still updating your robot…" : "Random parts, no clashes";
  }

  async function shuffleRobot() {
    if (running || !button || button.disabled) return;
    running = true;
    refresh();
    try {
      // The table is fetched when the page opens. This resolves the moment
      // that finishes, whether or not it worked, so an early click still
      // shuffles with the table rather than without it.
      if (typeof collisionTableReady !== "undefined") await collisionTableReady;
      const build = pickRandomBuild();
      log(`Shuffle: ${build.join(",")}`);
      await window.BB0.applyConfigArray(build);
    } catch (e) {
      log(`Shuffle failed: ${e && e.message ? e.message : e}`);
    } finally {
      running = false;
      refresh();
    }
  }

  // main.js builds the button column in its own DOMContentLoaded handler.
  // This one is registered after it, but keep looking for a few seconds in
  // case the order ever changes.
  function addButton() {
    if (document.getElementById("shuffle-side")) return true;
    const column = document.querySelector(".buttons-side");
    if (!column) return false;

    button = document.createElement("button");
    button.id = "shuffle-side";
    button.className = "toggle-button";
    button.textContent = "Shuffle B-b0";
    button.addEventListener("click", shuffleRobot);

    const reset = document.getElementById("reset-side");
    if (reset && reset.parentNode === column) column.insertBefore(button, reset);
    else column.appendChild(button);

    refresh();
    setInterval(refresh, 250);
    log("Shuffle button added");
    return true;
  }

  function start() {
    if (addButton()) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (addButton() || Date.now() - started > 10000) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // For the test suite, the same way collection-ui.js exposes BB0_COLLECTION.
  window.BB0_SHUFFLE = { pickRandomBuild, shuffleRobot };
})();
