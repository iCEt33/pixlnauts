// js/collision-table.js
//
// Loads the precomputed collision answers produced by bake.html.
//
// WHY THIS EXISTS:
// The live check in collisions.js voxelises a model by casting three rays per
// 0.1-unit grid cell against every triangle. That costs roughly half a second
// per model on a desktop and considerably more on a phone, and it happens
// right before someone commits money. Since the accessory list is fixed
// between deploys, every answer can be worked out ahead of time.
//
// WHY IT CANNOT BE WRONG:
// bake.html does not reimplement the algorithm. It loads this exact
// collisions.js and calls the same cachedVoxelSystem methods. The table is
// the output of the live checker, not a second opinion about it.
//
// WHAT HAPPENS WHEN IT DOESN'T KNOW:
// A pair is only answerable if BOTH filenames are in the baked manifest. Add
// an accessory and forget to re-bake, and every pair involving it returns
// null here, which sends checkAccessoryCollisions down its original path.
// Slow for that one pair, never wrong.
//
// Load this AFTER collisions.js — it reads cachedVoxelSystem.voxelSize.

const collisionTable = {
  ready: false,
  parts: new Set(),   // filenames the bake covered
  pairs: new Set(),   // "a.glb|b.glb", alphabetically ordered, colliding only
  meta: null
};

// Everything awaits this once. Resolves whether the load succeeded or not —
// a missing table is a fallback, not an error.
const collisionTableReady = (async () => {
  try {
    const res = await fetch('collision-table.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // The table answers a question defined by three constants. If any of them
    // has drifted from what the runtime now uses, the baked answers are for a
    // different question. Refuse the table rather than feed wrong results
    // into a mint.
    const liveVoxel = (typeof cachedVoxelSystem !== 'undefined')
      ? cachedVoxelSystem.voxelSize
      : 0.1;

    if (data.scale !== 0.1 || data.voxelSize !== liveVoxel || data.tolerance !== 0.05) {
      log('Collision table constants differ from runtime - ignoring it, using live checks');
      return;
    }

    if (!Array.isArray(data.parts) || !Array.isArray(data.collisions)) {
      throw new Error('malformed table');
    }

    collisionTable.parts = new Set(data.parts);
    collisionTable.pairs = new Set(data.collisions);
    collisionTable.meta = { bakedAt: data.bakedAt, pairs: data.collisions.length };
    collisionTable.ready = true;

    log(`Collision table loaded: ${data.parts.length} parts, ${data.collisions.length} colliding pairs (baked ${data.bakedAt})`);
  } catch (e) {
    log(`Collision table unavailable (${e.message}) - falling back to live checks`);
  }
})();

// Same key format bake.html writes: alphabetical, so a lookup works whichever
// way round the two files are passed.
const collisionPairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// true  = these two collide
// false = these two definitely do not
// null  = the table can't answer; the caller must check live
const lookupCollision = (fileA, fileB) => {
  if (!collisionTable.ready) return null;
  if (!fileA || !fileB) return null;
  if (!collisionTable.parts.has(fileA)) return null;
  if (!collisionTable.parts.has(fileB)) return null;
  return collisionTable.pairs.has(collisionPairKey(fileA, fileB));
};
