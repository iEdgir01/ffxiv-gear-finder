// js/ui.js
import { decodeHtmlEntities } from './api.js';
import {
  STATS_BY_GROUP,
  GEAR_TYPES,
  JOB_IDS,
  DOH_JOB_IDS,
  CLASSJOB_CATEGORY_TO_JOBS,
  SERVERS_BY_DC,
  MAX_EQUIP_LEVEL,
} from './constants.js';
import { maxSingleGroupStatValue, canPlayerCraftRecipe } from './search.js';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
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

/** `cssVar` from `main.js` tag defs → outlined pill class */
const ACQ_TAG_CLASS_BY_CSS_VAR = {
  '--green': 'acq-tag--equipped',
  '--gc': 'acq-tag--gc',
  '--purple': 'acq-tag--tomestone',
  '--amber': 'acq-tag--scrip',
  '--blue': 'acq-tag--craftable',
};

function buildAcqTagEl(label, cssVar) {
  const mod = ACQ_TAG_CLASS_BY_CSS_VAR[cssVar];
  return el('span', { class: 'acq-tag' + (mod ? ' ' + mod : '') }, label);
}

/** Native number spinners are unthemeable on Windows/Chromium; use dark step buttons instead. */
function wrapEquipLevelInput(input, onCommit, opts = {}) {
  const compact = Boolean(opts.compact);
  const wrap = el('div', {
    class: 'level-range-field-wrap' + (compact ? ' level-range-field-wrap--compact' : ''),
  });
  const btnUp = el('button', {
    type: 'button',
    class: 'level-range-step level-range-step--up',
    'aria-label': 'Increase level',
  });
  btnUp.appendChild(document.createTextNode('\u25b4'));
  const btnDown = el('button', {
    type: 'button',
    class: 'level-range-step level-range-step--down',
    'aria-label': 'Decrease level',
  });
  btnDown.appendChild(document.createTextNode('\u25be'));
  const stack = el('div', { class: 'level-range-steps' }, btnUp, btnDown);
  const step = () => {
    onCommit();
  };
  btnUp.addEventListener('click', e => {
    e.preventDefault();
    input.stepUp();
    step();
  });
  btnDown.addEventListener('click', e => {
    e.preventDefault();
    input.stepDown();
    step();
  });
  wrap.appendChild(input);
  wrap.appendChild(stack);
  return wrap;
}

/** 1…4 star tier buttons; click star i sets tier to i; click same star again clears (0). */
function buildMasterStarStrip(stars, onChange) {
  const wrap = el('span', { class: 'master-star-strip', role: 'group', 'aria-label': 'Master crafting tier' });
  const s = Number(stars) || 0;
  for (let i = 1; i <= 4; i++) {
    const btn = el('button', {
      type: 'button',
      class: 'master-star-btn' + (s >= i ? ' master-star-btn--on' : ''),
      'aria-label': 'Master tier ' + i,
      'aria-pressed': s >= i ? 'true' : 'false',
    }, '\u2605');
    btn.addEventListener('click', e => {
      e.preventDefault();
      const next = s === i ? 0 : i;
      onChange(next);
    });
    wrap.appendChild(btn);
  }
  const clear = el('button', { type: 'button', class: 'btn-secondary btn-sm master-star-clear' }, 'Clear');
  clear.addEventListener('click', e => {
    e.preventDefault();
    onChange(0);
  });
  wrap.appendChild(clear);
  return wrap;
}

// ── Import section ────────────────────────────────────────────────────────────

export function initServerDropdowns() {
  const dcSel = document.getElementById('char-datacenter');
  const srvSel = document.getElementById('char-server');
  if (!dcSel || !srvSel || dcSel.tagName !== 'SELECT' || srvSel.tagName !== 'SELECT') {
    return;
  }
  const sync = () => {
    const dc = dcSel.value;
    srvSel.textContent = '';
    srvSel.appendChild(el('option', { value: '' }, '-- selection required --'));
    if (dc && SERVERS_BY_DC[dc]) {
      for (const s of SERVERS_BY_DC[dc]) {
        srvSel.appendChild(el('option', {}, s));
      }
      srvSel.hidden = false;
    } else {
      srvSel.hidden = true;
    }
  };
  dcSel.addEventListener('change', sync);
  // If the browser restores the DC selection (or it was preselected), populate servers immediately.
  sync();
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
      document.dispatchEvent(
        new CustomEvent('import-character-id', { detail: { id: char.id, avatar: char.avatar ?? null } })
      );
    });
    list.appendChild(card);
  }
  container.appendChild(list);
}

// ── Job group + level display ─────────────────────────────────────────────────

