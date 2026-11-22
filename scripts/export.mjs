// Builds the presentation dataset (data.js) and copies the app next to it.
//
//   node scripts/export.mjs fixture   → dist/            fictional data, safe to show anywhere
//   node scripts/export.mjs preview   → restricted/preview/  real DRAFT data, team-internal only
//   node scripts/export.mjs release   → release/         only fellows + fields approved in restricted/approvals.json
//
// Same inputs → byte-identical output (no timestamps, sorted keys and lists).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CANON, canonOf, TAXONOMY_VERSION } from "./taxonomy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const RESTRICTED = path.join(ROOT, "restricted");

export const CLUSTERS = {
  "data-ai": "Data & AI",
  "software-cloud": "Software & Cloud",
  "enterprise-transformation": "Enterprise Systems & Digital Transformation",
  "finance": "Finance, Banking & Payments",
  "health": "Health & Life Sciences",
  "engineering": "Engineering, Energy & Manufacturing",
  "operations-quality": "Operations, Supply Chain & Quality",
  "growth-media": "Business Growth, Marketing & Media",
  "programmes-people": "Programmes, Projects & People",
  "sustainability": "Sustainability & ESG",
};

// Fields a fellow can approve for display. Anything not listed here never reaches the bundle.
export const DISPLAY_FIELDS = ["name", "role", "org", "country", "clusters", "skills", "capabilities", "traits", "beyond_cv", "example"];
// Minimum for a fellow to appear as a node at all.
const REQUIRED_FOR_NODE = ["clusters", "skills"];
// Fields that must never appear in any bundle, whatever the approvals say.
export const FORBIDDEN = ["email", "phone", "sources", "identity", "placement_self_reported", "education", "sectors", "raw", "linkedin", "cv"];

// Illustrative partner challenge, the same across modes. Steps reference skills, not people.
const SCENARIO = {
  title: "Illustrative challenge: launching a digital service for distributors in a new African market",
  status: "illustrative",
  steps: [
    { label: "Understand the market", skills: ["Business development & sales", "Marketing & communication", "Multilingual"] },
    { label: "Design the process & systems", skills: ["ERP & SAP systems", "Digital transformation", "Product management", "Software development"] },
    { label: "Make it data-driven", skills: ["Data engineering", "Analytics & BI", "Machine learning & AI", "Cloud & DevOps"] },
    { label: "Deliver it responsibly", skills: ["Project & programme management", "Supply chain & logistics", "Quality management", "Regulatory & compliance"] },
  ],
};

// ---------- fictional fixture ----------
const POOLS = {
  "data-ai": [["Data engineer", "Data engineering", "Analytics & BI"], ["ML engineer", "Machine learning & AI", "Data engineering"], ["Data scientist", "Machine learning & AI", "Analytics & BI"]],
  "software-cloud": [["Software engineer", "Software development", "Cloud & DevOps"], ["Cloud engineer", "Cloud & DevOps", "Software development"]],
  "enterprise-transformation": [["ERP consultant", "ERP & SAP systems", "Digital transformation"], ["Transformation lead", "Digital transformation", "Project & programme management"]],
  "finance": [["Payments product manager", "Payments & fintech", "Product management"], ["Corporate banker", "Banking & trade finance", "Business development & sales"]],
  "health": [["Public health specialist", "Public health", "Monitoring & evaluation"], ["Pharmacist", "Pharmacy & drug safety", "Regulatory & compliance"], ["Clinical researcher", "Clinical research", "Regulatory & compliance"]],
  "engineering": [["Process engineer", "Process & chemical engineering", "Quality management"], ["Automation engineer", "Industrial automation & energy", "Multilingual"]],
  "operations-quality": [["Supply chain specialist", "Supply chain & logistics", "Business development & sales"], ["Quality manager", "Quality management", "Regulatory & compliance"]],
  "growth-media": [["Business developer", "Business development & sales", "Multilingual"], ["Marketing strategist", "Marketing & communication", "Analytics & BI"]],
  "programmes-people": [["Project manager", "Project & programme management", "People & talent"], ["HR performance partner", "People & talent", "Analytics & BI"]],
  "sustainability": [["ESG consultant", "Sustainability & ESG", "Regulatory & compliance"]],
};
const FIXTURE_COUNTRIES = ["Nigeria", "Kenya", "Uganda", "Ethiopia", "Ghana", "Morocco", "Tanzania", "Egypt", "Malawi", "Sudan", "Cameroon"];
function fixtureFellows(n = 32) {
  const keys = Object.keys(POOLS);
  const out = [];
  for (let i = 0; i < n; i++) {
    const c1 = keys[i % keys.length], c2 = keys[(i * 3 + 1) % keys.length];
    const [role, s1, s2] = POOLS[c1][Math.floor(i / keys.length) % POOLS[c1].length];
    const [, s3] = POOLS[c2][i % POOLS[c2].length];
    const id = `X${String(i + 1).padStart(2, "0")}`;
    out.push({
      id, name: `Fictional Fellow ${String(i + 1).padStart(2, "0")}`, role, org: "Example Org",
      country: FIXTURE_COUNTRIES[i % FIXTURE_COUNTRIES.length],
      clusters: c1 === c2 ? [c1] : [c1, c2], skills: [...new Set([s1, s2, s3])].sort(),
      capabilities: [`${s1} (example)`, `${s2} (example)`], traits: "Placeholder trait",
      beyond_cv: "Placeholder: a fact from beyond the CV",
      example: i < 2 ? `Placeholder example of a concrete outcome by ${role.toLowerCase()}.` : undefined,
    });
  }
  return out;
}

