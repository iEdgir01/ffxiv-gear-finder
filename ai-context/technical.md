# Technical Context — Stack & Deploy

## Stack

- Plain HTML/CSS/ES Modules — no bundler, no build step
- Open `index.html` directly in browser (or `python -m http.server 3000`)
- Tests: `npm test` → `node --test tests/*.test.js` — 228 tests, 54 suites

## Deploy

- **Live:** Netlify at https://ffxiv-gear-finder.netlify.app. Auto-deploys on push to main.
- `netlify.toml` runs `npm test` as the build command, publishes the repo root, and sets no-cache headers on html/js/css.
- `.github/workflows/deploy.yml` — CI-only. Runs tests. Does not deploy (Pages deploy removed in favor of Netlify).
- `.github/workflows/weekly-datamine-refresh.yml` — Runs Mondays 06:00 UTC. Fetches xivapi/ffxiv-datamining CSVs. Regenerates `js/gcData.js` and `js/specialVendorData.js`. Runs tests. Commits and pushes if anything changed (triggers a redeploy).

## Module Boundaries

- `constants.js` — data only, no functions
- `search.js` — pure functions, no DOM, no fetch
- `data.js` — fetch + in-memory cache, no DOM
- `api.js` — fetch only, no DOM, no caching
- `garland.js` — fetch + classification, no DOM
- `upgrade.js` — pure upgrade logic, no DOM, no fetch
- `gearBaseline.js` — baseline stat resolution, no DOM, no fetch
- `gearsets.js` — Teamcraft gearset fetch, no DOM
- `lists.js` — localStorage CRUD + Teamcraft URL builder, no DOM
- `listImport.js` — parses pasted text into list items, no DOM, no fetch
- `finderSourceFilter.js` — pure source-filter predicate logic, no DOM
- `itemMeta.js` — generated item metadata constant, data only
- `profiles.js` — localStorage profile CRUD (`gf_profiles_v1`), no DOM
- `gcData.js` — generated constant, data only
- `specialVendorData.js` — generated constant, data only
- `ui.js` — DOM only, emits events, does not call search.js or api.js directly
- `main.js` — orchestrates all others, owns all state
