# FFXIV Gear Finder — Project Index

## Overview
Single-page browser app. Import FFXIV character job levels from Lodestone via XIVAPI. Find best craftable gear at your current level, filtered by gear type and stat, sorted best-first. Also shows Upgrades (vs equipped gear from Teamcraft gearsets) and a Lists tab for saving/exporting to Teamcraft. Plain HTML/CSS/ES Modules, no build step.

## Current Status

### Deployed
- Netlify: https://ffxiv-gear-finder.netlify.app (auto-deploys on push to main; `netlify.toml` runs `npm test` as the build command)
- GitHub Actions (`deploy.yml`): CI-only now (tests), no longer deploys to Pages
- Weekly datamine refresh (`weekly-datamine-refresh.yml`): regenerates GC + special vendor data, auto-commits, re-triggers deploy
- 228 tests passing across 54 suites (`npm test`)

### v1 Core — all complete
- [x] Task 1: Scaffold — all project files, context docs, empty modules.
- [x] Task 2: constants.js — JOB_IDS (39 jobs), JOB_IDS_BY_GROUP, STATS_BY_GROUP, GEAR_TYPES, CLASSJOB_CATEGORY_TO_JOBS.
- [x] Task 3: search.js (TDD) — pure filter/sort functions. 104 passing tests.
- [x] Task 4: data.js — Teamcraft recipe loader with in-memory level index.
- [x] Task 5: api.js — XIVAPI character search + import + item stats batch fetch. 5 unit tests.
- [x] Task 6: index.html + styles.css — full layout, FFXIV dark theme, ARIA roles, loading bar.
- [x] Task 7: ui.js — all sidebar + results rendering. 15+ exports.
- [x] Task 8: main.js — state management, all event wiring, runSearch race-condition guard.
- [x] Task 9: Integration + polish — error/empty/loading states. 104 tests pass.

### v2 Feature Additions — all complete
- [x] Grand Company data generator (`scripts/build-gc-data.mjs` → `js/gcData.js`). GC items merged into pool. Source filter + Include GC toggle in Gear Finder and Upgrades.
- [x] GC stat name normalization — generator maps CSV human-readable names ("Direct Hit Rate") to PascalCase ("DirectHitRate") so combat GC items score correctly.
- [x] Garland acquisition layer (`js/garland.js`) — classifies items craft/gc/vendor/drop, drives source filter and tags.
- [x] Upgrades tab (`js/upgrade.js`) — best available vs equipped gear from Teamcraft gearsets.
- [x] Lists tab (`js/lists.js`) — save gear lists, export to Teamcraft (`id,null,qty;` semicolon base64 URL).
- [x] Character chip + overlay — avatar display, unified import UI.
- [x] Sum-based scoring — `maxGroupStatScore` sums all group stats for ALL job groups (was max). Balanced gear wins on aggregate.
- [x] Priority stat dropdown — null = best overall (sum), selected = sort by that stat only. Options from actual result set. Human-readable labels via `statLabel()`.
- [x] Live search bar (`#finder-search`) — filters by item name substring, client-side, clears on job/group change.
- [x] % gain removed — no `sortByPercent`, `_gainPct`, `showSortToggle`, `maxGroupStatGainPercent`. Raw stat scoring only.
- [x] Recipe level inputs — single-line, 52px wide, dark-themed spinners.
- [x] Teamcraft list export fixed — was sending JSON, now correct `id,null,qty;` semicolon format. 3 tests in `tests/lists.test.js`.
- [x] Post-review fixes: `listProfilesSorted` null-safe name sort; `removeItemFromList` normalises itemId to Number before strict-equality filter.
- [x] GitHub sidebar link — bottom-left of sidebar, links to https://github.com/iEdgir01/ffxiv-gear-finder.
- [x] Deployment — GitHub Pages + CI workflow; weekly datamine-refresh workflow. 134 tests pass on main.

### v3 Fixes & Overlay Redesign — all complete
- [x] **Garland Tools removed at runtime** — fetch infrastructure stripped from `garland.js`. Source classification is now synchronous from local item metadata (`gcInfo`, `tomestoneInfo`, `scripInfo`). Zero external requests for acquisition data. Pure functions `parseGarlandDoc`, `classifyAcquisition`, `isGcExclusiveAcquisition`, `syntheticAcqFromItem` retained.
- [x] **Combat tomestone/scrip gear invisible (fixed)** — `specialVendorData.js` uses space-separated abbreviation lists (`"GLA MRD PLD WAR DRK GNB"`) for `classJobCategory`. `jobCanEquipCategory` in `search.js` now handles this format. 4 new tests added. 147 tests pass.
- [x] **Two-screen character overlay** — replaced three-section overlay with manage/add screens. Manage screen: profile cards (portrait, name/server read-only, editable Teamcraft URL, Use/Remove). Add screen: import form + Back button. Opens to manage when profiles exist, add when empty. Auto-switches to manage after import; to add when last profile removed.
- [x] **Server dropdown reset** — `ui.resetAddForm()` clears DC to blank and hides server dropdown every time the add screen is shown, fixing the "server disappears and won't reappear" bug.
- [x] **Teamcraft URL per profile card** — TC linking moved from standalone `#teamcraft-section` to inline editable field on each card. `handleTcSaveForCard` saves URL, loads gearsets if card is the active profile.
- [x] **On-reload level merge** — `refreshCharacterJobsOnLoad` now fetches both Lodestone and Teamcraft job levels, taking the higher value per job. Handles Lodestone lag (TC reflects in-game progress faster). 147 tests pass.

