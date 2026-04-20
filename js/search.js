import {
  GEAR_TYPES,
  JOB_IDS,
  CLASSJOB_CATEGORY_TO_JOBS,
  STATS_BY_GROUP,
  MAX_EQUIP_LEVEL,
} from './constants.js';

/**
 * All jobs (DoH, DoL, combat): include an item only if the selected job **can equip** it per
 * XIVAPI `ClassJobCategory` (same mapping as the job tags on result cards). Recipe crafter
 * (`craftJobAbbr`) is display-only — e.g. a BSM-made tool still appears under jobs that can wear it.
 */
function passesJobFilter(equipJobId, item) {
  if (equipJobId == null) return true;
  const abbr = JOB_IDS[equipJobId]?.abbr;
  if (!abbr) return false;
  if (Array.isArray(item.classJobAbbrs) && item.classJobAbbrs.length > 0) {
    return item.classJobAbbrs.includes(abbr);
  }
  return jobCanEquipCategory(equipJobId, item.classJobCategory);
}

const CANON = new Set(GEAR_TYPES);

/** Display order: armor, then accessories, then weapons (per tier / recipe level). */
export const GEAR_SLOT_ORDER = {
  Head: 0,
  Body: 1,
  Hands: 2,
  Legs: 3,
  Feet: 4,
  Necklace: 5,
  Earring: 6,
  Bracelet: 7,
  Ring: 8,
  MainHand: 9,
  OffHand: 10,
};

/**
 * True if the selected job can equip this item per XIVAPI ClassJobCategory (e.g. Weaver-only gear excludes CRP).
 * Datamining `Item.csv` often uses **job abbreviations** (e.g. `CRP`) for that job’s tools; XIVAPI may use full names (`Carpenter`). Both must work.
 */
export function jobCanEquipCategory(jobId, categoryName) {
  const cat = (categoryName ?? '').trim();
  if (!cat) return false;
  const abbr = JOB_IDS[jobId]?.abbr;
  if (!abbr) return false;
  const allowed = CLASSJOB_CATEGORY_TO_JOBS[cat];
  if (allowed !== undefined) {
    return allowed.includes(abbr);
  }
  const isJobAbbr = Object.values(JOB_IDS).some(j => j.abbr === cat);
  if (isJobAbbr && cat === abbr) return true;
  return false;
}

/** Normalized slot key (Head, Ring, …) for grouping and sorting. */
export function getCanonicalGearType(item) {
  const raw = item.gearTypeRaw ?? '';
  let gt = normalizeGearType(String(raw));
  if (!gt && item.gearType && CANON.has(item.gearType)) gt = item.gearType;
  if (!gt) gt = normalizeGearType(String(item.gearType ?? ''));
  return gt;
}

function gearSlotSortIndex(item) {
  const gt = getCanonicalGearType(item);
  return GEAR_SLOT_ORDER[gt] ?? 50;
}

/**
 * True when every **positive** stat on the item is listed in {@link STATS_BY_GROUP} for `groupKey`
 * (DoH: CP / Craftsmanship / Control; DoL: GP / Gathering / Perception; combat: group lists in constants).
 * “All Classes” body pieces that only have combat or gathering stats are excluded; mixed stats are excluded.
 * Empty or missing stats → **true** (XIVAPI may omit data; do not hide the row).
 */
export function itemStatsMatchJobGroup(item, groupKey) {
  const g = groupKey ?? 'doh';
  const allowed = STATS_BY_GROUP[g];
  if (!allowed?.length) return true;
  const allow = new Set(allowed);
  const stats = item.stats;
  if (!stats || typeof stats !== 'object') return true;
  for (const [k, v] of Object.entries(stats)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    if (!allow.has(k)) return false;
  }
  return true;
}

/** @param {object[]} items @param {keyof typeof STATS_BY_GROUP|null|undefined} groupKey */
export function filterByJobGroupStats(items, groupKey) {
  if (!items?.length) return items;
  const g = groupKey ?? 'doh';
  return items.filter(it => itemStatsMatchJobGroup(it, g));
}

