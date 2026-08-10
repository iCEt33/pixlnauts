#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * verify-parts.mjs
 *
 * The parts list lives in THREE places and they must agree exactly:
 *   models.js      -> what the customizer shows
 *   parts.json     -> what goes on-chain via setPartInfo
 *   renderer.html  -> what the marketplace renders
 *
 * A part id is its POSITION in the list. If these three ever disagree,
 * robots render with the wrong parts and nothing errors -- it just looks
 * subtly wrong, months later, on tokens you cannot change.
 *
 * Run from the repo root:   node verify-parts.mjs
 * ------------------------------------------------------------------ */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".git", ".vercel", ".next", "dist", "build"]);

function find(filename) {
  const hits = [];
  (function walk(dir, depth) {
    if (depth > 6) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name) && !e.name.startsWith(".")) walk(path.join(dir, e.name), depth + 1);
      } else if (e.name === filename) {
        hits.push(path.join(dir, e.name));
      }
    }
  })(ROOT, 0);
  return hits;
}

function need(filename) {
  const hits = find(filename);
  if (hits.length === 0) { console.error(`\n  Could not find ${filename} under ${ROOT}`); process.exit(1); }
  if (hits.length > 1) {
    console.error(`\n  Found more than one ${filename}:`);
    hits.forEach((h) => console.error("    " + path.relative(ROOT, h)));
    console.error("  Cannot tell which is real. Aborting.");
    process.exit(1);
  }
  return hits[0];
}

/* Pull a bracketed array out of a source file by its opening marker. */
function grabArray(src, marker) {
  const i0 = src.indexOf(marker);
  if (i0 === -1) return null;
  const i = src.indexOf("[", i0);
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "[") d++;
    else if (src[j] === "]") { d--; if (d === 0) return src.slice(i, j + 1); }
  }
  return null;
}

