import { STATS_BY_GROUP } from './constants.js';

/** Teamcraft gearset slot keys → canonical gear type (inverse of upgrade.js). */
export const GEAR_TYPE_TO_GEARSET_KEY = {
  MainHand: 'mainHand',
  OffHand: 'offHand',
  Head: 'head',
  Body: 'body',
  Hands: 'hands',
  Legs: 'legs',
  Feet: 'feet',
  Necklace: 'necklace',
  Earring: 'earrings',
  Bracelet: 'bracelet',
};

/**
 * Baseline stats for comparison: per group stat, values from the equipped piece in that slot.
 * Rings: per-stat min(ring1, ring2) (upgrade vs weaker ring).
 * Returns null if no gearset or no item in slot.
 */
export function resolveBaselineStats(slot, gearset, statsCache, groupKey) {
  if (!gearset || !groupKey) return null;
  const keys = STATS_BY_GROUP[groupKey] ?? [];
  if (keys.length === 0) return null;

  if (slot === 'Ring') {
    const id1 = gearset.ring1;
    const id2 = gearset.ring2;
    const s1 = id1 ? statsCache[id1] : null;
    const s2 = id2 ? statsCache[id2] : null;
    if (!s1 && !s2) return null;
    const stats = {};
    for (const k of keys) {
      const v1 = s1?.stats?.[k];
      const v2 = s2?.stats?.[k];
      if (v1 != null && v2 != null) stats[k] = Math.min(v1, v2);
      else stats[k] = (v1 ?? v2 ?? 0);
    }
    return { stats };
  }

  const gk = GEAR_TYPE_TO_GEARSET_KEY[slot];
  if (!gk) return null;
  const id = gearset[gk];
  if (!id) return null;
  const st = statsCache[id];
  if (!st?.stats) return null;
  const stats = {};
  for (const k of keys) stats[k] = st.stats[k] ?? 0;
  return { stats };
}
