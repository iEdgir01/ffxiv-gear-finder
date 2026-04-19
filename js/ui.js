// js/ui.js
import { STATS_BY_GROUP, GEAR_TYPES, JOB_IDS, JOB_IDS_BY_GROUP, CLASSJOB_CATEGORY_TO_JOBS, SERVERS_BY_DC } from './constants.js';

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

export function initServerDropdowns() {
  const dcSel = document.getElementById('char-datacenter');
  const srvSel = document.getElementById('char-server');
  if (!dcSel || !srvSel || dcSel.tagName !== 'SELECT' || srvSel.tagName !== 'SELECT') {
    return;
  }
  dcSel.addEventListener('change', () => {
    const dc = dcSel.value;
    srvSel.textContent = '';
    srvSel.appendChild(el('option', { value: '' }, 'Any server'));
    if (dc && SERVERS_BY_DC[dc]) {
      for (const s of SERVERS_BY_DC[dc]) {
        srvSel.appendChild(el('option', {}, s));
      }
      srvSel.hidden = false;
    } else {
      srvSel.hidden = true;
    }
  });
}

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
  node.textContent = '';
  node.appendChild(document.createTextNode('\u2713 ' + name + ' \u2014 ' + server));
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

export function initJobSelect(groupJobIds, jobs, onSelect) {
  const old = document.getElementById('job-select');
  const sel = old.cloneNode(false);
  old.replaceWith(sel);
  for (const id of groupJobIds) {
    const job = JOB_IDS[id];
    const level = jobs[id]?.level ?? '?';
    const opt = el('option', { value: String(id) }, job.abbr + ' \u2014 ' + job.name + ' (Lv ' + level + ')');
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onSelect(Number(sel.value)));
  return Number(sel.value);
}

export function showJobSelect(visible) {
  document.getElementById('job-select-wrap').hidden = !visible;
}

export function renderLevelDisplay(jobAbbr, jobLevel, min, max) {
  const node = document.getElementById('level-display');
  node.textContent = '';
  const row1 = el('div', {});
  row1.appendChild(el('span', { style: 'color:var(--text-muted)' }, jobAbbr + ' level: '));
  row1.appendChild(el('span', { class: 'level-avg' }, 'Lv ' + jobLevel));
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

export function renderResultsHeader(count, stat, gearType, jobAbbr, jobLevel) {
  const groupLabel = 'Lv ' + jobLevel;
  const el2 = document.getElementById('results-header');
  el2.textContent = '';
  const countSpan = el('span', { class: 'count' }, String(count));
  el2.appendChild(countSpan);
  el2.appendChild(document.createTextNode(
    ' result' + (count !== 1 ? 's' : '') +
    ' \u2014 ' + (stat ?? 'all stats') +
    ', ' + (gearType ?? 'all types') +
    ', ' + (jobAbbr ? jobAbbr + ' ' : '') + groupLabel
  ));
}

function renderJobTags(classJobCategory) {
  const abbrs = CLASSJOB_CATEGORY_TO_JOBS[classJobCategory] ?? [];
  if (abbrs.length === 0) return null;
  const row = el('div', { class: 'card-job-tags' });
  row.appendChild(document.createTextNode(abbrs.join(' \u00b7 ')));
  return row;
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
    const card = el('div', {
      class: 'result-card' + (idx === 0 && activeStat ? ' best-match' : ''),
      'data-item-id': String(item.id),
    });

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
    const jobTagRow = renderJobTags(item.classJobCategory ?? '');
    if (jobTagRow) card.appendChild(jobTagRow);
    card.appendChild(el('div', { class: 'card-acq-tags' }));
    grid.appendChild(card);
  });
}

export function updateCardTags(itemId, tags) {
  const card = document.querySelector('[data-item-id="' + itemId + '"]');
  if (!card) return;
  const container = card.querySelector('.card-acq-tags');
  if (!container) return;
  container.textContent = '';
  for (const { label, cssVar } of tags) {
    container.appendChild(el('span', {
      class: 'acq-tag',
      style: 'background:var(' + cssVar + ')',
    }, label));
  }
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
      const targetId = 'tab-' + btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(targetId);
      panel.classList.add('active');
      panel.hidden = false;
    });
  });
}

// ── Upgrade page ──────────────────────────────────────────────────────────────

export function renderUpgradePage(upgrades, jobAbbr, noGearset) {
  const container = document.getElementById('upgrade-content');
  container.textContent = '';

  if (noGearset) {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No gearset for ' + jobAbbr),
      'Sync this job\'s gearset in the Teamcraft desktop app, then re-import.'
    ));
    return;
  }

  if (!upgrades || upgrades.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'Select a job to see upgrades')
    ));
    return;
  }

  const table = el('table', { class: 'upgrade-table' });
  const thead = el('thead', {},
    el('tr', {},
      el('th', {}, 'Slot'),
      el('th', {}, 'Equipped'),
      el('th', {}, 'Best Upgrade'),
      el('th', {}, 'Stat Delta'),
    )
  );
  table.appendChild(thead);
  const tbody = el('tbody', {});
  for (const row of upgrades) {
    const currentText = row.current
      ? row.current.name + ' (ilvl ' + (row.current.ilvl ?? '?') + ')'
      : '\u2014';
    const bestCell = row.best
      ? el('td', { class: 'upgrade-best' }, row.best.name + ' (ilvl ' + (row.best.ilvl ?? '?') + ')')
      : el('td', {}, row.current ? '\u2713 Best available' : '\u2014');
    const deltaCell = row.delta != null
      ? el('td', { class: 'upgrade-best' }, '+' + row.delta + ' ' + row.primaryStat)
      : el('td', {}, '\u2014');
    tbody.appendChild(el('tr', {},
      el('td', {}, row.label),
      el('td', {}, currentText),
      bestCell,
      deltaCell,
    ));
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// ── List panel ────────────────────────────────────────────────────────────────

export function renderListPanel(lists, handlers) {
  const body = document.getElementById('list-panel-body');
  body.textContent = '';
  if (lists.length === 0) {
    body.appendChild(el('p', { style: 'color:var(--text-muted);font-size:13px' },
      'No lists yet. Use + on any item card.'));
    return;
  }
  for (const list of lists) {
    const section = el('div', { style: 'margin-bottom:16px' });
    const header = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px' });
    header.appendChild(el('strong', {}, list.name + ' (' + list.items.length + ')'));
    const actions = el('div', { style: 'display:flex;gap:6px' });
    const exportBtn = el('button', { class: 'btn-secondary btn-sm' }, 'Export');
    exportBtn.addEventListener('click', () => handlers.onExport(list));
    const delBtn = el('button', { class: 'btn-secondary btn-sm' }, 'Delete');
    delBtn.addEventListener('click', () => handlers.onDeleteList(list.id));
    actions.appendChild(exportBtn);
    actions.appendChild(delBtn);
    header.appendChild(actions);
    section.appendChild(header);
    for (const item of list.items) {
      const row = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:3px 0' });
      row.appendChild(document.createTextNode(item.name));
      const rmBtn = el('button', { class: 'btn-icon', style: 'font-size:12px' }, '\u00d7');
      rmBtn.addEventListener('click', () => handlers.onRemoveItem(list.id, item.itemId));
      row.appendChild(rmBtn);
      section.appendChild(row);
    }
    body.appendChild(section);
  }
}