/**
 * Score an item for a job group: sum of all relevant stats.
 * Balanced gear beats single-stat specialists across all groups.
 * "Best overall" = highest sum; priority stat selection overrides this at the sort layer.
 */
export function maxGroupStatScore(item, groupKey) {
  const keys = STATS_BY_GROUP[groupKey] ?? [];
  let total = 0;
  let any = false;
  for (const s of keys) {
    const v = item.stats?.[s];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) { total += v; any = true; }
  }
  return any ? total : -Infinity;
}

/**
 * Largest single group-stat value on the item. Used to highlight which line(s) are “primary”
 * on the card under **Best overall** (must not use {@link maxGroupStatScore}, which is a sum).
 */
export function maxSingleGroupStatValue(item, groupKey) {
  const keys = STATS_BY_GROUP[groupKey] ?? [];
  let m = -Infinity;
  for (const s of keys) {
    const v = item.stats?.[s];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v > m) m = v;
  }
  return m;
}


/** Single-stat value for priority sorting / top picks; missing stat → −∞. */
export function priorityStatValue(item, statKey) {
  if (!statKey) return -Infinity;
  const v = item.stats?.[statKey];
  return typeof v === 'number' && Number.isFinite(v) ? v : -Infinity;
}

/**
 * Stats to offer in the priority dropdown: group stats that appear on at least one item
 * (when a gear type is selected); otherwise all group stats.
 */
export function collectPriorityStatOptions(groupKey, gearTypeFilter, items) {
  const groupStats = STATS_BY_GROUP[groupKey] ?? [];
  if (!gearTypeFilter || !items?.length) return [...groupStats];
  const found = new Set();
  for (const it of items) {
    for (const k of groupStats) {
      const v = it.stats?.[k];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) found.add(k);
    }
  }
  if (found.size === 0) return [...groupStats];
  return groupStats.filter(k => found.has(k));
}

/**
 * Sort: with `priorityStat`, order by that stat (best first). Else max group stat;
 * then **equip level**, recipe level (craft tier), slot, ilvl.
 */
export function sortGearForDisplay(items, groupKey, options = {}) {
  const g = groupKey ?? 'doh';
  const priorityStat = options.priorityStat ?? null;
  if (priorityStat) {
    return [...items].sort((a, b) => {
      const va = priorityStatValue(a, priorityStat);
      const vb = priorityStatValue(b, priorityStat);
      if (vb !== va) return vb - va;
      const de = (b.equipLevel ?? 0) - (a.equipLevel ?? 0);
      if (de !== 0) return de;
      const dr = (b.recipeLevel ?? 0) - (a.recipeLevel ?? 0);
      if (dr !== 0) return dr;
      const ds = gearSlotSortIndex(a) - gearSlotSortIndex(b);
      if (ds !== 0) return ds;
      return (b.ilvl ?? 0) - (a.ilvl ?? 0);
    });
  }
  return [...items].sort((a, b) => {
    const ma = maxGroupStatScore(a, g);
    const mb = maxGroupStatScore(b, g);
    if (ma !== mb) return mb - ma;
    const de = (b.equipLevel ?? 0) - (a.equipLevel ?? 0);
    if (de !== 0) return de;
    const dr = (b.recipeLevel ?? 0) - (a.recipeLevel ?? 0);
    if (dr !== 0) return dr;
    const ds = gearSlotSortIndex(a) - gearSlotSortIndex(b);
    if (ds !== 0) return ds;
    return (b.ilvl ?? 0) - (a.ilvl ?? 0);
  });
}

/**
 * Item ids for "top match" red dot: best **max group stat** (or priority stat / % gain) in the list or per slot.
 * - **All gear types** (`gearTypeFilter` null): best per slot (Head, Ring, …); ties included.
 * - **One gear type**: best in the list; ties included.
 * @param {string|null} [priorityStat] — when set, rank by `stats[priorityStat]` instead of max group / % gain.
 */
