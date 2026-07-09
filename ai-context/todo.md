# Todo

## Active
- [ ] pending — add scope from AGENTS.md or user request

## Done
- [x] Netlify deploy switch, level-sync on tab switch/focus, base class generalization (9 base classes via `promotedJobIds`), text import list creator (`js/listImport.js`), API/upgrade fixes (ClassJobs attribution, upgrade job-equip match, retry, perf). 228 tests pass on main.
- [x] GitHub sidebar link — bottom-left of sidebar, links to https://github.com/iEdgir01/ffxiv-gear-finder.
- [x] Deployment — GitHub Pages + CI workflow; weekly datamine-refresh workflow. 134 tests pass on main.
- [x] **Garland Tools removed at runtime** — fetch infrastructure stripped from `garland.js`. Source classification is now synchronous from local item metadata (`gcInfo`, `tomestoneInfo`, `scripInfo`). Zero external requests for acquisition data. Pure functions `parseGarlandDoc`, `classifyAcquisition`, `isGcExclusiveAcquisition`, `syntheticAcqFromItem` retained.
- [x] **Combat tomestone/scrip gear invisible (fixed)** — `specialVendorData.js` uses space-separated abbreviation lists (`"GLA MRD PLD WAR DRK GNB"`) for `classJobCategory`. `jobCanEquipCategory` in `search.js` now handles this format. 4 new tests added. 147 tests pass.
- [x] **Two-screen character overlay** — replaced three-section overlay with manage/add screens. Manage screen: profile cards (portrait, name/server read-only, editable Teamcraft URL, Use/Remove). Add screen: import form + Back button. Opens to manage when profiles exist, add when empty. Auto-switches to manage after import; to add when last profile removed.
- [x] **Server dropdown reset** — `ui.resetAddForm()` clears DC to blank and hides server dropdown every time the add screen is shown, fixing the "server disappears and won't reappear" bug.
- [x] **Teamcraft URL per profile card** — TC linking moved from standalone `#teamcraft-section` to inline editable field on each card. `handleTcSaveForCard` saves URL, loads gearsets if card is the active profile.
- [x] **On-reload level merge** — `refreshCharacterJobsOnLoad` now fetches both Lodestone and Teamcraft job levels, taking the higher value per job. Handles Lodestone lag (TC reflects in-game progress faster). 147 tests pass.