export function initGroupPills(activeGroup, onSelect) {
  document.querySelectorAll('#group-pills .pill').forEach(pill => {
    pill.classList.toggle('active', activeGroup != null && pill.dataset.group === activeGroup);
    pill.addEventListener('click', () => {
      document.querySelectorAll('#group-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      onSelect(pill.dataset.group);
    });
  });
}

export function setGroupPillsActive(activeGroup) {
  document.querySelectorAll('#group-pills .pill').forEach(pill => {
    pill.classList.toggle('active', activeGroup != null && pill.dataset.group === activeGroup);
  });
}

export function clearLevelDisplay() {
  const node = document.getElementById('level-display');
  if (node) node.textContent = '';
}

function jobHasNumericLevel(jobs, id) {
  const lv = jobs[id]?.level;
  return typeof lv === 'number' && Number.isFinite(lv) && lv >= 1;
}

/**
 * Only lists jobs with a known numeric level (imported character data).
 * Returns the selected job id, or null if none / placeholder.
 * @param {{ placeholderFirst?: boolean, emptyLabel?: string }} [opts]
 */
export function initJobSelect(groupJobIds, jobs, onSelect, opts = {}) {
  const placeholderFirst = Boolean(opts.placeholderFirst);
  const emptyLabel = opts.emptyLabel ?? '\u2014 Select a job \u2014';

  const old = document.getElementById('job-select');
  const sel = old.cloneNode(false);
  old.replaceWith(sel);

  const validIds = groupJobIds.filter(id => jobHasNumericLevel(jobs, id));
  const hasImportedJobs = jobs && typeof jobs === 'object' && Object.keys(jobs).length > 0;

  if (validIds.length === 0) {
    const msg = hasImportedJobs
      ? 'No jobs with level — import a character'
      : 'Link a character in Character settings';
    sel.appendChild(el('option', { value: '' }, msg));
    sel.disabled = true;
    sel.addEventListener('change', () => {});
    return null;
  }

  if (placeholderFirst) {
    sel.appendChild(el('option', { value: '' }, emptyLabel));
  }

  for (const id of validIds) {
    const job = JOB_IDS[id];
    const level = jobs[id].level;
    const opt = el('option', { value: String(id) }, job.abbr + ' \u2014 ' + job.name + ' (Lv ' + level + ')');
    sel.appendChild(opt);
  }

  sel.disabled = false;
  const preferred = validIds.find(id => jobs[id].level > 1) ?? validIds[0];
  sel.value = placeholderFirst ? '' : String(preferred);

  sel.addEventListener('change', () => {
    const v = sel.value;
    if (v === '') onSelect(null);
    else onSelect(Number(v));
  });

  return placeholderFirst ? null : preferred;
}

export function showJobSelect(visible) {
  document.getElementById('job-select-wrap').hidden = !visible;
}

/**
 * Sidebar: `CRP: Lv 51` → master stars (DoH) → single-line “Showing: Lv min–max”.
 * @param {null|{
 *   masterStars: number,
 *   onMasterStarsChange: (n: number) => void,
 * }} [masterOpts] — DoH sidebar only: master recipe tiers for the selected job.
 */
export function renderLevelDisplay(jobAbbr, jobLevel, equipLevelMin, equipLevelMax, onEquipRangeChange, masterOpts = null) {
  const node = document.getElementById('level-display');
  node.textContent = '';
  const rowJob = el('div', { class: 'level-display-row level-display-row--job' });
  rowJob.appendChild(el('span', { class: 'level-display-job-label' }, jobAbbr + ': '));
  rowJob.appendChild(el('span', { class: 'level-avg' }, 'Lv ' + jobLevel));
  node.appendChild(rowJob);

  if (masterOpts && typeof masterOpts.onMasterStarsChange === 'function') {
    const rowM = el('div', { class: 'level-display-row level-display-master' });
    rowM.appendChild(el('span', { class: 'level-display-master-label' }, 'Master crafting: '));
    rowM.appendChild(
      buildMasterStarStrip(masterOpts.masterStars ?? 0, n => masterOpts.onMasterStarsChange(n))
    );
    node.appendChild(rowM);
  }

  const minInput = el('input', {
    type: 'number',
    class: 'level-range-field',
    min: '1',
    max: String(MAX_EQUIP_LEVEL),
    step: '1',
    value: String(equipLevelMin),
    'aria-label': 'Minimum equip level for results',
  });
  const maxInput = el('input', {
    type: 'number',
    class: 'level-range-field',
    min: '1',
    max: String(MAX_EQUIP_LEVEL),
    step: '1',
    value: String(equipLevelMax),
    'aria-label': 'Maximum equip level for results',
  });
  function commit() {
    let a = Math.round(Number(minInput.value) || 1);
    let b = Math.round(Number(maxInput.value) || a);
    a = Math.max(1, Math.min(MAX_EQUIP_LEVEL, a));
    b = Math.max(1, Math.min(MAX_EQUIP_LEVEL, b));
    if (b < a) [a, b] = [b, a];
    minInput.value = String(a);
    maxInput.value = String(b);
    if (typeof onEquipRangeChange === 'function') onEquipRangeChange(a, b);
  }
  minInput.addEventListener('change', commit);
  maxInput.addEventListener('change', commit);

  const rowShow = el('div', { class: 'level-display-row level-display-row--showing' });
  rowShow.appendChild(el('span', { class: 'level-display-showing-label' }, 'Showing: Lv '));
  rowShow.appendChild(wrapEquipLevelInput(minInput, commit, { compact: true }));
  rowShow.appendChild(el('span', { class: 'level-display-showing-dash' }, '\u2013'));
  rowShow.appendChild(wrapEquipLevelInput(maxInput, commit, { compact: true }));
  node.appendChild(rowShow);
}

/** Top-right character chip: portrait + name, or placeholder. */
export function setCharacterChip({ name, portraitUrl }) {
  const img = document.getElementById('character-chip-avatar');
  const ph = document.getElementById('character-chip-placeholder');
  const lab = document.getElementById('character-chip-label');
  if (!img || !ph || !lab) return;
  const hasChar = Boolean(name);
  if (portraitUrl) {
    img.src = portraitUrl;
    img.hidden = false;
    ph.hidden = true;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
    ph.hidden = !hasChar;
  }
  if (hasChar) {
    lab.textContent = name;
    lab.title = name;
  } else {
    lab.textContent = 'Character';
    lab.title = 'Import character & Teamcraft';
  }
}

/**
 * @param {Array<{ lodestoneId: string, name: string, server: string, portrait?: string | null }>} entries
 * @param {string | null} activeLodestoneId
 */
export function renderSavedProfilesList(entries, activeLodestoneId, onSwitch, onRemove) {
  const container = document.getElementById('saved-profiles-list');
  if (!container) return;
  container.textContent = '';
  if (entries.length === 0) {
    container.appendChild(
      el('p', { class: 'saved-profiles-empty' }, 'No saved characters yet — use Import character above.')
    );
    return;
  }
  for (const p of entries) {
    const isActive = String(p.lodestoneId) === String(activeLodestoneId);
    const row = el('div', {
      class: 'saved-profile-row' + (isActive ? ' saved-profile-row--active' : ''),
      role: 'listitem',
    });
    const thumb = el('div', { class: 'saved-profile-thumb' });
    const portrait = p.portrait && /^https?:\/\//i.test(String(p.portrait)) ? String(p.portrait) : null;
    if (portrait) {
      thumb.appendChild(
        el('img', {
          src: portrait,
          alt: '',
          width: 36,
          height: 36,
          loading: 'lazy',
        })
      );
    } else {
      thumb.appendChild(el('span', { class: 'saved-profile-thumb-ph', 'aria-hidden': 'true' }));
    }
    const meta = el('div', { class: 'saved-profile-meta' });
    const nameRow = el('div', { class: 'saved-profile-name-row' });
    nameRow.appendChild(el('span', { class: 'saved-profile-name' }, p.name));
    if (isActive) {
      nameRow.appendChild(el('span', { class: 'saved-profile-active-pill' }, 'Active'));
    }
    meta.appendChild(nameRow);
    meta.appendChild(el('div', { class: 'saved-profile-server' }, p.server));
    const actions = el('div', { class: 'saved-profile-actions' });
    if (!isActive) {
      const useBtn = el('button', { type: 'button', class: 'btn-secondary btn-sm saved-profile-btn' }, 'Use');
      useBtn.addEventListener('click', () => onSwitch(p.lodestoneId));
      actions.appendChild(useBtn);
    }
    const removeBtn = el('button', { type: 'button', class: 'btn-secondary btn-sm saved-profile-btn saved-profile-btn--danger' }, 'Remove');
    removeBtn.addEventListener('click', () => onRemove(p.lodestoneId));
    actions.appendChild(removeBtn);
    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    container.appendChild(row);
  }
}

const STAT_DISPLAY_NAMES = {
  CriticalHit:   'Critical Hit',
  DirectHitRate: 'Direct Hit Rate',
  SkillSpeed:    'Skill Speed',
  SpellSpeed:    'Spell Speed',
};
function statLabel(key) { return STAT_DISPLAY_NAMES[key] ?? key; }

/** Fill priority stat dropdown (empty value = best overall). Uses an optgroup so it mirrors the Source dropdown structure. */
export function renderPriorityStatOptions(statKeys, selectedValue) {
  const sel = document.getElementById('finder-priority-stat');
  if (!sel) return;
  const cur = selectedValue ?? '';
  sel.textContent = '';
  const og = el('optgroup', { label: 'Stat priority' });
  og.appendChild(el('option', { value: '' }, 'Best overall'));
  for (const k of statKeys) {
    og.appendChild(el('option', { value: k }, statLabel(k)));
  }
  sel.appendChild(og);
  if (cur && !statKeys.includes(cur)) {
    sel.value = '';
  } else {
    sel.value = cur || '';
  }
}

// ── Gear type pills ───────────────────────────────────────────────────────────

/** @param {string|null|undefined} activeType — `undefined` = no selection yet; `null` = All. */
export function renderGearTypePills(activeType, onSelect) {
  const container = document.getElementById('gear-type-pills');
  container.textContent = '';
  for (const type of ['All', ...GEAR_TYPES]) {
    const value = type === 'All' ? null : type;
    const isActive =
      activeType === undefined ? false : activeType === value;
    const btn = el('button', { type: 'button', class: 'pill' + (isActive ? ' active' : '') }, type);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      onSelect(value);
    });
    container.appendChild(btn);
  }
}

