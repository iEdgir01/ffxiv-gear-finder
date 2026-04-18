# Technical Context

## Stack
- Plain HTML/CSS/ES Modules — no bundler, no build step
- Open index.html directly in browser (or use `npx serve .` for a local server)
- Node.js 18+ built-in test runner for unit tests: `node --test tests/search.test.js`

## Data Sources

### Teamcraft (recipe data, loaded at startup)
Base URL: https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/json/
(Note: original spec had `.../data/` — confirmed correct path is `.../json/` via repo tree inspection)
- `recipes.json` — array of recipe objects: { id, job, lvl, rlvl, result, yields, ingredients, stars, qs, hq, durability, ... }
- `items.json` — object keyed by item ID string: { "6116": { "en": "Rose Gold Ring", "de": "...", "ja": "...", "fr": "..." } }

Field names verified 2026-04-18: `job` (integer), `lvl` (craft level), `result` (item ID integer). No adaptation needed — matches original spec.

Loaded once at app startup, indexed in memory. ~2-5MB total.

### XIVAPI (character import + item stats)
- Character search: GET https://xivapi.com/character/search?name={name}&server={server}
- Character jobs: GET https://xivapi.com/character/{id}?data=CJ
- Item stats: GET https://xivapi.com/search?indexes=Item&filters=ID|={id1,id2,...}&columns=ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory

PROVISIONAL: Verify the exact Stats field name and structure from a live XIVAPI response before writing the stats parser. The field may be Bonuses or Stats depending on item type.

## Module Boundaries
- `constants.js` — data only, no functions
- `search.js` — pure functions, no DOM, no fetch
- `data.js` — fetch + in-memory cache, no DOM
- `api.js` — fetch only, no DOM, no caching
- `ui.js` — DOM only, emits events, does not call search.js or api.js
- `main.js` — orchestrates all others, owns state
