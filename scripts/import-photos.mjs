// Imports the form's "picture of yourself" uploads into the deck as release/deck/photos/<id>.jpg (480x480, square).
// Matches each file to a fellow by the name Google Forms appends to uploads ("IMG_123 - First Last.jpeg").
// Usage: node scripts/import-photos.mjs <folder with the extracted photos>   then: node scripts/build-deck.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src || !fs.existsSync(src)) throw new Error("usage: node scripts/import-photos.mjs <folder>");
const fellows = JSON.parse(fs.readFileSync(path.join(ROOT, "restricted", "fellows.json"), "utf8")).fellows;
const out = path.join(ROOT, "release", "deck", "photos");
fs.mkdirSync(out, { recursive: true });

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w.length > 2);
const close = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a)));
function match(file) {
  const base = path.parse(file).name, who = base.includes(" - ") ? base.split(" - ").slice(1).join(" ") : base;
  const toks = norm(who);
  let best = null, bestScore = 0;
  for (const f of fellows) {
    const ft = norm(f.name + " " + (f.aka || ""));
    const score = toks.filter((t) => ft.some((x) => close(t, x))).length;
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return bestScore ? best : null;
}
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(jpe?g|png|heic|heif|webp)$/i.test(e.name)) files.push(p); } })(src);
const used = {}, report = [];
for (const file of files.sort()) {
  const f = match(path.basename(file));
  if (!f) { report.push(`skip (no fellow match): ${path.basename(file)}`); continue; }
  if (used[f.id]) { report.push(`skip (already have ${f.id}): ${path.basename(file)}`); continue; }
  const dst = path.join(out, `${f.id}.jpg`);
  // square crop biased to the upper part of the frame (faces), 480px
  // HEIC is a tiled image that ffmpeg exposes through a complex filtergraph: flatten it to PNG first
  let input = file;
  if (/.(heic|heif)$/i.test(file)) { input = path.join(out, `${f.id}.tmp.png`); execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-frames:v", "1", input]); }
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-frames:v", "1", "-vf",
    "crop='min(iw,ih)':'min(iw,ih)':'(iw-min(iw,ih))/2':'(ih-min(iw,ih))*0.2',scale=480:480", "-q:v", "3", dst]);
  if (input !== file) fs.rmSync(input);
  used[f.id] = path.basename(file);
  report.push(`${f.id} ${f.name}  <=  ${path.basename(file)}`);
}
console.log(report.join("\n"));
console.log(`\n${Object.keys(used).length} photos; missing: ${fellows.filter((f) => !used[f.id]).map((f) => f.id + " " + f.name).join(", ") || "none"}`);