// ── Results panel ─────────────────────────────────────────────────────────────

/**
 * @param {'bestMatch'|'topPick'|'ilvl'|'equipLevel'} [sortMode]
 */
export function renderResultsHeader(count, gearType, jobAbbr, jobLevel, priorityStat, sortMode = 'bestMatch') {
  const groupLabel = 'Lv ' + jobLevel;
  const el2 = document.getElementById('results-header');
  el2.textContent = '';
  const countSpan = el('span', { class: 'count' }, String(count));
  el2.appendChild(countSpan);
  let sortPhrase;
  if (sortMode === 'topPick') {
    sortPhrase = 'sorted with top picks first, ';
  } else if (sortMode === 'ilvl') {
    sortPhrase = 'sorted by item level (high first), ';
  } else if (sortMode === 'equipLevel') {
    sortPhrase = 'sorted by equip level (high first), ';
  } else if (priorityStat) {
    sortPhrase = 'sorted by ' + statLabel(priorityStat) + ' (highest first), ';
  } else {
    sortPhrase = 'sorted by best match, ';
  }
  el2.appendChild(document.createTextNode(
    ' result' + (count !== 1 ? 's' : '') +
    ' \u2014 ' + sortPhrase + (gearType ?? 'all types') +
    ', ' + (jobAbbr ? jobAbbr + ' ' : '') + groupLabel
  ));
}

