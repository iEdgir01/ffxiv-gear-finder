/**
 * One-off: Lv 51 CRP — pool + findBestUpgrades (empty gearset = max stat per slot).
 * Order matches main.js: fetch stats, merge, then filterItems(equipJobId).
 * Run: node scripts/debug-crp51-upgrades.mjs  (from feature-v2 root)
 */
import { loadData, getItemsInLevelRange, isLoaded } from '../js/data.js';
import { filterItems, maxGroupStatScore, normalizeGearType } from '../js/search.js';
import { findBestUpgrades } from '../js/upgrade.js';
import { fetchItemStats } from '../js/api.js';

const CRP = 8;
const JOB_LEVEL = 51;

await loadData();
for (let i = 0; i < 200 && !isLoaded(); i++) await new Promise(r => setTimeout(r, 50));
if (!isLoaded()) throw new Error('data not loaded');

const rawPool = getItemsInLevelRange(1, JOB_LEVEL);
const ids = [...new Set(rawPool.map(p => p.id))];
console.log('Band 1–' + JOB_LEVEL + ': recipe rows', rawPool.length, 'unique item ids', ids.length);

const statsCache = {};
const BATCH = 40;
for (let i = 0; i < ids.length; i += BATCH) {
  const chunk = ids.slice(i, i + BATCH);
  const got = await fetchItemStats(chunk);
  Object.assign(statsCache, got);
  process.stderr.write(`\rFetched stats ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
}
console.log('');

const merged = rawPool.map(row => ({
  ...row,
  ...(statsCache[row.id] ?? {}),
  stats: statsCache[row.id]?.stats ?? {},
}));

const pool = filterItems(merged, {
  levelMin: 1,
  levelMax: JOB_LEVEL,
  gearType: null,
  equipJobId: CRP,
});

console.log('After filterItems(CRP equip + gear): recipe rows', pool.length);

const poolMerged = pool;
const gearset = {};
const upgrades = findBestUpgrades(CRP, JOB_LEVEL, gearset, statsCache, poolMerged);

console.log('\n=== findBestUpgrades (empty gearset, max(CP,Craft,Control)) ===\n');
for (const u of upgrades) {
  const b = u.best;
  const score = b ? maxGroupStatScore(b, 'doh') : null;
  console.log(
    u.label.padEnd(14),
    b ? `${b.name} | ilvl ${b?.ilvl} | max ${score} | recipe L${b?.recipeLevel} ${b?.craftJobAbbr ?? ''}` : '(none)'
  );
}

const NAMES = [
  'Bas-relief Cobalt Saw',
  "Artisan's Claw Hammer",
  "Artisan's Saw",
  'Cobalt Claw Hammer',
];
console.log('\n=== Spot-check: max group stat for named tools (any job equip) ===\n');
for (const name of NAMES) {
  const id = ids.find(iid => statsCache[iid]?.name === name);
  if (!id) {
    console.log(name, '→ not in 1–51 recipe band or name exact mismatch');
    continue;
  }
  const st = statsCache[id];
  console.log(
    name,
    '| id',
    id,
    '| ilvl',
    st.ilvl,
    '| max',
    maxGroupStatScore({ stats: st.stats ?? {} }, 'doh'),
    '| cat',
    st.classJobAbbrs?.join(',') || st.classJobCategory
  );
}

// Main hand competition: top 5 MainHand by maxGroupStat among CRP pool
const mh = poolMerged.filter(row => {
  const st = statsCache[row.id];
  if (!st?.stats) return false;
  const gt = String(st.gearTypeRaw ?? st.gearType ?? '');
  return /Primary Tool|Main Hand|Arm$/i.test(gt) || gt.includes("Carpenter");
});
const mh2 = poolMerged.filter(row => {
  const st = statsCache[row.id];
  if (!st?.stats) return false;
  return normalizeGearType(st.gearTypeRaw ?? st.gearType ?? '') === 'MainHand';
});
const ranked = mh2
  .map(row => {
    const st = statsCache[row.id];
    return {
      name: st.name,
      ilvl: st.ilvl,
      max: maxGroupStatScore({ stats: st.stats }, 'doh'),
      recipeL: row.recipeLevel,
      abbr: row.craftJobAbbr,
      id: row.id,
    };
  })
  .sort((a, b) => b.max - a.max)
  .slice(0, 15);

console.log('\n=== Top MainHand (CRP pool) by max(CP,Craft,Control) ===\n');
for (const r of ranked) {
  console.log(r.name, '| ilvl', r.ilvl, '| max', r.max, '| recipe', r.recipeL, r.abbr);
}