// ---------- real data ----------
function realFellows() {
  const src = JSON.parse(fs.readFileSync(path.join(RESTRICTED, "fellows.json"), "utf8"));
  return src.fellows.map((f) => ({ ...f, skills: canonOf(f) }));
}
function loadApprovals(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8")).fellows || {};
}

// Returns the subset of fields this fellow approved for this audience, or null if they're excluded.
export function approvedFields(approval, audience, today) {
  if (!approval || approval.status !== "approved") return null;
  if (approval.withdrawn_at && approval.withdrawn_at <= today) return null;
  if (approval.expires_at && approval.expires_at < today) return null;
  if (!(approval.audiences || []).includes(audience)) return null;
  const fields = (approval.fields || []).filter((f) => DISPLAY_FIELDS.includes(f));
  return REQUIRED_FOR_NODE.every((r) => fields.includes(r)) ? fields : null;
}

function pick(f, fields) {
  const o = { id: f.id };
  for (const k of fields) if (f[k] !== undefined && f[k] !== null && f[k] !== "") o[k] = f[k];
  if (o.clusters) o.clusters = o.clusters.filter((c) => CLUSTERS[c]);
  return o;
}

export function buildDataset(mode, { fellows, approvals = {}, audience = "partner-event", today = "2026-11-18", cohort = 32, respondents = null } = {}) {
  let shown;
  if (mode === "fixture") shown = fellows.map((f) => pick(f, DISPLAY_FIELDS));
  else if (mode === "preview") shown = fellows.map((f) => pick(f, DISPLAY_FIELDS.filter((k) => k !== "example")));
  else if (mode === "release") shown = fellows.map((f) => [f, approvedFields(approvals[f.id], audience, today)]).filter(([, a]) => a).map(([f, a]) => pick(f, a));
  else throw new Error("unknown mode " + mode);
  shown.sort((a, b) => a.id.localeCompare(b.id));

  // Graph: fellow ↔ skill and fellow ↔ cluster edges, derived only from shown fields.
  const skillSet = new Set(shown.flatMap((f) => f.skills || []));
  const skills = CANON.map(([n]) => n).filter((n) => skillSet.has(n)).map((n) => ({ id: n, label: n, count: shown.filter((f) => f.skills?.includes(n)).length }));
  const clusters = Object.entries(CLUSTERS).map(([id, label]) => ({ id, label, count: shown.filter((f) => f.clusters?.includes(id)).length }));
  const edges = [];
  for (const f of shown) {
    for (const s of f.skills || []) edges.push({ id: `${f.id}|skill|${s}`, from: f.id, to: s, type: "has-skill", why: `${f.name || f.id}'s profile lists experience in ${s}.` });
    for (const c of f.clusters || []) edges.push({ id: `${f.id}|cluster|${c}`, from: f.id, to: c, type: "in-cluster", why: `${f.name || f.id} works in ${CLUSTERS[c]}.` });
  }
  const scenario = {
    ...SCENARIO,
    steps: SCENARIO.steps.map((s) => ({ ...s, skills: s.skills.filter((k) => skillSet.has(k)), fellows: shown.filter((f) => f.skills?.some((k) => s.skills.includes(k))).map((f) => f.id) })),
  };
  const examples = shown.filter((f) => f.example).slice(0, 2).map((f) => f.id);
  const topClusters = [...clusters].filter((c) => c.count > 0).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, 3).map((c) => c.id);
  const countries = [...new Set(shown.map((f) => f.country).filter(Boolean))].sort();

  const banner = { fixture: "FICTIONAL DATA: placeholder profiles for layout and rehearsal", preview: "DRAFT: analyst-inferred and not approved by fellows. Internal review only, do not present", release: "" }[mode];
  return {
    meta: {
      mode, banner, dataset_version: mode === "fixture" ? "fixture-1" : "0.1.0", taxonomy_version: TAXONOMY_VERSION, audience: mode === "release" ? audience : null,
      counts: { cohort, displayed: shown.length, respondents: mode === "fixture" ? null : respondents, countries: countries.length },
      title: "32 Minds. One Collective Impact.", subtitle: "AFRIKA KOMMT! 15: what we offer",
    },
    clusters, skills, fellows: shown, edges, scenario, examples, topClusters,
  };
}

