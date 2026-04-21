// js/listImport.js
import { el, mountFocusTrap } from './ui.js';

export function parseItemLines(text) {
  const lines = text.split('\n');
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[A-Z\s]+$/.test(line)) continue;
    if (/^[A-Z]{2,4}\d+/.test(line)) continue;

    let name;
    let qty;
    let m = line.match(/^(.+?)\s+[x×](\d+)\s*$/i);
    if (m) {
      name = m[1].trim();
      qty = Math.max(1, Math.round(Number(m[2])) || 1);
    } else {
      m = line.match(/^(.+?)\s+(\d+)\s*$/);
      if (m) {
        name = m[1].trim();
        qty = Math.max(1, Math.round(Number(m[2])) || 1);
      } else {
        name = line;
        qty = 1;
      }
    }
    if (name) out.push({ rawName: name, qty });
  }
  return out;
}

/** Merge lines that share the same raw name (case-insensitive); quantities add. */
function coalesceParsedByRawName(parsed) {
  const byKey = new Map();
  for (const e of parsed) {
    const k = e.rawName.toLowerCase().trim();
    const qty = Math.max(1, Math.round(Number(e.qty)) || 1);
    const prev = byKey.get(k);
    if (prev) prev.qty += qty;
    else byKey.set(k, { rawName: e.rawName.trim(), qty });
  }
  return [...byKey.values()];
}

export function resolveItems(parsed, craftPool) {
  const entries = coalesceParsedByRawName(parsed);

  /** Lowercased item name → all pool rows with that name (handles duplicate display names). */
  const byLowerName = new Map();
  for (const item of craftPool) {
    const k = item.name.toLowerCase();
    const list = byLowerName.get(k);
    if (list) list.push(item);
    else byLowerName.set(k, [item]);
  }

  return entries.map(entry => {
    const key = entry.rawName.toLowerCase().trim();
    const exactList = byLowerName.get(key);
    if (exactList?.length === 1) {
      const exact = exactList[0];
      return { ...entry, id: exact.id, name: exact.name, status: 'matched' };
    }
    if (exactList && exactList.length > 1) {
      return { ...entry, status: 'unmatched' };
    }

    const partials = craftPool.filter(item => {
      const n = item.name.toLowerCase();
      return n.includes(key) || key.includes(n);
    });
    const seen = new Set();
    const uniquePartials = [];
    for (const p of partials) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      uniquePartials.push(p);
    }
    if (uniquePartials.length === 1) {
      return { ...entry, id: uniquePartials[0].id, name: uniquePartials[0].name, status: 'partial' };
    }
    return { ...entry, status: 'unmatched' };
  });
}

function todayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function statusIcon(status) {
  if (status === 'matched') return { char: '✓', cls: 'import-status-matched' };
  if (status === 'partial') return { char: '~', cls: 'import-status-partial' };
  return { char: '⚠', cls: 'import-status-unmatched' };
}

/**
 * @param {object} opts
 * @param {() => Array<{ id: number, name: string }>} opts.getCraftPool
 * @param {(name: string) => object} opts.createList
 * @param {(listId: string, entry: { itemId: number, name: string, qty: number }) => object} opts.addItemToList
 * @param {(list: object) => string} opts.exportTeamcraftUrl
 * @param {() => void} [opts.onListCreated]
 */