export function findTopPickIdsByMaxGroupStat(items, groupKey, gearTypeFilter, priorityStat = null) {
  const out = new Set();
  if (!items?.length) return out;
  const g = groupKey ?? 'doh';
  const score = it => priorityStat ? priorityStatValue(it, priorityStat) : maxGroupStatScore(it, g);

  const addTiedBest = list => {
    let maxVal = -Infinity;
    for (const it of list) {
      const v = score(it);
      if (v > maxVal) maxVal = v;
    }
    if (maxVal === -Infinity) return;
    for (const it of list) {
      if (score(it) === maxVal) out.add(Number(it.id));
    }
  };

  if (gearTypeFilter) {
    addTiedBest(items);
    return out;
  }

  const bySlot = new Map();
  for (const it of items) {
    const slot = getCanonicalGearType(it);
    if (!slot || !CANON.has(slot)) continue;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(it);
  }
  for (const list of bySlot.values()) addTiedBest(list);
  return out;
}

/**
 * Reorder Gear Finder results after `sortGearForDisplay` and name search.
 * Does not change which items get the red-dot top pick marker — that is still derived from `findTopPickIdsByMaxGroupStat`.
 * @param {object[]} items
 * @param {'bestMatch'|'topPick'|'ilvl'|'equipLevel'} mode
 * @param {Set<number>|Iterable<number>} topPickIds
 * @returns {object[]}
 */
export function applyFinderSortMode(items, mode, topPickIds) {
  if (!items?.length) return items;
  if (!mode || mode === 'bestMatch') return items;
  const set = topPickIds instanceof Set ? topPickIds : new Set(topPickIds ?? []);
  if (mode === 'topPick') {
    const top = [];
    const rest = [];
    for (const it of items) {
      if (set.has(Number(it.id))) top.push(it);
      else rest.push(it);
    }
    return [...top, ...rest];
  }
  if (mode === 'ilvl') {
    return [...items].sort((a, b) => {
      const di = (b.ilvl ?? 0) - (a.ilvl ?? 0);
      if (di !== 0) return di;
      return (b.equipLevel ?? 0) - (a.equipLevel ?? 0);
    });
  }
  if (mode === 'equipLevel') {
    return [...items].sort((a, b) => {
      const de = (b.equipLevel ?? 0) - (a.equipLevel ?? 0);
      if (de !== 0) return de;
      return (b.ilvl ?? 0) - (a.ilvl ?? 0);
    });
  }
  return items;
}

/**
 * Map XIVAPI ItemUICategory.Name to our GEAR_TYPES filter keys (pills).
 * Crafter tools use "* Primary Tool" / "* Secondary Tool", not "Main Hand".
 */
export function normalizeGearType(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (CANON.has(s)) return s;
  const lower = s.toLowerCase();

  const direct = {
    'main hand': 'MainHand',
    'off hand': 'OffHand',
    'head': 'Head',
    'body': 'Body',
    'hands': 'Hands',
    'legs': 'Legs',
    'feet': 'Feet',
    'necklace': 'Necklace',
    'earrings': 'Earring',
    'earring': 'Earring',
    'bracelets': 'Bracelet',
    'bracelet': 'Bracelet',
    'finger': 'Ring',
    'rings': 'Ring',
    'ring': 'Ring',
    'soul crystal': '',
    'soul of the carpenter': '',
  };
  if (direct[lower] !== undefined) return direct[lower];

  if (/primary tool$/i.test(s)) return 'MainHand';
  if (/secondary tool$/i.test(s)) return 'OffHand';
  if (/'s Arm$/i.test(s)) return 'MainHand';
  if (s === 'Shield' || /shield$/i.test(s)) return 'OffHand';

  if (lower.includes('finger') || lower === 'rings') return 'Ring';

  if (CANON.has(s)) return s;
  return '';
}

/**
 * True if XIVAPI ItemUICategory maps to an equippable slot (armor, weapon, accessory).
 * Excludes materials, food, potions, lumber, etc.
 */
export function isEquipGearItem(item) {
  const raw = item.gearTypeRaw;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const n = normalizeGearType(String(raw));
    return n !== '' && CANON.has(n);
  }
  const gt = item.gearType;
  if (gt && CANON.has(gt)) return true;
  const n2 = normalizeGearType(String(gt ?? ''));
  return n2 !== '' && CANON.has(n2);
}

