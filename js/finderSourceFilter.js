import { isGcExclusiveAcquisition } from './garland.js';

function isMasterRecipeRow(row) {
  return (Number(row?.recipeStars) || 0) > 0;
}

/**
 * Gear Finder **Source** dropdown (`all` | `gc` | `craft` | `tomestone` | `scrip` | `master`).
 * Mirrors `passesSourceMode` in `main.js` without reading global `state`.
 *
 * @param {object|null|undefined} row — pool row (may have `gcInfo`, `tomestoneInfo`, `scripInfo`)
 * @param {object|null|undefined} acq — Garland acquisition summary or null
 * @param {'all'|'gc'|'craft'|'tomestone'|'scrip'|'master'|string} mode
 * @param {{ canCraftRow: (row: object) => boolean }} ctx
 */
export function passesFinderSourceMode(row, acq, mode, ctx) {
  if (mode === 'all' || !mode) return true;
  if (mode === 'craft') return ctx.canCraftRow(row);
  if (mode === 'gc') return Boolean(row?.gcInfo) || isGcExclusiveAcquisition(acq);
  if (mode === 'tomestone') return Boolean(row?.tomestoneInfo);
  if (mode === 'scrip') return Boolean(row?.scripInfo);
  if (mode === 'master') return isMasterRecipeRow(row);
  return true;
}
