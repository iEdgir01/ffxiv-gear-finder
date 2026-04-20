// Teamcraft data loader
import { JOB_IDS } from './constants.js';
import { GC_ITEMS } from './gcData.js';
import { SPECIAL_VENDOR_ITEMS } from './specialVendorData.js';
import { ITEM_META } from './itemMeta.js';

const BASE_URL = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/json/';

/** @type {Map<number, object>|null} */
let _craftPoolById = null;
let _loadError = null;
let _loading = false;
let _onProgress = null;

export function onProgress(fn) {
  _onProgress = fn;
}
export function isLoaded() {
  return _craftPoolById !== null;
}
export function getLoadError() {
  return _loadError;
}

/**
 * Merge datamining equip / UI category into a recipe or GC row so filtering can run
 * before XIVAPI (see `filterItems` in `search.js`).
 */
function enrichCraftRow(row) {
  if (row.gcInfo || row.tomestoneInfo || row.scripInfo) {
    return {
      ...row,
      equipLevel: row.equipLevel != null ? row.equipLevel : row.recipeLevel,
    };
  }
  const m = ITEM_META[row.id] ?? ITEM_META[String(row.id)];
  if (!m) {
    return { ...row, equipLevel: row.equipLevel ?? null };
  }
  return {
    ...row,
    equipLevel: m.le,
    gearTypeRaw: m.ui || row.gearTypeRaw || '',
    classJobCategory: m.cjc || row.classJobCategory || '',
  };
}

export async function loadData() {
  if (_craftPoolById || _loading) return;
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
    _craftPoolById = buildCraftPool(recipesRaw, itemsRaw);
    _onProgress?.('Ready');
    console.info('[data] Loaded', recipesRaw.length, 'recipes,', _craftPoolById.size, 'unique items');
  } catch (err) {
    _loadError = err.message;
    _onProgress?.('error:' + err.message);
    console.error('[data] Load failed:', err);
  } finally {
    _loading = false;
  }
}

function buildCraftPool(recipes, items) {
  const byId = new Map();

  for (const recipe of recipes) {
    const jobInfo = JOB_IDS[recipe.job];
    if (!jobInfo) continue;
    const name = items[recipe.result]?.en ?? 'Item #' + recipe.result;
    const stars = Number(recipe.stars) || 0;
    const entry = {
      id: recipe.result,
      recipeId: recipe.id,
      name,
      craftJobAbbr: jobInfo.abbr,
      craftJobId: recipe.job,
      craftJobGroup: jobInfo.group,
      recipeLevel: recipe.lvl,
      recipeStars: Number.isFinite(stars) && stars > 0 ? Math.min(4, Math.floor(stars)) : 0,
    };
    const prev = byId.get(entry.id);
    if (!prev) {
      byId.set(entry.id, entry);
    } else if (entry.recipeLevel > prev.recipeLevel) {
      byId.set(entry.id, entry);
    } else if (entry.recipeLevel === prev.recipeLevel) {
      const ps = Number(prev.recipeStars) || 0;
      const es = Number(entry.recipeStars) || 0;
      if (es > ps) byId.set(entry.id, entry);
    }
  }

  for (const [idStr, gc] of Object.entries(GC_ITEMS ?? {})) {
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) continue;
    const lvl = Number(gc.levelEquip) || 0;
    if (lvl <= 0) continue;
    const name = items?.[id]?.en ?? 'Item #' + id;
    const gcRow = {
      id,
      recipeId: null,
      name,
      craftJobAbbr: null,
      craftJobId: null,
      craftJobGroup: null,
      recipeLevel: null,
      recipeStars: 0,
      equipLevel: lvl,
      ilvl: Number(gc.ilvl) || 0,
      gearTypeRaw: gc.gearTypeRaw || '',
      classJobCategory: gc.classJobCategory || '',
      gcInfo: {
        companyId: gc.companyId,
        seals: Number(gc.seals) || 0,
        requiredRankOrder: gc.requiredRankOrder ?? null,
      },
      stats: gc.stats ?? {},
    };
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, gcRow);
    } else {
      byId.set(id, {
        ...prev,
        gcInfo: gcRow.gcInfo,
        equipLevel: prev.equipLevel ?? gcRow.equipLevel,
      });
    }
  }

  for (const [idStr, sv] of Object.entries(SPECIAL_VENDOR_ITEMS ?? {})) {
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) continue;
    const lvl = Number(sv.levelEquip) || 0;
    if (lvl <= 0) continue;
    const tomestoneInfo = sv.tomestone ? { ...sv.tomestone } : undefined;
    const scripInfo = sv.scrip ? { ...sv.scrip } : undefined;
    if (!tomestoneInfo && !scripInfo) continue;
    const name = items?.[id]?.en ?? 'Item #' + id;
    const vRow = {
      id,
      recipeId: null,
      name,
      craftJobAbbr: null,
      craftJobId: null,
      craftJobGroup: null,
      recipeLevel: null,
      recipeStars: 0,
      equipLevel: lvl,
      ilvl: Number(sv.ilvl) || 0,
      gearTypeRaw: sv.gearTypeRaw || '',
      classJobCategory: sv.classJobCategory || '',
      stats: sv.stats ?? {},
      ...(tomestoneInfo ? { tomestoneInfo } : {}),
      ...(scripInfo ? { scripInfo } : {}),
    };
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, vRow);
    } else {
      byId.set(id, {
        ...prev,
        ...(tomestoneInfo ? { tomestoneInfo } : {}),
        ...(scripInfo ? { scripInfo } : {}),
        equipLevel: prev.equipLevel ?? vRow.equipLevel,
      });
    }
  }

  return byId;
}

/**
 * All unique craft/GC/vendor-currency gear rows, enriched with **equip level** from datamining (`itemMeta.js`).
 * Filtering by job level uses `equipLevel`, not recipe level.
 */
export function getCraftPoolItems() {
  if (!_craftPoolById) return [];
  return [..._craftPoolById.values()].map(enrichCraftRow);
}
