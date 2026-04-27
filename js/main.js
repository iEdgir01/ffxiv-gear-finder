// js/main.js
import { loadData, getCraftPoolItems, isLoaded, onProgress } from './data.js';
import {
  searchCharacter,
  fetchCharacterJobs,
  fetchByTeamcraftUID,
  fetchItemStats,
  extractTeamcraftUid,
  clearItemStatsLocalStorageCache,
} from './api.js';
import { isGcExclusiveAcquisition } from './garland.js';
import {
  filterItems,
  sortGearForDisplay,
  findTopPickIdsByMaxGroupStat,
  getCanonicalGearType,
  canPlayerCraftRecipe,
  collectPriorityStatOptions,
  applyFinderSortMode,
  filterByJobGroupStats,
} from './search.js';
import { JOB_IDS, JOB_IDS_BY_GROUP, MAX_EQUIP_LEVEL, isBaseClass } from './constants.js';
import { GC_ITEMS } from './gcData.js';
import { passesFinderSourceMode } from './finderSourceFilter.js';
import { findBestUpgrades } from './upgrade.js';
import { fetchGearsetsForUser } from './gearsets.js';
import * as lists from './lists.js';
import * as listImport from './listImport.js';
import * as ui from './ui.js';
import * as profiles from './profiles.js';

const state = {
  /** Lodestone character id for the active profile (persistence key). */
  lodestoneId: null,
  jobs: {},
  charName: null,
  uid: null,
  activeGroup: null,
  activeJobId: null,
  activeGearType: null,
  /** True after the user picks a gear type pill (including All). */
  finderGearTypeChosen: false,
  statsCache: {},
  /** Teamcraft gearsets: tabKey -> { jobId, slots, name } */
  gearsetsByJob: null,
  /** ClassJob id for Upgrades tab (Teamcraft gearset); independent of sidebar job. */
  upgradeJobKey: null,
  /** Garland acquisition cache: item id → parsed doc (session). */
  acqCache: {},
  /** Gear Finder Source: `all` | `gc` | `tomestone` | `scrip` | `master` | `craft` (toolbar; paired with sidebar toggles) */
  acquisitionFilter: 'all',
  /** Include Grand Company (seal-only) items in Gear Finder results */
  finderIncludeGc: true,
  /** Include tomestone vendor (Allagan …) items — all job groups */
  finderIncludeTomestones: true,
  /** Include Crafters'/Gatherers' Scrip vendor items — all job groups */
  finderIncludeScrips: true,
  /** Include recipes with a master tier (recipe stars) in Gear Finder */
  finderIncludeMasterCrafts: true,
  /** Include GC seal-only items when computing Upgrades */
  upgradeIncludeGc: true,
  upgradeIncludeTomestones: true,
  upgradeIncludeScrips: true,
  /** Include master-tier recipes when computing Upgrades */
  upgradeIncludeMasterCrafts: true,
  /** Upgrades tab: `bestOverall` (same pool as Gear Finder for the toggles) vs `craft` (craftable-only) */
  upgradeSourceMode: 'bestOverall',
  /** When set, sort/top-pick by this stat key (see STATS_BY_GROUP); null = best overall */
  priorityStat: null,
  /** Live search filter applied to Gear Finder results (lowercase, item name only) */
  searchQuery: '',
  /** Gear Finder results ordering after best-match sort + filter */
  finderSortMode: 'bestMatch',
  /** Lodestone portrait URL after import */
  charPortrait: null,
  /** Gear Finder: equip level band (defaults 1 … job level when job/level changes) */
  equipLevelMin: 1,
  equipLevelMax: 1,
  _equipRangeKey: null,
  /** Master recipe tier (1…4) per crafter ClassJob id string — from profile + session. */
  masterStars: {},
};

let _searchSeq = 0;
let _upgradeRefreshSeq = 0;
let _refreshAllProfilesPromise = null;
let _lastAllProfilesRefreshAt = 0;
/** Draft object while master overlay is open (same reference passed to `fillMasterCraftingOverlay`). */
let _masterDraft = null;

/**
 * Synthesize levels for all 9 base classes from their promoted job levels.
 * Each base-class entry is set to max(existing base-class level, max of promotedJobIds levels).
 * @param {Record<number|string, { level: number }>} jobs
 */
function withBaseClassJobLevels(jobs) {
  const src = jobs && typeof jobs === 'object' ? jobs : {};
  const out = { ...src };
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    if (!info.promotedJobIds) continue;
    const id = Number(idStr);
    const existing = Number(out[id]?.level ?? 0);
    const promoted = Math.max(...info.promotedJobIds.map(pid => Number(out[pid]?.level ?? 0)));
    const lv = Math.max(existing, promoted);
    if (Number.isFinite(lv) && lv > 0) out[id] = { level: lv };
  }
  return out;
}

function normalizeMasterStars(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[String(k)] = Math.min(4, Math.floor(n));
  }
  return out;
}

function persistMasterStar(jobId, tier) {
  const k = String(jobId);
  if (tier <= 0) delete state.masterStars[k];
  else state.masterStars[k] = Math.min(4, Math.floor(tier));
  if (state.lodestoneId) profiles.patchMasterStarsForProfile(state.lodestoneId, { [k]: tier });
}

function persistAllMasterStars(map) {
  state.masterStars = normalizeMasterStars(map);
  if (state.lodestoneId) profiles.setMasterStarsForProfile(state.lodestoneId, state.masterStars);
}

/** Load saved “include GC / tomestones / scrips / master crafts” toggles from a stored profile (default: all on). */
function applyIncludeTogglesFromProfile(p) {
  if (!p) return;
  state.finderIncludeGc = p.finderIncludeGc !== false;
  state.finderIncludeTomestones = p.finderIncludeTomestones !== false;
  state.finderIncludeScrips = p.finderIncludeScrips !== false;
  state.finderIncludeMasterCrafts = p.finderIncludeMasterCrafts !== false;
  state.upgradeIncludeGc = p.upgradeIncludeGc !== false;
  state.upgradeIncludeTomestones = p.upgradeIncludeTomestones !== false;
  state.upgradeIncludeScrips = p.upgradeIncludeScrips !== false;
  state.upgradeIncludeMasterCrafts = p.upgradeIncludeMasterCrafts !== false;
  state.upgradeSourceMode = p.upgradeSourceMode === 'craft' ? 'craft' : 'bestOverall';
}

/** When Source narrows to a type, turn on the matching sidebar include so the pool is not empty. */
function ensureFinderIncludeMatchesSource() {
  const m = state.acquisitionFilter;
  let changed = false;
  if (m === 'gc' && !state.finderIncludeGc) {
    state.finderIncludeGc = true;
    changed = true;
  }
  if (m === 'tomestone' && !state.finderIncludeTomestones) {
    state.finderIncludeTomestones = true;
    changed = true;
  }
  if (m === 'scrip' && !state.finderIncludeScrips) {
    state.finderIncludeScrips = true;
    changed = true;
  }
  if (m === 'master' && !state.finderIncludeMasterCrafts) {
    state.finderIncludeMasterCrafts = true;
    changed = true;
  }
  if (changed) {
    syncIncludeToggleControls();
    persistIncludeTogglesToProfile();
  }
}

/** If Source asks for a type the user turned off in the sidebar, fall back to All sources. */
function reconcileFinderSourceFilterWithToggles() {
  const m = state.acquisitionFilter;
  if (m === 'gc' && !state.finderIncludeGc) state.acquisitionFilter = 'all';
  else if (m === 'tomestone' && !state.finderIncludeTomestones) state.acquisitionFilter = 'all';
  else if (m === 'scrip' && !state.finderIncludeScrips) state.acquisitionFilter = 'all';
  else if (m === 'master' && !state.finderIncludeMasterCrafts) state.acquisitionFilter = 'all';
  syncFinderAcqFilter();
}

