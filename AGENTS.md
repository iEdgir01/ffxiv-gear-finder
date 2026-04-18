# FFXIV Gear Finder — Project Index

## Overview
Single-page browser app. Import FFXIV character job levels from Lodestone via XIVAPI. Find best craftable gear at current level, filtered by stat and gear type, sorted best-first. Plain HTML/CSS/ES Modules, no build step.

## Current Status
- [ ] Task 1: Scaffold — pending
- [ ] Task 2: constants.js — pending
- [ ] Task 3: search.js (TDD) — pending
- [ ] Task 4: data.js — pending
- [ ] Task 5: api.js — pending
- [ ] Task 6: index.html + styles.css — pending
- [ ] Task 7: ui.js — pending
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

## Agent Rules
1. Read this file and all linked ai-context/ files before writing any code or making any plan.
2. After completing any task, update the to-do list: mark it [x] complete with a one-line test result summary.
3. If a design decision changes during implementation, update the relevant ai-context/ file immediately.
4. If you discover something important not documented, add it to the relevant ai-context/ file before moving on.
5. Do not start the next task until the current one is marked complete with passing tests confirmed.
6. If the user provides feedback that changes scope, update AGENTS.md and relevant ai-context/ before continuing.
7. At the end of every session, verify AGENTS.md and ai-context/ accurately reflect current state.
