// Release-rule tests. Run: node scripts/test-export.mjs
import assert from "node:assert/strict";
import { buildDataset, validate, approvedFields } from "./export.mjs";

const fellows = [
  { id: "T01", name: "Ada Test", role: "Engineer", org: "Org A", country: "Kenya", clusters: ["engineering"], skills: ["Process & chemical engineering"], capabilities: ["x"], email: "ada@example.com", identity: "confirmed-link", sources: ["cv"] },
  { id: "T02", name: "Ben Test", role: "Analyst", org: "Org B", country: "Ghana", clusters: ["data-ai"], skills: ["Analytics & BI", "Process & chemical engineering"], capabilities: ["y"] },
  { id: "T03", name: "Cy Test", role: "PM", org: "Org C", country: "Egypt", clusters: ["programmes-people"], skills: ["Project & programme management"], capabilities: ["z"] },
];
const base = ["name", "role", "country", "clusters", "skills"];
const approvals = {
  T01: { status: "approved", audiences: ["partner-event"], fields: base },                                     // org withheld
  T02: { status: "approved", audiences: ["partner-event"], fields: [...base, "org"], withdrawn_at: "2026-11-10" }, // withdrawn
  T03: { status: "approved", audiences: ["internal"], fields: base },                                          // wrong audience
};
let n = 0;
const t = (name, fn) => { fn(); n++; console.log("ok", name); };

t("withheld field is absent", () => {
  const ds = buildDataset("release", { fellows, approvals });
  const a = ds.fellows.find((f) => f.id === "T01");
  assert.ok(a);
  assert.equal(a.org, undefined);
  assert.deepEqual(validate(ds), []);
});
t("withdrawn fellow removed from nodes, edges, counts, search text and scenario", () => {
  const ds = buildDataset("release", { fellows, approvals });
  assert.equal(ds.fellows.some((f) => f.id === "T02"), false);
  assert.equal(ds.edges.some((e) => e.from === "T02"), false);
  assert.equal(ds.skills.some((s) => s.id === "Analytics & BI"), false, "skill only T02 had must disappear");
  assert.equal(ds.skills.find((s) => s.id === "Process & chemical engineering").count, 1);
  assert.equal(ds.meta.counts.displayed, 1);
  assert.equal(JSON.stringify(ds).includes("Ben Test"), false);
  assert.equal(ds.scenario.steps.some((s) => s.fellows.includes("T02")), false);
});
t("withdrawal dated in the future does not apply yet", () => {
  const a = { ...approvals.T02, withdrawn_at: "2027-01-01" };
  assert.ok(approvedFields(a, "partner-event", "2026-11-18"));
});
t("expired approval excluded", () => {
  assert.equal(approvedFields({ ...approvals.T01, expires_at: "2026-11-01" }, "partner-event", "2026-11-18"), null);
});
t("approval for another audience excluded", () => {
  const ds = buildDataset("release", { fellows, approvals });
  assert.equal(ds.fellows.some((f) => f.id === "T03"), false);
});
t("approval without clusters+skills does not create a node", () => {
  assert.equal(approvedFields({ status: "approved", audiences: ["partner-event"], fields: ["name"] }, "partner-event", "2026-11-18"), null);
});
t("pending or missing approval excluded (unreadable/absent approvals file → nothing shown)", () => {
  const ds = buildDataset("release", { fellows, approvals: {} });
  assert.equal(ds.fellows.length, 0);
  assert.equal(ds.edges.length, 0);
  assert.deepEqual(validate(ds), []);
});
t("restricted fields never exported, even if approved", () => {
  const ds = buildDataset("release", { fellows, approvals: { T01: { status: "approved", audiences: ["partner-event"], fields: [...base, "email", "identity", "sources"] } } });
  const a = ds.fellows[0];
  assert.equal(a.email, undefined); assert.equal(a.identity, undefined); assert.equal(a.sources, undefined);
});
t("validator catches leaked fields and contact data", () => {
  const ds = buildDataset("release", { fellows, approvals });
  ds.fellows[0].email = "ada@example.com";
  const errs = validate(ds);
  assert.ok(errs.some((e) => e.includes("email")));
});
t("preview never carries identity flags or sources", () => {
  const ds = buildDataset("preview", { fellows });
  assert.equal(JSON.stringify(ds).includes("confirmed-link"), false);
  assert.equal(JSON.stringify(ds).includes("example.com"), false);
});
t("same input → identical dataset", () => {
  const a = JSON.stringify(buildDataset("release", { fellows, approvals }));
  const b = JSON.stringify(buildDataset("release", { fellows: [...fellows].reverse(), approvals }));
  assert.equal(a, b);
});
console.log(`\n${n} tests passed`);