function syncIncludeToggleControls() {
  const finderGc = document.getElementById('finder-gc-toggle');
  const finderTomestone = document.getElementById('finder-tomestone-toggle');
  const finderScrip = document.getElementById('finder-scrip-toggle');
  const finderMaster = document.getElementById('finder-master-toggle');
  const upgradeGc = document.getElementById('upgrade-gc-toggle');
  const upgradeTomestone = document.getElementById('upgrade-tomestone-toggle');
  const upgradeScrip = document.getElementById('upgrade-scrip-toggle');
  const upgradeMaster = document.getElementById('upgrade-master-toggle');
  if (finderGc) finderGc.checked = state.finderIncludeGc;
  if (finderTomestone) finderTomestone.checked = state.finderIncludeTomestones;
  if (finderScrip) finderScrip.checked = state.finderIncludeScrips;
  if (finderMaster) finderMaster.checked = state.finderIncludeMasterCrafts;
  if (upgradeGc) upgradeGc.checked = state.upgradeIncludeGc;
  if (upgradeTomestone) upgradeTomestone.checked = state.upgradeIncludeTomestones;
  if (upgradeScrip) upgradeScrip.checked = state.upgradeIncludeScrips;
  if (upgradeMaster) upgradeMaster.checked = state.upgradeIncludeMasterCrafts;
}

function persistIncludeTogglesToProfile() {
  if (!state.lodestoneId) return;
  profiles.setIncludeTogglesForProfile(state.lodestoneId, {
    finderIncludeGc: state.finderIncludeGc,
    finderIncludeTomestones: state.finderIncludeTomestones,
    finderIncludeScrips: state.finderIncludeScrips,
    finderIncludeMasterCrafts: state.finderIncludeMasterCrafts,
    upgradeIncludeGc: state.upgradeIncludeGc,
    upgradeIncludeTomestones: state.upgradeIncludeTomestones,
    upgradeIncludeScrips: state.upgradeIncludeScrips,
    upgradeIncludeMasterCrafts: state.upgradeIncludeMasterCrafts,
  });
}

function getCraftUiForCards() {
  if (!state.charName) return null;
  return {
    jobs: state.jobs,
    masterStars: state.masterStars,
  };
}

function openMasterCraftingEditor(focusJobId) {
  _masterDraft = { ...state.masterStars };
  ui.fillMasterCraftingOverlay(state.jobs, _masterDraft, focusJobId ?? null);
  ui.showMasterOverlay();
}

function initMasterCraftingOverlay() {
  const overlay = document.getElementById('master-overlay');
  const backdrop = document.getElementById('master-overlay-backdrop');
  const closeBtn = document.getElementById('master-overlay-close');
  const saveBtn = document.getElementById('master-overlay-save');
  function discard() {
    _masterDraft = null;
    ui.hideMasterOverlay();
  }
  function save() {
    if (_masterDraft) {
      persistAllMasterStars(_masterDraft);
      _masterDraft = null;
    }
    ui.hideMasterOverlay();
    void runSearch();
    void refreshUpgradePage();
    refreshLevelDisplaySidebar();
  }
  backdrop?.addEventListener('click', discard);
  closeBtn?.addEventListener('click', discard);
  saveBtn?.addEventListener('click', save);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && overlay && !overlay.hidden) discard();
  });
}

function ensureEquipRangeForCurrentJob() {
  const jobId = state.activeJobId;
  if (jobId == null || !state.jobs[jobId]) return;
  const jl = state.jobs[jobId]?.level ?? 1;
  const key = String(jobId) + ':' + jl;
  if (state._equipRangeKey !== key) {
    state.equipLevelMin = 1;
    state.equipLevelMax = jl;
    state._equipRangeKey = key;
  }
}

function clampEquipRange() {
  let a = Math.round(Number(state.equipLevelMin) || 1);
  let b = Math.round(Number(state.equipLevelMax) || a);
  a = Math.max(1, Math.min(MAX_EQUIP_LEVEL, a));
  b = Math.max(1, Math.min(MAX_EQUIP_LEVEL, b));
  if (b < a) [a, b] = [b, a];
  state.equipLevelMin = a;
  state.equipLevelMax = b;
}

function refreshLevelDisplaySidebar() {
  const jobId = state.activeJobId;
  if (jobId == null || !state.jobs[jobId]) {
    ui.clearLevelDisplay();
    return;
  }
  ensureEquipRangeForCurrentJob();
  clampEquipRange();
  const jl = state.jobs[jobId]?.level ?? 1;
  const abbr = JOB_IDS[jobId]?.abbr ?? '?';
  const isDoh = JOB_IDS[jobId]?.group === 'doh';
  const ms = Number(state.masterStars[String(jobId)] ?? state.masterStars[jobId] ?? 0) || 0;
  ui.renderLevelDisplay(
    abbr,
    jl,
    state.equipLevelMin,
    state.equipLevelMax,
    (min, max) => {
      state.equipLevelMin = min;
      state.equipLevelMax = max;
      void runSearch();
    },
    isDoh
      ? {
          masterStars: ms,
          onMasterStarsChange: n => {
            persistMasterStar(jobId, n);
            void runSearch();
            void refreshUpgradePage();
          },
        }
      : null
  );
}

function initJobGroupMasterEditButton() {
  const btn = document.getElementById('job-group-master-edit-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const jid = state.activeJobId;
    const focus =
      jid != null && state.jobs[jid] && JOB_IDS[jid]?.group === 'doh' ? jid : null;
    openMasterCraftingEditor(focus);
  });
}

function equippedItemIdSetForActiveJob() {
  const jid = state.activeJobId;
  if (jid == null) return new Set();
  const key = String(jid) + ':' + (JOB_IDS[jid]?.abbr ?? '');
  const entry = state.gearsetsByJob?.get(key) ?? null;
  const slots = entry?.slots ?? null;
  const s = new Set();
  if (!slots) return s;
  for (const v of Object.values(slots)) {
    if (v != null && Number(v) > 0) s.add(Number(v));
  }
  return s;
}

function filterItemsByAcquisition(items, mode) {
  if (mode === 'all' || !mode) return items;
  const ctx = {
    canCraftRow: row => canPlayerCraftRecipe(state.jobs, row, state.masterStars),
  };
  return items.filter(it => {
    const acq = state.acqCache[it.id];
    return passesFinderSourceMode(it, acq, mode, ctx);
  });
}

function filterOutGcExclusiveItems(items, includeGc) {
  if (includeGc) return items;
  return items.filter(it => {
    if (it?.gcInfo) return false;
    return !isGcExclusiveAcquisition(state.acqCache[it.id]);
  });
}

function filterOutTomestoneVendorItems(items, includeTomestone) {
  if (includeTomestone) return items;
  return items.filter(it => !it?.tomestoneInfo);
}

function filterOutScripVendorItems(items, includeScrip) {
  if (includeScrip) return items;
  return items.filter(it => !it?.scripInfo);
}

function isMasterRecipeRow(row) {
  const n = Number(row?.recipeStars) || 0;
  return n > 0;
}

/**
 * Upgrades pool: Best overall = same candidates as Gear Finder (GC / master toggles already applied above).
 * Craftable = only items the imported character can craft (respects levels + master stars).
 * @param {'bestOverall'|'craft'} mode
 */
function filterPoolForUpgradeMode(pool, mode) {
  if (mode === 'craft') {
    return pool.filter(it => canPlayerCraftRecipe(state.jobs, it, state.masterStars));
  }
  return pool;
}

/** When `includeMaster` is false, drop items whose Teamcraft recipe has a star tier (master crafts). */
function filterOutMasterRecipeItems(items, includeMaster) {
  if (includeMaster) return items;
  return items.filter(it => !isMasterRecipeRow(it));
}


function buildAcquisitionTags(row, acq, equippedIds) {
  const tags = [];
  const eq = equippedIds ?? equippedItemIdSetForActiveJob();
  if (eq.has(Number(row.id))) tags.push({ label: 'Equipped', cssVar: '--green' });
  if (row?.gcInfo || isGcExclusiveAcquisition(acq)) tags.push({ label: 'Grand Company', cssVar: '--gc' });
  else if (row?.tomestoneInfo) tags.push({ label: 'Tomestones', cssVar: '--purple' });
  else if (row?.scripInfo) tags.push({ label: 'Scrips', cssVar: '--amber' });
  else if (canPlayerCraftRecipe(state.jobs, row, state.masterStars)) tags.push({ label: 'Craftable', cssVar: '--blue' });
  return tags;
}

