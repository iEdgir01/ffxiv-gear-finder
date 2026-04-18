// Teamcraft data loader
import { JOB_IDS } from './constants.js';

const BASE_URL = 'https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/json/';

let _itemsByLevel = null;
let _loadError = null;
let _loading = false;
let _onProgress = null;

export function onProgress(fn) { _onProgress = fn; }
export function isLoaded() { return _itemsByLevel !== null; }
export function getLoadError() { return _loadError; }

export async function loadData() {
  if (_itemsByLevel || _loading) return;
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
    _itemsByLevel = buildIndex(recipesRaw, itemsRaw);
    _onProgress?.('Ready');
    console.info('[data] Loaded', recipesRaw.length, 'recipes');
  } catch (err) {
    _loadError = err.message;
    _onProgress?.('error:' + err.message);
    console.error('[data] Load failed:', err);
  } finally {
    _loading = false;
  }
}

function buildIndex(recipes, items) {
  const map = new Map();
  for (const recipe of recipes) {
    const jobInfo = JOB_IDS[recipe.job];
    if (!jobInfo) continue;
    const name = items[recipe.result]?.en ?? ('Item #' + recipe.result);
    const entry = {
      id: recipe.result,
      recipeId: recipe.id,
      name,
      craftJobAbbr: jobInfo.abbr,
      craftJobGroup: jobInfo.group,
      recipeLevel: recipe.lvl,
    };
    const lvl = recipe.lvl;
    if (!map.has(lvl)) map.set(lvl, []);
    map.get(lvl).push(entry);
  }
  return map;
}

export function getItemsInLevelRange(min, max) {
  if (!_itemsByLevel) return [];
  const result = [];
  for (let lvl = min; lvl <= max; lvl++) {
    const items = _itemsByLevel.get(lvl);
    if (items) result.push(...items);
  }
  return result;
}
