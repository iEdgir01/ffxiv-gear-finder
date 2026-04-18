# FFXIV Gear Finder — Project Index

## Overview
Single-page browser app. Import FFXIV character job levels from Lodestone via XIVAPI. Find best craftable gear at current level, filtered by stat and gear type, sorted best-first. Plain HTML/CSS/ES Modules, no build step.

## Current Status
- [x] Task 1: Scaffold — complete. All project files, context docs, and empty module files created. Git initialized with initial commit.
- [x] Task 2: constants.js — complete. Exports JOB_IDS (33 jobs), DOH/DOL/COMBAT_JOB_IDS arrays, STATS_BY_GROUP, GEAR_TYPES, LEVEL_RANGE_RADIUS.
- [x] Task 3: search.js (TDD) — complete. 15 passing unit tests via `node --test tests/search.test.js`.
- [x] Task 4: data.js — complete. Teamcraft loader with in-memory level index. buildIndex mock test passed. Browser gate pending (requires open browser).
- [x] Task 5: api.js — complete. searchCharacter, fetchCharacterJobs, extractCharacterIdFromUrl, fetchItemStats implemented. escapeHtml on all API strings. characterId validated numeric. 19 search.js tests still pass.
- [x] Task 6: index.html + styles.css — complete. Full sidebar + results panel layout, FFXIV dark theme with CSS variables. ARIA tab roles, focus-visible styles, fixed loading bar animation added post-review.
- [x] Task 7: ui.js — complete. 15 exports, el() helper with createTextNode, ARIA tab toggling. Fixed stacked combat-select listener bug post-review.
- [ ] Task 8: main.js — pending
- [ ] Task 9: Integration + polish — pending

## Key Decisions
- Plain HTML/CSS/JS, no build step — open index.html directly in browser
- Teamcraft GitHub CDN for recipe data (loaded at startup, cached in memory)
- XIVAPI for character import + item stats (batched per search, cached)
- Fixed +-5 level range around group average
- Job group selection: DoH avg / DoL avg / individual combat job
- search.js is pure (no DOM) — unit tested with Node.js built-in test runner

## File Map
- `ai-context/technical.md` — stack, APIs, data layer
- `ai-context/build-plan.md` — ordered tasks + verification gates
- `ai-context/ffxiv.md` — FFXIV domain context (job IDs, stat names)
- `docs/superpowers/specs/2026-04-18-ffxiv-gear-finder-design.md` — original design spec: UI layout detail, error handling, full search behaviour

## Agent Rules
1. Read this file and all linked ai-context/ files before writing any code or making any plan.
2. After completing any task, update the to-do list: mark it [x] complete with a one-line test result summary.
3. If a design decision changes during implementation, update the relevant ai-context/ file immediately.
4. If you discover something important not documented, add it to the relevant ai-context/ file before moving on.
5. Do not start the next task until the current one is marked complete with passing tests confirmed.
6. If the user provides feedback that changes scope, update AGENTS.md and relevant ai-context/ before continuing.
7. At the end of every session, verify AGENTS.md and ai-context/ accurately reflect current state.