export function openImportModal({
  getCraftPool,
  createList,
  addItemToList,
  exportTeamcraftUrl,
  onListCreated,
}) {
  /** True while the item search sub-overlay is mounted (so Escape closes search, not the import modal). */
  const importUi = {
    searchOpen: false,
    disposeImportFocus: () => {},
    disposeSearchFocus: () => {},
  };
  /** Closes the topmost import search overlay, if any (prevents stacking multiple searches). */
  let closeActiveSearch = null;

  const backdrop = el('div', { class: 'character-overlay-backdrop' });
  const panel = el('div', {
    class: 'character-overlay-panel import-modal-panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Import items from text',
  });
  const overlay = el(
    'div',
    {
      class: 'character-overlay',
      style: 'display:flex',
      'aria-hidden': 'false',
    },
    backdrop,
    panel,
  );
  document.body.appendChild(overlay);
  importUi.disposeImportFocus = mountFocusTrap(overlay);

  function onMainEscape(e) {
    if (e.key !== 'Escape' || importUi.searchOpen) return;
    close();
  }
  document.addEventListener('keydown', onMainEscape);

  function close() {
    document.removeEventListener('keydown', onMainEscape);
    closeActiveSearch?.();
    importUi.disposeSearchFocus({ restoreFocus: false });
    importUi.disposeSearchFocus = () => {};
    importUi.disposeImportFocus({ restoreFocus: true });
    importUi.disposeImportFocus = () => {};
    overlay.remove();
  }
  backdrop.addEventListener('click', close);

  function makeHeader() {
    const closeBtn = el(
      'button',
      {
        type: 'button',
        class: 'character-overlay-close',
        'aria-label': 'Close',
      },
      '×',
    );
    closeBtn.addEventListener('click', close);
    return el(
      'div',
      { class: 'character-overlay-head' },
      el('h2', { class: 'character-overlay-title' }, 'Import items from text'),
      closeBtn,
    );
  }

  function renderStep1() {
    panel.textContent = '';
    panel.appendChild(makeHeader());

    const info = el(
      'div',
      { class: 'import-info-callout' },
      el('strong', {}, 'Accepted formats:'),
      el('span', {}, ' Iron Hoplon x1  ·  Iron Hoplon ×1  ·  Iron Hoplon 1  ·  Iron Hoplon'),
    );

    const textarea = el('textarea', {
      class: 'import-textarea',
      placeholder: 'Paste item list here…',
      rows: '12',
    });

    const parseMsg = el('div', {
      class: 'import-parse-msg',
      role: 'status',
      'aria-live': 'polite',
    });

    const parseBtn = el('button', { type: 'button', class: 'btn-primary import-parse-btn' }, 'Parse →');
    parseBtn.addEventListener('click', () => {
      parseMsg.textContent = '';
      const parsed = parseItemLines(textarea.value);
      if (!parsed.length) {
        parseMsg.textContent =
          'No item lines found. Paste lines like “Iron Hoplon x2” or bare item names (one per line).';
        return;
      }
      const resolved = resolveItems(parsed, getCraftPool());
      renderStep2(resolved);
    });

    const body = el('div', { class: 'character-overlay-section' }, info, textarea, parseMsg);
    const footer = el('div', { class: 'import-footer' }, parseBtn);
    panel.appendChild(body);
    panel.appendChild(footer);
    textarea.focus();
  }

  function renderStep2(rows) {
    panel.textContent = '';
    panel.appendChild(makeHeader());

    const nameInput = el('input', {
      type: 'text',
      class: 'import-list-name-input',
      value: todayLabel(),
      'aria-label': 'List name',
    });
    const nameRow = el(
      'div',
      { class: 'import-name-row' },
      el('label', { class: 'import-name-label' }, 'List name:'),
      nameInput,
    );

    const state = rows.map(r => ({ ...r, dismissed: false }));

    const tbody = el('tbody');
    const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Create List');
    const exportBtn = el(
      'button',
      {
        type: 'button',
        class: 'btn-secondary',
        style: 'display:none',
      },
      'Export to Teamcraft',
    );
    const exportTarget = { list: null };
    const createErr = el('div', {
      class: 'import-create-msg',
      role: 'alert',
      'aria-live': 'assertive',
    });

    function refreshTable() {
      tbody.textContent = '';
      for (let i = 0; i < state.length; i++) {
        const row = state[i];
        const icon = statusIcon(row.dismissed ? 'unmatched' : row.status);
        const tr = el('tr', { class: row.dismissed ? 'import-row-dismissed' : '' });

        const statusCell = el(
          'td',
          { class: 'import-cell-status' },
          el(
            'span',
            { class: row.dismissed ? 'import-status-dismissed' : icon.cls },
            row.dismissed ? '–' : icon.char,
          ),
        );
        const inputCell = el('td', { class: 'import-cell-input' }, row.rawName);
        const matchCell = el(
          'td',
          { class: 'import-cell-match' },
          row.dismissed ? '–' : (row.name ?? 'No match'),
        );
        const qtyCell = el('td', { class: 'import-cell-qty' }, String(row.qty));

        const editBtn = el(
          'button',
          { type: 'button', class: 'import-row-btn', 'aria-label': 'Edit match', title: 'Edit match' },
          '✏',
        );
        editBtn.addEventListener('click', () =>
          openSearchOverlay(i, state, getCraftPool, refreshTable, refreshCreateBtn),
        );

        const dismissBtn = el(
          'button',
          { type: 'button', class: 'import-row-btn', 'aria-label': 'Dismiss row', title: 'Dismiss' },
          '✕',
        );
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
      const addable = state.some(r => !r.dismissed && r.id != null);
      createBtn.disabled = blocked || !addable;
    }

    refreshTable();
    refreshCreateBtn();

    const table = el(
      'table',
      { class: 'import-preview-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
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

    exportBtn.addEventListener('click', () => {
      if (exportTarget.list) {
        window.open(exportTeamcraftUrl(exportTarget.list), '_blank', 'noopener');
      }
    });

    createBtn.addEventListener('click', () => {
      createErr.textContent = '';
      const listName = nameInput.value.trim() || todayLabel();
      const merged = new Map();
      for (const row of state) {
        if (row.dismissed || row.id == null) continue;
        const itemId = Number(row.id);
        const qty = Math.max(1, Math.round(Number(row.qty)) || 1);
        const prev = merged.get(itemId);
        if (prev) prev.qty += qty;
        else merged.set(itemId, { itemId, name: row.name, qty });
      }
      let list;
      try {
        list = createList(listName);
        for (const entry of merged.values()) {
          list = addItemToList(list.id, entry);
        }
      } catch (err) {
        const msg = err && typeof err.message === 'string' ? err.message : 'Unknown error';
        createErr.textContent = `Could not create list or add items: ${msg}`;
        createBtn.disabled = false;
        return;
      }
      exportTarget.list = list;
      createBtn.disabled = true;
      createBtn.textContent = 'Created ✓';
      if (list.items.length > 0) {
        exportBtn.style.display = '';
        exportBtn.disabled = false;
      } else {
        exportBtn.style.display = 'none';
      }
      if (typeof onListCreated === 'function') onListCreated();
    });

    const body = el('div', { class: 'character-overlay-section import-preview-body' }, nameRow, table);
    const footer = el('div', { class: 'import-footer import-footer--step2' }, createErr, backBtn, createBtn, exportBtn);
    panel.appendChild(body);
    panel.appendChild(footer);
  }

  function openSearchOverlay(rowIndex, state, getPool, refreshTableFn, refreshCreateBtnFn) {
    closeActiveSearch?.();
    importUi.disposeImportFocus({ restoreFocus: false });
    importUi.disposeImportFocus = () => {};

    const craftPool = getPool();
    let debounceTimer = null;

    const searchInput = el('input', {
      type: 'search',
      class: 'import-search-input',
      placeholder: 'Search items…',
      autocomplete: 'off',
    });
    const resultsList = el('ul', { class: 'import-search-results' });

    const closeOverlayBtn = el(
      'button',
      {
        type: 'button',
        class: 'character-overlay-close',
        'aria-label': 'Close search',
      },
      '×',
    );

    const overlayPanel = el(
      'div',
      { class: 'character-overlay-panel import-search-panel' },
      el(
        'div',
        { class: 'character-overlay-head' },
        el('h2', { class: 'character-overlay-title' }, 'Search items'),
        closeOverlayBtn,
      ),
      el('div', { class: 'character-overlay-section' }, searchInput, resultsList),
    );
    const overlayBackdrop = el('div', { class: 'character-overlay-backdrop' });
    const searchOverlay = el(
      'div',
      {
        class: 'character-overlay',
        style: 'display:flex',
      },
      overlayBackdrop,
      overlayPanel,
    );

    function onSearchEscape(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onSearchEscape);
        closeSearchOverlay();
      }
    }
    function closeSearchOverlay() {
      document.removeEventListener('keydown', onSearchEscape);
      importUi.searchOpen = false;
      if (closeActiveSearch === closeSearchOverlay) closeActiveSearch = null;
      importUi.disposeSearchFocus({ restoreFocus: false });
      importUi.disposeSearchFocus = () => {};
      importUi.disposeImportFocus = mountFocusTrap(overlay);
      searchOverlay.remove();
    }
    importUi.searchOpen = true;
    closeActiveSearch = closeSearchOverlay;

    function renderResults(query) {
      resultsList.textContent = '';
      const q = query.toLowerCase();
      const matches = q
        ? craftPool.filter(item => item.name.toLowerCase().includes(q)).slice(0, 20)
        : [];
      for (const item of matches) {
        const li = el('li', { class: 'import-search-result-item' }, item.name);
        li.addEventListener('click', () => {
          state[rowIndex].id = item.id;
          state[rowIndex].name = item.name;
          state[rowIndex].status = 'matched';
          closeSearchOverlay();
          refreshTableFn();
          refreshCreateBtnFn();
        });
        resultsList.appendChild(li);
      }
    }

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderResults(searchInput.value), 150);
    });

    document.body.appendChild(searchOverlay);
    importUi.disposeSearchFocus = mountFocusTrap(searchOverlay);

    closeOverlayBtn.addEventListener('click', closeSearchOverlay);
    overlayBackdrop.addEventListener('click', closeSearchOverlay);
    document.addEventListener('keydown', onSearchEscape);
    searchInput.focus();
  }

  renderStep1();
}