function buildUpgradeSourceTags(best, acq) {
  const tags = [];
  if (best?.gcInfo || isGcExclusiveAcquisition(acq)) tags.push({ label: 'Grand Company', cssVar: '--gc' });
  else if (best?.tomestoneInfo) tags.push({ label: 'Tomestones', cssVar: '--purple' });
  else if (best?.scripInfo) tags.push({ label: 'Scrips', cssVar: '--amber' });
  else if (canPlayerCraftRecipe(state.jobs, best, state.masterStars)) tags.push({ label: 'Craftable', cssVar: '--blue' });
  return tags;
}

function applyAcquisitionTags(items) {
  const equippedIds = equippedItemIdSetForActiveJob();
  for (const row of items.slice(0, 48)) {
    ui.updateCardTags(row.id, buildAcquisitionTags(row, null, equippedIds));
  }
}

function refreshListPanel() {
  ui.renderListPanel(lists.getLists(), {
    onExport(list) {
      const url = lists.exportTeamcraftUrl(list);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onDeleteList(id) {
      lists.deleteList(id);
      refreshListPanel();
    },
    onRemoveItem(listId, itemId) {
      lists.removeItemFromList(listId, itemId);
      refreshListPanel();
    },
  });
  ui.syncAddButtonsListedState(lists.getListedItemIdSet(), handleAddToList);
}

/**
 * Single source of truth for **equip-level** candidate lists (Gear Finder + Upgrades).
 * `getCraftPoolItems()` + optional extra GC rows + `filterItems` by `jobLevel` / job equip rules.
 */
function getFilteredCraftPool({ includeExtraGc, jobId, jobLevel, gearType, equipLevelMin, equipLevelMax }) {
  let items = getCraftPoolItems();
  if (includeExtraGc) {
    const existingIds = new Set(items.map(i => i.id));
    for (const g of Object.values(GC_ITEMS)) {
      if (g.levelEquip <= 0 || g.ilvl <= 0 || g.ilvl >= 10000) continue;
      const gt = getCanonicalGearType({ gearTypeRaw: g.gearTypeRaw });
      if (!gt) continue;
      if (!existingIds.has(g.itemId)) {
        items.push({
          id: g.itemId,
          name: '',
          recipeLevel: null,
          gearTypeRaw: g.gearTypeRaw,
          gearType: gt,
          classJobCategory: g.classJobCategory,
          ilvl: g.ilvl,
          equipLevel: g.levelEquip,
          stats: g.stats,
          gcInfo: {
            companyId: g.companyId,
            seals: Number(g.seals) || 0,
            requiredRankOrder: g.requiredRankOrder ?? null,
          },
        });
        existingIds.add(g.itemId);
      }
    }
  }
  return filterItems(items, {
    gearType: gearType ?? null,
    equipJobId: jobId,
    jobLevel,
    equipLevelMin,
    equipLevelMax,
  });
}

function applyStatsCacheAndRefilter(rows, { jobId, jobLevel, gearType, equipLevelMin, equipLevelMax }) {
  return filterItems(
    rows.map(item => ({
      ...item,
      ...(state.statsCache[item.id] ?? {}),
      stats: state.statsCache[item.id]?.stats ?? item.stats ?? {},
    })),
    {
      gearType: gearType ?? null,
      equipJobId: jobId,
      jobLevel,
      equipLevelMin,
      equipLevelMax,
    }
  );
}

function handleAddToList(item, anchor) {
  const existing = lists.getLists();
  ui.showAddToListPopover(
    anchor,
    item,
    existing,
    (listId, qty) => {
      lists.addItemToList(listId, { itemId: item.id, name: item.name, qty });
      refreshListPanel();
    },
    (name, qty) => {
      const list = lists.createList(name);
      lists.addItemToList(list.id, { itemId: item.id, name: item.name, qty });
      refreshListPanel();
    }
  );
}

async function runSearch() {
  const seq = ++_searchSeq;

  if (!isLoaded()) {
    if (!document.getElementById('results-view-loading')) {
      ui.beginViewLoading('Loading recipe data…');
    }
    ui.renderEmptyState('Loading recipe data...', 'Please wait a moment.');
    return;
  }

  if (!state.charName) {
    ui.renderEmptyState(
      'Load a character.',
      'Open Character (top right), search and import a character to use Gear Finder.'
    );
    return;
  }

  if (state.activeGroup == null || state.activeJobId == null || !state.finderGearTypeChosen) {
    ui.renderEmptyState(
      'Select a job and gear type',
      'Choose a job group, a job, and a gear type (including All) in the sidebar to search.'
    );
    return;
  }

  const jobId = state.activeJobId;
  ui.beginViewLoading('Loading gear…');
  try {
    const jobLevel = state.jobs[jobId]?.level ?? 1;
    const jobAbbr = JOB_IDS[jobId]?.abbr ?? '?';
    ensureEquipRangeForCurrentJob();
    clampEquipRange();

    let filtered = getFilteredCraftPool({
      includeExtraGc: state.finderIncludeGc,
      jobId,
      jobLevel,
      gearType: state.activeGearType,
      equipLevelMin: state.equipLevelMin,
      equipLevelMax: state.equipLevelMax,
    });

    const gearsetKey = String(jobId) + ':' + (JOB_IDS[jobId]?.abbr ?? '');
    const gearset = state.gearsetsByJob?.get(gearsetKey);
    const equipIds = gearset?.slots
      ? [...new Set(Object.values(gearset.slots).map(Number).filter(id => id > 0))]
      : [];
    const poolIds = filtered.map(i => i.id);
    const uncachedIds = [...new Set([...poolIds, ...equipIds])].filter(id => !state.statsCache[id]);
    if (uncachedIds.length > 0) {
      try {
        const fetched = await fetchItemStats(uncachedIds);
        Object.assign(state.statsCache, fetched);
      } catch {
        /* ignore */
      }
    }

    if (seq !== _searchSeq) return;

    filtered = applyStatsCacheAndRefilter(filtered, {
      jobId,
      jobLevel,
      gearType: state.activeGearType,
      equipLevelMin: state.equipLevelMin,
      equipLevelMax: state.equipLevelMax,
    });

    filtered = filterByJobGroupStats(filtered, state.activeGroup);

    const listedIds = lists.getListedItemIdSet();

    if (filtered.length === 0) {
      ui.renderPriorityStatOptions(
        collectPriorityStatOptions(state.activeGroup, state.activeGearType, []),
        state.priorityStat
      );
      ui.renderResultsHeader(0, state.activeGearType, jobAbbr, jobLevel, state.priorityStat, state.finderSortMode);
      ui.renderResults(
        [], state.activeGroup, handleAddToList, new Set(),
        state.activeGearType, listedIds, null, false, state.priorityStat,
        getCraftUiForCards()
      );
      return;
    }

    const afterGc = filterOutGcExclusiveItems(filtered, state.finderIncludeGc);
    const afterTomestone = filterOutTomestoneVendorItems(afterGc, state.finderIncludeTomestones);
    const afterScrip = filterOutScripVendorItems(afterTomestone, state.finderIncludeScrips);
    const afterMaster = filterOutMasterRecipeItems(afterScrip, state.finderIncludeMasterCrafts);
    const afterAcq = filterItemsByAcquisition(afterMaster, state.acquisitionFilter);

    const prioOptions = collectPriorityStatOptions(state.activeGroup, state.activeGearType, afterMaster);
    if (state.priorityStat && !prioOptions.includes(state.priorityStat)) {
      state.priorityStat = null;
    }
    ui.renderPriorityStatOptions(prioOptions, state.priorityStat);

    if (afterAcq.length === 0) {
      ui.renderResultsHeader(0, state.activeGearType, jobAbbr, jobLevel, state.priorityStat, state.finderSortMode);
      const emptyDetail =
        afterGc.length === 0 && filtered.length > 0 && !state.finderIncludeGc
          ? 'No items match with Grand Company gear hidden. Turn on “Include Grand Company items” in the sidebar or try another filter.'
          : afterTomestone.length === 0 && afterGc.length > 0 && !state.finderIncludeTomestones
            ? 'No items match with tomestone vendor gear hidden. Turn on “Include tomestone vendor items” in the sidebar or try another filter.'
            : afterScrip.length === 0 && afterTomestone.length > 0 && !state.finderIncludeScrips
              ? 'No items match with scrip vendor gear hidden. Turn on “Include scrip vendor items” in the sidebar or try another filter.'
              : afterMaster.length === 0 && afterScrip.length > 0 && !state.finderIncludeMasterCrafts
                ? 'No items match with master crafts hidden. Turn on “Include master crafts” in the sidebar or try another filter.'
                : 'No items match this source filter. Try All sources, or pick Grand Company, Tomestones, Scrips, Master crafts, or Craftable.';
      ui.renderResults(
        [], state.activeGroup, handleAddToList, new Set(),
        state.activeGearType, listedIds, emptyDetail, false, state.priorityStat,
        getCraftUiForCards()
      );
      return;
    }

    const sortOpts = { priorityStat: state.priorityStat || null };
    const sorted = sortGearForDisplay(afterAcq, state.activeGroup, sortOpts);
    const q = state.searchQuery;
    const displayed = q ? sorted.filter(it => (it.name ?? '').toLowerCase().includes(q)) : sorted;
    const topPickIds = findTopPickIdsByMaxGroupStat(
      displayed, state.activeGroup, state.activeGearType, state.priorityStat || null
    );
    const ordered = applyFinderSortMode(displayed, state.finderSortMode, topPickIds);
    ui.renderResultsHeader(
      ordered.length, state.activeGearType, jobAbbr, jobLevel, state.priorityStat, state.finderSortMode
    );
    ui.renderResults(
      ordered, state.activeGroup, handleAddToList, topPickIds,
      state.activeGearType, listedIds, null, false, state.priorityStat,
      getCraftUiForCards()
    );
    applyAcquisitionTags(ordered);
  } finally {
    ui.endViewLoading();
  }
}

async function handleCharacterSearch() {
  const name = document.getElementById('char-name').value.trim();
  const dc = document.getElementById('char-datacenter')?.value?.trim() ?? '';
  const server = document.getElementById('char-server').value.trim();
  if (!name) {
    ui.showImportStatus('error', 'Enter a character name.');
    return;
  }
  if (!dc) {
    ui.showImportStatus('error', 'Select a data centre.');
    return;
  }
  if (!server) {
    ui.showImportStatus('error', 'Select a server.');
    return;
  }
  ui.showImportStatus('loading', 'Searching...');
  ui.beginViewLoading('Searching characters…');
  try {
    const results = await searchCharacter(name, server);
    ui.renderCharSearchResults(results);
    ui.hideImportStatus();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  } finally {
    ui.endViewLoading();
  }
}

async function handleImportById(e) {
  const id = typeof e === 'object' && e?.detail?.id != null ? String(e.detail.id) : String(e);
  const avatarFromSearch = typeof e === 'object' && e?.detail?.avatar != null ? e.detail.avatar : null;
  ui.showImportStatus('loading', 'Importing character...');
  ui.beginViewLoading('Importing character…');
  try {
    const { name, server, jobs, portrait } = await fetchCharacterJobs(id);
    state.lodestoneId = id;
    state.jobs = withBaseClassJobLevels(jobs);
    state.charName = name;
    state.charPortrait = portrait || avatarFromSearch || null;
    state.uid = null;
    state.gearsetsByJob = null;
    state.upgradeJobKey = null;
    state.activeGroup = null;
    state.activeJobId = null;
    state.activeGearType = null;
    state.finderGearTypeChosen = false;
    state.priorityStat = null;
    state._equipRangeKey = null;
    state.equipLevelMin = 1;
    state.equipLevelMax = 1;
    clearSearch();
    ui.showImportStatus('success', 'Imported ' + name);
    ui.showCharInfo(name, server);
    ui.setCharacterChip({ name, portraitUrl: state.charPortrait });
    ui.setGroupPillsActive(null);
    ui.showJobSelect(false);
    ui.renderGearTypePills(undefined, onGearTypeSelect);
    ui.clearLevelDisplay();
    profiles.upsertProfileFromImport(id, {
      name,
      server,
      portrait: state.charPortrait,
      jobs: state.jobs,
    });
    const pSaved = profiles.getActiveProfile();
    state.masterStars = normalizeMasterStars(pSaved?.masterStars);
    applyIncludeTogglesFromProfile(pSaved);
    syncIncludeToggleControls();
    const tcInput = document.getElementById('teamcraft-profile');
    if (tcInput) tcInput.value = pSaved?.teamcraftProfileUrl || '';
    refreshSavedProfilesUi();
    const overlay = document.getElementById('character-overlay');
    if (overlay && !overlay.hidden) {
      ui.showCharacterScreen('manage');
      const backBtn = document.getElementById('char-back-btn');
      if (backBtn) backBtn.hidden = false;
    }
    await runSearch();
  } catch (err) {
    ui.showImportStatus('error', err.message);
  } finally {
    ui.endViewLoading();
  }
}

async function handleTeamcraftLink() {
  const raw = document.getElementById('teamcraft-profile')?.value?.trim() ?? '';
  const status = document.getElementById('teamcraft-status');
  if (!state.lodestoneId) {
    if (status) {
      status.hidden = false;
      status.className = 'status-msg error';
      status.textContent = 'Import a character first so this Teamcraft link is saved to that profile.';
    }
    return;
  }
  const uid = extractTeamcraftUid(raw);
  if (!uid) {
    if (status) {
      status.hidden = false;
      status.className = 'status-msg error';
      status.textContent = 'Paste a Teamcraft profile URL (ffxivteamcraft.com/profile/…).';
    }
    return;
  }
  if (status) {
    status.hidden = false;
    status.className = 'status-msg loading';
    status.textContent = 'Loading gearsets…';
  }
  try {
    state.uid = uid;
    ui.beginViewLoading('Loading Teamcraft gearsets…');
    try {
      state.gearsetsByJob = await fetchGearsetsForUser(uid);
    } finally {
      ui.endViewLoading();
    }
    if (status) {
      status.className = 'status-msg success';
      status.textContent = 'Profile linked. Gearsets loaded when available from Teamcraft.';
    }
    profiles.patchTeamcraftForProfile(state.lodestoneId, uid, raw);
    refreshSavedProfilesUi();
    const listsPanel = document.getElementById('lists-panel');
    if (listsPanel && !listsPanel.hidden) refreshListPanel();
    await Promise.all([refreshUpgradePage(), runSearch()]);
  } catch (err) {
    if (status) {
      status.className = 'status-msg error';
      status.textContent = err.message ?? 'Could not load gearsets.';
    }
  }
}

function refreshSavedProfilesUi() {
  ui.renderProfileCards(
    profiles.listProfilesSorted(),
    state.lodestoneId,
    {
      onMakeActive: id => void switchToProfileById(id),
      onRemove: id => void removeSavedProfile(id),
      onTcSave: (id, url) => void handleTcSaveForCard(id, url),
    }
  );
}

async function handleTcSaveForCard(lodestoneId, url) {
  const uid = extractTeamcraftUid(url) ?? null;
  profiles.patchTeamcraftForProfile(lodestoneId, uid, url);
  if (String(lodestoneId) === String(state.lodestoneId) && uid) {
    state.uid = uid;
    try {
      ui.beginViewLoading('Loading Teamcraft gearsets…');
      state.gearsetsByJob = await fetchGearsetsForUser(uid);
    } catch {
      state.gearsetsByJob = null;
    } finally {
      ui.endViewLoading();
    }
    await Promise.all([refreshUpgradePage(), runSearch()]);
  }
  refreshSavedProfilesUi();
  closeCharacterOverlay();
}

function clearCharacterState() {
  state.lodestoneId = null;
  state.jobs = {};
  state.masterStars = {};
  state.charName = null;
  state.charPortrait = null;
  state.uid = null;
  state.gearsetsByJob = null;
  state.upgradeJobKey = null;
  state.activeGroup = null;
  state.activeJobId = null;
  state.activeGearType = null;
  state.finderGearTypeChosen = false;
  state.priorityStat = null;
  state._equipRangeKey = null;
  state.equipLevelMin = 1;
  state.equipLevelMax = 1;
  clearSearch();
  ui.setCharacterChip({ name: null, portraitUrl: null });
  const ci = document.getElementById('char-info');
  if (ci) ci.hidden = true;
  ui.setGroupPillsActive(null);
  ui.showJobSelect(false);
  ui.renderGearTypePills(undefined, onGearTypeSelect);
  ui.clearLevelDisplay();
  const tc = document.getElementById('teamcraft-profile');
  if (tc) tc.value = '';
  state.finderIncludeGc = true;
  state.finderIncludeTomestones = true;
  state.finderIncludeScrips = true;
  state.finderIncludeMasterCrafts = true;
  state.upgradeIncludeGc = true;
  state.upgradeIncludeTomestones = true;
  state.upgradeIncludeScrips = true;
  state.upgradeIncludeMasterCrafts = true;
  state.upgradeSourceMode = 'bestOverall';
  state.finderSortMode = 'bestMatch';
  syncIncludeToggleControls();
  syncUpgradeSourceSelect();
  syncFinderSortSelect();
  void runSearch();
}

function deleteAllLocalAppData() {
  const msg =
    'Delete everything this app has saved in this browser?\n\n' +
    '• All characters and Teamcraft links\n' +
    '• Master crafting tiers\n' +
    '• Gear lists\n' +
    '• Cached item stats\n\n' +
    'This cannot be undone.';
  if (!confirm(msg)) return;
  _masterDraft = null;
  ui.hideMasterOverlay();
  profiles.resetProfilesStore();
  lists.resetListsStore();
  clearItemStatsLocalStorageCache();
  state.statsCache = {};
  state.acqCache = {};
  clearCharacterState();
  void refreshUpgradePage();
  refreshSavedProfilesUi();
  refreshListPanel();
  ui.syncAddButtonsListedState(lists.getListedItemIdSet(), handleAddToList);
  ui.showCharacterScreen('add');
  ui.resetAddForm();
  const backBtn = document.getElementById('char-back-btn');
  if (backBtn) backBtn.hidden = true;
}

async function applyStoredProfile(p) {
  state.lodestoneId = p.lodestoneId;
  state.charName = p.name;
  state.charPortrait = p.portrait;
  state.jobs = p.jobs;
  state.masterStars = normalizeMasterStars(p.masterStars);
  applyIncludeTogglesFromProfile(p);
  state.uid = p.teamcraftUid || null;
  state.gearsetsByJob = null;
  state.upgradeJobKey = null;
  state.activeGroup = null;
  state.activeJobId = null;
  state.activeGearType = null;
  state.finderGearTypeChosen = false;
  state.priorityStat = null;
  state._equipRangeKey = null;
  state.equipLevelMin = 1;
  state.equipLevelMax = 1;
  clearSearch();
  ui.setCharacterChip({ name: p.name, portraitUrl: p.portrait });
  ui.showCharInfo(p.name, p.server);
  ui.setGroupPillsActive(null);
  ui.showJobSelect(false);
  ui.renderGearTypePills(undefined, onGearTypeSelect);
  ui.clearLevelDisplay();
  const tcInput = document.getElementById('teamcraft-profile');
  if (tcInput) tcInput.value = p.teamcraftProfileUrl || '';
  if (state.uid) {
    try {
      ui.beginViewLoading('Loading Teamcraft gearsets…');
      state.gearsetsByJob = await fetchGearsetsForUser(state.uid);
    } catch {
      state.gearsetsByJob = null;
    } finally {
      ui.endViewLoading();
    }
  }
  syncIncludeToggleControls();
  syncUpgradeSourceSelect();
  await Promise.all([refreshUpgradePage(), runSearch()]);
}

async function hydrateFromStorage() {
  const p = profiles.getActiveProfile();
  if (!p) {
    refreshSavedProfilesUi();
    return;
  }
  await applyStoredProfile(p);
  refreshSavedProfilesUi();
}

async function switchToProfileById(lodestoneId) {
  if (!profiles.setActiveLodestoneId(lodestoneId)) return;
  const s = profiles.readStore();
  const p = s.profiles[String(lodestoneId)];
  if (!p) return;
  await applyStoredProfile(p);
  refreshSavedProfilesUi();
}

async function removeSavedProfile(lodestoneId) {
  const wasActive = String(state.lodestoneId) === String(lodestoneId);
  const nextActive = profiles.removeProfile(lodestoneId);
  if (!wasActive) {
    refreshSavedProfilesUi();
    return;
  }
  if (nextActive) {
    const s = profiles.readStore();
    const p = s.profiles[String(nextActive)];
    if (p) await applyStoredProfile(p);
  } else {
    clearCharacterState();
    const overlay = document.getElementById('character-overlay');
    if (overlay && !overlay.hidden) {
      ui.showCharacterScreen('add');
      ui.resetAddForm();
    }
  }
  refreshSavedProfilesUi();
}

function closeCharacterOverlay() {
  const el = document.getElementById('character-overlay');
  if (!el) return;
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
}

function initCharacterOverlay() {
  const overlay = document.getElementById('character-overlay');
  const backdrop = document.getElementById('character-overlay-backdrop');
  const closeBtn = document.getElementById('character-overlay-close');
  const openBtn = document.getElementById('character-open-btn');
  const addBtn = document.getElementById('char-add-btn');
  const backBtn = document.getElementById('char-back-btn');
  const clearAllBtn = document.getElementById('btn-clear-all-local-data');

  function hide() {
    closeCharacterOverlay();
  }
  function show() {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    const profs = profiles.listProfilesSorted();
    if (profs.length > 0) {
      ui.showCharacterScreen('manage');
      refreshSavedProfilesUi();
    } else {
      ui.showCharacterScreen('add');
      ui.resetAddForm();
    }
    if (backBtn) backBtn.hidden = profs.length === 0;
  }

  openBtn?.addEventListener('click', show);
  backdrop?.addEventListener('click', hide);
  closeBtn?.addEventListener('click', hide);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && overlay && !overlay.hidden) hide();
  });

  addBtn?.addEventListener('click', () => {
    ui.showCharacterScreen('add');
    ui.resetAddForm();
    if (backBtn) backBtn.hidden = false;
  });

  backBtn?.addEventListener('click', () => {
    ui.showCharacterScreen('manage');
    refreshSavedProfilesUi();
  });

  clearAllBtn?.addEventListener('click', () => deleteAllLocalAppData());

  const importToggle = document.getElementById('character-import-toggle');
  const importExtra = document.getElementById('character-import-extra');
  if (importToggle && importExtra) {
    importToggle.addEventListener('click', () => {
      const willShow = importExtra.hidden;
      importExtra.hidden = !willShow;
      importToggle.setAttribute('aria-expanded', String(willShow));
    });
  }
}

