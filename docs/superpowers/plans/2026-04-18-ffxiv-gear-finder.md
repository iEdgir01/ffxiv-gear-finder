# FFXIV Gear Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a plain HTML/CSS/JS browser app that imports FFXIV character job levels from Lodestone and finds the best craftable gear by stat, filtered by gear type, with results sorted best-first.

**Architecture:** Sidebar + results panel SPA. Teamcraft GitHub CDN provides recipe data (loaded at startup). XIVAPI provides character job levels (on import) and item stats (batched per level-range search, cached in memory). Five focused JS modules with clear boundaries; `search.js` is pure and unit-tested with the Node.js built-in test runner.

**Tech Stack:** HTML/CSS/ES Modules (no build step), Node.js 18+ built-in test runner for `search.js` unit tests, XIVAPI public API, Teamcraft GitHub raw CDN.

---

## File Map

| File | Role |
|---|---|
| `index.html` | App shell — sidebar + results panel layout, loads all JS as modules |
| `css/styles.css` | All styles — FFXIV dark theme |
| `js/constants.js` | FFXIV domain data: job ID map, stat groups, gear types (no logic) |
| `js/search.js` | Pure functions: filter, sort, group average, level range |
| `js/data.js` | Teamcraft data loader — fetches + indexes recipes/items, caches in memory |
| `js/api.js` | XIVAPI calls: character search, character job levels, item stats batch |
| `js/ui.js` | DOM rendering: sidebar sections + result cards, emits custom events |
| `js/main.js` | App init, state object, event wiring — ties all modules together |
| `tests/search.test.js` | Unit tests for `search.js` pure functions |
| `package.json` | `{ "type": "module" }` only — enables ES modules in Node for tests |
| `CLAUDE.md` | Project entry point for agents |
| `AGENTS.md` | Project index, status, to-do, agent rules |
| `ai-context/technical.md` | Stack, APIs, data layer details |
| `ai-context/build-plan.md` | Ordered sub-projects + verification gates |
| `ai-context/ffxiv.md` | FFXIV domain context |

---

## Task 1: Project scaffold + context docs

**Files:**
- Create: `package.json`
- Create: `CLAUDE.md`
- Create: `AGENTS.md`
- Create: `ai-context/technical.md`
- Create: `ai-context/build-plan.md`
- Create: `ai-context/ffxiv.md`
- Create: `index.html` (shell only)
- Create: `css/styles.css` (empty)
- Create: `js/constants.js` (empty)
- Create: `js/search.js` (empty)
- Create: `js/data.js` (empty)
- Create: `js/api.js` (empty)
- Create: `js/ui.js` (empty)
- Create: `js/main.js` (empty)
- Create: `tests/search.test.js` (empty)

- [ ] **Step 1: Create package.json**

```json
{ "type": "module" }
```

- [ ] **Step 2: Create index.html shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FFXIV Gear Finder</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <h1>FFXIV Gear Finder</h1>
      <div id="import-section"></div>
      <div id="job-group-section"></div>
      <div id="stat-section"></div>
      <div id="gear-type-section"></div>
    </aside>
    <main id="results-panel">
      <div id="results-header"></div>
      <div id="results-grid"></div>
    </main>
  </div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create empty JS files and css/styles.css**

Create each as an empty file with a single comment line:
- `css/styles.css` — `/* FFXIV Gear Finder styles */`
- `js/constants.js` — `// FFXIV domain constants`
- `js/search.js` — `// Pure filter/sort functions`
- `js/data.js` — `// Teamcraft data loader`
- `js/api.js` — `// XIVAPI client`
- `js/ui.js` — `// DOM rendering`
- `js/main.js` — `// App init and state`
- `tests/search.test.js` — `// search.js unit tests`

- [ ] **Step 4: Create CLAUDE.md**

```markdown
# FFXIV Gear Finder

A browser-based tool for finding the best craftable FFXIV gear at your current job levels. Import your character from Lodestone, pick a stat, and get a sorted list of craftable gear — no backend, no build step.

Read `AGENTS.md` before doing anything on this project.
Keep all `ai-context/` files and `AGENTS.md` up to date as you work.

-> [AGENTS.md](AGENTS.md)
```

- [ ] **Step 5: Create AGENTS.md**

```markdown
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
```

- [ ] **Step 6: Create ai-context/technical.md**

```markdown
# Technical Context

## Stack
- Plain HTML/CSS/ES Modules — no bundler, no build step
- Open index.html directly in browser (or use `npx serve .` for a local server)
- Node.js 18+ built-in test runner for unit tests: `node --test tests/search.test.js`

## Data Sources

### Teamcraft (recipe data, loaded at startup)
Base URL: https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/data/
- `recipes.json` — array of recipe objects: { id, job, lvl, rlvl, result, yields, ingredients }
- `items.json` — object keyed by item ID: { "6116": { "en": "Rose Gold Ring", ... } }

Loaded once at app startup, indexed in memory. ~2-5MB total.

### XIVAPI (character import + item stats)
- Character search: GET https://xivapi.com/character/search?name={name}&server={server}
- Character jobs: GET https://xivapi.com/character/{id}?data=CJ
- Item stats: GET https://xivapi.com/search?indexes=Item&filters=ID|={id1,id2,...}&columns=ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory

PROVISIONAL: Verify the exact Stats field name and structure from a live XIVAPI response
before writing the stats parser. The field may be Bonuses or Stats depending on item type.

## Module Boundaries
- `constants.js` — data only, no functions
- `search.js` — pure functions, no DOM, no fetch
- `data.js` — fetch + in-memory cache, no DOM
- `api.js` — fetch only, no DOM, no caching
- `ui.js` — DOM only, emits events, does not call search.js or api.js
- `main.js` — orchestrates all others, owns state
```

- [ ] **Step 7: Create ai-context/build-plan.md**

```markdown
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
```

- [ ] **Step 8: Create ai-context/ffxiv.md**