export function validate(ds) {
  const errs = [];
  const ids = new Set([...ds.fellows.map((f) => f.id), ...ds.skills.map((s) => s.id), ...ds.clusters.map((c) => c.id)]);
  for (const e of ds.edges) if (!ids.has(e.from) || !ids.has(e.to)) errs.push("dangling edge " + e.id);
  for (const f of ds.fellows) {
    for (const k of Object.keys(f)) if (k !== "id" && !DISPLAY_FIELDS.includes(k)) errs.push(`field ${k} not allowed on ${f.id}`);
    for (const k of FORBIDDEN) if (k in f) errs.push(`forbidden ${k} on ${f.id}`);
  }
  const txt = JSON.stringify(ds);
  if (/@[a-z0-9-]+\.[a-z]{2,}/i.test(txt)) errs.push("email-like string in bundle");
  if (/\+\d{3}\s?\d{3}/.test(txt)) errs.push("phone-like string in bundle");
  if (/linkedin\.com|drive\.google|docs\.google/i.test(txt)) errs.push("source URL in bundle");
  if (ds.meta.counts.displayed !== ds.fellows.length) errs.push("count mismatch");
  return errs;
}

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
  return v;
}

export function writeBundle(ds, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "data.js"), "window.BRAIN_DATA = " + JSON.stringify(stable(ds), null, 1) + ";\n");
  fs.copyFileSync(path.join(ROOT, "app", "index.html"), path.join(outDir, "index.html"));
}

// ---------- CLI ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || "fixture";
  const out = { fixture: path.join(ROOT, "dist"), preview: path.join(RESTRICTED, "preview"), release: path.join(ROOT, "release") }[mode];
  const fellows = mode === "fixture" ? fixtureFellows() : realFellows();
  const ds = buildDataset(mode, {
    fellows, approvals: loadApprovals(path.join(RESTRICTED, "approvals.json")),
    respondents: mode === "fixture" ? null : fellows.length,
    today: new Date().toISOString().slice(0, 10), // decides withdrawals/expiry; not written into the bundle
  });
  const errs = validate(ds);
  if (errs.length) { console.error("VALIDATION FAILED\n" + errs.join("\n")); process.exit(1); }
  writeBundle(ds, out);
  console.log(JSON.stringify({ mode, out: path.relative(ROOT, out), ...ds.meta.counts, skills: ds.skills.length, edges: ds.edges.length }));
}
