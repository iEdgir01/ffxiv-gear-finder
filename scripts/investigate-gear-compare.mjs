#!/usr/bin/env node
/**
 * Compare FFXIV items from every angle useful for “why does Garland pick X?”:
 * XIVAPI (equip level, ilvl, NQ/HQ stats) + Garland Tools JSON (attr, craft job,
 * recipe level, vendors, upgrades/downgrades chain).
 *
 * Usage (from `.worktrees/feature-v2`):
 *   node scripts/investigate-gear-compare.mjs 4379 8451 12011
 *
 * Requires network. XIVAPI search is often flaky; this script uses /item/{id} only.
 */
const XIVAPI = 'https://xivapi.com/item';
const GARLAND = 'https://www.garlandtools.org/db/doc/item/en/3';

const DOH_JOB = {
  8: 'CRP',
  9: 'BSM',
  10: 'ARM',
  11: 'GSM',
  12: 'LTW',
  13: 'WVR',
  14: 'ALC',
  15: 'CUL',
};

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

function fmtXivStats(stats) {
  if (!stats || typeof stats !== 'object') return '—';
  const parts = [];
  for (const [k, v] of Object.entries(stats)) {
    if (typeof v === 'object' && v !== null && ('NQ' in v || 'HQ' in v)) {
      parts.push(`${k} NQ ${v.NQ ?? '—'} / HQ ${v.HQ ?? '—'}`);
    } else {
      parts.push(`${k}: ${v}`);
    }
  }
  return parts.join('; ') || '—';
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (ids.length === 0) {
    console.error('Usage: node scripts/investigate-gear-compare.mjs <itemId> [itemId...]');
    console.error('Example: node scripts/investigate-gear-compare.mjs 4379 8451 12011');
    process.exit(1);
  }

  for (const id of ids) {
    console.log('\n========== Item', id, '==========');

    try {
      const item = await fetchJson(
        `${XIVAPI}/${id}?columns=ID,Name,LevelEquip,LevelItem,Stats,ClassJobCategory,ItemUICategory`
      );
      if (item.Error) {
        console.log('XIVAPI:', item.Message ?? item);
      } else {
        console.log('XIVAPI:', item.Name);
        console.log('  LevelEquip:', item.LevelEquip, '  LevelItem (ilvl):', item.LevelItem);
        console.log('  UI Category:', item.ItemUICategory?.Name ?? '—');
        console.log('  Stats:', fmtXivStats(item.Stats));
      }
    } catch (e) {
      console.log('XIVAPI error:', e.message);
    }

    try {
      const doc = await fetchJson(`${GARLAND}/${id}.json`);
      const it = doc.item;
      if (!it) {
        console.log('Garland: (no item in doc)');
        continue;
      }
      console.log('Garland:', it.name);
      console.log('  elvl:', it.elvl, '  ilvl:', it.ilvl, '  slot:', it.slot);
      console.log('  attr (NQ):', JSON.stringify(it.attr));
      console.log('  attr_hq:', JSON.stringify(it.attr_hq));
      const crafts = it.craft ?? [];
      if (crafts.length === 0) {
        console.log('  craft: (none in doc)');
      } else {
        for (const c of crafts) {
          const j = DOH_JOB[c.job] ?? 'job#' + c.job;
          const extra = [];
          if (c.unlockId != null) extra.push('unlockId=' + c.unlockId);
          if (c.controlReq != null) extra.push('controlReq=' + c.controlReq);
          if (c.craftsmanshipReq != null) extra.push('craftsmanshipReq=' + c.craftsmanshipReq);
          console.log(
            '  craft:',
            j,
            'rlvl',
            c.rlvl,
            'lvl',
            c.lvl,
            c.stars != null ? '*' + c.stars : '',
            extra.length ? '(' + extra.join(', ') + ')' : ''
          );
        }
      }
      console.log('  vendor NPCs:', it.vendors?.length ?? 0);
      if (it.upgrades?.length) console.log('  upgrades  →', it.upgrades.join(', '));
      if (it.downgrades?.length) console.log('  downgrades ←', it.downgrades.join(', '));
    } catch (e) {
      console.log('Garland error:', e.message);
    }
  }
  console.log('');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
