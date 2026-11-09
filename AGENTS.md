# FFXIV Gear Finder — Project Index

## Overview

This is a single-page browser app.
It imports FFXIV character job levels from Lodestone through XIVAPI.
It finds the best craftable gear at your current level.
You can filter gear by type and stat.
Results sort best-first.
The app also shows Upgrades (equipped gear from Teamcraft gearsets vs available gear).
A Lists tab lets you save gear lists and export them to Teamcraft.
The app uses plain HTML, CSS, and ES Modules.
It has no build step.

## Current Status

### Deployed

- Netlify: https://ffxiv-gear-finder.netlify.app (auto-deploys on push to main; `netlify.toml` runs `npm test` as the build command)
- GitHub Actions (`deploy.yml`): CI-only (tests); no longer deploys to Pages
- Weekly datamine refresh (`weekly-datamine-refresh.yml`): regenerates GC + special vendor data, auto-commits, re-triggers deploy
- 228 tests passing across 54 suites (`npm test`)

### v1-v4 — all complete

All four milestones are done: core app, GC/Garland/Upgrades/Lists, overlay redesign, and base classes + Netlify + list import.
Full task breakdown: `ai-context/build-plan.md`.
228 tests pass on main.

## Key Decisions

- **Plain HTML/CSS/JS, no build step.** Open `index.html` directly.
- **Teamcraft GitHub CDN for recipe data.** Loaded at startup. Indexed in memory (about 2–5MB).
- **XIVAPI for character import and item stats.** Requests are batched and cached per session.
- **Garland Tools removed at runtime.** Source classification now runs from local item metadata. `garland.js` keeps pure classification functions. Fetch infrastructure was removed.
- **Sum scoring for all groups.** Avoids over-ranking single-stat specialists. A priority-stat dropdown can override sort.
- **GC data comes from datamining CSVs, not a runtime API.** Primary source: `GCScripShopItem` and `GCScripShopCategory`. Build merges in `SpecialShop` CostType 0 seal rows. Run `npm run build:gc-data` or `npm run build:datamine-shops`.
- **Teamcraft export format is confirmed from source.** Verified against `Aida-Enna/TeamcraftListMaker` Plugin.cs. Format: `id,null,qty;`, semicolon-delimited, base64-encoded.
- **% gain was removed.** Raw stats are clearer. The feature also required a Teamcraft baseline.
- **Two-screen character overlay.** Manage screen (profile cards) and add screen (import form).
- **Job level merge on reload.** On page load, the app takes `max(Lodestone, Teamcraft)` per job.
- **`specialVendorData.js` uses space-separated abbreviation lists.** Example: `"GLA MRD PLD WAR DRK GNB"`. `jobCanEquipCategory` must handle single-keyword and space-separated formats.
- **Base classes resolve through `promotedJobIds`.** Generic delegation, not per-job special-casing. Applies to all 9 base classes.
- **Netlify replaced GitHub Pages as the deploy target.** GitHub Actions still runs CI (tests).

## File Map

- `ai-context/technical.md` — stack, APIs, data layer, module boundaries, scoring
- `ai-context/build-plan.md` — ordered tasks + completion status
- `ai-context/ffxiv.md` — FFXIV domain context: job IDs, stat names, gear slots, GC behavior
- `ai-context/todo.md` — active/done task list
- `ai-context/resume.md` — cold-start guide
- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans
- `tests/` — `node --test` unit tests (228 tests, 54 suites)

## Rules for all agents working on this project

1. Read this file and all linked ai-context/ files before writing any code or making any plan.
2. After completing any task, update the to-do list: mark it [x] complete with a one-line test result summary and any user feedback received.
3. If a design decision changes during implementation, update the relevant ai-context/ file immediately — do not leave it stale.
4. If you discover something important that is not documented (an undocumented constraint, a gotcha, a key dependency), add it to the relevant ai-context/ file before moving on.
5. Do not start the next sub-project until the current one is marked [x] complete with passing tests confirmed.
6. If the user provides feedback that changes scope or approach, update AGENTS.md and the relevant ai-context/ file before continuing.
7. At the end of every session, verify AGENTS.md and ai-context/ accurately reflect the current state of the project.
