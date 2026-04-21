# Text Import List Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Import from text" button to the Lists toolbar that parses arbitrary text blobs into resolved craft-pool items, previews matches with edit/dismiss controls, creates an internal list, and offers a Teamcraft export button.

**Architecture:** New `js/listImport.js` owns all parsing logic (`parseItemLines`, `resolveItems`) and the entire modal DOM tree. `js/data.js` gains a `getCraftPoolItems()` accessor. `js/ui.js` exports its existing `el()` helper. `index.html` adds the button; `js/main.js` wires it after data loads.

**Tech Stack:** Vanilla ES modules, no bundler, Node.js built-in test runner (`node --test tests/*.test.js` via `npm test`).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `js/data.js` | Modify | Add `getCraftPoolItems()` export |
| `js/ui.js` | Modify | Export `el()` |
| `js/listImport.js` | Create | `parseItemLines`, `resolveItems`, `openImportModal` |
| `tests/listImport.test.js` | Create | Unit tests for parser + resolver |
| `index.html` | Modify | Add `btn-import-list` button to Lists toolbar |
| `js/main.js` | Modify | Bind button after data loads |

---

## Task 1: `getCraftPoolItems()` in `data.js` + export `el()` from `ui.js`

**Files:**
- Modify: `js/data.js`
- Modify: `js/ui.js`

- [ ] **Step 1: Add `getCraftPoolItems` to `js/data.js`**

The `_itemsByLevel` map has entries `{ id, name, craftJobAbbr, craftJobGroup, recipeLevel }`. Collect all of them, deduplicated by `id`. Add this function after `getItemsInLevelRange` (line ~75) and add it to the `export` list at the bottom of the file:

```js
export function getCraftPoolItems() {
  if (!_itemsByLevel) return [];
  const seen = new Set();
  const out = [];
  for (const items of _itemsByLevel.values()) {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
  }
  return out;
}
```

- [ ] **Step 2: Export `el()` from `js/ui.js`**

Change `function el(` on line 14 to `export function el(`. No other changes.

- [ ] **Step 3: Run tests to confirm nothing broke**

```
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/data.js js/ui.js
git commit -m "feat(list-import): export getCraftPoolItems + el helper"
```

---

## Task 2: `parseItemLines` + `resolveItems` + unit tests

**Files:**
- Create: `js/listImport.js`
- Create: `tests/listImport.test.js`

- [ ] **Step 1: Write failing tests in `tests/listImport.test.js`**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemLines, resolveItems } from '../js/listImport.js';

// --- parseItemLines ---

describe('parseItemLines — Name x{qty} format', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Iron Hoplon x1');
    assert.deepEqual(result, [{ rawName: 'Iron Hoplon', qty: 1 }]);
  });
});

describe('parseItemLines — Name ×{qty} format (unicode multiply)', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Electrum Circlet ×3');
    assert.deepEqual(result, [{ rawName: 'Electrum Circlet', qty: 3 }]);
  });
});

describe('parseItemLines — Name {trailing number} format', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Iron Ingot 5');
    assert.deepEqual(result, [{ rawName: 'Iron Ingot', qty: 5 }]);
  });
});

describe('parseItemLines — bare name', () => {
  it('defaults qty to 1', () => {
    const result = parseItemLines('Iron Ore');
    assert.deepEqual(result, [{ rawName: 'Iron Ore', qty: 1 }]);
  });
});

describe('parseItemLines — skips all-caps header line', () => {
  it('returns empty array', () => {
    assert.deepEqual(parseItemLines('BLACKSMITH'), []);
  });
});

describe('parseItemLines — skips job-abbr prefix lines', () => {
  it('skips ARM20 prefix line', () => {
    assert.deepEqual(parseItemLines('ARM20Iron Hoplon'), []);
  });
  it('skips BSM with level prefix', () => {
    assert.deepEqual(parseItemLines('BSM15'), []);
  });
});

describe('parseItemLines — mixed block', () => {
  it('extracts all valid lines', () => {
    const text = [
      'BLACKSMITH',
      'ARM20',
      'Iron Hoplon x1',
      'Electrum Circlet ×3',
      'Iron Ingot 2',
      'Raw Tourmaline',
    ].join('\n');
    assert.deepEqual(parseItemLines(text), [
      { rawName: 'Iron Hoplon', qty: 1 },
      { rawName: 'Electrum Circlet', qty: 3 },
      { rawName: 'Iron Ingot', qty: 2 },
      { rawName: 'Raw Tourmaline', qty: 1 },
    ]);
  });
});