function clearSearch() {
  state.searchQuery = '';
  const el = document.getElementById('finder-search');
  if (el) el.value = '';
}

function onGearTypeSelect(type) {
  state.activeGearType = type;
  state.finderGearTypeChosen = true;
  void runSearch();
}

function getVisibleJobIds(group) {
  const allIds = JOB_IDS_BY_GROUP[group] ?? [];
  // No character data: show all jobs so anonymous users can pick any job and enter a level.
  if (!state.jobs || Object.keys(state.jobs).length === 0) return allIds;
  return allIds.filter(id => {
    // Only show jobs the character has actually leveled.
    const lv = state.jobs[id]?.level ?? 0;
    if (lv <= 0) return false;
    const promotedIds = JOB_IDS[id]?.promotedJobIds;
    if (promotedIds?.length) {
      // Hide base class if any specialization has a level — show that job instead (e.g. NIN not ROG).
      if (promotedIds.some(pid => (state.jobs[pid]?.level ?? 0) > 0)) return false;
    }
    return true;
  });
}

function initSidebar() {
  document.getElementById('btn-search-char').addEventListener('click', handleCharacterSearch);
  document.addEventListener('import-character-id', e => void handleImportById(e));
  ui.initServerDropdowns();

  const tcBtn = document.getElementById('btn-link-teamcraft');
  if (tcBtn) tcBtn.addEventListener('click', () => void handleTeamcraftLink());

  ui.initGroupPills(null, group => {
    clearSearch();
    state.activeGroup = group;
    state.activeJobId = null;
    state.activeGearType = null;
    state.finderGearTypeChosen = false;
    ui.renderGearTypePills(undefined, onGearTypeSelect);
    const groupIds = getVisibleJobIds(group);
    ui.showJobSelect(true);
    ui.initJobSelect(
      groupIds,
      state.jobs,
      jid => {
        state.activeJobId = jid;
        clearSearch();
        refreshLevelDisplaySidebar();
        void runSearch();
      },
      { placeholderFirst: true }
    );
    refreshLevelDisplaySidebar();
    void runSearch();
  });

  ui.showJobSelect(false);
  ui.renderGearTypePills(undefined, onGearTypeSelect);
  ui.clearLevelDisplay();
  refreshSavedProfilesUi();
}


