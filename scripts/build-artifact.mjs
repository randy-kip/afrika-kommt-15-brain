// Packs a built app folder (default: release/) into one self-contained HTML file for publishing as a
// claude.ai Artifact: strips the document skeleton (the host adds its own), inlines data.js, and adds the
// light-theme media block the host expects. Usage: node scripts/build-artifact.mjs [srcDir] [outFile]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, process.argv[2] || "release");
const out = path.join(ROOT, process.argv[3] || "restricted/artifacts/brain-v1.html");

let html = fs.readFileSync(path.join(src, "index.html"), "utf8");
const data = fs.readFileSync(path.join(src, "data.js"), "utf8");
if (/<\/script/i.test(data)) throw new Error("data.js contains </script>");

html = html
  .replace(/<!doctype html>\s*/i, "")
  .replace(/<html[^>]*>\s*/i, "")
  .replace(/<\/html>\s*/i, "")
  .replace(/<head>\s*/i, "")
  .replace(/<\/head>\s*/i, "")
  .replace(/<body>\s*/i, "")
  .replace(/<\/body>\s*/i, "")
  .replace(/<meta charset="utf-8">\s*/i, "")
  .replace(/<meta name="viewport"[^>]*>\s*/i, "")
  .replace('<script src="data.js"></script>', `<script>\n${data}</script>`)
  // story page ships inside the same artifact as motion.html (published via `files`), so the relative link stays
  .replace("height: 100vh;", "height: 100%;")
  // dark-first page: light palette for viewers whose system is light and who haven't picked dark
  .replace(":root[data-theme=\"light\"] {", "@media (prefers-color-scheme: light) { :root:not([data-theme=\"dark\"]) { --bg: #f6f7f9; --panel: #ffffff; --line: #dfe3e8; --text: #14202b; --muted: #55636f; --accent: #9a5b00; --dim: 0.12; color-scheme: light; } }\n:root { color-scheme: dark; }\n:root[data-theme=\"light\"] { color-scheme: light;");
if (!/^<title>/.test(html.trimStart().replace(/^<!--.*?-->\s*/s, ""))) {
  html = html.replace(/<title>.*?<\/title>\s*/, "");
  html = "<title>AK!15 Collective Brain</title>\n" + html;
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(1) + " KB");
