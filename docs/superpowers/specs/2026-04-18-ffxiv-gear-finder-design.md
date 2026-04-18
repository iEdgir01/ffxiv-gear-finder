# FFXIV Gear Finder — Design Spec
_Date: 2026-04-18_

## What We're Building

A browser-based tool (plain HTML/CSS/JS, no build step) that lets a Final Fantasy XIV player import their character's job levels from the Lodestone, then find the best craftable gear available at their current level — filtered by gear stat (CP, GP, Craftsmanship, etc.) and gear slot (ring, necklace, body, etc.).

The core loop: **import levels → select job group → pick a stat → pick a gear type → see the best craftable items sorted by that stat.**

---

## Decisions Summary

| Decision | Choice |
|---|---|
| Stack | Plain HTML/CSS/JS, no build step |
| Layout | Sidebar (filters) + main panel (results) |
| Recipe/item data | Teamcraft static dataset, loaded from GitHub CDN at startup |
| Character import | XIVAPI (Lodestone proxy) — URL or name search |
| Job scope | All jobs: DoH (8), DoL (3), all combat jobs |
| Job selection UX | Group select — DoH avg / DoL avg / individual combat job |
| Level range | Fixed ±5 from selected group's average level |
| Sort | Results sorted descending by value of selected stat |
| Persistence | None — session only |

---

## File Structure

```
ffxiv-gear-finder/
  index.html              ← app shell, sidebar layout
  css/
    styles.css            ← FFXIV dark theme, all styles
  js/
    main.js               ← app init, state, wires all modules
    data.js               ← loads Teamcraft JSON, caches in memory
    api.js                ← XIVAPI character import
    search.js             ← pure filter/sort functions, no DOM
    ui.js                 ← renders sidebar controls + result cards
  CLAUDE.md
  AGENTS.md
  ai-context/
    technical.md
    build-plan.md
    ffxiv.md
  docs/
    superpowers/specs/
      2026-04-18-ffxiv-gear-finder-design.md  ← this file
```

---

## Architecture

### Module Responsibilities

**`data.js`**
- On startup: fetches Teamcraft `recipes.json` and `items.json` from the GitHub raw CDN
- Parses and indexes in memory: recipe level → item IDs, item ID → { name, craftJob, recipeLevel }
- Exposes:
  - `getItemsInLevelRange(min, max)` → array of `{ id, name, craftJob, recipeLevel }` (no stats yet)
  - `isLoaded()` → bool, for startup gating
- Loading progress shown in sidebar status area

**`api.js`**
- `searchCharacter(name, server)` → calls `https://xivapi.com/character/search`
- `fetchCharacterJobs(characterId)` → calls `https://xivapi.com/character/{id}?data=CJ`
- Returns job levels keyed by FFXIV job ID, mapped to abbreviations (CRP, BSM, PLD, etc.)
- `loadFromLodestoneUrl(url)` → extracts character ID from URL, calls fetchCharacterJobs

**`search.js`**  
Pure functions only — no DOM access, no global state.
- `filterItems(items, { levelMin, levelMax, stat, gearType })` → filtered array
- `sortByStat(items, stat)` → sorted descending by stat value
- `getGroupAverage(jobs, group)` → calculates DoH/DoL average from job level map
- `getLevelRange(avgLevel)` → returns `{ min: avg - 5, max: avg + 5 }`

**`ui.js`**
- Renders sidebar: import section, job group selector, level display, stat pills, gear type pills
- Renders result cards: item name, ilvl, crafted-by job abbreviation, stat badges
- Emits custom DOM events (`filter-changed`, `import-requested`) — never calls search.js directly
- "No data loaded yet" and "No results" empty states

**`main.js`**
- Initialises all modules on `DOMContentLoaded`
- Holds single state object: `{ jobs, activeGroup, activeGroupAvg, activeStat, activeGearType, items }`
- Listens for UI events → computes level range → calls search.js → passes results to ui.js
- Triggers data.js load on startup, updates sidebar status

---

## UI Layout

```
┌──────────────┬─────────────────────────────────────┐
│   SIDEBAR    │            RESULTS PANEL             │
│  (fixed)     │                                      │
│              │  12 results — CP gear, rings, DoH 45 │
│  ① Import    │                                      │
│  [Lodestone] │  ┌────────────────────────────┐      │
│              │  │ Rose Gold Ring        CP +6 │      │
│  ② Job group │  │ ilvl 50 · GSM · Ring        │      │
│  [DoH] [DoL] │  └────────────────────────────┘      │
│  [Combat ▾]  │  ┌────────────────────────────┐      │
│              │  │ Electrum Ring         CP +5 │      │
│  DoH avg: 45 │  │ ilvl 48 · GSM · Ring        │      │
│  Lv 40–50    │  └────────────────────────────┘      │
│              │  ...                                  │
│  ③ Gear stat │                                      │
│  [CP] [GP]   │                                      │
│  [Craft][Ctl]│                                      │
│              │                                      │
│  ④ Gear type │                                      │
│  [All][Ring] │                                      │
│  [Neck][Body]│                                      │
│  ...         │                                      │
└──────────────┴─────────────────────────────────────┘
```

