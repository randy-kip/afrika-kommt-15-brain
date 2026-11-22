// Builds an Obsidian vault (restricted/brain-vault) from restricted/fellows.json.
// Deterministic: same input → same files. Usage: node build-vault.mjs
import fs from "node:fs";
import path from "node:path";
import { CANON, canonOf } from "./taxonomy.mjs";
const ROOT = "C:/Users/hp/Downloads/ak15-collective-brain/restricted";
const data = JSON.parse(fs.readFileSync(`${ROOT}/fellows.json`, "utf8"));
const V = `${ROOT}/brain-vault`;
fs.rmSync(V, { recursive: true, force: true });
for (const d of ["Fellows", "Clusters", "Capabilities", "Countries", ".obsidian"]) fs.mkdirSync(`${V}/${d}`, { recursive: true });

const safe = (s) => s.replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").trim();
const w = (p, s) => fs.writeFileSync(path.join(V, p), s);
const byCluster = {}, byCap = {}, byCountry = {};
const fellowNote = (f) => `${f.id} ${safe(f.name)}`;


for (const f of data.fellows) {
  const fn = fellowNote(f);
  f.canon = canonOf(f);
  f.clusters.forEach((c) => (byCluster[c] ||= []).push(fn));
  f.canon.forEach((c) => (byCap[c] ||= { cl: new Set(), fs: [] }).fs.push(fn) && f.clusters.forEach((x) => byCap[c].cl.add(x)));
  (byCountry[f.country] ||= []).push(fn);
  w(`Fellows/${fn}.md`, `---
type: fellow
id: ${f.id}
country: ${f.country}
identity: ${f.identity}
review_status: pending
sources: [${f.sources.join(", ")}]
---
# ${f.name}

> DRAFT, analyst-inferred and not yet approved by the fellow.

**${f.role}**${f.org ? `, ${f.org}` : ""}
From [[${f.country}]]

## Clusters
${f.clusters.map((c) => `- [[${data.clusters[c]}]]`).join("\n")}

## Shared skills
${f.canon.map((c) => `- [[${c}]]`).join("\n")}

## Capabilities (detail)
${f.capabilities.map((c) => `- ${c}`).join("\n")}

## Sector knowledge
${f.sectors.map((s) => `- ${s}`).join("\n")}

## Education
${f.education.map((e) => `- ${e}`).join("\n")}

## Beyond the CV
- In their words: *${f.traits}*
- ${f.beyond_cv}
${f.placement_self_reported ? `\n## Placement (self-reported, unconfirmed)\n- ${f.placement_self_reported}\n` : ""}`);
}

for (const [k, label] of Object.entries(data.clusters)) {
  const ms = byCluster[k] || [];
  const caps = Object.entries(byCap).filter(([, v]) => v.cl.has(k)).map(([c]) => c).sort();
  w(`Clusters/${label}.md`, `---\ntype: cluster\nkey: ${k}\nfellows: ${ms.length}\n---\n# ${label}\n\n${ms.length} of ${data.fellows.length} respondents (draft tags).\n\n## Fellows\n${ms.map((m) => `- [[${m}]]`).join("\n")}\n\n## Capabilities in this cluster\n${caps.map((c) => `- [[${c}]]`).join("\n")}\n`);
}
for (const [c, v] of Object.entries(byCap).sort()) {
  w(`Capabilities/${c}.md`, `---\ntype: capability\nfellows: ${v.fs.length}\n---\n# ${c}\n\nClusters: ${[...v.cl].map((x) => `[[${data.clusters[x]}]]`).join(", ")}\n\n${v.fs.map((m) => `- [[${m}]]`).join("\n")}\n`);
}
for (const [c, ms] of Object.entries(byCountry).sort()) {
  w(`Countries/${c}.md`, `---\ntype: country\nfellows: ${ms.length}\n---\n# ${c}\n\n${ms.map((m) => `- [[${m}]]`).join("\n")}\n`);
}

const counts = Object.entries(data.clusters).map(([k, l]) => `| [[${l}]] | ${(byCluster[k] || []).length} |`).join("\n");
w(`00 Index.md`, `# AK!15 Collective Brain (draft)

**RESTRICTED: analyst draft, not approved for display.**

- Cohort: ${data.cohort_facts.target_size} fellows (${data.cohort_facts.target_size_source})
- Profiles in this vault: ${data.fellows.length}, so 1 fellow is missing
- Countries: ${Object.keys(byCountry).length}
- Capabilities: ${Object.keys(byCap).length}
- Dataset version: ${data.version}

| Cluster | Fellows (a fellow can be in several) |
|---|---|
${counts}

Open the **Graph view** to see the brain. Colours: clusters = orange, fellows = blue, capabilities = green, countries = purple.
`);

const rgb = (h) => parseInt(h, 16);
w(`.obsidian/graph.json`, JSON.stringify({
  colorGroups: [
    { query: "path:Clusters", color: { a: 1, rgb: rgb("F59E0B") } },
    { query: "path:Fellows", color: { a: 1, rgb: rgb("3B82F6") } },
    { query: "path:Capabilities", color: { a: 1, rgb: rgb("10B981") } },
    { query: "path:Countries", color: { a: 1, rgb: rgb("8B5CF6") } },
  ],
  showTags: false, showAttachments: false, hideUnresolved: true,
}, null, 2));
console.log({ fellows: data.fellows.length, clusters: Object.keys(data.clusters).length, capabilities: Object.keys(byCap).length, countries: Object.keys(byCountry).length });
console.log(Object.entries(data.clusters).map(([k, l]) => `${l}: ${(byCluster[k] || []).length}`).join("\n"));