const idsIn    = (block) => [...block.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const stringsIn = (block) => [...block.matchAll(/"([^"]+\.glb)"|(\bnull\b)/g)]
  .map((m) => (m[1] ? m[1].replace(/\.glb$/, "") : null));

/* ---------------- load ---------------- */
const modelsPath   = need("models.js");
const rendererPath = need("renderer.html");

/* parts.json legitimately exists TWICE: the site's copy, and the server's copy
   at api/_lib/. stamp.mjs refuses to sign a mint containing a part id it does
   not know, so if the two ever drift, a part shows up in the customizer, prices
   correctly, and then dies at the stamp with "Unknown part in category N".
   Both copies are checked, and they must be identical. */
const partsPaths = find("parts.json");
if (partsPaths.length === 0) {
  console.error(`\n  Could not find parts.json under ${ROOT}`);
  process.exit(1);
}

const modelsSrc   = fs.readFileSync(modelsPath, "utf8");
const rendererSrc = fs.readFileSync(rendererPath, "utf8");
const partsCopies = partsPaths.map((p) => ({
  path: p,
  json: JSON.parse(fs.readFileSync(p, "utf8")),
}));

console.log("\n  models.js      " + path.relative(ROOT, modelsPath));
partsCopies.forEach((c) => console.log("  parts.json     " + path.relative(ROOT, c.path)));
console.log("  renderer.html  " + path.relative(ROOT, rendererPath) + "\n");

let copiesAgree = true;
if (partsCopies.length > 1) {
  const base = JSON.stringify(partsCopies[0].json);
  for (let i = 1; i < partsCopies.length; i++) {
    if (JSON.stringify(partsCopies[i].json) !== base) {
      copiesAgree = false;
      console.log("  FAIL  these two copies of parts.json DISAGREE:");
      console.log("          " + path.relative(ROOT, partsCopies[0].path));
      console.log("          " + path.relative(ROOT, partsCopies[i].path));
      console.log("        The server copy decides which part ids can be minted.");
    }
  }
  if (copiesAgree) {
    console.log(`  OK    ${partsCopies.length} copies of parts.json are identical`);
  }
}

const partsJson = partsCopies[0].json;

const CATS = [
  { label: "Body",           models: "\n  body: [",       renderer: "BODY: [" },
  { label: "Face",           models: "\n  face: [",       renderer: "FACE: [" },
  { label: "Screen",         models: "\n  screen: [",     renderer: "SCREEN: [" },
  { label: "Specs",          models: "\n  specs: [",      renderer: "SPECS: [" },
  { label: "Clothes",        models: "\n    clothes: [",  renderer: "CLOTHES: [" },
  { label: "Face Accessory", models: "\n    face: [",     renderer: "ACC_FACE: [" },
  { label: "Head Accessory", models: "\n    head: [",     renderer: "ACC_HEAD: [" },
];

let problems = 0;

CATS.forEach((cat, ci) => {
  const mBlock = grabArray(modelsSrc, cat.models);
  const rBlock = grabArray(rendererSrc, cat.renderer);
  const jCat   = partsJson.categories?.[ci];

  if (!mBlock || !rBlock || !jCat) {
    console.log(`  ${cat.label.padEnd(15)} COULD NOT READ ONE OF THE THREE LISTS`);
    problems++;
    return;
  }

  const fromModels   = idsIn(mBlock);
  // parts.json stores modelKey: null for the "None" entries; models.js and the
  // renderer both call that "none". Same thing, normalise before comparing.
  const fromParts    = [...jCat.parts].sort((a, b) => a.id - b.id).map((p) => p.modelKey ?? "none");
  const fromRenderer = stringsIn(rBlock);

  const n = Math.max(fromModels.length, fromParts.length, fromRenderer.length);
  const bad = [];

  for (let i = 0; i < n; i++) {
    const m = fromModels[i] ?? "(missing)";
    const p = fromParts[i] ?? "(missing)";
    // renderer stores filenames; "none" entries are null in both
    const r = fromRenderer[i] === null ? "none" : (fromRenderer[i] ?? "(missing)");
    if (m !== p || m !== r) bad.push({ i, m, p, r });
  }

  const counts = `${fromModels.length}/${fromParts.length}/${fromRenderer.length}`;
  if (bad.length === 0) {
    console.log(`  OK    ${cat.label.padEnd(15)} ${counts.padStart(11)}  all three agree`);
  } else {
    problems += bad.length;
    console.log(`  FAIL  ${cat.label.padEnd(15)} ${counts.padStart(11)}  ${bad.length} mismatch(es)`);
    bad.slice(0, 5).forEach(({ i, m, p, r }) => {
      console.log(`          index ${String(i).padStart(2)}  models.js=${m}  parts.json=${p}  renderer=${r}`);
    });
    if (bad.length > 5) console.log(`          ...and ${bad.length - 5} more`);
  }
});

/* Every filename referenced must exist on disk -- and, going the other way,
   anything sitting in models/ that nothing references is dead weight. On the
   website that is harmless; on Arweave it is permanent and billable. */
const modelsDir = path.dirname(rendererPath) + path.sep + "models";
let missingFiles = 0;
if (fs.existsSync(modelsDir)) {
  const onDisk = fs.readdirSync(modelsDir);
  const onDiskSet = new Set(onDisk);
  const referenced = [...new Set(
    [...rendererSrc.matchAll(/"([a-z0-9_]+\.glb)"/g)].map((m) => m[1])
  )];
  const refSet = new Set(referenced);

  const missing = referenced.filter((f) => !onDiskSet.has(f));
  missingFiles = missing.length;

  console.log("");
  if (missing.length === 0) {
    console.log(`  OK    ${referenced.length} filenames referenced, all present in models/`);
  } else {
    console.log(`  FAIL  ${missing.length} referenced file(s) not in models/:`);
    missing.forEach((f) => console.log("          " + f));
  }

  /* Not a failure -- just money and clutter. */
  const orphans = onDisk.filter((f) => !refSet.has(f));
  if (orphans.length) {
    let bytes = 0;
    orphans.forEach((f) => {
      try { bytes += fs.statSync(path.join(modelsDir, f)).size; } catch {}
    });
    console.log(`  NOTE  ${orphans.length} file(s) in models/ that nothing references` +
                ` (${(bytes / 1024 / 1024).toFixed(2)} MB):`);
    orphans.slice(0, 15).forEach((f) => console.log("          " + f));
    if (orphans.length > 15) console.log(`          ...and ${orphans.length - 15} more`);
    console.log("        Harmless on the website. Do NOT upload these to Arweave.");
  }
} else {
  console.log("\n  (models/ folder not found next to renderer.html -- skipped file check)");
}

console.log("");
if (problems === 0 && missingFiles === 0 && copiesAgree) {
  console.log("  PASS -- the lists agree and every file exists.\n");
  process.exit(0);
} else {
  console.log("  FAILED -- fix the above before minting or uploading anything.\n");
  process.exit(1);
}