const TOP_PICK_TOOLTIP_ALL_SLOTS =
  'Best max stat in each gear slot for this job group (e.g. highest of CP / Craftsmanship / Control for DoH). Multiple dots mean a tie.';

const TOP_PICK_TOOLTIP_ONE_TYPE =
  'Best max stat among these results for this job group. Multiple dots mean a tie.';

function encodeItemNameForData(name) {
  return encodeURIComponent(String(name ?? ''));
}

function decodeItemNameFromData(encoded) {
  try {
    return decodeURIComponent(String(encoded ?? ''));
  } catch {
    return '';
  }
}

/**
 * Sync all + / ✓ add-to-list buttons (Gear Finder cards + Upgrades table) from listed id set.
 */
export function syncAddButtonsListedState(listedIdSet, onAddToList) {
  const set = listedIdSet instanceof Set ? listedIdSet : new Set(listedIdSet);
  document.querySelectorAll('.btn-add-list[data-list-item-id]').forEach(oldBtn => {
    const id = Number(oldBtn.getAttribute('data-list-item-id'));
    const name = decodeItemNameFromData(oldBtn.getAttribute('data-item-name'));
    const listed = set.has(id);
    const parent = oldBtn.parentNode;
    if (!parent) return;

    const newBtn = el('button', {
      type: 'button',
      class: 'btn-add-list' + (listed ? ' btn-in-list' : ''),
      'data-list-item-id': String(id),
      'data-item-name': encodeItemNameForData(name),
      'aria-label': listed ? 'Already in a list' : 'Add to list',
      disabled: listed ? true : undefined,
    }, listed ? '\u2713' : '+');
    if (!listed) {
      newBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        onAddToList({ id, name }, newBtn);
      });
    }
    parent.replaceChild(newBtn, oldBtn);
  });
}

/** Length of the full "every job" list — footer is hidden when redundant with meta ("All jobs"). */
const ALL_JOBS_ABBR_COUNT = CLASSJOB_CATEGORY_TO_JOBS['All Classes']?.length ?? 33;

/**
 * Show the job-abbr strip only for a **strict subset** of jobs (2 … all−1), e.g. DoH-only.
 * Hide for a single job (already in the meta line) and for All Classes ("All jobs").
 */
function shouldShowJobTagFooter(abbrs) {
  if (!abbrs || abbrs.length <= 1) return false;
  if (abbrs.length >= ALL_JOBS_ABBR_COUNT) return false;
  return true;
}

function resolveJobTagAbbrs(item) {
  const cat = (item.classJobCategory ?? '').trim();
  if (cat === 'All Classes') return null;
  if (Array.isArray(item.classJobAbbrs) && item.classJobAbbrs.length > 0) {
    return item.classJobAbbrs;
  }
  const fromMap = CLASSJOB_CATEGORY_TO_JOBS[cat] ?? [];
  return fromMap.length > 0 ? fromMap : null;
}

function renderJobTags(item) {
  const abbrs = resolveJobTagAbbrs(item);
  if (!abbrs || !shouldShowJobTagFooter(abbrs)) return null;
  const text = abbrs.join(' \u00b7 ');
  const row = el('div', { class: 'card-job-tags', title: text });
  row.appendChild(document.createTextNode(text));
  return row;
}

/** Short label for equip restriction (not recipe crafter). */
function equipCategoryShortLabel(classJobCategory) {
  const c = (classJobCategory ?? '').trim();
  if (!c) return '';
  const short = {
    'Disciple of the Hand': 'DoH',
    'Disciple of the Land': 'DoL',
    'Disciple of War': 'DoW',
    'Disciple of Magic': 'DoM',
    'All Classes': 'All jobs',
  };
  if (short[c]) return short[c];
  const abbrs = CLASSJOB_CATEGORY_TO_JOBS[c];
  if (abbrs?.length === 1) return abbrs[0];
  if (abbrs?.length > 1) return abbrs.slice(0, 5).join('\u00b7');
  return c;
}

/** Remove stale document listener from a previous popover (avoid stacked listeners). */
let _addListOutsideClose = null;

