# Build Plan

## Verification Gate Rule
Do not start the next task until the current one passes all its checks.

## Tasks
1. [ ] Scaffold — directory structure, context docs, empty files. Gate: all files exist.
2. [ ] constants.js — FFXIV domain data. Gate: file exports all required constants.
3. [ ] search.js (TDD) — pure functions. Gate: `node --test tests/search.test.js` passes.
4. [ ] data.js — Teamcraft loader. Gate: open index.html, console shows loaded item count.
5. [ ] api.js — XIVAPI character import. Gate: import a real character, levels appear in console.
6. [ ] index.html + styles.css — full layout. Gate: sidebar + results panel visible, correct theme.
7. [ ] ui.js — sidebar + results rendering. Gate: all sidebar sections render, result cards render with mock data.
8. [ ] main.js — state + wiring. Gate: full end-to-end flow works in browser.
9. [ ] Integration + polish — error states, empty states, loading states. Gate: all error paths tested manually.