### Sidebar Sections

1. **Import** — Lodestone URL input + "Import" button, or character name/server search with result list. Shows imported character name and server once loaded.

2. **Job group** — Three toggle buttons: `DoH avg`, `DoL avg`, `Combat`. Selecting Combat shows a dropdown of all combat jobs with their levels. Displays the selected group's average level and the derived level range (e.g., "Lv 40–50").

3. **Gear stat** — Pill buttons, single-select:
   - DoH group: CP, Craftsmanship, Control
   - DoL group: GP, Gathering, Perception
   - Combat group: primary stats (Strength, Dexterity, Mind, Intelligence, Vitality) + secondary (Critical Hit, Direct Hit Rate, Determination, Skill Speed, Spell Speed, Tenacity, Piety)
   - Stat pills update when job group changes

4. **Gear type** — Pill buttons, single-select: All, Ring, Earring, Necklace, Bracelet, Head, Body, Hands, Legs, Feet, Main Hand, Off Hand

### Result Cards

Each card shows:
- Item name (large)
- Item level badge
- Crafted-by abbreviation (GSM, WVR, etc.)
- Gear type
- All stats as badges, with the active stat highlighted

Results header shows: "{count} results — {stat} gear, {type}, {group} Lv {avg}"

---

## Data Sources

### Teamcraft dataset (GitHub CDN)

Base URL: `https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/data/`

Files fetched at startup:
- `recipes.json` — recipe ID → { itemId, job, level, rlvl }
- `items.json` — item ID → { en: name }

For item stats (bonuses like CP, GP, Craftsmanship), XIVAPI item endpoint is used lazily on first search:
`https://xivapi.com/item/{id}?columns=ID,Name,LevelItem,LevelEquip,Stats,ItemKind,ItemUICategory`

Stats are cached in memory (keyed by item ID) after first fetch. When a search triggers, any uncached item IDs in the current level range are collected and fetched in a single XIVAPI call using the IDs filter: `https://xivapi.com/search?indexes=Item&filters=ID|={id1,id2,...}&columns=...`. Results are merged into the stats cache before `filterItems()` runs.

### XIVAPI (character import only)

- `GET https://xivapi.com/character/search?name={name}&server={server}`
- `GET https://xivapi.com/character/{id}?data=CJ`

Job ID to abbreviation mapping is hardcoded (stable, doesn't change between patches):
- DoH: 8=CRP, 9=BSM, 10=ARM, 11=GSM, 12=LTW, 13=WVR, 14=ALC, 15=CUL
- DoL: 16=MIN, 17=BTN, 18=FSH
- Combat: 19=PLD, 20=MNK, 21=WAR, 22=DRG, 23=BRD, 24=WHM, 25=BLM, 26=SMN, 27=SCH, 28=NIN, 29=MCH, 30=DRK, 31=AST, 32=SAM, 33=RDM, 34=BLU, 35=GNB, 36=DNC, 37=RPR, 38=SGE, 39=VPR, 40=PCT

---

## Search Behaviour

1. User selects job group → `getGroupAverage()` computes average → `getLevelRange()` gives ±5 window
2. `data.js` returns all craftable items in that level range
3. Item stats fetched from XIVAPI (cached) if not already loaded
4. `filterItems()` applied: remove items without the selected stat, filter by gear type
5. `sortByStat()` sorts descending by value of selected stat
6. Results rendered — "best" item for selected stat always first

If no stat selected: all items in level range shown, sorted by ilvl descending.
If no gear type selected (default "All"): no gear type filter applied.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Teamcraft data fails to load | Sidebar shows error banner with retry button |
| XIVAPI character not found | Inline error under import field |
| XIVAPI character profile is private | Clear message: "Character profile is private on Lodestone" |
| XIVAPI item stats fetch fails | Item shown without stats, marked "(stats unavailable)" |
| No results for current filters | Empty state: "No craftable items found — try widening your filters or adjusting your level range" |

---

## Project Context Files

The project will include the full required context structure:
- `CLAUDE.md` — project overview, points to AGENTS.md
- `AGENTS.md` — status, decisions, to-do list, agent rules
- `ai-context/technical.md` — stack, APIs, data layer
- `ai-context/build-plan.md` — ordered sub-projects with verification gates
- `ai-context/ffxiv.md` — FFXIV domain context (job IDs, stat names, level cap)
