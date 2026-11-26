// Renders the /offer/ slide kit to 4K PNGs with headless Edge or Chrome:
//   release/offer/export/offer-slide-1..5.png    16:9 What We Offer slide, one per talking point (3840x2160)
//   release/offer/export/offer-graphic-1..5.png  centre graphic only, transparent (2160x2160)
//   release/offer/export/intro-map.png           intro map, 11 countries (3840x2160)
// Needs: `node scripts/build-motion.mjs` first, internet (d3 + font), and the local server on :8015
//   (node scripts/serve.mjs release 8015). Usage: node scripts/export-slides.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "release", "offer", "export");
fs.mkdirSync(OUT, { recursive: true });
const BROWSERS = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"];
const browser = BROWSERS.find((b) => fs.existsSync(b));
if (!browser) throw new Error("no Edge or Chrome found");
const BASE = "http://localhost:8015/offer/index.html";

const jobs = [];
for (let s = 1; s <= 5; s++) {
  jobs.push({ file: `offer-slide-${s}.png`, url: `${BASE}?render=slide&step=${s}`, w: 1920, h: 1080 });
  jobs.push({ file: `offer-graphic-${s}.png`, url: `${BASE}?render=graphic&step=${s}`, w: 1080, h: 1080, transparent: true });
}
jobs.push({ file: "intro-map.png", url: `${BASE}?render=map`, w: 1920, h: 1080 });

for (const j of jobs) {
  const out = path.join(OUT, j.file);
  execFileSync(browser, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${j.w},${j.h}`, "--virtual-time-budget=8000", `--screenshot=${out}`,
    ...(j.transparent ? ["--default-background-color=00000000"] : []), j.url,
  ], { stdio: "ignore", timeout: 60000 });
  console.log(j.file, fs.existsSync(out) ? (fs.statSync(out).size / 1024).toFixed(0) + " KB" : "MISSING");
}
