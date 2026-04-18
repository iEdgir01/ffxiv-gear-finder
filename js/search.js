export function getLevelRange(jobLevel) {
  const min = Math.floor(jobLevel / 5) * 5;
  return { min: Math.max(1, min), max: jobLevel };
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
    if (aVal === -Infinity && bVal === -Infinity) return 0;
    return bVal - aVal;
  });
}
