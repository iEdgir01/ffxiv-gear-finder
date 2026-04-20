import { JOB_IDS } from './constants.js';
import { normalizeGearType, jobCanEquipCategory, maxGroupStatScore } from './search.js';

function poolRowMatchesSelectedJob(jobId, row, statsById) {
  const st = statsById[row.id];
  const abbr = JOB_IDS[jobId]?.abbr;
  if (!abbr) return false;
  if (Array.isArray(st?.classJobAbbrs) && st.classJobAbbrs.length > 0) {
    return st.classJobAbbrs.includes(abbr);
  }
  const cat = st?.classJobCategory ?? row.classJobCategory;
  return jobCanEquipCategory(jobId, cat);
}

const SLOT_DEFS = [
  { slotKey: 'mainHand', gearType: 'MainHand', label: 'Main hand' },
  { slotKey: 'offHand', gearType: 'OffHand', label: 'Off hand' },
  { slotKey: 'head', gearType: 'Head', label: 'Head' },
  { slotKey: 'body', gearType: 'Body', label: 'Body' },
  { slotKey: 'hands', gearType: 'Hands', label: 'Hands' },
  { slotKey: 'legs', gearType: 'Legs', label: 'Legs' },
  { slotKey: 'feet', gearType: 'Feet', label: 'Feet' },
  { slotKey: 'necklace', gearType: 'Necklace', label: 'Necklace' },
  { slotKey: 'earrings', gearType: 'Earring', label: 'Earrings' },
  { slotKey: 'bracelet', gearType: 'Bracelet', label: 'Bracelet' },
  { slotKey: 'ring1', gearType: 'Ring', label: 'Ring' },
  { slotKey: 'ring2', gearType: 'Ring', label: 'Ring (2)' },
];

const GROUP_DELTA_HINT = {
  doh: 'sum(CP, Craftsmanship, Control)',
  dol: 'sum(GP, Gathering, Perception)',
  dow: 'sum of relevant combat stats',
  dom: 'sum of relevant combat stats',
};

/**
 * @param {number} jobId
 * @param {number} jobLevel — max equip level for the pool (same as Gear Finder)
 * @param {Record<string, number>|null} gearsetSlots slotKey -> item id
 * @param {Record<number, object>} statsById item id -> parseItemStats result + name
 * @param {Array<object>} poolItems equip-filtered craft/GC rows (same pool as Gear Finder, with XIVAPI stats merged)
 */
export function findBestUpgrades(jobId, jobLevel, gearsetSlots, statsById, poolItems) {
  const jobInfo = JOB_IDS[jobId];
  const groupKey = jobInfo?.group ?? 'doh';
  if (!jobInfo || !gearsetSlots) return [];

  const deltaHint = GROUP_DELTA_HINT[groupKey] ?? GROUP_DELTA_HINT.doh;
  const rows = [];

  for (const def of SLOT_DEFS) {
    const equippedId = gearsetSlots[def.slotKey] ?? null;
    const equipped = equippedId ? statsById[equippedId] : null;
    const curMax = equipped ? maxGroupStatScore(equipped, groupKey) : -Infinity;
    const curBaseline = curMax === -Infinity || !Number.isFinite(curMax) ? 0 : curMax;

    let best = null;
    let bestMax = curBaseline;

    for (const row of poolItems) {
      if (!poolRowMatchesSelectedJob(jobId, row, statsById)) continue;
      const st = statsById[row.id];
      if (!st?.stats) continue;
      const equipCap = st.equipLevel ?? row.equipLevel;
      if (equipCap != null && Number.isFinite(equipCap) && equipCap > jobLevel) continue;
      const gt = normalizeGearType(st.gearTypeRaw ?? st.gearType ?? '');
      if (gt !== def.gearType) continue;
      const candMax = maxGroupStatScore(st, groupKey);
      if (candMax === -Infinity || !Number.isFinite(candMax)) continue;
      if (candMax > bestMax) {
        bestMax = candMax;
        best = {
          ...st,
          craftJobId: row.craftJobId,
          recipeLevel: row.recipeLevel,
          recipeStars: row.recipeStars,
          craftJobAbbr: row.craftJobAbbr,
        };
      }
    }

    const hasUpgrade = best && best.id !== equippedId && bestMax > curBaseline;
    const delta = hasUpgrade ? Math.round(bestMax - curBaseline) : null;

    rows.push({
      label: def.label,
      current: equipped,
      best: hasUpgrade ? best : null,
      delta,
      deltaHint,
      primaryStat: null,
    });
  }

  return rows;
}