```markdown
# FFXIV Domain Context

## Level Cap
Current cap (Dawntrail): 100. Recipe levels go 1-100.

## Job Groups
- DoH (Disciples of the Hand) — crafting jobs, 8 total
- DoL (Disciples of the Land) — gathering jobs, 3 total
- Combat — all combat jobs, used for combat gear search

## Job ID to Abbreviation Map (stable across patches)
| ID | Abbr | Name | Group |
|---|---|---|---|
| 8  | CRP | Carpenter     | DoH |
| 9  | BSM | Blacksmith    | DoH |
| 10 | ARM | Armorer       | DoH |
| 11 | GSM | Goldsmith     | DoH |
| 12 | LTW | Leatherworker | DoH |
| 13 | WVR | Weaver        | DoH |
| 14 | ALC | Alchemist     | DoH |
| 15 | CUL | Culinarian    | DoH |
| 16 | MIN | Miner         | DoL |
| 17 | BTN | Botanist      | DoL |
| 18 | FSH | Fisher        | DoL |
| 19 | PLD | Paladin       | Combat |
| 20 | MNK | Monk          | Combat |
| 21 | WAR | Warrior       | Combat |
| 22 | DRG | Dragoon       | Combat |
| 23 | BRD | Bard          | Combat |
| 24 | WHM | White Mage    | Combat |
| 25 | BLM | Black Mage    | Combat |
| 26 | SMN | Summoner      | Combat |
| 27 | SCH | Scholar       | Combat |
| 28 | NIN | Ninja         | Combat |
| 29 | MCH | Machinist     | Combat |
| 30 | DRK | Dark Knight   | Combat |
| 31 | AST | Astrologian   | Combat |
| 32 | SAM | Samurai       | Combat |
| 33 | RDM | Red Mage      | Combat |
| 34 | BLU | Blue Mage     | Combat |
| 35 | GNB | Gunbreaker    | Combat |
| 36 | DNC | Dancer        | Combat |
| 37 | RPR | Reaper        | Combat |
| 38 | SGE | Sage          | Combat |
| 39 | VPR | Viper         | Combat |
| 40 | PCT | Pictomancer   | Combat |

## Stats by Group
- DoH gear stats: CP, Craftsmanship, Control
- DoL gear stats: GP, Gathering, Perception
- Combat primary stats: Strength, Dexterity, Mind, Intelligence, Vitality
- Combat secondary stats: CriticalHit, DirectHitRate, Determination, SkillSpeed, SpellSpeed, Tenacity, Piety

PROVISIONAL: Confirm exact stat key names from a live XIVAPI item response.

## Gear Slot Types
Ring, Earring, Necklace, Bracelet, Head, Body, Hands, Legs, Feet, MainHand, OffHand

## Recipe Level vs Item Level
- Recipe level (lvl): the crafting job level required to craft the item — filter by this
- Item level (ilvl): the power level of the result — display on cards only
```

- [ ] **Step 9: Verify directory structure**

Run: `find . -not -path './.git/*' | sort`

Expected output includes all files listed in the File Map above.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "chore: project scaffold, context docs, empty module files"
```

---

## Task 2: constants.js

**Files:**
- Modify: `js/constants.js`

- [ ] **Step 1: Write constants.js**

```js
export const JOB_IDS = {
  8:  { abbr: 'CRP', name: 'Carpenter',     group: 'doh' },
  9:  { abbr: 'BSM', name: 'Blacksmith',    group: 'doh' },
  10: { abbr: 'ARM', name: 'Armorer',       group: 'doh' },
  11: { abbr: 'GSM', name: 'Goldsmith',     group: 'doh' },
  12: { abbr: 'LTW', name: 'Leatherworker', group: 'doh' },
  13: { abbr: 'WVR', name: 'Weaver',        group: 'doh' },
  14: { abbr: 'ALC', name: 'Alchemist',     group: 'doh' },
  15: { abbr: 'CUL', name: 'Culinarian',    group: 'doh' },
  16: { abbr: 'MIN', name: 'Miner',         group: 'dol' },
  17: { abbr: 'BTN', name: 'Botanist',      group: 'dol' },
  18: { abbr: 'FSH', name: 'Fisher',        group: 'dol' },
  19: { abbr: 'PLD', name: 'Paladin',       group: 'combat' },
  20: { abbr: 'MNK', name: 'Monk',          group: 'combat' },
  21: { abbr: 'WAR', name: 'Warrior',       group: 'combat' },
  22: { abbr: 'DRG', name: 'Dragoon',       group: 'combat' },
  23: { abbr: 'BRD', name: 'Bard',          group: 'combat' },
  24: { abbr: 'WHM', name: 'White Mage',    group: 'combat' },
  25: { abbr: 'BLM', name: 'Black Mage',    group: 'combat' },
  26: { abbr: 'SMN', name: 'Summoner',      group: 'combat' },
  27: { abbr: 'SCH', name: 'Scholar',       group: 'combat' },
  28: { abbr: 'NIN', name: 'Ninja',         group: 'combat' },
  29: { abbr: 'MCH', name: 'Machinist',     group: 'combat' },
  30: { abbr: 'DRK', name: 'Dark Knight',   group: 'combat' },
  31: { abbr: 'AST', name: 'Astrologian',   group: 'combat' },
  32: { abbr: 'SAM', name: 'Samurai',       group: 'combat' },
  33: { abbr: 'RDM', name: 'Red Mage',      group: 'combat' },
  34: { abbr: 'BLU', name: 'Blue Mage',     group: 'combat' },
  35: { abbr: 'GNB', name: 'Gunbreaker',    group: 'combat' },
  36: { abbr: 'DNC', name: 'Dancer',        group: 'combat' },
  37: { abbr: 'RPR', name: 'Reaper',        group: 'combat' },
  38: { abbr: 'SGE', name: 'Sage',          group: 'combat' },
  39: { abbr: 'VPR', name: 'Viper',         group: 'combat' },
  40: { abbr: 'PCT', name: 'Pictomancer',   group: 'combat' },
};

export const DOH_JOB_IDS = Object.entries(JOB_IDS)
  .filter(([, v]) => v.group === 'doh').map(([k]) => Number(k));

export const DOL_JOB_IDS = Object.entries(JOB_IDS)
  .filter(([, v]) => v.group === 'dol').map(([k]) => Number(k));

export const COMBAT_JOB_IDS = Object.entries(JOB_IDS)
  .filter(([, v]) => v.group === 'combat').map(([k]) => Number(k));

export const STATS_BY_GROUP = {
  doh: ['CP', 'Craftsmanship', 'Control'],
  dol: ['GP', 'Gathering', 'Perception'],
  combat: [
    'Strength', 'Dexterity', 'Mind', 'Intelligence', 'Vitality',
    'CriticalHit', 'DirectHitRate', 'Determination',
    'SkillSpeed', 'SpellSpeed', 'Tenacity', 'Piety',
  ],
};

