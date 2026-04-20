# Build Plan

## Verification Gate Rule
Do not start the next task until the current one passes all its checks.

## Tasks

### v1 Core
1. [x] Scaffold — directory structure, context docs, empty files.
2. [x] constants.js — FFXIV domain data. Exports JOB_IDS (39 jobs), JOB_IDS_BY_GROUP, STATS_BY_GROUP, GEAR_TYPES, CLASSJOB_CATEGORY_TO_JOBS.
3. [x] search.js (TDD) — pure filter/sort functions. 104 passing tests (expanded iteratively).
4. [x] data.js — Teamcraft loader with in-memory level index.
5. [x] api.js — XIVAPI character import + item stats. 5 unit tests pass.
6. [x] index.html + styles.css — full layout, FFXIV dark theme, ARIA roles.
7. [x] ui.js — sidebar + results rendering. 15+ exports.
8. [x] main.js — state management + all event wiring. Race-condition guard on runSearch.
9. [x] Integration + polish — error/empty/loading states. 104 unit tests pass.

### v2 Feature Additions (all complete)
10. [x] Grand Company data generator — `scripts/build-gc-data.mjs` builds `js/gcData.js` from xivapi/ffxiv-datamining CSVs. GC items merged into pool via `data.js`. Source filter (All/GC/Craft) + Include GC toggle in both Gear Finder and Upgrades.
11. [x] Garland acquisition layer — `js/garland.js` classifies items as craft/gc/vendor/drop. Drives source filter and acquisition tags on cards.
12. [x] Upgrades tab — `js/upgrade.js` compares equipped gear vs best available. Teamcraft gearset import via `fetchGearsetsForUser`. Per-job tabs in Upgrades toolbar.
13. [x] Lists tab — `js/lists.js` manage saved gear lists, export to Teamcraft via `id,null,qty;` base64 URL format.
14. [x] Character chip + overlay — avatar/portrait display, unified import UI.
15. [x] Sum-based scoring — `maxGroupStatScore` sums all group stats (was max). Applies to ALL groups (DoH, DoL, DoW, DoM). Balanced gear scores = sum of its relevant stats.
16. [x] Priority stat dropdown — `state.priorityStat`; null = best overall (sum), set = sort by single stat. Options populated from stats actually present on current result set. Human-readable labels via `statLabel()`.
17. [x] Live search bar — `#finder-search` filters results by item name (substring, case-insensitive). Clears on job group or job change (`clearSearch()`).
18. [x] GC stat name normalization — `build-gc-data.mjs` normalises CSV human-readable names ("Direct Hit Rate" → "DirectHitRate") so GC combat items score correctly against STATS_BY_GROUP.
19. [x] Teamcraft list export fix — format is `id,null,qty;id,null,qty` (semicolons), base64 via `btoa()`. Was incorrectly sending JSON.
20. [x] % gain removal — removed `sortByPercent`, `_gainPct`, `showSortToggle`, `maxGroupStatGainPercent`, `resolveBaselineStats` usage. Scoring is raw stats only.
21. [x] Recipe level inputs — single-line row, 52px-wide inputs, dark-themed spinners, font-size 0.88em.

### v3 Fixes & Overlay Redesign (all complete)
22. [x] Garland Tools runtime fetch removed — `garland.js` pure functions retained; no network calls at runtime. Source classification synchronous from local item metadata. 147 tests pass.
23. [x] Combat tomestone/scrip gear fix — `jobCanEquipCategory` extended to handle space-separated abbreviation lists (`"GLA MRD PLD WAR DRK GNB"`) used by `specialVendorData.js`. 4 new tests. 147 tests pass.
24. [x] Two-screen character overlay — manage screen (profile cards) + add screen (import form). Screen logic: profiles exist → manage, none → add, import success → manage, last removed → add. `resetAddForm()` fixes server dropdown bug. 147 tests pass.
25. [x] Per-card Teamcraft URL — TC linking moved from standalone section to inline field on each profile card. `handleTcSaveForCard` saves + loads gearsets if card is active profile.
26. [x] On-reload Lodestone + Teamcraft merge — `refreshCharacterJobsOnLoad` fetches both sources, takes max level per job. Handles Lodestone lag behind in-game progress. 147 tests pass.
