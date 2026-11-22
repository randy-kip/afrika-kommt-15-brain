// Cleans restricted/linkedin-raw/*.json into compact per-fellow text (restricted/linkedin-clean.md).
// Usage: node li-clean.mjs
import fs from "node:fs";
const DIR = "C:/Users/hp/Downloads/ak15-collective-brain/restricted";
const RAW = DIR + "/linkedin-raw";

const stopAt = (t, ...m) => { for (const x of m) { const i = t.indexOf(x); if (i >= 0) t = t.slice(0, i); } return t; };
const NOISE = /^(Endorse|\d+ endorsements?|Passed LinkedIn Skill Assessment|All|Industry Knowledge|Tools & Technologies|Interpersonal Skills|Other Skills|Skills|Experience|Education|Show all.*|Show more|Message|Connect|Follow|·|.*\.pdf|Contact info|More|\d+\+? connections|.*mutual connections?)$/;

function lines(t) { return t.split("\n").map(s => s.trim()).filter(s => s && !NOISE.test(s)); }

let out = "# LinkedIn compact extract (RESTRICTED, analyst use only)\n\n";
for (const f of fs.readdirSync(RAW).filter(f => f.endsWith(".json")).sort()) {
  const r = JSON.parse(fs.readFileSync(`${RAW}/${f}`, "utf8"));
  const top = lines(stopAt(r.top?.text || "", "\nActivity", "More profiles for you"));
  const head = top.filter(l => !/^· (1st|2nd|3rd\+?)$|^(She|He|They)\/\w+$/.test(l)).slice(0, 4);
  const exp = lines(stopAt(r.experience?.text || "", "More profiles for you"))
    .map(l => l.length > 260 ? l.slice(0, 260) + "…" : l).slice(0, 60);
  const edu = lines(stopAt(r.education?.text || "", "More profiles for you"))
    .map(l => l.length > 160 ? l.slice(0, 160) + "…" : l).slice(0, 25);
  const skills = lines(stopAt(r.skills?.text || "", "More profiles for you"))
    .filter(l => !/ at |^Company logo|^\d+ experiences? /.test(l)).slice(0, 40);
  out += `## ${r.fellow_id}\n**Top:** ${head.join(" | ")}\n\n**Experience:**\n${exp.join("\n")}\n\n**Education:**\n${edu.join("\n")}\n\n**Skills:** ${[...new Set(skills)].join("; ")}\n\n---\n\n`;
}
fs.writeFileSync(DIR + "/linkedin-clean.md", out);
console.log("chars", out.length);