function buildUpgradeTabs() {
  const tabs = [];
  const seenJobIds = new Set();

  // Category 1: jobs that have a gearset and a level
  const m = state.gearsetsByJob;
  if (m?.size) {
    for (const [key, entry] of m.entries()) {
      const jobId = Number(entry?.jobId);
      if (!Number.isFinite(jobId) || !JOB_IDS[jobId]) continue;
      // Skip gearsets for jobs the character hasn't leveled.
      const lv = state.jobs[jobId]?.level ?? 0;
      if (lv <= 0) continue;
      // Skip base-class gearsets when any promoted job has a level — use the promoted job tab.
      const promotedIds = JOB_IDS[jobId]?.promotedJobIds;
      if (promotedIds?.length && promotedIds.some(pid => (state.jobs[pid]?.level ?? 0) > 0)) continue;
      const abbr = JOB_IDS[jobId].abbr;
      tabs.push({ key, jobId, abbr, title: entry?.name ?? JOB_IDS[jobId].name, hasGearset: true });
      seenJobIds.add(jobId);
    }
  }

  // Category 2: jobs with a level but no Teamcraft gearset tab yet (e.g. Arcanist before a gearset exists).
  // Include base classes only while no specialization is leveled (same rule as Gear Finder job list).
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    const jobId = Number(idStr);
    if (seenJobIds.has(jobId)) continue;
    const lv = state.jobs[jobId]?.level;
    if (!lv || !Number.isFinite(lv)) continue;
    const promotedIds = info.promotedJobIds;
    if (promotedIds?.length && promotedIds.some(pid => (state.jobs[pid]?.level ?? 0) > 0)) continue;
    const key = String(jobId) + ':' + info.abbr;
    tabs.push({ key, jobId, abbr: info.abbr, title: info.name, hasGearset: false });
  }

  tabs.sort((a, b) => a.jobId - b.jobId || a.abbr.localeCompare(b.abbr));
  return tabs;
}