export function showAddToListPopover(anchor, item, lists, onAddToExisting, onCreateAndAdd) {
  document.querySelectorAll('.add-list-dropdown').forEach(d => d.remove());
  if (_addListOutsideClose) {
    document.removeEventListener('click', _addListOutsideClose, true);
    _addListOutsideClose = null;
  }

  const drop = el('div', { class: 'add-list-dropdown' });
  const rect = anchor.getBoundingClientRect();
  drop.style.position = 'fixed';
  drop.style.top = rect.bottom + 4 + 'px';
  drop.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';
  drop.style.right = 'auto';
  drop.style.zIndex = '200';

  // Quantity row
  const qtyRow = el('div', { style: 'padding:8px 8px 6px;border-bottom:1px solid var(--border)' });
  const qtyLabel = el('label', { style: 'font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px' }, 'Quantity');
  const qtyInp = el('input', { type: 'number', min: '1', value: '1', style: 'width:70px;margin-bottom:0;padding:4px 6px;font-size:12px' });
  qtyRow.appendChild(qtyLabel);
  qtyRow.appendChild(qtyInp);
  drop.appendChild(qtyRow);

  const getQty = () => Math.max(1, Math.round(Number(qtyInp.value) || 1));

  const closeDrop = () => {
    drop.remove();
    if (_addListOutsideClose) {
      document.removeEventListener('click', _addListOutsideClose, true);
      _addListOutsideClose = null;
    }
  };

  for (const list of lists) {
    const btn = el('button', { class: 'dropdown-item', type: 'button' }, list.name);
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      onAddToExisting(list.id, getQty());
      closeDrop();
    });
    drop.appendChild(btn);
  }
  const newRow = el('div', { style: 'padding:8px;border-top:1px solid var(--border)' });
  const inp = el('input', { type: 'text', placeholder: 'New list name', style: 'width:100%;margin-bottom:6px' });
  const createBtn = el('button', { class: 'btn-primary', type: 'button', style: 'width:100%;font-size:12px;padding:6px' }, 'Create and add');
  createBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    const name = inp.value.trim();
    if (name) onCreateAndAdd(name, getQty());
    closeDrop();
  });
  newRow.appendChild(inp);
  newRow.appendChild(createBtn);
  drop.appendChild(newRow);
  document.body.appendChild(drop);

  _addListOutsideClose = ev => {
    const t = ev.target;
    if (drop.contains(t) || (anchor && typeof anchor.contains === 'function' && anchor.contains(t))) {
      return;
    }
    drop.remove();
    document.removeEventListener('click', _addListOutsideClose, true);
    _addListOutsideClose = null;
  };
  setTimeout(() => document.addEventListener('click', _addListOutsideClose, true), 0);
}

function formatStatBadgeText(k, v, baseline, groupStats, showBaselineComparison) {
  if (!groupStats.includes(k) || typeof v !== 'number' || !Number.isFinite(v)) {
    return k + ' +' + v;
  }
  if (!showBaselineComparison) {
    return k + ' +' + v;
  }
  const oldV = baseline?.stats?.[k];
  if (oldV == null || oldV <= 0) {
    return k + ' +' + v + (v > 0 ? ' (new)' : '');
  }
  const pct = ((v - oldV) / oldV) * 100;
  const sign = pct >= 0 ? '+' : '';
  return k + ' +' + v + ' (' + sign + Math.round(pct) + '%)';
}

/**
 * @param {null|{
 *   jobs: Record<number, { level: number }>,
 *   masterStars: Record<string, number>,
 * }} [craftUi] — Your levels for Craftable tags / meta; omit when no character loaded.
 */