export const GEAR_TYPES = [
  'Ring', 'Earring', 'Necklace', 'Bracelet',
  'Head', 'Body', 'Hands', 'Legs', 'Feet',
  'MainHand', 'OffHand',
];

export const LEVEL_RANGE_RADIUS = 5;
```

- [ ] **Step 2: Commit**

```bash
git add js/constants.js
git commit -m "feat: FFXIV domain constants (job IDs, stat groups, gear types)"
```

---

## Task 3: search.js — TDD

**Files:**
- Modify: `js/search.js`
- Modify: `tests/search.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/search.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGroupAverage,
  getLevelRange,
  filterItems,
  sortByStat,
} from '../js/search.js';

const JOBS = {
  8:  { level: 44 }, 9:  { level: 46 }, 10: { level: 45 },
  11: { level: 47 }, 12: { level: 44 }, 13: { level: 46 },
  14: { level: 44 }, 15: { level: 44 },
  16: { level: 38 }, 17: { level: 40 }, 18: { level: 36 },
};
const DOH_IDS = [8, 9, 10, 11, 12, 13, 14, 15];
const DOL_IDS = [16, 17, 18];

describe('getGroupAverage', () => {
  it('returns floor of average for doh jobs', () => {
    assert.equal(getGroupAverage(JOBS, DOH_IDS), 45);
  });
  it('returns floor of average for dol jobs', () => {
    assert.equal(getGroupAverage(JOBS, DOL_IDS), 38);
  });
  it('returns 1 when all levels are 1', () => {
    assert.equal(getGroupAverage({ 8: { level: 1 }, 9: { level: 1 } }, [8, 9]), 1);
  });
  it('ignores job IDs not present in jobs map', () => {
    assert.equal(getGroupAverage({ 8: { level: 40 } }, [8, 9]), 40);
  });
});

describe('getLevelRange', () => {
  it('returns avg +-5', () => {
    assert.deepEqual(getLevelRange(45), { min: 40, max: 50 });
  });
  it('clamps min to 1', () => {
    assert.deepEqual(getLevelRange(3), { min: 1, max: 8 });
  });
  it('clamps max to 100', () => {
    assert.deepEqual(getLevelRange(98), { min: 93, max: 100 });
  });
});

const ITEMS = [
  { id: 1, name: 'Alpha Ring',   recipeLevel: 44, gearType: 'Ring',     stats: { CP: 6, Control: 3 } },
  { id: 2, name: 'Beta Ring',    recipeLevel: 46, gearType: 'Ring',     stats: { CP: 5 } },
  { id: 3, name: 'Gamma Neck',   recipeLevel: 48, gearType: 'Necklace', stats: { GP: 7 } },
  { id: 4, name: 'Delta Head',   recipeLevel: 55, gearType: 'Head',     stats: { CP: 4 } },
  { id: 5, name: 'Epsilon Ring', recipeLevel: 44, gearType: 'Ring',     stats: { Craftsmanship: 20 } },
];

describe('filterItems', () => {
  it('filters by level range', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: null });
    assert.deepEqual(result.map(i => i.id), [1, 2, 3]);
  });
  it('filters by stat — only items with that stat', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: 'CP', gearType: null });
    assert.deepEqual(result.map(i => i.id), [1, 2]);
  });
  it('filters by gear type', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: 'Ring' });
    assert.deepEqual(result.map(i => i.id), [1, 2, 5]);
  });
  it('applies stat and gear type together', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: 'CP', gearType: 'Ring' });
    assert.deepEqual(result.map(i => i.id), [1, 2]);
  });
  it('returns all in range when stat and gearType are null', () => {
    assert.equal(
      filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: null }).length,
      3
    );
  });
});

