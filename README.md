# AK!15 Collective Brain

An interactive capability map of the AFRIKA KOMMT! 15 cohort for the "What we offer" segment of the partner-company presentation. It runs fully offline: one HTML file plus one data file, with no fonts, APIs or analytics loaded from the internet.

## Folders

| Folder | What's in it | Share? |
|---|---|---|
| `app/` | The app source (`index.html` map, `motion.html` story, `africa.js` shapes + flags) | yes |
| `scripts/` | Import, export, vault and test scripts | yes |
| `dist/` | App + **fictional** data, for rehearsal and layout | yes |
| `release/` | App + **only fellow-approved** data (committed; public while hosted on GitHub Pages) | only for the approved audience |
| `restricted/` | Fellow data, raw LinkedIn text, audit, draft preview, approvals, Obsidian vault | **no**: never commit, sync or email |

## Commands (Node 18+)

```bash
node scripts/export.mjs fixture    # → dist/                fictional data
node scripts/export.mjs preview    # → restricted/preview/  real DRAFT data, team review only
node scripts/export.mjs release    # → release/             approved fellows + fields only
node scripts/build-vault.mjs       # → restricted/brain-vault/  Obsidian vault
node scripts/test-export.mjs       # release-rule tests
```

Each export validates its own output: no dangling edges, no fields outside the allowlist, and no emails, phone numbers or source URLs. If validation fails, nothing is written.

## Approving a fellow

1. Send the fellow their draft from `restricted/fellows.json` or the vault note, and get their corrections and approval.
2. Apply the corrections in `restricted/fellows.json`.
3. Add them to `restricted/approvals.json` with the audience and the exact fields they approved.
4. Run `node scripts/export.mjs release`.

**Withdrawal:** set `withdrawn_at` on that fellow, then re-run the release export. They disappear from the nodes, edges, counts, search and scenario. Replace any slides or screenshots made before the withdrawal.

## Using the app

- Open `index.html` from `dist/`, `release/` or `restricted/preview/` in a browser. Double-clicking the file works.
- **Explore:** click a fellow, skill or cluster to see its connections. Search filters by name, role, skill or country. Esc or Reset clears it.
- **Directory:** the same information as a keyboard-accessible table.
- **Present ▶:** 10 steps: overview, the top 3 clusters, "Beyond the CV" (4 interesting facts in the fellows' own words), the 4-step illustrative challenge, then the invitation. Keys: → or Space for next, ← for back, R to restart, F for full screen, Esc to exit.
- **✦ Fun fact:** jumps through the fellows one by one and shows their interesting fact. Hovering over any fellow shows it too.
- ◐ toggles light and dark (light can be easier to read on some projectors).

## Status (2026-11-18)

- The cohort gave sign-off (2026-11-18), recorded in `restricted/approvals.json`. The release build shows all 32 fellows: role and org, skills and clusters from their CV/LinkedIn, plus their interesting fact in their own words. Other form answers, education and placements are not shown. Audience: internal, for AFRIKA KOMMT! partner companies.
- The partner-challenge scenario is **illustrative**, and it's labelled that way in the app.
- Taxonomy v0.1: 25 shared skills mapped by keyword rules in `scripts/taxonomy.mjs`. Review the mapping before it's frozen.

## Data and hosting

This repository is **public for now** (temporary, until the site moves to a host with a login). It holds the code, the fictional `dist/` data, and `release/`: the approved build, the same three files the Claude artifact serves. `.gitignore` keeps out `restricted/` (raw sources, CVs, LinkedIn text, the audit, approvals) and the helper scripts that embed fellow names, facts or profile links.

The page people see has three files, built locally from the approved data:

```bash
node scripts/export.mjs release   # release/index.html + release/data.js
node scripts/build-motion.mjs     # release/motion.html (the Africa-map story)
```

- `release/index.html`: the capability map, with "▶ Watch the story" linking to `motion.html`
- `release/motion.html`: the scroll story, with "← Back to map" linking to `index.html`
- `release/data.js`: the approved fellow data, the only file with personal data

**Current hosting:** GitHub Pages deploys `release/` on every push to `main` (`.github/workflows/pages.yml`), with every page marked `noindex`. The site is open to anyone who has the link.

To move hosting, upload `release/` as a static site (it needs no build step on the host), or point a host at a **private** copy that contains `release/data.js`. Put the site behind a login (for example Cloudflare Access) when partners outside the team use it.

`node scripts/build-artifact.mjs` packs `release/` into the single-file Claude artifact (`restricted/artifacts/brain-v1.html`), published with `motion.html` and `data.js` beside it.

Map shapes come from Natural Earth (public domain) via world-atlas. Flags come from flag-icons (MIT). Both are generated into `app/africa.js` by `scripts/build-geo.mjs`.
