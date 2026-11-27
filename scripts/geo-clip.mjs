// Morocco without Western Sahara.
// Natural Earth's "Morocco" polygon includes Western Sahara. This clips it at 27.67°N
// (the Morocco / Western Sahara line), so points to the south become one straight edge.
// Used by build-geo.mjs; run directly to patch files that already contain window.AFRICA_GEO:
//   node scripts/geo-clip.mjs app/africa.js release/africa.js release/motion.html
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const MOROCCO_SOUTH = 27.67;

function clipRing(ring, lat = MOROCCO_SOUTH) {
  const inside = (p) => p[1] >= lat - 1e-9;
  const cut = (a, b) => { const t = (lat - a[1]) / (b[1] - a[1]); return [+(a[0] + t * (b[0] - a[0])).toFixed(2), lat]; };
  const pts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring.slice();
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (inside(a)) { out.push(a); if (!inside(b)) out.push(cut(a, b)); }
    else if (inside(b)) out.push(cut(a, b));
  }
  if (out.length < 3) return null;
  out.push(out[0]);
  return out;
}

export function clipMorocco(geo) {
  const f = geo.features.find((x) => x.properties.name === "Morocco");
  if (!f) throw new Error("no Morocco feature");
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const kept = polys.map((poly) => poly.map((r) => clipRing(r)).filter(Boolean)).filter((p) => p.length);
  f.geometry = kept.length === 1 ? { type: "Polygon", coordinates: kept[0] } : { type: "MultiPolygon", coordinates: kept };
  return geo;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, "utf8");
    const re = /window\.AFRICA_GEO = (\{.*?\});\n/s;
    const m = src.match(re);
    if (!m) { console.log("skip (no AFRICA_GEO):", file); continue; }
    const geo = clipMorocco(JSON.parse(m[1]));
    const minLat = Math.min(...JSON.stringify(geo.features.find((x) => x.properties.name === "Morocco").geometry.coordinates).match(/-?\d+(\.\d+)?,(-?\d+(\.\d+)?)/g).map((s) => +s.split(",")[1]));
    fs.writeFileSync(file, src.replace(re, () => `window.AFRICA_GEO = ${JSON.stringify(geo)};\n`));
    console.log("clipped Morocco in", file, "southmost lat", minLat);
  }
}