export function renderResults(
  items,
  jobGroup,
  onAddToList,
  topPickIds,
  activeGearType,
  listedItemIds = new Set(),
  emptyDetail = null,
  hasTeamcraftBaseline = false,
  priorityStat = null,
  craftUi = null
) {
  const grid = document.getElementById('results-grid');
  grid.textContent = '';
  if (items.length === 0) {
    const empty = el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No results'),
      emptyDetail ??
        'Try a different gear type, source filter, or check that your levels are imported.'
    );
    grid.appendChild(empty);
    return;
  }
  const groupStats = STATS_BY_GROUP[jobGroup] ?? [];
  items.forEach(item => {
    const recipeStars = Number(item.recipeStars) || 0;
    const canCraft =
      craftUi &&
      item.craftJobId != null &&
      canPlayerCraftRecipe(craftUi.jobs, item, craftUi.masterStars);
    let cardClass = 'result-card';
    if (recipeStars > 0) {
      cardClass += ' result-card--master-recipe';
      if (canCraft) cardClass += ' result-card--master-craftable';
    }
    const card = el('div', {
      class: cardClass,
      'data-item-id': String(item.id),
    });

    const displayName = decodeHtmlEntities(item.name ?? '');
    const headerRow = el('div', { class: 'card-header-row' });
    const titleBlock = el('div', { class: 'card-title-block' });
    titleBlock.appendChild(el('div', { class: 'card-name' }, displayName));
    const tools = el('div', { class: 'card-header-tools' });
    const pickSet = topPickIds instanceof Set ? topPickIds : new Set();
    const tip = priorityStat
      ? 'Best ' + priorityStat + ' among these results (ties share the marker).'
      : activeGearType == null
        ? TOP_PICK_TOOLTIP_ALL_SLOTS
        : TOP_PICK_TOOLTIP_ONE_TYPE;
    const isTopPick = pickSet.size > 0 && pickSet.has(Number(item.id));
    if (isTopPick) {
      tools.appendChild(el('span', {
        class: 'top-pick-dot',
        title: tip,
        tabindex: '0',
        role: 'img',
        'aria-label': tip,
      }));
    }
    if (onAddToList) {
      const listed =
        (listedItemIds instanceof Set ? listedItemIds : new Set()).has(Number(item.id));
      const addBtn = el('button', {
        type: 'button',
        class: 'btn-add-list' + (listed ? ' btn-in-list' : ''),
        'data-list-item-id': String(item.id),
        'data-item-name': encodeItemNameForData(decodeHtmlEntities(item.name ?? '')),
        'aria-label': listed ? 'Already in a list' : 'Add to list',
        disabled: listed ? true : undefined,
      }, listed ? '\u2713' : '+');
      if (!listed) {
        addBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          onAddToList(item, addBtn);
        });
      }
      tools.appendChild(addBtn);
    }
    headerRow.appendChild(titleBlock);
    if (tools.childNodes.length > 0) headerRow.appendChild(tools);
    card.appendChild(headerRow);

    if (recipeStars > 0) {
      card.appendChild(
        el('div', { class: 'card-master-banner' }, 'Master Craft: Lv ' + recipeStars)
      );
    }

    const meta = el('div', { class: 'card-meta' });
    const craft = item.craftJobAbbr != null && item.craftJobAbbr !== '' ? String(item.craftJobAbbr) : '';
    const cat = (item.classJobCategory ?? '').trim();
    const equipShort = equipCategoryShortLabel(cat);
    meta.appendChild(el('span', { class: 'ilvl' }, 'ilvl ' + (item.ilvl ?? '?')));
    if (item.equipLevel != null && Number.isFinite(item.equipLevel)) {
      meta.appendChild(document.createTextNode(' \u00b7 Lv ' + item.equipLevel + ' equip'));
      if (equipShort) {
        meta.appendChild(el('span', { class: 'card-meta-recipe-class', title: cat || undefined }, ' (' + equipShort + ')'));
      }
    }
    if (item.gcInfo) {
      const seals = Number(item.gcInfo?.seals) || 0;
      if (seals > 0) meta.appendChild(document.createTextNode(' \u00b7 ' + seals.toLocaleString() + ' seals'));
      const rOrder = item.gcInfo?.requiredRankOrder;
      if (rOrder != null) meta.appendChild(document.createTextNode(' \u00b7 Rank ' + rOrder));
    } else if (item.tomestoneInfo) {
      const amt = Number(item.tomestoneInfo?.amount) || 0;
      const cur = (item.tomestoneInfo?.currencyName ?? 'tomestone').trim();
      if (amt > 0) meta.appendChild(document.createTextNode(' \u00b7 ' + amt.toLocaleString() + ' \u00d7 ' + cur));
    } else if (item.scripInfo) {
      const amt = Number(item.scripInfo?.amount) || 0;
      const cur = (item.scripInfo?.currencyName ?? 'scrip').trim();
      if (amt > 0) meta.appendChild(document.createTextNode(' \u00b7 ' + amt.toLocaleString() + ' \u00d7 ' + cur));
    } else if (item.recipeLevel != null && Number.isFinite(item.recipeLevel)) {
      meta.appendChild(document.createTextNode(' \u00b7 Lv ' + item.recipeLevel + ' recipe'));
      if (craft) {
        meta.appendChild(el('span', { class: 'card-meta-recipe-class' }, ' (' + craft + ')'));
      }
    }
    /** Read-only “Your BSM: Lv … ★…” — rendered at bottom-right of the card, not in meta. */
    let yourCraftFoot = null;
    if (craftUi && item.craftJobId != null && item.craftJobAbbr) {
      const cid = item.craftJobId;
      const abbr = String(item.craftJobAbbr);
      const pl = craftUi.jobs[cid]?.level;
      const ms = Number(craftUi.masterStars?.[cid] ?? craftUi.masterStars?.[String(cid)] ?? 0) || 0;
      const your = el('span', {
        class: 'card-meta-your-craft',
        title:
          'Your ' +
          abbr +
          ' level and master book tier. Adjust in the sidebar (DoH job) or Job Group \u2192 Edit all.',
      });
      your.appendChild(document.createTextNode('Your ' + abbr + ': Lv ' + (pl ?? '?') + '\u00a0'));
      const stars = el('span', { class: 'card-meta-star-row' });
      for (let i = 1; i <= 4; i++) {
        stars.appendChild(
          el(
            'span',
            { class: 'card-meta-star' + (ms >= i ? ' card-meta-star--on' : '') },
            '\u2605'
          )
        );
      }
      your.appendChild(stars);
      yourCraftFoot = el('div', { class: 'card-your-craft-foot' }, your);
    }
    const tipParts = [];
    if (craft) tipParts.push('Craft job: ' + craft);
    if (cat) tipParts.push('Equip: ' + cat);
    if (item.gcInfo) {
      const seals = Number(item.gcInfo?.seals) || 0;
      if (seals > 0) tipParts.push('Grand Company seals: ' + seals.toLocaleString());
      const rOrder = item.gcInfo?.requiredRankOrder;
      if (rOrder != null) tipParts.push('Required rank: ' + rOrder);
    } else if (item.tomestoneInfo) {
      const amt = Number(item.tomestoneInfo?.amount) || 0;
      const cur = (item.tomestoneInfo?.currencyName ?? '').trim();
      if (amt > 0 && cur) tipParts.push(amt.toLocaleString() + ' \u00d7 ' + cur);
    } else if (item.scripInfo) {
      const amt = Number(item.scripInfo?.amount) || 0;
      const cur = (item.scripInfo?.currencyName ?? '').trim();
      if (amt > 0 && cur) tipParts.push(amt.toLocaleString() + ' \u00d7 ' + cur);
    }
    if (tipParts.length) meta.title = tipParts.join(' \u2014 ');

    const statsDiv = el('div', { class: 'card-stats' });
    const statEntries = Object.entries(item.stats ?? {});
    const maxSingleGroup = maxSingleGroupStatValue(item, jobGroup);
    const baseline = item._baselineStats ?? null;
    if (statEntries.length > 0) {
      for (const [k, v] of statEntries) {
        // Green badges only on **recommended** rows (red top-pick dot), not on every card.
        const isGroupBest =
          isTopPick &&
          !priorityStat &&
          groupStats.includes(k) &&
          typeof v === 'number' &&
          Number.isFinite(v) &&
          maxSingleGroup !== -Infinity &&
          v === maxSingleGroup;
        const isPriority =
          isTopPick && priorityStat && k === priorityStat && typeof v === 'number';
        const label = formatStatBadgeText(k, v, baseline, groupStats, hasTeamcraftBaseline);
        const badge = el(
          'span',
          { class: 'stat-badge' + (isGroupBest || isPriority ? ' highlight' : '') },
          label
        );
        statsDiv.appendChild(badge);
      }
    } else {
      statsDiv.appendChild(el('span', { class: 'stat-badge unavailable' }, 'stats unavailable'));
    }

    card.appendChild(meta);
    card.appendChild(statsDiv);

    const footer = el('div', { class: 'card-footer' });
    const jobTagRow = renderJobTags(item);
    if (jobTagRow) footer.appendChild(jobTagRow);
    const bottomBar = el('div', { class: 'card-bottom-bar' });
    bottomBar.appendChild(el('div', { class: 'card-acq-tags' }));
    if (yourCraftFoot) bottomBar.appendChild(yourCraftFoot);
    footer.appendChild(bottomBar);
    card.appendChild(footer);
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
    container.appendChild(buildAcqTagEl(label, cssVar));
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
    const bar = el('div', { id: 'data-loading-bar', class: 'data-loading-bar', role: 'progressbar', 'aria-label': 'Loading recipe data' },
      el('div', { class: 'data-loading-bar-track' },
        el('div', { class: 'data-loading-bar-indeterminate' })
      )
    );
    document.body.prepend(bar);
  } else if (!visible && existing) {
    existing.remove();
  }
}

