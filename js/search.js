import { LEVEL_RANGE_RADIUS } from './constants.js';

export function getGroupAverage(jobs, jobIds) {
  const present = jobIds.filter(id => jobs[id]);
  if (present.length === 0) return 1;
  const sum = present.reduce((acc, id) => acc + (jobs[id].level ?? 1), 0);
  return Math.floor(sum / present.length);
}

export function getLevelRange(avgLevel) {
  return {
    min: Math.max(1, avgLevel - LEVEL_RANGE_RADIUS),
    max: Math.min(100, avgLevel + LEVEL_RANGE_RADIUS),
  };
}

export function filterItems(items, { levelMin, levelMax, stat, gearType }) {
  return items.filter(item => {
    if (item.recipeLevel < levelMin || item.recipeLevel > levelMax) return false;
    if (gearType && item.gearType !== gearType) return false;
    if (stat && !Object.prototype.hasOwnProperty.call(item.stats ?? {}, stat)) return false;
    return true;
  });
}

export function sortByStat(items, stat) {
  return [...items].sort((a, b) => {
    if (!stat) return (b.ilvl ?? 0) - (a.ilvl ?? 0);
    const aVal = a.stats?.[stat] ?? -Infinity;
    const bVal = b.stats?.[stat] ?? -Infinity;
    return bVal - aVal;
  });
}