### v4 Base Classes, Netlify, List Import — all complete
- [x] **Netlify deploy switch** — moved from GitHub Pages to Netlify (`netlify.toml`, build command `npm test`); GitHub Actions `deploy.yml` is CI-only now. No-cache headers on html/js/css.
- [x] **Level-sync on tab switch/focus** — job levels refresh on in-app tab switches and on window focus, not just page load.
- [x] **Base class generalization** — all 9 FFXIV base classes (GLA, PGL, MRD, LNC, ARC, CNJ, THM + existing) added to `JOB_IDS` with `promotedJobIds`, so a base class resolves to its promoted job (e.g. Arcanist → SMN/SCH) throughout filtering, gearset lookup, and upgrade tabs. Data-driven `resolveDisplayJobId`, `withBaseClassJobLevels`, `buildUpgradeTabs` no-gearset empty state.
- [x] **Text import list creator** — `js/listImport.js` + modal UI for creating gear lists from pasted text; job list visibility fixes.
- [x] **API/upgrade fixes** — Lodestone `ClassJobs` level attribution corrected; Upgrades tab matches Gear Finder job-equip rules; equipped-item stats fetch retries on transient XIVAPI failure; background sync skips re-render when nothing changed (perf).
- 228 tests pass on main.

## Key Decisions
- **Plain HTML/CSS/JS, no build step** — open index.html directly; avoids toolchain complexity.
- **Teamcraft GitHub CDN** for recipe data — loaded at startup, indexed in memory (~2-5MB).
- **XIVAPI** for character import + item stats (batched, session-cached).
- **Garland Tools removed at runtime** — was used for acquisition metadata but eliminated (network overhead, unreliable). Source classification is now synchronous from local item metadata. `garland.js` retains pure classification functions; fetch infrastructure removed.
- **Sum scoring for all groups** — avoids single-stat specialists being over-ranked; priority stat dropdown lets user override when they want to optimise a specific stat.
- **GC data from datamining CSVs** (not runtime API) — `feature/datamine-shops` worktree: `GCScripShopItem` + `GCScripShopCategory` (primary) merged with `SpecialShop` CostType 0 seal rows; **no Garland** in `build-gc-data.mjs`. Run `npm run build:gc-data` or `npm run build:datamine-shops`.
- **Teamcraft export format** confirmed from `Aida-Enna/TeamcraftListMaker` Plugin.cs source: `id,null,qty;` semicolon-delimited, base64.
- **% gain removed** — was complex, confusing, and required a Teamcraft baseline. Raw stats are clearer and simpler.
- **Two-screen character overlay** — manage screen (profile cards) vs add screen (import form). Avoids the old embedded three-section design that was hard to navigate with multiple profiles.
- **Job level merge on reload** — take `max(Lodestone, Teamcraft)` per job on page load. Teamcraft reflects in-game progress faster than Lodestone; Lodestone is the fallback when TC is not linked.
- **`specialVendorData.js` uses space-separated abbreviation lists** — `classJobCategory` field uses format like `"GLA MRD PLD WAR DRK GNB"` (not a single keyword). `jobCanEquipCategory` must handle both single-keyword and space-separated formats.
- **Base classes resolve via `promotedJobIds`** — generic delegation (not per-job special-casing) so a base class (e.g. Arcanist, Gladiator) inherits its promoted job's equip rules, gearsets, and upgrade tab. Applies to all 9 base classes uniformly.
- **Netlify over GitHub Pages** — switched deploy target; GitHub Actions retained for CI (tests) only, not deploy.

## File Map
- `ai-context/technical.md` — stack, APIs, data layer, module boundaries, scoring details
- `ai-context/build-plan.md` — ordered tasks + completion status
- `ai-context/ffxiv.md` — FFXIV domain context: job IDs, stat names, gear slots, GC behavior
- `ai-context/todo.md` — active/done task list
- `ai-context/resume.md` — cold-start guide for agents
- `docs/superpowers/specs/` — design specs (base-class generalization, text import list creator, v3 overlay)
- `docs/superpowers/plans/` — implementation plans
- `tests/` — `node --test` unit tests for search, api, lists, garland, upgrade, gearBaseline, gearsets, constants, gcSealCost, finderSourceFilter, listImport, specialVendorData, gcItems.pool (228 tests, 54 suites)

## Rules for all agents working on this project

1. Read this file and all linked ai-context/ files before writing any code or making any plan.
2. After completing any task, update the to-do list: mark it [x] complete with a one-line test result summary and any user feedback received.
3. If a design decision changes during implementation, update the relevant ai-context/ file immediately — do not leave it stale.
4. If you discover something important that is not documented (an undocumented constraint, a gotcha, a key dependency), add it to the relevant ai-context/ file before moving on.
5. Do not start the next sub-project until the current one is marked [x] complete with passing tests confirmed.
6. If the user provides feedback that changes scope or approach, update AGENTS.md and the relevant ai-context/ file before continuing.
7. At the end of every session, verify AGENTS.md and ai-context/ accurately reflect the current state of the project.