function ensureUpgradeJobKey() {
  const tabs = buildUpgradeTabs();
  if (tabs.length === 0) {
    state.upgradeJobKey = null;
    return;
  }
  const cur = state.upgradeJobKey;
  if (!cur || !tabs.some(t => t.key === cur)) {
    state.upgradeJobKey = tabs[0].key;
  }
}

function syncUpgradeToolbar() {
  ensureUpgradeJobKey();
  const tabs = buildUpgradeTabs();
  ui.renderUpgradeJobTabs(tabs, state.upgradeJobKey, state.jobs, key => {
    state.upgradeJobKey = key;
    void refreshUpgradePage();
  });
}

async function refreshCharacterJobsOnLoad() {
  if (!state.lodestoneId) return;
  ui.beginViewLoading('Syncing character…');
  try {
    // Sometimes a just-loaded page has transient fetch failures (network warm-up, captive portals).
    // Retry once quickly; if it still fails we keep stored levels.
    let payload = null;
    try {
      payload = await fetchCharacterJobs(state.lodestoneId);
    } catch {
      await new Promise(r => setTimeout(r, 600));
      payload = await fetchCharacterJobs(state.lodestoneId);
    }
    const { name, server, jobs, portrait } = payload ?? {};
    // If the user is mid-session and data is already loaded, update in-place without resetting UI state.
    state.jobs = withBaseClassJobLevels(jobs || state.jobs);

    // Supplement with Teamcraft job levels — TC reflects in-game progress faster than Lodestone.
    if (state.uid) {
      try {
        const tcData = await fetchByTeamcraftUID(state.uid);
        if (tcData?.jobs) {
          const merged = { ...state.jobs };
          for (const [jobId, tcJob] of Object.entries(tcData.jobs)) {
            const existing = merged[jobId]?.level ?? 0;
            const tcLevel = tcJob?.level ?? 0;
            if (tcLevel > existing) merged[jobId] = { level: tcLevel };
          }
          state.jobs = withBaseClassJobLevels(merged);
        }
      } catch {
        // Non-fatal; keep Lodestone-only levels.
        console.warn('[main] Teamcraft level sync failed on load; keeping Lodestone levels.');
      }
    }

    if (name) state.charName = name;
    if (server) {
      // Keep existing UI server label up to date.
      ui.showCharInfo(state.charName ?? name, server);
    }
    if (portrait) state.charPortrait = portrait;
    if (state.charName) ui.setCharacterChip({ name: state.charName, portraitUrl: state.charPortrait });

    // Persist refreshed levels (merged Lodestone + Teamcraft) so next load is already updated.
    profiles.upsertProfileFromImport(state.lodestoneId, {
      name: state.charName ?? name ?? 'Unknown',
      server: server ?? '',
      portrait: state.charPortrait ?? null,
      jobs: withBaseClassJobLevels(state.jobs),
    });

    refreshLevelDisplaySidebar();
    syncUpgradeToolbar();

    // Re-fetch Teamcraft gearsets in parallel — TC may update before Lodestone.
    if (state.uid) {
      try {
        state.gearsetsByJob = await fetchGearsetsForUser(state.uid);
      } catch {
        // Keep existing gearsets if refresh fails.
      }
    }

    if (state.activeGroup) {
      ui.initJobSelect(
        getVisibleJobIds(state.activeGroup),
        state.jobs,
        jid => {
          state.activeJobId = jid;
          clearSearch();
          refreshLevelDisplaySidebar();
          void runSearch();
        },
        { placeholderFirst: true }
      );
    }

    await Promise.all([runSearch(), refreshUpgradePage()]);
  } catch (err) {
    // Ignore network/privacy failures; stored levels remain.
    console.warn('[main] Could not refresh character levels on load:', err?.message ?? err);
  } finally {
    ui.endViewLoading();
  }
}

function mergeJobsPreferHigher(a, b) {
  const out = { ...(a ?? {}) };
  for (const [jobId, jb] of Object.entries(b ?? {})) {
    const existing = out[jobId]?.level ?? 0;
    const incoming = jb?.level ?? 0;
    if (incoming > existing) out[jobId] = { level: incoming };
  }
  return withBaseClassJobLevels(out);
}

async function refreshAllProfilesJobsOnLoad({ reason = 'load', minIntervalMs = 30_000 } = {}) {
  const now = Date.now();
  if (_refreshAllProfilesPromise) return _refreshAllProfilesPromise;
  if (now - _lastAllProfilesRefreshAt < minIntervalMs) return;
  _lastAllProfilesRefreshAt = now;

  const doWork = (async () => {
    const store = profiles.readStore();
    const ids = Object.keys(store.profiles ?? {});
    if (ids.length === 0) return;

    // Sequential fetch to avoid hammering external services.
    for (const lodestoneId of ids) {
      const p = store.profiles[String(lodestoneId)];
      if (!p) continue;

      let lodestoneJobs = null;
      try {
        const payload = await fetchCharacterJobs(lodestoneId);
        lodestoneJobs = payload?.jobs ?? null;
      } catch {
        lodestoneJobs = null;
      }

      let merged = lodestoneJobs ?? p.jobs ?? {};

      const uid = p.teamcraftUid ?? null;
      if (uid) {
        try {
          const tc = await fetchByTeamcraftUID(uid);
          if (tc?.jobs) merged = mergeJobsPreferHigher(merged, tc.jobs);
        } catch {
          // Keep Lodestone/stored levels.
        }
      }

      profiles.setJobsForProfile(lodestoneId, withBaseClassJobLevels(merged));

      // Keep in-memory state in sync for the active profile so the UI updates immediately.
      if (String(lodestoneId) === String(state.lodestoneId)) {
        state.jobs = withBaseClassJobLevels(merged);
        refreshLevelDisplaySidebar();
      }

      // Small delay to reduce rate-limit / burstiness.
      await new Promise(r => setTimeout(r, 120));
    }

    // Re-render profile cards (levels not shown today, but keeps TC URL edits consistent).
    refreshSavedProfilesUi();

    // Re-run views for active profile in case job level changed.
    await Promise.all([runSearch(), refreshUpgradePage()]);

    console.info('[main] Refreshed job levels for', ids.length, 'profiles (' + reason + ')');
  })();

  _refreshAllProfilesPromise = doWork.finally(() => {
    _refreshAllProfilesPromise = null;
  });
  return _refreshAllProfilesPromise;
}