// --- resolveItems ---

const pool = [
  { id: 1, name: 'Iron Hoplon' },
  { id: 2, name: 'Electrum Circlet' },
  { id: 3, name: 'Iron Ingot' },
  { id: 4, name: 'Iron Ore' },
];

describe('resolveItems — exact match', () => {
  it('returns status matched with correct id', () => {
    const [row] = resolveItems([{ rawName: 'Iron Hoplon', qty: 1 }], pool);
    assert.equal(row.status, 'matched');
    assert.equal(row.id, 1);
    assert.equal(row.name, 'Iron Hoplon');
  });
});

describe('resolveItems — case-insensitive exact match', () => {
  it('returns status matched', () => {
    const [row] = resolveItems([{ rawName: 'iron hoplon', qty: 1 }], pool);
    assert.equal(row.status, 'matched');
    assert.equal(row.id, 1);
  });
});

describe('resolveItems — single partial match', () => {
  it('returns status partial with correct id', () => {
    const [row] = resolveItems([{ rawName: 'Electrum', qty: 2 }], pool);
    assert.equal(row.status, 'partial');
    assert.equal(row.id, 2);
  });
});

describe('resolveItems — multiple partial matches', () => {
  it('returns status unmatched (Iron matches Iron Hoplon, Iron Ingot, Iron Ore)', () => {
    const [row] = resolveItems([{ rawName: 'Iron', qty: 1 }], pool);
    assert.equal(row.status, 'unmatched');
    assert.equal(row.id, undefined);
  });
});