export function getLevelRange(jobLevel) {
  const min = Math.floor(jobLevel / 5) * 5;
  return { min: Math.max(1, min), max: jobLevel };
}

/**
 * Legacy helper: was the Gear Finder recipe-level band. The finder now uses **equip level**
 * (`LevelEquip` via `itemMeta.js` + XIVAPI) for the pool; recipe level is only for craft tags.
 * Kept for tests and any code that still expects a numeric range object.
 */
export function getRecipeSearchRange(jobLevel) {
  const jl = Number(jobLevel) || 1;
  return { min: 1, max: Math.max(1, jl) };
}

/**
 * True if the imported character’s level for the recipe’s crafter job meets this recipe’s level,
 * and (when the recipe has a star tier) the player’s saved **master crafting** stars for that job.
 * @param {Record<number, { level: number }>} jobs — classJobId → { level }
 * @param {{ craftJobId?: number, recipeLevel?: number, recipeStars?: number }} recipeRow — pool row from `data.js`
 * @param {Record<string|number, number>|null|undefined} masterStarsByJob — classJobId → 0…4 (master tier)
 */
export function canPlayerCraftRecipe(jobs, recipeRow, masterStarsByJob) {
  if (!recipeRow || recipeRow.craftJobId == null) return false;
  const craftId = recipeRow.craftJobId;
  const jl = jobs[craftId]?.level;
  if (jl == null || !Number.isFinite(jl)) return false;
  const rl = Number(recipeRow.recipeLevel) || 0;
  if (jl < rl) return false;
  const needStars = Number(recipeRow.recipeStars) || 0;
  if (needStars <= 0) return true;
  const map = masterStarsByJob && typeof masterStarsByJob === 'object' ? masterStarsByJob : {};
  const ms = Number(map[craftId] ?? map[String(craftId)] ?? 0);
  if (!Number.isFinite(ms) || ms < 0) return false;
  return ms >= needStars;
}

/**
 * Filter gear candidates by **equip level** band, slot, and job equip rules.
 * Use `equipLevelMin` / `equipLevelMax` when set (sidebar). If `equipLevelMax` is omitted, it defaults to `jobLevel`.
 * Recipe level is not used here — it is only for “Craft” tagging via `canPlayerCraftRecipe`.
 */
export function filterItems(items, { gearType, gearOnly = true, equipJobId, jobLevel, equipLevelMin, equipLevelMax }) {
  return items.filter(item => {
    const el = item.equipLevel;
    if (el == null || !Number.isFinite(el)) return false;
    const min = equipLevelMin != null ? equipLevelMin : 1;
    const max =
      equipLevelMax != null ? equipLevelMax : jobLevel != null && Number.isFinite(jobLevel) ? jobLevel : MAX_EQUIP_LEVEL;
    if (el < min || el > max) return false;
    if (gearOnly && !isEquipGearItem(item)) return false;
    if (equipJobId != null && !passesJobFilter(equipJobId, item)) return false;
    if (gearType) {
      const canon = getCanonicalGearType(item);
      if (canon !== gearType) return false;
    }
    return true;
  });
}

export function sortByStat(items, stat) {
  return [...items].sort((a, b) => {
    if (!stat) return (b.ilvl ?? 0) - (a.ilvl ?? 0);
    const aVal = a.stats?.[stat] ?? -Infinity;
    const bVal = b.stats?.[stat] ?? -Infinity;
    if (aVal === -Infinity && bVal === -Infinity) return 0;
    if (aVal !== bVal) return bVal - aVal;
    return (a.ilvl ?? 999) - (b.ilvl ?? 999);
  });
}