let _viewLoadingDepth = 0;
let _viewLoadingMessage = 'Loading…';

/** Ref-counted overlay on `#results-panel` for async fetch/process (finder, upgrades, import). */
export function beginViewLoading(message = 'Loading…') {
  _viewLoadingDepth++;
  _viewLoadingMessage = message;
  syncViewLoadingOverlay();
}

export function endViewLoading() {
  _viewLoadingDepth = Math.max(0, _viewLoadingDepth - 1);
  syncViewLoadingOverlay();
}

/** Main column only (`#results-panel`) — not the sidebar. */
function getMainContentLoadingHost() {
  return document.getElementById('results-panel');
}

function syncViewLoadingOverlay() {
  const host = getMainContentLoadingHost();
  if (!host) return;
  let overlay = document.getElementById('results-view-loading');
  if (_viewLoadingDepth > 0) {
    host.setAttribute('aria-busy', 'true');
    if (!overlay) {
      overlay = el('div', {
        id: 'results-view-loading',
        class: 'main-content-loading',
        role: 'status',
        'aria-busy': 'true',
        'aria-live': 'polite',
      },
        el('div', { class: 'app-loading-card' },
          el('div', { class: 'loading-spinner', 'aria-hidden': 'true' }),
          el('div', { class: 'app-loading-msg' }, _viewLoadingMessage)
        )
      );
      host.appendChild(overlay);
    } else {
      const msgEl = overlay.querySelector('.app-loading-msg');
      if (msgEl) msgEl.textContent = _viewLoadingMessage;
    }
  } else {
    if (overlay) overlay.remove();
    host.removeAttribute('aria-busy');
  }
}