describe('resolveItems — no match', () => {
  it('returns status unmatched', () => {
    const [row] = resolveItems([{ rawName: 'Foobar Widget', qty: 1 }], pool);
    assert.equal(row.status, 'unmatched');
    assert.equal(row.id, undefined);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```
npm test
```

Expected: FAIL with `Cannot find module '../js/listImport.js'` (or similar).

- [ ] **Step 3: Create `js/listImport.js` with `parseItemLines` and `resolveItems`**

```js
// js/listImport.js
import { el } from './ui.js';
import * as lists from './lists.js';

export function parseItemLines(text) {
  const lines = text.split('\n');
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[A-Z\s]+$/.test(line)) continue;
    if (/^[A-Z]{2,4}\d+/.test(line)) continue;

    let name, qty;
    let m = line.match(/^(.+?)\s+[x×](\d+)\s*$/i);
    if (m) {
      name = m[1].trim();
      qty = Number(m[2]);
    } else {
      m = line.match(/^(.+?)\s+(\d+)\s*$/);
      if (m) {
        name = m[1].trim();
        qty = Number(m[2]);
      } else {
        name = line;
        qty = 1;
      }
    }
    if (name) out.push({ rawName: name, qty });
  }
  return out;
}

export function resolveItems(parsed, craftPool) {
  const nameMap = new Map();
  for (const item of craftPool) {
    nameMap.set(item.name.toLowerCase(), item);
  }

  return parsed.map(entry => {
    const key = entry.rawName.toLowerCase().trim();
    const exact = nameMap.get(key);
    if (exact) return { ...entry, id: exact.id, name: exact.name, status: 'matched' };

    const partials = craftPool.filter(item => {
      const n = item.name.toLowerCase();
      return n.includes(key) || key.includes(n);
    });
    if (partials.length === 1) {
      return { ...entry, id: partials[0].id, name: partials[0].name, status: 'partial' };
    }
    return { ...entry, status: 'unmatched' };
  });
}
```

Note: the `el` and `lists` imports are used in later tasks — `openImportModal` added in Task 3.

- [ ] **Step 4: Run tests — confirm they pass**

```
npm test
```

Expected: all 12 new tests pass, all prior tests still pass.

- [ ] **Step 5: Commit**

```bash
git add js/listImport.js tests/listImport.test.js
git commit -m "feat(list-import): parseItemLines + resolveItems with unit tests"
```

---

## Task 3: Modal UI — paste step + preview step

**Files:**
- Modify: `js/listImport.js` (add `openImportModal`)

This task adds the full modal to `listImport.js`. The modal is a single `<div>` appended to `document.body`, toggled between two steps. No external CSS files change — all classes follow the existing patterns in `css/styles.css` that are already used by the character overlay modal.

- [ ] **Step 1: Read `css/styles.css` to identify relevant modal class names already in use**

Look for `.character-overlay`, `.character-overlay-panel`, `.character-overlay-head`, `.character-overlay-close`, `.btn-primary`, `.btn-secondary`. These are the classes to reuse in the import modal for consistent styling.

- [ ] **Step 2: Add `openImportModal` to `js/listImport.js`**

Append the following to `js/listImport.js` after `resolveItems`:

```js
function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function statusIcon(status) {
  if (status === 'matched') return { char: '✓', cls: 'import-status-matched' };
  if (status === 'partial')  return { char: '~', cls: 'import-status-partial'  };
  return                            { char: '⚠', cls: 'import-status-unmatched' };
}

export function openImportModal({ getCraftPool, createList, addItemToList, exportTeamcraftUrl }) {
  // --- backdrop + panel ---
  const backdrop = el('div', { class: 'character-overlay-backdrop' });
  const panel = el('div', {
    class: 'character-overlay-panel import-modal-panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Import items from text',
  });
  const overlay = el('div', {
    class: 'character-overlay',
    style: 'display:flex',
    'aria-hidden': 'false',
  }, backdrop, panel);
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  backdrop.addEventListener('click', close);

  // --- header (shared) ---
  function makeHeader() {
    const closeBtn = el('button', {
      type: 'button',
      class: 'character-overlay-close',
      'aria-label': 'Close',
    }, '×');
    closeBtn.addEventListener('click', close);
    return el('div', { class: 'character-overlay-head' },
      el('h2', { class: 'character-overlay-title' }, 'Import items from text'),
      closeBtn,
    );
  }

  // --- Step 1: Paste ---
  function renderStep1() {
    panel.textContent = '';
    panel.appendChild(makeHeader());

    const info = el('div', { class: 'import-info-callout' },
      el('strong', {}, 'Accepted formats:'),
      el('span', {}, ' Iron Hoplon x1  ·  Iron Hoplon ×1  ·  Iron Hoplon 1  ·  Iron Hoplon'),
    );

    const textarea = el('textarea', {
      class: 'import-textarea',
      placeholder: 'Paste item list here…',
      rows: '12',
    });

    const parseBtn = el('button', { type: 'button', class: 'btn-primary import-parse-btn' }, 'Parse →');
    parseBtn.addEventListener('click', () => {
      const parsed = parseItemLines(textarea.value);
      if (!parsed.length) return;
      const resolved = resolveItems(parsed, getCraftPool());
      renderStep2(resolved);
    });

    const body = el('div', { class: 'character-overlay-section' }, info, textarea);
    const footer = el('div', { class: 'import-footer' }, parseBtn);
    panel.appendChild(body);
    panel.appendChild(footer);
    textarea.focus();
  }

  // --- Step 2: Preview ---
  function renderStep2(rows) {
    panel.textContent = '';
    panel.appendChild(makeHeader());

    // list name input
    const nameInput = el('input', {
      type: 'text',
      class: 'import-list-name-input',
      value: todayLabel(),
      'aria-label': 'List name',
    });
    const nameRow = el('div', { class: 'import-name-row' },
      el('label', { class: 'import-name-label' }, 'List name:'),
      nameInput,
    );

    // rows state: track dismissed
    const state = rows.map(r => ({ ...r, dismissed: false }));

    const tbody = el('tbody');
    const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Create List');
    const exportBtn = el('button', {
      type: 'button',
      class: 'btn-secondary',
      style: 'display:none',
    }, 'Export to Teamcraft');

    function refreshTable() {
      tbody.textContent = '';
      for (let i = 0; i < state.length; i++) {
        const row = state[i];
        const icon = statusIcon(row.dismissed ? 'dismissed' : row.status);
        const tr = el('tr', { class: row.dismissed ? 'import-row-dismissed' : '' });

        const statusCell = el('td', { class: 'import-cell-status' },
          el('span', { class: row.dismissed ? 'import-status-dismissed' : icon.cls }, row.dismissed ? '–' : icon.char),
        );
        const inputCell = el('td', { class: 'import-cell-input' }, row.rawName);
        const matchCell = el('td', { class: 'import-cell-match' },
          row.dismissed ? '–' : (row.name ?? 'No match'),
        );
        const qtyCell = el('td', { class: 'import-cell-qty' }, String(row.qty));

        const editBtn = el('button', { type: 'button', class: 'import-row-btn', 'aria-label': 'Edit match', title: 'Edit match' }, '✏');
        editBtn.addEventListener('click', () => openSearchOverlay(i));

        const dismissBtn = el('button', { type: 'button', class: 'import-row-btn', 'aria-label': 'Dismiss row', title: 'Dismiss' }, '✕');
        dismissBtn.addEventListener('click', () => {
          state[i].dismissed = !state[i].dismissed;
          refreshTable();
          refreshCreateBtn();
        });

        const actionsCell = el('td', { class: 'import-cell-actions' }, editBtn, dismissBtn);
        tr.appendChild(statusCell);
        tr.appendChild(inputCell);
        tr.appendChild(matchCell);
        tr.appendChild(qtyCell);
        tr.appendChild(actionsCell);
        tbody.appendChild(tr);
      }
    }

    function refreshCreateBtn() {
      const blocked = state.some(r => !r.dismissed && r.status === 'unmatched');
      createBtn.disabled = blocked;
    }

    refreshTable();
    refreshCreateBtn();

    const table = el('table', { class: 'import-preview-table' },
      el('thead', {},
        el('tr', {},
          el('th', {}, ''),
          el('th', {}, 'Input text'),
          el('th', {}, 'Matched item'),
          el('th', {}, 'Qty'),
          el('th', {}, ''),
        ),
      ),
      tbody,
    );

    const backBtn = el('button', { type: 'button', class: 'btn-secondary' }, '← Back');
    backBtn.addEventListener('click', renderStep1);

    createBtn.addEventListener('click', () => {
      const listName = nameInput.value.trim() || todayLabel();
      const list = createList(listName);
      for (const row of state) {
        if (!row.dismissed && row.id != null) {
          addItemToList(list.id, { itemId: row.id, name: row.name, qty: row.qty });
        }
      }
      createBtn.disabled = true;
      createBtn.textContent = 'Created ✓';
      exportBtn.style.display = '';
      exportBtn.addEventListener('click', () => {
        window.open(exportTeamcraftUrl(list), '_blank', 'noopener');
      });
    });

    const body = el('div', { class: 'character-overlay-section import-preview-body' },
      nameRow, table,
    );
    const footer = el('div', { class: 'import-footer' }, backBtn, createBtn, exportBtn);
    panel.appendChild(body);
    panel.appendChild(footer);
  }

  // --- Search overlay ---
  function openSearchOverlay(rowIndex) {
    const craftPool = getCraftPool();
    let debounceTimer = null;

    const searchInput = el('input', {
      type: 'search',
      class: 'import-search-input',
      placeholder: 'Search items…',
      autocomplete: 'off',
    });
    const resultsList = el('ul', { class: 'import-search-results' });

    function renderResults(query) {
      resultsList.textContent = '';
      const q = query.toLowerCase();
      const matches = q
        ? craftPool.filter(item => item.name.toLowerCase().includes(q)).slice(0, 20)
        : [];
      for (const item of matches) {
        const li = el('li', { class: 'import-search-result-item' }, item.name);
        li.addEventListener('click', () => {
          rows[rowIndex] = { ...rows[rowIndex], id: item.id, name: item.name, status: 'matched' };
          // also update the mutable state in the outer renderStep2 scope via rows reference
          Object.assign(rows[rowIndex], { id: item.id, name: item.name, status: 'matched' });
          closeOverlay();
        });
        resultsList.appendChild(li);
      }
    }

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderResults(searchInput.value), 150);
    });

    const closeOverlayBtn = el('button', {
      type: 'button',
      class: 'character-overlay-close',
      'aria-label': 'Close search',
    }, '×');

    const overlayPanel = el('div', { class: 'character-overlay-panel import-search-panel' },
      el('div', { class: 'character-overlay-head' },
        el('h2', { class: 'character-overlay-title' }, 'Search items'),
        closeOverlayBtn,
      ),
      el('div', { class: 'character-overlay-section' }, searchInput, resultsList),
    );
    const overlayBackdrop = el('div', { class: 'character-overlay-backdrop' });
    const searchOverlay = el('div', {
      class: 'character-overlay',
      style: 'display:flex',
    }, overlayBackdrop, overlayPanel);
    document.body.appendChild(searchOverlay);

    function closeOverlay() {
      searchOverlay.remove();
      // re-render step 2 to reflect any change
      renderStep2(rows);
    }

    closeOverlayBtn.addEventListener('click', closeOverlay);
    overlayBackdrop.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', handler); }
    }, { once: false });
    searchInput.focus();
  }

  renderStep1();
}
```

**Important:** The search overlay `closeOverlay` calls `renderStep2(rows)` — but `rows` is the original `parsed` array passed into `renderStep2`. The mutable `state` array in `renderStep2` is what tracks dismissals and edits. To make the search overlay edit persist, we need `rows` to be the same array as `state`. Correct approach: pass `state` (not `rows`) as the argument to `openSearchOverlay`, and mutate `state[rowIndex]` directly.

Revise the search overlay call site in `renderStep2` to:
```js
editBtn.addEventListener('click', () => openSearchOverlay(i, state, refreshTable, refreshCreateBtn));
```

And revise `openSearchOverlay` signature to:
```js
function openSearchOverlay(rowIndex, state, refreshTable, refreshCreateBtn) {
```

Remove the `rows` references inside `openSearchOverlay`. Replace the click handler on each result `li`:
```js
li.addEventListener('click', () => {
  state[rowIndex].id = item.id;
  state[rowIndex].name = item.name;
  state[rowIndex].status = 'matched';
  searchOverlay.remove();
  refreshTable();
  refreshCreateBtn();
});
```

And remove `closeOverlay`'s `renderStep2(rows)` call — just do `searchOverlay.remove()`.

Update the Escape keydown listener to also just remove the overlay:
```js
document.addEventListener('keydown', function handler(e) {
  if (e.key === 'Escape') {
    searchOverlay.remove();
    document.removeEventListener('keydown', handler);
  }
});
```

- [ ] **Step 3: Run tests to confirm parser/resolver tests still pass**

```
npm test
```

Expected: all tests pass (modal code is not exercised by tests).

- [ ] **Step 4: Commit**

```bash
git add js/listImport.js
git commit -m "feat(list-import): openImportModal with paste, preview, and search overlay"
```

---

## Task 4: CSS for import modal

**Files:**
- Modify: `css/styles.css`

The modal reuses `.character-overlay`, `.character-overlay-panel`, `.character-overlay-head`, `.character-overlay-close`, `.btn-primary`, `.btn-secondary` — no new structural CSS needed. Only import-specific classes need styling.

- [ ] **Step 1: Read the end of `css/styles.css` to find where to append**

Use `get_file_outline` or read the last 20 lines to find an appropriate append point (after the existing modal/overlay section).

- [ ] **Step 2: Append import-specific CSS to `css/styles.css`**

```css
/* --- Import modal --- */
.import-info-callout {
  border-left: 4px solid #3b82f6;
  background: #1e3a5f22;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 0.85em;
  color: var(--text-muted, #aaa);
  border-radius: 0 4px 4px 0;
}

.import-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg, #1a1a2e);
  color: var(--text, #e0e0e0);
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 0.85em;
  resize: vertical;
}

.import-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border, #333);
}

.import-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.import-name-label {
  white-space: nowrap;
  font-size: 0.9em;
}

.import-list-name-input {
  flex: 1;
  background: var(--input-bg, #1a1a2e);
  color: var(--text, #e0e0e0);
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  padding: 5px 8px;
}

.import-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88em;
}

.import-preview-table th,
.import-preview-table td {
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border, #222);
}

.import-preview-table th {
  color: var(--text-muted, #888);
  font-weight: 500;
}

.import-preview-body {
  max-height: 340px;
  overflow-y: auto;
}

.import-cell-status { width: 24px; text-align: center; }
.import-cell-qty    { width: 40px; text-align: right; }
.import-cell-actions { width: 60px; text-align: right; white-space: nowrap; }

.import-status-matched  { color: #4ade80; font-weight: bold; }
.import-status-partial  { color: #fbbf24; font-weight: bold; }
.import-status-unmatched { color: #f87171; font-weight: bold; }
.import-status-dismissed { color: #555; }

.import-row-dismissed td { opacity: 0.4; text-decoration: line-through; }

.import-row-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.9em;
  color: var(--text-muted, #888);
}
.import-row-btn:hover { color: var(--text, #e0e0e0); }

/* Search overlay panel (narrower than main modal) */
.import-search-panel {
  max-width: 380px;
}

.import-search-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--input-bg, #1a1a2e);
  color: var(--text, #e0e0e0);
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  padding: 7px 10px;
  margin-bottom: 8px;
}

.import-search-results {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
}

.import-search-result-item {
  padding: 7px 10px;
  cursor: pointer;
  border-radius: 3px;
}
.import-search-result-item:hover { background: var(--hover-bg, #2a2a3e); }
```

- [ ] **Step 3: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "feat(list-import): CSS for import modal and search overlay"
```

---

## Task 5: HTML button + `main.js` binding

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`

- [ ] **Step 1: Add button to Lists toolbar in `index.html`**

In the `lists-toolbar` div (lines ~219–227), add the import button **inside** `.lists-create-row` after the existing "Create" button:

```html
<div class="lists-toolbar">
  <h2 class="lists-heading">My lists</h2>
  <div class="lists-create-row">
    <input type="text" id="new-list-name" placeholder="New list name" aria-label="New list name">
    <button id="btn-create-list" class="btn-secondary btn-sm" type="button">Create</button>
    <button id="btn-import-list" class="btn-secondary btn-sm" type="button" hidden>Import from text</button>
  </div>
</div>
```

- [ ] **Step 2: Add import to `js/main.js`**

At the top of `js/main.js`, add the import:

```js
import * as listImport from './listImport.js';
```

In the `onProgress` callback inside `init()`, in the `if (msg === 'Ready')` branch, add:

```js
if (msg === 'Ready') {
  ui.showDataLoadingBar(false);
  const importBtn = document.getElementById('btn-import-list');
  if (importBtn) {
    importBtn.hidden = false;
    importBtn.addEventListener('click', () => {
      listImport.openImportModal({
        getCraftPool: data.getCraftPoolItems,
        createList: lists.createList,
        addItemToList: lists.addItemToList,
        exportTeamcraftUrl: lists.exportTeamcraftUrl,
      });
    });
  }
}
```

Check the existing imports at the top of `main.js` to confirm `data` and `lists` are already imported under those names — they should be `import * as data from './data.js'` and `import * as lists from './lists.js'`. If those exact names differ, match what's already there.

- [ ] **Step 3: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add index.html js/main.js
git commit -m "feat(list-import): wire btn-import-list button and main.js binding"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered by |
|---|---|
| Parse `Name x{qty}`, `Name ×{qty}`, `Name {qty}`, bare `Name` | Task 2 `parseItemLines` |
| Skip all-caps + job-abbr headers | Task 2 `parseItemLines` |
| Match against craft pool only (no XIVAPI) | Task 2 `resolveItems` |
| Exact → matched, single partial → partial, multi/none → unmatched | Task 2 `resolveItems` |
| Two-step modal (paste → preview) | Task 3 `renderStep1` + `renderStep2` |
| Status icons ✓ / ~ / ⚠ with colours | Task 3 + Task 4 CSS |
| Pencil edit + ✕ dismiss per row | Task 3 `renderStep2` |
| Create List blocked until all matched/partial or dismissed | Task 3 `refreshCreateBtn` |
| Pencil → search overlay, autofocus, debounced 150ms, max 20 results | Task 3 `openSearchOverlay` |
| Escape / click-outside closes overlay without change | Task 3 keydown + backdrop listener |
| After creation: Export to Teamcraft button | Task 3 `createBtn` click handler |
| "Import from text" hidden until data pool loaded | Task 5 `hidden` attr + `msg === 'Ready'` unhide |
| Unit tests for parser + resolver | Task 2 `tests/listImport.test.js` |

**Placeholder scan:** None found.

**Type consistency:** `resolveItems` returns `{ rawName, qty, id?, name?, status }` — matches usage in `renderStep2` (`row.id`, `row.name`, `row.status`, `row.rawName`, `row.qty`). `openImportModal` params (`getCraftPool`, `createList`, `addItemToList`, `exportTeamcraftUrl`) match `main.js` binding in Task 5.