async function handleRefreshGearsets() {
  if (!state.uid) return;
  const status = document.getElementById('teamcraft-status');
  if (status) {
    status.hidden = false;
    status.className = 'status-msg loading';
    status.textContent = 'Refreshing gearsets…';
  }
  try {
    ui.beginViewLoading('Refreshing gearsets…');
    try {
      state.gearsetsByJob = await fetchGearsetsForUser(state.uid);
    } finally {
      ui.endViewLoading();
    }
    if (status) {
      status.className = 'status-msg success';
      status.textContent = 'Gearsets refreshed.';
    }
    if (state.activeGroup) {
      ui.initJobSelect(
        getVisibleJobIds(state.activeGroup),
        state.jobs,
        jid => {
          state.activeJobId = jid;
          clearSearch();
          refreshLevelDisplaySidebar();
          void runSearch();
        },
        { placeholderFirst: true }
      );
    }
    await refreshUpgradePage();
  } catch (err) {
    if (status) {
      status.className = 'status-msg error';
      status.textContent = err.message ?? 'Could not refresh gearsets.';
    }
  }
}

async function refreshUpgradePage() {
  const seq = ++_upgradeRefreshSeq;
  syncUpgradeToolbar();

  if (!state.uid) {
    if (seq === _upgradeRefreshSeq) {
      ui.renderUpgradePage([], '?', 'profile', handleAddToList, lists.getListedItemIdSet());
    }
    return;
  }

  const tabs = buildUpgradeTabs();
  if (tabs.length === 0) {
    if (seq === _upgradeRefreshSeq) {
      ui.renderUpgradePage([], '?', 'gearsets', handleAddToList, lists.getListedItemIdSet());
    }
    return;
  }

  const key = state.upgradeJobKey ? String(state.upgradeJobKey) : null;
  const activeTab = key ? tabs.find(t => t.key === key) : null;
  const jobId = activeTab?.jobId != null ? Number(activeTab.jobId) : null;
  const abbr = activeTab?.abbr ?? (jobId != null && Number.isFinite(jobId) ? (JOB_IDS[jobId]?.abbr ?? '?') : '?');
  if (!key || jobId == null || !Number.isFinite(jobId)) {
    if (seq === _upgradeRefreshSeq) {
      ui.renderUpgradePage([], abbr, 'gearset', handleAddToList, lists.getListedItemIdSet());
    }
    return;
  }

  const activeHasGearset = activeTab?.hasGearset ?? true;
  if (!activeHasGearset) {
    if (seq === _upgradeRefreshSeq) {
      ui.renderUpgradePage([], abbr, 'no-gearset', handleAddToList, lists.getListedItemIdSet());
    }
    return;
  }

  const gearset = state.gearsetsByJob?.get(key)?.slots ?? null;
  if (!gearset || Object.keys(gearset).length === 0) {
    if (seq === _upgradeRefreshSeq) {
      ui.renderUpgradePage([], abbr, 'gearset', handleAddToList, lists.getListedItemIdSet());
    }
    return;
  }

  ui.beginViewLoading('Loading upgrades…');
  try {
    const jobLevel = state.jobs[jobId]?.level ?? 1;
    let pool = getFilteredCraftPool({
      includeExtraGc: state.upgradeIncludeGc,
      jobId,
      jobLevel,
      gearType: null,
    });
    const gearIds = [...new Set(Object.values(gearset).map(Number).filter(id => id > 0))];
    const poolIds = pool.map(i => i.id);
    const uncached = [...new Set([...poolIds, ...gearIds])].filter(id => !state.statsCache[id]);
    if (uncached.length > 0) {
      try {
        const fetched = await fetchItemStats(uncached);
        Object.assign(state.statsCache, fetched);
      } catch {
        /* ignore */
      }
    }
    // Retry any equipped-item IDs that failed above — without this a transient XIVAPI
    // error leaves the Equipped column blank until the user manually triggers a refresh.
    const missedGear = gearIds.filter(id => !state.statsCache[id]);
    if (missedGear.length > 0) {
      try {
        Object.assign(state.statsCache, await fetchItemStats(missedGear));
      } catch { /* ignore */ }
    }
    if (seq !== _upgradeRefreshSeq) return;

    pool = applyStatsCacheAndRefilter(pool, { jobId, jobLevel, gearType: null });

    const upgradeGroup = JOB_IDS[jobId]?.group ?? null;
    pool = filterByJobGroupStats(pool, upgradeGroup);

    pool = filterOutGcExclusiveItems(pool, state.upgradeIncludeGc);
    pool = filterOutTomestoneVendorItems(pool, state.upgradeIncludeTomestones);
    pool = filterOutScripVendorItems(pool, state.upgradeIncludeScrips);
    if (!state.upgradeIncludeMasterCrafts) {
      pool = pool.filter(it => !isMasterRecipeRow(it));
    }

    pool = filterPoolForUpgradeMode(pool, state.upgradeSourceMode);

    const upgrades = findBestUpgrades(jobId, jobLevel, gearset, state.statsCache, pool);
    if (seq !== _upgradeRefreshSeq) return;
    for (const row of upgrades) {
      if (row.best) {
        row.bestSourceTags = buildUpgradeSourceTags(row.best, state.acqCache[row.best.id]);
      }
    }
    ui.renderUpgradePage(upgrades, abbr, null, handleAddToList, lists.getListedItemIdSet());
  } finally {
    ui.endViewLoading();
  }
}

function initMainTabs() {
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.main-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = tab.dataset.panel;
      const finder = document.getElementById('finder-panel');
      const upgrade = document.getElementById('upgrade-panel');
      const listsPanel = document.getElementById('lists-panel');
      if (finder) finder.hidden = panel !== 'finder';
      if (upgrade) upgrade.hidden = panel !== 'upgrade';
      if (listsPanel) listsPanel.hidden = panel !== 'lists';
      const jobGroupSec = document.getElementById('job-group-section');
      if (jobGroupSec) jobGroupSec.hidden = panel === 'upgrade' || panel === 'lists';
      const gearTypeSec = document.getElementById('gear-type-section');
      if (gearTypeSec) gearTypeSec.hidden = panel === 'upgrade' || panel === 'lists';
      // On every in-app tab switch, refresh job levels for all saved profiles in the background.
      // Throttled/rate-limited by `refreshAllProfilesJobsOnLoad`.
      void refreshAllProfilesJobsOnLoad({ reason: 'tab', minIntervalMs: 30_000 });
      if (panel === 'finder') void runSearch();
      if (panel === 'upgrade') void refreshUpgradePage();
      if (panel === 'lists') refreshListPanel();
    });
  });
}

const FINDER_ACQ_MODES = new Set(['all', 'gc', 'tomestone', 'scrip', 'master', 'craft']);

function syncFinderAcqFilter() {
  const finder = document.getElementById('finder-acq-filter');
  if (!finder) return;
  let v = state.acquisitionFilter || 'all';
  if (!FINDER_ACQ_MODES.has(v)) {
    v = 'all';
    state.acquisitionFilter = 'all';
  }
  finder.value = v;
}

function syncFinderSortSelect() {
  const el = document.getElementById('finder-sort-mode');
  if (el) {
    const v = state.finderSortMode || 'bestMatch';
    const ok = ['bestMatch', 'topPick', 'ilvl', 'equipLevel'].includes(v);
    el.value = ok ? v : 'bestMatch';
  }
}