describe('sortByStat', () => {
  it('sorts descending by stat value', () => {
    const items = [{ id: 1, stats: { CP: 5 } }, { id: 2, stats: { CP: 8 } }, { id: 3, stats: { CP: 3 } }];
    assert.deepEqual(sortByStat(items, 'CP').map(i => i.id), [2, 1, 3]);
  });
  it('sorts by ilvl descending when stat is null', () => {
    const items = [{ id: 1, ilvl: 48, stats: {} }, { id: 2, ilvl: 52, stats: {} }, { id: 3, ilvl: 46, stats: {} }];
    assert.deepEqual(sortByStat(items, null).map(i => i.id), [2, 1, 3]);
  });
  it('places items missing the stat after items that have it', () => {
    const items = [{ id: 1, stats: { CP: 5 } }, { id: 2, stats: { GP: 7 } }, { id: 3, stats: { CP: 8 } }];
    const sorted = sortByStat(items, 'CP');
    assert.equal(sorted[0].id, 3);
    assert.equal(sorted[1].id, 1);
    assert.equal(sorted[2].id, 2);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/search.test.js
```

Expected: all 15 tests fail with import/missing export errors.

- [ ] **Step 3: Implement search.js**

```js
// js/search.js
import { LEVEL_RANGE_RADIUS } from './constants.js';

export function getGroupAverage(jobs, jobIds) {
  const present = jobIds.filter(id => jobs[id]);
  if (present.length === 0) return 1;
  const sum = present.reduce((acc, id) => acc + (jobs[id].level ?? 1), 0);
  return Math.floor(sum / present.length);
}

export function getLevelRange(avgLevel) {
  return {
    min: Math.max(1, avgLevel - LEVEL_RANGE_RADIUS),
    max: Math.min(100, avgLevel + LEVEL_RANGE_RADIUS),
  };
}

export function filterItems(items, { levelMin, levelMax, stat, gearType }) {
  return items.filter(item => {
    if (item.recipeLevel < levelMin || item.recipeLevel > levelMax) return false;
    if (gearType && item.gearType !== gearType) return false;
    if (stat && !Object.prototype.hasOwnProperty.call(item.stats ?? {}, stat)) return false;
    return true;
  });
}

export function sortByStat(items, stat) {
  return [...items].sort((a, b) => {
    if (!stat) return (b.ilvl ?? 0) - (a.ilvl ?? 0);
    const aVal = a.stats?.[stat] ?? -Infinity;
    const bVal = b.stats?.[stat] ?? -Infinity;
    return bVal - aVal;
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/search.test.js
```

Expected:
```
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

- [ ] **Step 5: Commit**

```bash
git add js/search.js tests/search.test.js
git commit -m "feat: search.js pure functions with 15 passing unit tests"
```

---

## Task 4: data.js — Teamcraft loader

**Files:**
- Modify: `js/data.js`

- [ ] **Step 1: Verify Teamcraft data structure**

Open these URLs in a browser and note the exact JSON shape:
- https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/data/recipes.json
- https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/data/items.json

Expected recipes.json: array of `{ id, job, lvl, rlvl, result, yields, ingredients }`.
Expected items.json: object keyed by item ID string: `{ "6116": { "en": "Rose Gold Ring", ... } }`.

If shapes differ, update the `buildIndex` function below before writing the file.

- [ ] **Step 2: Implement data.js**

```js
// js/data.js
import { JOB_IDS } from './constants.js';

const BASE_URL = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/data/';

let _itemsByLevel = null;
let _loadError = null;
let _loading = false;
let _onProgress = null;

export function onProgress(fn) { _onProgress = fn; }
export function isLoaded() { return _itemsByLevel !== null; }
export function getLoadError() { return _loadError; }

export async function loadData() {
  if (_itemsByLevel || _loading) return;
  _loading = true;
  _loadError = null;
  _onProgress?.('Loading recipe data...');

  try {
    const [recipesRaw, itemsRaw] = await Promise.all([
      fetch(BASE_URL + 'recipes.json').then(r => {
        if (!r.ok) throw new Error('recipes.json failed to load');
        return r.json();
      }),
      fetch(BASE_URL + 'items.json').then(r => {
        if (!r.ok) throw new Error('items.json failed to load');
        return r.json();
      }),
    ]);

    _onProgress?.('Indexing...');
    _itemsByLevel = buildIndex(recipesRaw, itemsRaw);
    _onProgress?.('Ready');
    console.info('[data] Loaded', recipesRaw.length, 'recipes');
  } catch (err) {
    _loadError = err.message;
    _onProgress?.('error:' + err.message);
    console.error('[data] Load failed:', err);
  } finally {
    _loading = false;
  }
}

function buildIndex(recipes, items) {
  const map = new Map();
  for (const recipe of recipes) {
    const jobInfo = JOB_IDS[recipe.job];
    if (!jobInfo) continue;
    const name = items[recipe.result]?.en ?? ('Item #' + recipe.result);
    const entry = {
      id: recipe.result,
      recipeId: recipe.id,
      name,
      craftJobAbbr: jobInfo.abbr,
      craftJobGroup: jobInfo.group,
      recipeLevel: recipe.lvl,
    };
    const lvl = recipe.lvl;
    if (!map.has(lvl)) map.set(lvl, []);
    map.get(lvl).push(entry);
  }
  return map;
}

export function getItemsInLevelRange(min, max) {
  if (!_itemsByLevel) return [];
  const result = [];
  for (let lvl = min; lvl <= max; lvl++) {
    const items = _itemsByLevel.get(lvl);
    if (items) result.push(...items);
  }
  return result;
}
```

- [ ] **Step 3: Test in browser console**

Add a temporary script block to index.html after the existing script tag (remove after testing):

```html
<script type="module">
  import { loadData, getItemsInLevelRange, isLoaded } from './js/data.js';
  await loadData();
  console.log('Loaded:', isLoaded());
  console.log('Level 44-46 items:', getItemsInLevelRange(44, 46));
</script>
```

Open index.html. Expected console output:
```
[data] Loaded XXXX recipes
Loaded: true
Level 44-46 items: Array(N) [{id, name, craftJobAbbr, recipeLevel}, ...]
```

Remove the temporary script after confirming.

- [ ] **Step 4: Commit**

```bash
git add js/data.js
git commit -m "feat: data.js Teamcraft recipe loader with in-memory level index"
```

---

## Task 5: api.js — XIVAPI character import + item stats

**Files:**
- Modify: `js/api.js`

- [ ] **Step 1: Verify XIVAPI character response**

Open in a browser (replace with a real character ID from Lodestone):
`https://xivapi.com/character/24343498?data=CJ`

Confirm the field path for job levels is `Character.ClassJobs[].JobID` and `Character.ClassJobs[].Level`. Note any differences and update `fetchCharacterJobs` below.

- [ ] **Step 2: Verify XIVAPI item stats field**

Open: `https://xivapi.com/item/6116?columns=ID,Name,LevelItem,LevelEquip,Stats,ItemKind,ItemUICategory`

Find the field that contains gear bonus stats (CP, Craftsmanship, etc.). It may be `Stats`, `Bonuses`, or another key. Confirm the nested structure. Update `parseItemStats` in Step 3 if the field name differs from `Stats`.

- [ ] **Step 3: Implement api.js**

```js
// js/api.js

const XIVAPI = 'https://xivapi.com';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function searchCharacter(name, server) {
  let url = XIVAPI + '/character/search?name=' + encodeURIComponent(name);
  if (server) url += '&server=' + encodeURIComponent(server);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Character search failed (' + res.status + ')');
  const data = await res.json();
  return (data.Results ?? []).map(c => ({
    id: c.ID,
    name: escapeHtml(c.Name),
    server: escapeHtml(c.Server),
    avatar: c.Avatar,
  }));
}

export async function fetchCharacterJobs(characterId) {
  const res = await fetch(XIVAPI + '/character/' + characterId + '?data=CJ');
  if (!res.ok) throw new Error('Character fetch failed (' + res.status + ')');
  const data = await res.json();
  const classJobs = data.Character?.ClassJobs ?? data.ClassJobs ?? [];
  if (classJobs.length === 0) {
    throw new Error('No job data found. The character profile may be private.');
  }
  const jobs = {};
  for (const cj of classJobs) {
    if (cj.JobID != null && cj.Level != null) {
      jobs[cj.JobID] = { level: cj.Level };
    }
  }
  return {
    name: escapeHtml(data.Character?.Name ?? 'Unknown'),
    server: escapeHtml(data.Character?.Server ?? ''),
    jobs,
  };
}

export function extractCharacterIdFromUrl(url) {
  const match = url.match(/character\/(\d+)/);
  if (!match) throw new Error('Invalid Lodestone URL. Expected: .../character/12345678/');
  return match[1];
}

export async function fetchItemStats(itemIds) {
  if (itemIds.length === 0) return {};
  const columns = 'ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory';
  const results = {};
  const batches = [];
  for (let i = 0; i < itemIds.length; i += 100) {
    batches.push(itemIds.slice(i, i + 100));
  }
  await Promise.all(batches.map(async batch => {
    const url = XIVAPI + '/search?indexes=Item&filters=ID|=' + batch.join(',') + '&columns=' + columns;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    for (const item of (data.Results ?? [])) {
      results[item.ID] = parseItemStats(item);
    }
  }));
  return results;
}

function parseItemStats(item) {
  // Stats field structure from XIVAPI: { "CP": { "NQ": 5, "HQ": 6 }, ... }
  // If the field is named differently (see Task 5 Step 2), update the key below.
  const rawStats = item.Stats ?? {};
  const stats = {};
  for (const [key, val] of Object.entries(rawStats)) {
    const value = typeof val === 'object' ? (val.NQ ?? val.Value ?? 0) : Number(val);
    if (value > 0) stats[key] = value;
  }
  return {
    id: item.ID,
    name: escapeHtml(item.Name ?? ''),
    ilvl: item.LevelItem,
    equipLevel: item.LevelEquip,
    gearType: escapeHtml(item.ItemUICategory?.Name ?? 'Unknown'),
    stats,
  };
}
```

- [ ] **Step 4: Test character import in browser console**

Add a temporary script to index.html:

```html
<script type="module">
  import { searchCharacter, fetchCharacterJobs } from './js/api.js';
  const results = await searchCharacter('YourCharName', 'YourServer');
  console.log('Search results:', results);
  if (results.length > 0) {
    const { name, jobs } = await fetchCharacterJobs(results[0].id);
    console.log('Character:', name, 'Jobs:', jobs);
  }
</script>
```

Expected: array of character results + object with job ID keys mapped to `{ level: N }`.
Remove after confirming.

- [ ] **Step 5: Test item stats fetch**

```html
<script type="module">
  import { fetchItemStats } from './js/api.js';
  const stats = await fetchItemStats([6116, 6117]);
  console.log('Item stats:', stats);
</script>
```

Expected: object keyed by item ID with `{ id, name, ilvl, gearType, stats }`. Confirm `stats` contains the bonus stats (CP, etc.).
Remove after confirming.

- [ ] **Step 6: Commit**

```bash
git add js/api.js
git commit -m "feat: api.js XIVAPI character import and batched item stats fetch"
```

---

## Task 6: index.html + styles.css — layout and theme

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`

- [ ] **Step 1: Update index.html with full structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FFXIV Gear Finder</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="app">
    <aside id="sidebar">
      <div class="sidebar-header">
        <h1>FFXIV Gear Finder</h1>
        <p class="tagline">Find your best craftable gear</p>
      </div>

      <section class="sidebar-section" id="import-section">
        <h2 class="section-label">Import Character</h2>
        <div class="import-tabs">
          <button class="tab-btn active" data-tab="url">Lodestone URL</button>
          <button class="tab-btn" data-tab="search">Search</button>
        </div>
        <div class="tab-panel active" id="tab-url">
          <input type="text" id="lodestone-url" placeholder="https://na.finalfantasyxiv.com/lodestone/character/...">
          <button class="btn-primary" id="btn-import-url">Import</button>
        </div>
        <div class="tab-panel" id="tab-search">
          <input type="text" id="char-name" placeholder="Character name">
          <input type="text" id="char-server" placeholder="Server (optional)">
          <button class="btn-primary" id="btn-search-char">Search</button>
          <div id="char-results"></div>
        </div>
        <div id="import-status" class="status-msg" hidden></div>
        <div id="char-info" class="char-info" hidden></div>
      </section>

      <section class="sidebar-section" id="job-group-section">
        <h2 class="section-label">Job Group</h2>
        <div class="pill-group" id="group-pills">
          <button class="pill active" data-group="doh">DoH avg</button>
          <button class="pill" data-group="dol">DoL avg</button>
          <button class="pill" data-group="combat">Combat</button>
        </div>
        <select id="combat-job-select" class="combat-select" hidden></select>
        <div id="level-display" class="level-display"></div>
      </section>

      <section class="sidebar-section" id="stat-section">
        <h2 class="section-label">Gear Stat</h2>
        <div class="pill-group" id="stat-pills"></div>
      </section>

      <section class="sidebar-section" id="gear-type-section">
        <h2 class="section-label">Gear Type</h2>
        <div class="pill-group" id="gear-type-pills"></div>
      </section>
    </aside>

    <main id="results-panel">
      <div id="results-header" class="results-header"></div>
      <div id="results-grid" class="results-grid"></div>
    </main>
  </div>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write styles.css**

```css
/* FFXIV Gear Finder styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0f1117;
  --bg-card:   #1a1f2e;
  --bg-input:  #141824;
  --border:    #2a3050;
  --text:      #e0e0e0;
  --text-muted:#888;
  --gold:      #f39c12;
  --blue:      #3498db;
  --green:     #2ecc71;
  --red:       #e74c3c;
  --sidebar-w: 280px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-size: 14px;
}

#app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  min-height: 100vh;
}

#sidebar {
  background: #12161f;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-header h1 { color: var(--gold); font-size: 1.1em; margin-bottom: 2px; }
.tagline { color: var(--text-muted); font-size: 0.78em; margin-bottom: 16px; }

.sidebar-section { padding: 14px 0; border-bottom: 1px solid var(--border); }

.section-label {
  color: var(--blue);
  font-size: 0.72em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.import-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.tab-btn {
  flex: 1;
  padding: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8em;
  transition: all 0.2s;
}
.tab-btn.active { background: rgba(52,152,219,0.2); border-color: var(--blue); color: var(--blue); }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

input[type="text"] {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 0.85em;
  margin-bottom: 6px;
  outline: none;
  transition: border-color 0.2s;
}
input[type="text"]:focus { border-color: var(--blue); }

.btn-primary {
  width: 100%;
  padding: 8px;
  background: linear-gradient(135deg, var(--blue), #2980b9);
  border: none;
  border-radius: 5px;
  color: #fff;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.status-msg {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 0.8em;
  line-height: 1.4;
}
.status-msg.error   { background: rgba(231,76,60,0.15);  border: 1px solid rgba(231,76,60,0.3);  color: var(--red); }
.status-msg.success { background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.3); color: var(--green); }
.status-msg.loading { background: rgba(52,152,219,0.12); border: 1px solid rgba(52,152,219,0.3); color: var(--blue); }

.char-results-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 200px; overflow-y: auto; }
.char-card {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.char-card:hover { border-color: var(--blue); }
.char-card img { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); }
.char-card-name { font-weight: 600; font-size: 0.85em; color: var(--gold); }
.char-card-server { font-size: 0.75em; color: var(--text-muted); }

.char-info {
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(46,204,113,0.08);
  border: 1px solid rgba(46,204,113,0.2);
  border-radius: 5px;
  font-size: 0.8em;
  color: var(--green);
}

.pill-group { display: flex; flex-wrap: wrap; gap: 5px; }
.pill {
  padding: 5px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.78em;
  transition: all 0.2s;
  white-space: nowrap;
}
.pill:hover  { border-color: var(--text-muted); color: var(--text); }
.pill.active { background: rgba(243,156,18,0.15); border-color: var(--gold); color: var(--gold); }

.combat-select {
  width: 100%;
  margin-top: 8px;
  padding: 7px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-size: 0.85em;
  outline: none;
}

.level-display {
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--bg-input);
  border-radius: 5px;
  font-size: 0.82em;
  line-height: 1.7;
}
.level-avg   { color: var(--gold); font-weight: 700; font-size: 1.05em; }
.level-range { color: var(--blue); }

#results-panel { display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }

.results-header {
  font-size: 0.82em;
  color: var(--text-muted);
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}
.results-header .count { color: var(--gold); font-weight: 700; font-size: 1.1em; }

.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

.result-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  transition: border-color 0.2s;
}
.result-card:hover { border-color: #3a4060; }
.result-card.best-match { border-color: rgba(243,156,18,0.4); }

.card-name { font-weight: 700; color: var(--text); font-size: 0.95em; margin-bottom: 4px; }
.card-meta { font-size: 0.75em; color: var(--text-muted); margin-bottom: 10px; }
.card-meta .ilvl  { color: var(--blue); }

.card-stats { display: flex; flex-wrap: wrap; gap: 5px; }
.stat-badge {
  padding: 3px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.75em;
  color: var(--text-muted);
}
.stat-badge.highlight {
  background: rgba(46,204,113,0.12);
  border-color: rgba(46,204,113,0.4);
  color: var(--green);
  font-weight: 700;
}
.stat-badge.unavailable { color: #555; font-style: italic; }

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
  font-size: 0.9em;
  line-height: 1.7;
}
.empty-state .empty-title {
  color: var(--text);
  display: block;
  margin-bottom: 6px;
  font-size: 1.1em;
  font-weight: 600;
}

.data-loading-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--blue), var(--gold));
  animation: slide 1.5s infinite;
  z-index: 100;
}
@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
```

- [ ] **Step 3: Verify in browser**

Open index.html. Confirm:
- Sidebar on left, main panel on right
- Dark FFXIV theme
- No console errors

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: full app layout and FFXIV dark theme"
```

---

## Task 7: ui.js — sidebar and results rendering

**Files:**
- Modify: `js/ui.js`

All user-supplied strings that come from the network (item names, character names, server names) are pre-escaped in `api.js` before reaching `ui.js`. The `setTextContent` helper is used for any dynamically assembled strings.

- [ ] **Step 1: Implement ui.js**

```js
// js/ui.js
import { STATS_BY_GROUP, GEAR_TYPES, JOB_IDS, COMBAT_JOB_IDS } from './constants.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else if (child) node.appendChild(child);
  }
  return node;
}

// ── Import section ────────────────────────────────────────────────────────────

export function showImportStatus(type, message) {
  const node = document.getElementById('import-status');
  node.className = 'status-msg ' + type;
  node.textContent = message;
  node.hidden = false;
  if (type === 'success') setTimeout(() => { node.hidden = true; }, 4000);
}

export function hideImportStatus() {
  document.getElementById('import-status').hidden = true;
}

export function showCharInfo(name, server) {
  const node = document.getElementById('char-info');
  node.textContent = '\u2713 ' + name + ' \u2014 ' + server;
  node.hidden = false;
}

export function renderCharSearchResults(results) {
  const container = document.getElementById('char-results');
  container.textContent = '';
  if (results.length === 0) {
    container.appendChild(el('p', { style: 'color:#888;font-size:0.8em;margin-top:8px' }, 'No characters found.'));
    return;
  }
  const list = el('div', { class: 'char-results-list' });
  for (const char of results) {
    const card = el('div', { class: 'char-card' });
    const img = el('img', { src: char.avatar, alt: '', loading: 'lazy' });
    const info = el('div', {},
      el('div', { class: 'char-card-name' }, char.name),
      el('div', { class: 'char-card-server' }, char.server),
    );
    card.appendChild(img);
    card.appendChild(info);
    card.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('import-character-id', { detail: { id: char.id } }));
    });
    list.appendChild(card);
  }
  container.appendChild(list);
}

// ── Job group + level display ─────────────────────────────────────────────────

export function initGroupPills(activeGroup, onSelect) {
  document.querySelectorAll('#group-pills .pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.group === activeGroup);
    pill.addEventListener('click', () => {
      document.querySelectorAll('#group-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      onSelect(pill.dataset.group);
    });
  });
}

export function initCombatJobSelect(jobs, onSelect) {
  const sel = document.getElementById('combat-job-select');
  sel.textContent = '';
  for (const id of COMBAT_JOB_IDS) {
    const job = JOB_IDS[id];
    const level = jobs[id]?.level ?? '?';
    const opt = el('option', { value: String(id) }, job.abbr + ' \u2014 ' + job.name + ' (Lv ' + level + ')');
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onSelect(Number(sel.value)));
  return Number(sel.value);
}

export function showCombatJobSelect(visible) {
  document.getElementById('combat-job-select').hidden = !visible;
}

export function renderLevelDisplay(group, avgLevel, min, max) {
  const label = group === 'doh' ? 'DoH average' : group === 'dol' ? 'DoL average' : 'Job level';
  const node = document.getElementById('level-display');
  node.textContent = '';
  const row1 = el('div', {});
  row1.appendChild(el('span', { style: 'color:var(--text-muted)' }, label + ': '));
  row1.appendChild(el('span', { class: 'level-avg' }, 'Lv ' + avgLevel));
  const row2 = el('div', {});
  row2.appendChild(el('span', { style: 'color:var(--text-muted)' }, 'Showing: '));
  row2.appendChild(el('span', { class: 'level-range' }, 'Lv ' + min + '\u2013' + max));
  node.appendChild(row1);
  node.appendChild(row2);
}

// ── Stat pills ────────────────────────────────────────────────────────────────

export function renderStatPills(group, activeStat, onSelect) {
  const stats = STATS_BY_GROUP[group] ?? [];
  const container = document.getElementById('stat-pills');
  container.textContent = '';
  for (const stat of stats) {
    const btn = el('button', { class: 'pill' + (stat === activeStat ? ' active' : '') }, stat);
    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('active');
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      if (!isActive) { btn.classList.add('active'); onSelect(stat); }
      else onSelect(null);
    });
    container.appendChild(btn);
  }
}

// ── Gear type pills ───────────────────────────────────────────────────────────

export function renderGearTypePills(activeType, onSelect) {
  const container = document.getElementById('gear-type-pills');
  container.textContent = '';
  for (const type of ['All', ...GEAR_TYPES]) {
    const value = type === 'All' ? null : type;
    const btn = el('button', { class: 'pill' + (activeType === value ? ' active' : '') }, type);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      onSelect(value);
    });
    container.appendChild(btn);
  }
}

// ── Results panel ─────────────────────────────────────────────────────────────

export function renderResultsHeader(count, stat, gearType, group, avgLevel) {
  const groupLabel = group === 'doh' ? 'DoH avg Lv ' + avgLevel
                   : group === 'dol' ? 'DoL avg Lv ' + avgLevel
                   : 'Lv ' + avgLevel;
  const el2 = document.getElementById('results-header');
  el2.textContent = '';
  const countSpan = el('span', { class: 'count' }, String(count));
  el2.appendChild(countSpan);
  el2.appendChild(document.createTextNode(
    ' result' + (count !== 1 ? 's' : '') +
    ' \u2014 ' + (stat ?? 'all stats') +
    ', ' + (gearType ?? 'all types') +
    ', ' + groupLabel
  ));
}

export function renderResults(items, activeStat) {
  const grid = document.getElementById('results-grid');
  grid.textContent = '';
  if (items.length === 0) {
    const empty = el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No results'),
      'Try selecting a different stat, gear type, or check that your levels are imported.'
    );
    grid.appendChild(empty);
    return;
  }
  items.forEach((item, idx) => {
    const card = el('div', { class: 'result-card' + (idx === 0 && activeStat ? ' best-match' : '') });

    const nameLine = el('div', { class: 'card-name' }, item.name);
    const meta = el('div', { class: 'card-meta' });
    meta.appendChild(el('span', { class: 'ilvl' }, 'ilvl ' + (item.ilvl ?? '?')));
    meta.appendChild(document.createTextNode(' \u00b7 ' + item.craftJobAbbr + ' \u00b7 Lv ' + item.recipeLevel));

    const statsDiv = el('div', { class: 'card-stats' });
    const statEntries = Object.entries(item.stats ?? {});
    if (statEntries.length > 0) {
      for (const [k, v] of statEntries) {
        const badge = el('span', { class: 'stat-badge' + (k === activeStat ? ' highlight' : '') }, k + ' +' + v);
        statsDiv.appendChild(badge);
      }
    } else {
      statsDiv.appendChild(el('span', { class: 'stat-badge unavailable' }, 'stats unavailable'));
    }

    card.appendChild(nameLine);
    card.appendChild(meta);
    card.appendChild(statsDiv);
    grid.appendChild(card);
  });
}

export function renderEmptyState(title, detail) {
  const grid = document.getElementById('results-grid');
  grid.textContent = '';
  const empty = el('div', { class: 'empty-state' },
    el('span', { class: 'empty-title' }, title),
    detail ?? ''
  );
  grid.appendChild(empty);
  document.getElementById('results-header').textContent = '';
}

export function showDataLoadingBar(visible) {
  const existing = document.getElementById('data-loading-bar');
  if (visible && !existing) {
    const bar = el('div', { id: 'data-loading-bar', class: 'data-loading-bar' });
    document.body.prepend(bar);
  } else if (!visible && existing) {
    existing.remove();
  }
}

export function initImportTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}
```

- [ ] **Step 2: Test sidebar rendering with mock data**

Add a temporary script to index.html:

```html
<script type="module">
  import * as ui from './js/ui.js';
  ui.initImportTabs();
  ui.renderLevelDisplay('doh', 45, 40, 50);
  ui.renderStatPills('doh', 'CP', stat => console.log('stat:', stat));
  ui.renderGearTypePills(null, type => console.log('type:', type));
  ui.renderResultsHeader(2, 'CP', 'Ring', 'doh', 45);
  ui.renderResults([
    { id: 1, name: 'Rose Gold Ring', ilvl: 50, craftJobAbbr: 'GSM', gearType: 'Ring', recipeLevel: 48, stats: { CP: 6, Control: 3 } },
    { id: 2, name: 'Electrum Ring',  ilvl: 48, craftJobAbbr: 'GSM', gearType: 'Ring', recipeLevel: 44, stats: { CP: 5 } },
  ], 'CP');
</script>
```

Verify: sidebar sections render, two result cards appear, first card has gold border, CP badge highlighted green. Remove script after confirming.

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: ui.js sidebar and results rendering with DOM-safe element helpers"
```

---

## Task 8: main.js — state and wiring

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Implement main.js**

```js
// js/main.js
import { loadData, getItemsInLevelRange, isLoaded, onProgress } from './data.js';
import { searchCharacter, fetchCharacterJobs, extractCharacterIdFromUrl, fetchItemStats } from './api.js';
import { getGroupAverage, getLevelRange, filterItems, sortByStat } from './search.js';
import { DOH_JOB_IDS, DOL_JOB_IDS, COMBAT_JOB_IDS } from './constants.js';
import * as ui from './ui.js';

const state = {
  jobs: {},
  charName: null,
  activeGroup: 'doh',
  activeCombatJobId: null,
  activeStat: null,
  activeGearType: null,
  statsCache: {},
};

async function runSearch() {
  if (!isLoaded()) {
    ui.renderEmptyState('Loading recipe data...', 'Please wait a moment.');
    return;
  }

  const jobIds = state.activeGroup === 'doh' ? DOH_JOB_IDS
               : state.activeGroup === 'dol' ? DOL_JOB_IDS
               : state.activeCombatJobId ? [state.activeCombatJobId] : [];

  const avg = getGroupAverage(state.jobs, jobIds);
  const { min, max } = getLevelRange(avg);
  ui.renderLevelDisplay(state.activeGroup, avg, min, max);

  let items = getItemsInLevelRange(min, max);

  const uncachedIds = items.map(i => i.id).filter(id => !state.statsCache[id]);
  if (uncachedIds.length > 0) {
    try {
      const fetched = await fetchItemStats(uncachedIds);
      Object.assign(state.statsCache, fetched);
    } catch {
      // Non-fatal: items render without stats
    }
  }

  items = items.map(item => ({
    ...item,
    ...(state.statsCache[item.id] ?? {}),
    stats: state.statsCache[item.id]?.stats ?? {},
  }));

  const filtered = filterItems(items, {
    levelMin: min, levelMax: max,
    stat: state.activeStat,
    gearType: state.activeGearType,
  });

  const sorted = sortByStat(filtered, state.activeStat);
  ui.renderResultsHeader(sorted.length, state.activeStat, state.activeGearType, state.activeGroup, avg);
  ui.renderResults(sorted, state.activeStat);
}

async function handleImportUrl() {
  const url = document.getElementById('lodestone-url').value.trim();
  try {
    const id = extractCharacterIdFromUrl(url);
    ui.showImportStatus('loading', 'Importing character...');
    const { name, server, jobs } = await fetchCharacterJobs(id);
    state.jobs = jobs;
    state.charName = name;
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
    runSearch();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

async function handleCharacterSearch() {
  const name = document.getElementById('char-name').value.trim();
  const server = document.getElementById('char-server').value.trim();
  if (!name) { ui.showImportStatus('error', 'Enter a character name.'); return; }
  ui.showImportStatus('loading', 'Searching...');
  try {
    const results = await searchCharacter(name, server);
    ui.renderCharSearchResults(results);
    ui.hideImportStatus();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

async function handleImportById(id) {
  ui.showImportStatus('loading', 'Importing character...');
  try {
    const { name, server, jobs } = await fetchCharacterJobs(id);
    state.jobs = jobs;
    state.charName = name;
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
    runSearch();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  }
}

function initSidebar() {
  ui.initImportTabs();

  document.getElementById('btn-import-url').addEventListener('click', handleImportUrl);
  document.getElementById('btn-search-char').addEventListener('click', handleCharacterSearch);
  document.addEventListener('import-character-id', e => handleImportById(e.detail.id));

  ui.initGroupPills(state.activeGroup, group => {
    state.activeGroup = group;
    const isCombat = group === 'combat';
    ui.showCombatJobSelect(isCombat);
    if (isCombat && !state.activeCombatJobId) {
      state.activeCombatJobId = ui.initCombatJobSelect(state.jobs, id => {
        state.activeCombatJobId = id;
        runSearch();
      });
    }
    state.activeStat = null;
    ui.renderStatPills(group, null, stat => { state.activeStat = stat; runSearch(); });
    runSearch();
  });

  ui.showCombatJobSelect(false);
  ui.renderStatPills('doh', null, stat => { state.activeStat = stat; runSearch(); });
  ui.renderGearTypePills(null, type => { state.activeGearType = type; runSearch(); });
  ui.renderLevelDisplay('doh', 1, 1, 6);
}

async function init() {
  initSidebar();
  ui.renderEmptyState(
    'Import your character',
    'Use the sidebar to import from Lodestone, then select a stat to search.'
  );

  onProgress(msg => {
    if (msg === 'Ready') {
      ui.showDataLoadingBar(false);
    } else if (msg.startsWith('error:')) {
      ui.showDataLoadingBar(false);
      const errMsg = msg.slice(6);
      const grid = document.getElementById('results-grid');
      grid.textContent = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const title = document.createElement('span');
      title.className = 'empty-title';
      title.textContent = 'Failed to load recipe data';
      const detail = document.createTextNode(errMsg);
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn-primary';
      retryBtn.style.cssText = 'width:auto;padding:8px 20px;margin-top:12px';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', () => loadData());
      empty.appendChild(title);
      empty.appendChild(document.createElement('br'));
      empty.appendChild(detail);
      empty.appendChild(document.createElement('br'));
      empty.appendChild(retryBtn);
      grid.appendChild(empty);
      document.getElementById('results-header').textContent = '';
    } else {
      ui.showDataLoadingBar(true);
    }
  });

  await loadData();
}

init();
```

- [ ] **Step 2: Remove all temporary test scripts from index.html**

Ensure index.html ends with only:
```html
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: End-to-end browser test**

Open index.html. Walk through:
1. Page loads — data loading bar appears briefly, then disappears
2. Import a real character via Lodestone URL
3. Sidebar shows character name and server
4. Select "DoH avg" group — level display shows average and range
5. Select "CP" stat — results appear sorted by CP descending, first card has gold border
6. Select "Ring" gear type — results filter to rings only
7. Switch to "DoL avg" — stat pills update to GP/Gathering/Perception
8. Switch to "Combat" — dropdown appears; select a job; results update

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: main.js state management and full app wiring"
```

---

## Task 9: Integration + polish

**Files:**
- Modify: `AGENTS.md`
- Modify: `ai-context/build-plan.md`

- [ ] **Step 1: Test error paths manually**

| Scenario | How to trigger | Expected |
|---|---|---|
| Invalid Lodestone URL | Enter "hello" in URL field, click Import | "Invalid Lodestone URL..." error |
| Empty name search | Click Search with empty name field | "Enter a character name." error |
| No results | Import character at level 1, select any stat | "No results" empty state |
| Data load failure | Disconnect wifi, refresh page | Error empty state with Retry button |

- [ ] **Step 2: Run unit tests one final time**

```bash
node --test tests/search.test.js
```

Expected: `ℹ pass 15` / `ℹ fail 0`

- [ ] **Step 3: Update AGENTS.md — mark all tasks complete**

Update each task line in the "Current Status" section of AGENTS.md from `- [ ]` to `- [x]` with a one-line summary, e.g.:
```
- [x] Task 3: search.js (TDD) — 15/15 tests pass
- [x] Task 8: main.js — end-to-end flow verified in browser
```

- [ ] **Step 4: Final commit**

```bash
git add AGENTS.md ai-context/build-plan.md
git commit -m "chore: mark all tasks complete, update project status"
```

---

## Verification Checklist

Before marking the project complete:

- [ ] `node --test tests/search.test.js` — 15 pass, 0 fail
- [ ] Open index.html in browser — no console errors on load
- [ ] Import a real Lodestone character — levels load correctly
- [ ] DoH group + CP stat + Ring type — results sorted by CP descending
- [ ] DoL group + GP stat — stat pills show GP/Gathering/Perception
- [ ] Combat group — dropdown appears, selecting a job updates results
- [ ] First result card has gold border when a stat is active
- [ ] Invalid URL shows inline error
- [ ] AGENTS.md has all tasks marked [x] complete
