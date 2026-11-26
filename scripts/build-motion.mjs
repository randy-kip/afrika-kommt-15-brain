// Builds the motion version from app/motion.html + release/data.js:
//   release/motion.html                       local copy (needs internet once for d3 + fonts)
//   release/daph/index.html                   simplified light view of the areas (copied from app/daph.html)
//   restricted/artifacts/brain-motion.html    single file with data inlined, for publishing as an Artifact
// Usage: node scripts/build-motion.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const africa = fs.readFileSync(path.join(ROOT, "app", "africa.js"), "utf8"); // made by scripts/build-geo.mjs
if (/<\/script/i.test(africa)) throw new Error("africa.js contains </script>");
const tplRaw = fs.readFileSync(path.join(ROOT, "app", "motion.html"), "utf8");
const tpl = tplRaw.replace('<script src="africa.js"></script>', () => `<script>
${africa}</script>`);
if (tpl === tplRaw) throw new Error("africa.js tag not found in template");
const data = fs.readFileSync(path.join(ROOT, "release", "data.js"), "utf8");
if (/<\/script/i.test(data)) throw new Error("data.js contains </script>");

const local = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${tpl}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(ROOT, "release", "motion.html"), local);

const art = tpl.replace('<script src="data.js"></script>', `<script>\n${data}</script>`)
  .replace('href="index.html"', 'href="https://claude.ai/artifact/QBgQXXTWwXAVmJ8nN7r4yd" target="_blank" rel="noopener"');
if (art === tpl) throw new Error("data.js tag not found in template");
const out = path.join(ROOT, "restricted", "artifacts", "brain-motion.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, art);
// /daph/: simplified light view of the areas of expertise (no names, no counts); reads ../data.js
fs.mkdirSync(path.join(ROOT, "release", "daph"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "app", "daph.html"), path.join(ROOT, "release", "daph", "index.html"));
// New presentation pages (originals above stay untouched): /offer/ (slide kit) and /baobab/ (motion story)
fs.copyFileSync(path.join(ROOT, "app", "africa.js"), path.join(ROOT, "release", "africa.js"));
for (const [src, dir] of [["offer.html", "offer"], ["baobab.html", "baobab"]]) {
  if (!fs.existsSync(path.join(ROOT, "app", src))) continue;
  fs.mkdirSync(path.join(ROOT, "release", dir), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "app", src), path.join(ROOT, "release", dir, "index.html"));
}
console.log("release/offer + release/baobab +", "release/daph/index.html +", "release/motion.html +", path.relative(ROOT, out), (art.length / 1024).toFixed(1) + " KB");