function syncUpgradeSourceSelect() {
  const upgrade = document.getElementById('upgrade-acq-filter');
  if (upgrade) upgrade.value = state.upgradeSourceMode === 'craft' ? 'craft' : 'bestOverall';
}

async function init() {
  if (!isLoaded()) {
    ui.beginViewLoading('Loading…');
  }
  initMainTabs();
  initCharacterOverlay();
  initMasterCraftingOverlay();
  initJobGroupMasterEditButton();
  ui.setCharacterChip({ name: null, portraitUrl: null });

  const refreshBtn = document.getElementById('btn-refresh-search');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (state.lodestoneId) {
        void refreshAllProfilesJobsOnLoad({ reason: 'toolbar' });
        void refreshCharacterJobsOnLoad();
      }
      else void runSearch();
    });
  }

  syncFinderAcqFilter();
  syncFinderSortSelect();
  syncUpgradeSourceSelect();

  const sortModeSel = document.getElementById('finder-sort-mode');
  if (sortModeSel) {
    sortModeSel.addEventListener('change', () => {
      const v = sortModeSel.value || 'bestMatch';
      state.finderSortMode = ['bestMatch', 'topPick', 'ilvl', 'equipLevel'].includes(v) ? v : 'bestMatch';
      syncFinderSortSelect();
      void runSearch();
    });
  }

  const acqFilter = document.getElementById('finder-acq-filter');
  if (acqFilter) {
    acqFilter.addEventListener('change', () => {
      const raw = acqFilter.value || 'all';
      state.acquisitionFilter = FINDER_ACQ_MODES.has(raw) ? raw : 'all';
      ensureFinderIncludeMatchesSource();
      syncFinderAcqFilter();
      void runSearch();
    });
  }

  const upgradeAcq = document.getElementById('upgrade-acq-filter');
  if (upgradeAcq) {
    upgradeAcq.addEventListener('change', () => {
      state.upgradeSourceMode = upgradeAcq.value === 'craft' ? 'craft' : 'bestOverall';
      syncUpgradeSourceSelect();
      if (state.lodestoneId) profiles.setUpgradeSourceModeForProfile(state.lodestoneId, state.upgradeSourceMode);
      void refreshUpgradePage();
    });
  }

  const finderGc = document.getElementById('finder-gc-toggle');
  if (finderGc) {
    finderGc.checked = state.finderIncludeGc;
    finderGc.addEventListener('change', () => {
      state.finderIncludeGc = finderGc.checked;
      reconcileFinderSourceFilterWithToggles();
      persistIncludeTogglesToProfile();
      void runSearch();
    });
  }

  const upgradeGc = document.getElementById('upgrade-gc-toggle');
  if (upgradeGc) {
    upgradeGc.checked = state.upgradeIncludeGc;
    upgradeGc.addEventListener('change', () => {
      state.upgradeIncludeGc = upgradeGc.checked;
      persistIncludeTogglesToProfile();
      void refreshUpgradePage();
    });
  }

  const finderTomestone = document.getElementById('finder-tomestone-toggle');
  if (finderTomestone) {
    finderTomestone.checked = state.finderIncludeTomestones;
    finderTomestone.addEventListener('change', () => {
      state.finderIncludeTomestones = finderTomestone.checked;
      reconcileFinderSourceFilterWithToggles();
      persistIncludeTogglesToProfile();
      void runSearch();
    });
  }

  const finderScrip = document.getElementById('finder-scrip-toggle');
  if (finderScrip) {
    finderScrip.checked = state.finderIncludeScrips;
    finderScrip.addEventListener('change', () => {
      state.finderIncludeScrips = finderScrip.checked;
      reconcileFinderSourceFilterWithToggles();
      persistIncludeTogglesToProfile();
      void runSearch();
    });
  }

  const upgradeTomestone = document.getElementById('upgrade-tomestone-toggle');
  if (upgradeTomestone) {
    upgradeTomestone.checked = state.upgradeIncludeTomestones;
    upgradeTomestone.addEventListener('change', () => {
      state.upgradeIncludeTomestones = upgradeTomestone.checked;
      persistIncludeTogglesToProfile();
      void refreshUpgradePage();
    });
  }

  const upgradeScrip = document.getElementById('upgrade-scrip-toggle');
  if (upgradeScrip) {
    upgradeScrip.checked = state.upgradeIncludeScrips;
    upgradeScrip.addEventListener('change', () => {
      state.upgradeIncludeScrips = upgradeScrip.checked;
      persistIncludeTogglesToProfile();
      void refreshUpgradePage();
    });
  }

  const finderMaster = document.getElementById('finder-master-toggle');
  if (finderMaster) {
    finderMaster.checked = state.finderIncludeMasterCrafts;
    finderMaster.addEventListener('change', () => {
      state.finderIncludeMasterCrafts = finderMaster.checked;
      reconcileFinderSourceFilterWithToggles();
      persistIncludeTogglesToProfile();
      void runSearch();
    });
  }

  const upgradeMaster = document.getElementById('upgrade-master-toggle');
  if (upgradeMaster) {
    upgradeMaster.checked = state.upgradeIncludeMasterCrafts;
    upgradeMaster.addEventListener('change', () => {
      state.upgradeIncludeMasterCrafts = upgradeMaster.checked;
      persistIncludeTogglesToProfile();
      void refreshUpgradePage();
    });
  }

  const refreshUpgradesBtn = document.getElementById('btn-refresh-upgrades');
  if (refreshUpgradesBtn) refreshUpgradesBtn.addEventListener('click', () => void handleRefreshGearsets());


  const prioSel = document.getElementById('finder-priority-stat');
  if (prioSel) {
    prioSel.addEventListener('change', () => {
      const v = prioSel.value;
      state.priorityStat = v === '' ? null : v;
      void runSearch();
    });
  }

  const finderSearch = document.getElementById('finder-search');
  if (finderSearch) {
    finderSearch.addEventListener('input', () => {
      state.searchQuery = finderSearch.value.trim().toLowerCase();
      void runSearch();
    });
  }

  const createListBtn = document.getElementById('btn-create-list');
  const newListName = document.getElementById('new-list-name');
  if (createListBtn && newListName) {
    createListBtn.addEventListener('click', () => {
      const name = newListName.value.trim();
      if (!name) return;
      try {
        lists.createList(name);
        newListName.value = '';
        refreshListPanel();
      } catch {
        /* ignore */
      }
    });
  }

  initSidebar();
  ui.renderEmptyState(
    'Load a character.',
    'Open Character (top right), search and import a character to use Gear Finder.'
  );

  onProgress(msg => {
    if (msg === 'Ready') {
      ui.showDataLoadingBar(false);
      ui.endViewLoading();
      const importBtn = document.getElementById('btn-import-list');
      if (importBtn && !importBtn.dataset.gfImportWired) {
        importBtn.dataset.gfImportWired = '1';
        importBtn.hidden = false;
        importBtn.addEventListener('click', () => {
          listImport.openImportModal({
            getCraftPool: getCraftPoolItems,
            createList: lists.createList,
            addItemToList: lists.addItemToList,
            exportTeamcraftUrl: lists.exportTeamcraftUrl,
            onListCreated: refreshListPanel,
          });
        });
      }
      void runSearch();
    } else if (msg.startsWith('error:')) {
      ui.showDataLoadingBar(false);
      ui.endViewLoading();
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
      const friendly = msg.includes('Index') ? 'Indexing recipes…' : 'Loading recipe data…';
      if (document.getElementById('results-view-loading')) {
        ui.updateViewLoadingMessage(friendly);
      } else {
        ui.beginViewLoading(friendly);
      }
    }
  });

  await loadData();
  await hydrateFromStorage();
  void refreshAllProfilesJobsOnLoad({ reason: 'load' });
  void refreshCharacterJobsOnLoad();

  // When the user comes back to the tab (or after a laptop sleep), refresh levels again.
  window.addEventListener('focus', () => {
    void refreshAllProfilesJobsOnLoad({ reason: 'focus', minIntervalMs: 30_000 });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void refreshAllProfilesJobsOnLoad({ reason: 'visible', minIntervalMs: 30_000 });
    }
  });
}

init();
