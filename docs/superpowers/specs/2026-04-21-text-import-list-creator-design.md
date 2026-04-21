# Text Import List Creator Design

**Date:** 2026-04-21  
**Status:** Approved

## Problem

Users have blobs of text (LLM-cleaned crafting lists, plain item name lists) and want to turn them into Teamcraft shopping lists without manually adding items one by one. The tool must parse multiple text formats, match item names against the in-memory craft pool, let the user fix any incorrect or missing matches, and then create an internal list and export it to Teamcraft.

## Requirements

1. Parse text blobs in any of these formats per line: `Name x{qty}`, `Name ×{qty}`, `Name {qty}`, bare `Name` (qty defaults to 1).
2. Skip header lines (all-caps lines, lines matching job abbr + level pattern like `ARM20...`).
3. Match parsed names against the craft pool (craftable/gatherable items only — no XIVAPI calls).
4. Resolution strategy: exact case-insensitive match → `matched`; single partial (substring) match → `partial`; multiple partial matches or none → `unmatched`.
5. Modal shows a two-step flow: paste → preview.
6. Preview lists every parsed row with status indicator (✓ green / ~ amber / ⚠️ red) + pencil edit button + ✕ dismiss button.
7. "Create List" is blocked until every row is either matched/partial OR dismissed with ✕.
8. Pencil opens a secondary search overlay: autofocused input, debounced 150 ms substring search against craft pool, max 20 results, click to select, Escape/click-outside closes without change.
9. After creation: an "Export to Teamcraft" button opens the Teamcraft import URL.
10. "Import from text" button in Lists toolbar is hidden until the data pool has loaded.

## Architecture

### New files

| File | Responsibility |
|---|---|
| `js/listImport.js` | `parseItemLines`, `resolveItems`, modal + search-overlay DOM (using `el()` from `ui.js`) |
| `tests/listImport.test.js` | Unit tests for parser and resolver |

### Modified files

| File | Change |
|---|---|
| `index.html` | Add "Import from text" button (`id="btn-import-list"`) to Lists toolbar, initially `hidden` |
| `js/main.js` | Bind button click → `listImport.openImportModal(...)` after data pool loads |

---

## `js/listImport.js`

### `parseItemLines(text)`

```js
/**
 * @param {string} text
 * @returns {{ rawName: string, qty: number }[]}
 */
export function parseItemLines(text) { ... }
```

**Algorithm:**
1. Split on `\n`.
2. Skip blank lines.
3. Skip header lines: lines that are entirely uppercase, OR lines that match `/^[A-Z]{2,4}\d+/` (job abbr + level prefix).
4. For each remaining line, try patterns in order:
   - `/^(.+?)\s+[x×](\d+)\s*$/i` → name + qty
   - `/^(.+?)\s+(\d+)\s*$/` → name + qty (trailing number)
   - Full trimmed line → name, qty = 1
5. Trim name. If name is empty after trim, skip.

### `resolveItems(parsed, craftPool)`

```js
/**
 * @param {{ rawName: string, qty: number }[]} parsed
 * @param {object[]} craftPool  — from getCraftPoolItems()
 * @returns {{ rawName: string, qty: number, id?: number, name?: string, status: 'matched'|'partial'|'unmatched' }[]}
 */
export function resolveItems(parsed, craftPool) { ... }
```

**Algorithm:**
1. Build `nameMap: Map<lowercase_name, {id, name}>` from craft pool.
2. For each entry:
   - Lowercase + trim `rawName` → `key`
   - Exact: `nameMap.get(key)` → status `matched`
   - Partial: items where `item.name.toLowerCase().includes(key)` or `key.includes(item.name.toLowerCase())`
     - Exactly 1 candidate → status `partial`, use that item
     - 0 or 2+ candidates → status `unmatched`

### Modal — `openImportModal({ getCraftPool, createList, addItemToList, exportTeamcraftUrl })`

Single modal element appended to `document.body`. Two steps rendered inside it:

#### Step 1 — Paste

```
┌─────────────────────────────────────────┐
│ Import items from text                 ✕ │
├─ ℹ info callout (blue left border) ──────┤
│ Accepted formats:                        │
│   Iron Hoplon x1  ·  Iron Hoplon 1  ·    │
│   Iron Hoplon                            │
├──────────────────────────────────────────┤
│ [  textarea (paste here)              ]  │
│                                          │
│                         [ Parse →  ]     │
└──────────────────────────────────────────┘
```

"Parse" runs `parseItemLines` + `resolveItems(parsed, getCraftPool())` then renders Step 2.

#### Step 2 — Preview

```
┌─────────────────────────────────────────┐
│ Import items from text                 ✕ │
├──────────────────────────────────────────┤
│ List name: [ 2026-04-21 (editable)    ]  │
├──────────────────────────────────────────┤
│ Input text       │ Matched item │ Qty │   │
│ ─────────────────┼──────────────┼─────┼── │
│ ✓ Iron Hoplon    │ Iron Hoplon  │  1  │✏️ ✕ │
│ ~ Electrum Circ… │ Electrum C…  │  3  │✏️ ✕ │
│ ⚠️ Foobar Widget │ No match     │  1  │✏️ ✕ │
├──────────────────────────────────────────┤
│ [ ← Back ]            [ Create List ]    │
│                                          │
│ (after creation:)                        │
│ [ Export to Teamcraft ]                  │
└──────────────────────────────────────────┘
```

- **✓** green = exact match
- **~** amber = single partial match
- **⚠️** red = unmatched
- **✏️** pencil = opens search overlay for that row
- **✕** per row = dismiss (row struck through / greyed out, no longer blocks Create)
- "Create List" disabled until every row is matched/partial OR dismissed
- After creation: "Export to Teamcraft" button appears

#### Search overlay (secondary)

Triggered by any ✏️. Rendered on top of the main modal.

```
┌───────────────────────────┐
│ Search items           ✕  │
│ [ search input (focus) ]  │
│ ─────────────────────── │
│   Iron Hoplon            │
│   Iron Ingot             │
│   ...                    │
└───────────────────────────┘
```

- Input debounced 150 ms, filters `item.name.toLowerCase().includes(query)`
- Max 20 results shown
- Click result → updates row status to `matched`, closes overlay
- Escape or click-outside → closes, no change

---

## Integration (`js/main.js`)

After data loads, show the button:

```js
document.getElementById('btn-import-list').hidden = false;
document.getElementById('btn-import-list').addEventListener('click', () => {
  listImport.openImportModal({
    getCraftPool: data.getCraftPoolItems,
    createList: lists.createList,
    addItemToList: lists.addItemToList,
    exportTeamcraftUrl: lists.exportTeamcraftUrl,
  });
});
```

---

## Tests (`tests/listImport.test.js`)

| Test | Verifies |
|---|---|
| `parseItemLines` — `Name x1` format | name + qty=1 |
| `parseItemLines` — `Name ×3` format | name + qty=3 |
| `parseItemLines` — `Name 5` format | name + qty=5 |
| `parseItemLines` — bare name | name + qty=1 |
| `parseItemLines` — skips all-caps header | empty result |
| `parseItemLines` — skips job-abbr prefix lines | empty result |
| `parseItemLines` — mixed block | all valid lines extracted |
| `resolveItems` — exact match | status `matched`, correct id |
| `resolveItems` — case-insensitive exact | status `matched` |
| `resolveItems` — single partial match | status `partial`, correct id |
| `resolveItems` — multiple partial matches | status `unmatched` |
| `resolveItems` — no match | status `unmatched` |