/** Update text without changing ref-count (e.g. recipe load → indexing). */
export function updateViewLoadingMessage(message) {
  _viewLoadingMessage = message;
  const overlay = document.getElementById('results-view-loading');
  const msgEl = overlay?.querySelector('.app-loading-msg');
  if (msgEl) msgEl.textContent = message;
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

/**
 * @param {'profile'|'gearsets'|'gearset'|null} emptyMode — null means render the upgrades table
 */
export function renderUpgradeJobTabs(jobIds, selectedJobId, jobsById, onSelect) {
  const wrap = document.getElementById('upgrade-job-tabs');
  if (!wrap) return;
  wrap.textContent = '';
  const sel = selectedJobId != null ? Number(selectedJobId) : null;
  for (const jid of jobIds) {
    const jn = Number(jid);
    const info = JOB_IDS[jn] ?? JOB_IDS[jid];
    const abbr = info?.abbr ?? String(jid);
    const active = sel != null && Number.isFinite(sel) && sel === jn;
    const lv = jobsById && typeof jobsById === 'object' ? jobsById[jn]?.level : null;
    const lvText = typeof lv === 'number' && Number.isFinite(lv) ? 'Lv ' + lv : null;
    const btn = el('button', {
      type: 'button',
      class: 'upgrade-job-tab' + (active ? ' active' : ''),
      role: 'tab',
      'aria-selected': active ? 'true' : 'false',
      title: info ? info.name : '',
    },
      el('span', { class: 'upgrade-job-tab-abbr' }, abbr),
      lvText ? el('span', { class: 'upgrade-job-tab-lv' }, lvText) : null
    );
    btn.addEventListener('click', () => onSelect(jn));
    wrap.appendChild(btn);
  }
}

export function renderUpgradePage(upgrades, jobAbbr, emptyMode, onAddToList, listedItemIds = new Set()) {
  const container = document.getElementById('upgrade-content');
  container.textContent = '';

  if (emptyMode === 'profile') {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'Teamcraft not linked'),
      'Paste your Teamcraft profile URL in the character settings and click Link profile to load gearsets for upgrades.'
    ));
    return;
  }
  if (emptyMode === 'gearsets') {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No gearsets found'),
      'Sync gearsets in the Teamcraft app, then click Refresh gearsets.'
    ));
    return;
  }
  if (emptyMode === 'gearset') {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No gearset for ' + jobAbbr),
      'This job has no saved gearset in Teamcraft, or slots could not be read.'
    ));
    return;
  }

  if (!upgrades || upgrades.length === 0) {
    container.appendChild(el('div', { class: 'empty-state' },
      el('span', { class: 'empty-title' }, 'No upgrades to show'),
      'Upgrades use the same equip-level rules as Gear Finder for this job. Try Source \u2192 Best overall or Craftable, adjust Include Grand Company / tomestone / scrip / master crafts, refresh gearsets, or re-import your character.'
    ));
    return;
  }

  const table = el('table', { class: 'upgrade-table' });
  const thead = el('thead', {},
    el('tr', {},
      el('th', {}, 'Slot'),
      el('th', {}, 'Equipped'),
      el('th', {}, 'Best Upgrade'),
      el('th', { title: 'Gain in sum of group stats (e.g. DoH: CP + Craftsmanship + Control) vs equipped' }, '\u0394 group stat'),
      el('th', {}, 'Source'),
    )
  );
  table.appendChild(thead);
  const tbody = el('tbody', {});
  for (const row of upgrades) {
    const currentText = row.current
      ? decodeHtmlEntities(row.current.name ?? '') + ' (ilvl ' + (row.current.ilvl ?? '?') + ')'
      : '\u2014';

    let bestCell;
    if (row.best) {
      const label = decodeHtmlEntities(row.best.name ?? '') + ' (ilvl ' + (row.best.ilvl ?? '?') + ')';
      const inner = el('div', { class: 'upgrade-best-row' });
      inner.appendChild(el('span', { class: 'upgrade-best-name' }, label));
      if (onAddToList) {
        const bestName = decodeHtmlEntities(row.best.name ?? '');
        const bestItem = { id: row.best.id, name: bestName };
        const listed =
          (listedItemIds instanceof Set ? listedItemIds : new Set()).has(Number(row.best.id));
        const addBtn = el('button', {
          type: 'button',
          class: 'btn-add-list' + (listed ? ' btn-in-list' : ''),
          'data-list-item-id': String(row.best.id),
          'data-item-name': encodeItemNameForData(bestName),
          'aria-label': listed ? 'Already in a list' : 'Add to list',
          disabled: listed ? true : undefined,
        }, listed ? '\u2713' : '+');
        if (!listed) {
          addBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            onAddToList(bestItem, addBtn);
          });
        }
        inner.appendChild(addBtn);
      }
      bestCell = el('td', { class: 'upgrade-best' }, inner);
    } else {
      bestCell = el('td', {}, row.current ? '\u2713 Best available' : '\u2014');
    }

    const deltaCell =
      row.delta != null
        ? el(
            'td',
            {
              class: 'upgrade-best',
              title: row.deltaHint ? 'Improvement in ' + row.deltaHint + ' vs equipped' : '',
            },
            '+' + row.delta
          )
        : el('td', {}, '\u2014');

    let sourceCell;
    if (row.best && row.bestSourceTags && row.bestSourceTags.length > 0) {
      sourceCell = el('td', {});
      const wrap = el('div', { class: 'upgrade-source-tags' });
      for (const t of row.bestSourceTags) {
        wrap.appendChild(buildAcqTagEl(t.label, t.cssVar));
      }
      sourceCell.appendChild(wrap);
    } else {
      sourceCell = el('td', {}, '\u2014');
    }

    tbody.appendChild(el('tr', {},
      el('td', {}, row.label),
      el('td', {}, currentText),
      bestCell,
      deltaCell,
      sourceCell,
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
      'No lists yet. Use + on Gear Finder or Upgrades (\u2713 if the item is already in a list).'));
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
      const qty = item.qty ?? 1;
      const label = qty > 1 ? item.name + ' \u00d7' + qty : item.name;
      const row = el('div', { style: 'display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:3px 0' });
      row.appendChild(document.createTextNode(label));
      const rmBtn = el('button', { class: 'btn-icon', style: 'font-size:12px' }, '\u00d7');
      rmBtn.addEventListener('click', () => handlers.onRemoveItem(list.id, item.itemId));
      row.appendChild(rmBtn);
      section.appendChild(row);
    }
    body.appendChild(section);
  }
}

// ── Master crafting overlay ───────────────────────────────────────────────────

export function fillMasterCraftingOverlay(jobs, draft, focusJobId) {
  const body = document.getElementById('master-overlay-body');
  if (!body) return;
  body.textContent = '';
  body.appendChild(
    el('p', { class: 'tagline master-overlay-intro' },
      'Set master recipe tiers per crafter (from Master books). Used for Craftable tags and the Craftable source filter.'
    )
  );
  for (const id of DOH_JOB_IDS) {
    const lv = jobs[id]?.level;
    if (lv == null || !Number.isFinite(lv)) continue;
    const j = JOB_IDS[id];
    const ms = Number(draft[String(id)] ?? draft[id] ?? 0) || 0;
    const row = el('div', { class: 'master-editor-row', 'data-job-id': String(id) });
    row.appendChild(el('div', { class: 'master-editor-job' }, j.abbr + ' \u2014 Lv ' + lv));
    row.appendChild(
      buildMasterStarStrip(ms, next => {
        const k = String(id);
        if (next <= 0) delete draft[k];
        else draft[k] = next;
        fillMasterCraftingOverlay(jobs, draft, focusJobId);
      })
    );
    body.appendChild(row);
  }
  if (focusJobId != null) {
    requestAnimationFrame(() => {
      const row = body.querySelector('[data-job-id="' + String(focusJobId) + '"]');
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

export function showMasterOverlay() {
  const overlay = document.getElementById('master-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
}

export function hideMasterOverlay() {
  const overlay = document.getElementById('master-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
}
