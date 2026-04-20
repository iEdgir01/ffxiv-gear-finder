/**
 * Build `js/specialVendorData.js` from xivapi/ffxiv-datamining CSVs.
 * Tomestones (Allagan …) and Crafters'/Gatherers' Scrips — **all jobs**: combat, DoH, DoL.
 * Same pattern as GC: SpecialShop CostType 0 + currency item id; amounts from ItemCost[0].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  fetchText,
  csvLines,
  parseSheet,
  headerIndex,
  toNum,
} from './lib/datamineCsv.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'js', 'specialVendorData.js');

const BASE = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/';
const LANG_EN = 'en';
const LANG_ANY = 'de';

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
}

const STAT_NAME_MAP = {
  'Critical Hit': 'CriticalHit',
  'Direct Hit Rate': 'DirectHitRate',
  'Skill Speed': 'SkillSpeed',
  'Spell Speed': 'SpellSpeed',
};
function normalizeStatName(name) {
  return STAT_NAME_MAP[name] ?? name;
}

/**
 * @param {string} itemName — from Item.csv Name column
 * @returns {'tomestone'|'scrip'|null}
 */
function currencyKindFromItemName(itemName) {
  const n = (itemName ?? '').trim();
  if (!n) return null;
  if (/^Allagan Tomestone of /i.test(n)) return 'tomestone';
  if (/Token/i.test(n)) return null;
  // Includes variants like "Crafters' Scrip (White)".
  if (/(Crafters'|Gatherers') Scrip/i.test(n)) return 'scrip';
  return null;
}

function scripBranchFromName(itemName) {
  const n = (itemName ?? '').trim();
  if (/Crafters'/i.test(n)) return 'crafter';
  if (/Gatherers'/i.test(n)) return 'gatherer';
  return null;
}

/**
 * SpecialShop has multiple cost encodings. We support:
 * - CostType 0: `CurrencyCost[0]` = currency item id, `ItemCost[0]` = amount
 * - CostType 2: `CurrencyCost[0]` = amount, `ItemCost[0]` = token (1/2) representing tomestones
 *
 * Token mapping inferred from current datamine behavior:
 * - token 1: Poetics (Item 28)
 * - token 2: Other tomestones (varies by patch); we keep a generic label
 */
function decodeSpecialShopCost({ costType, currencyCost0, itemCost0, currencyIdToKind, currencyIdToName }) {
  if (costType === 2) {
    const token = toNum(itemCost0);
    const amount = toNum(currencyCost0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (token === 1) {
      return { kind: 'tomestone', currencyId: 28, currencyName: 'Allagan Tomestone of Poetics', amount };
    }
    if (token === 2) {
      return { kind: 'tomestone', currencyId: null, currencyName: 'Tomestones', amount };
    }
    return null;
  }

  // CostType 0 and 3 both use (currencyId, amount) in (CurrencyCost[0], ItemCost[0]).
  if (costType !== 0 && costType !== 3) return null;
  const currencyId = toNum(currencyCost0);
  const kind = currencyIdToKind.get(currencyId) ?? null;
  if (!kind) return null;
  const amount = toNum(itemCost0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currencyName = currencyIdToName.get(currencyId) ?? String(currencyId);
  return { kind, currencyId, currencyName, amount };
}

async function main() {
  const specialShop = parseSheet(await fetchText(`${BASE}${LANG_ANY}/SpecialShop.csv`));
  const item = parseSheet(await fetchText(`${BASE}${LANG_ANY}/Item.csv`));
  const classJobCategory = parseSheet(await fetchText(`${BASE}${LANG_EN}/ClassJobCategory.csv`));
  const itemUiCategory = parseSheet(await fetchText(`${BASE}${LANG_EN}/ItemUICategory.csv`));
  const baseParam = parseSheet(await fetchText(`${BASE}${LANG_EN}/BaseParam.csv`));

  const specialIdx = headerIndex(specialShop.header);
  const itemIdx = headerIndex(item.header);
  const cjcIdx = headerIndex(classJobCategory.header);
  const uiIdx = headerIndex(itemUiCategory.header);
  const bpIdx = headerIndex(baseParam.header);
  /** Item.csv has quoted fields; `csvSplit` breaks rows. Use Singular (2nd column) via line prefix. */
  const itemLines = csvLines(await fetchText(`${BASE}${LANG_EN}/Item.csv`));
  const currencyIdToKind = new Map();
  const currencyIdToName = new Map();
  for (let li = 1; li < itemLines.length; li++) {
    const line = itemLines[li];
    const m = line.match(/^(\d+),([^,]*),/);
    if (!m) continue;
    const id = toNum(m[1]);
    const singular = String(m[2] ?? '').trim();
    if (!id || !singular) continue;
    const kind = currencyKindFromItemName(singular);
    if (!kind) continue;
    currencyIdToKind.set(id, kind);
    currencyIdToName.set(id, singular);
  }

  /** @type {Map<number, { itemId: number, tomestone?: object, scrip?: object }>} */
  const acc = new Map();

  for (const row of specialShop.rows) {
    for (let i = 0; i < 60; i++) {
      const cKey = `Item[${i}].CurrencyCost[0]`;
      const costKey = `Item[${i}].ItemCost[0]`;
      const itemKey = `Item[${i}].Item[0]`;
      const ctKey = `Item[${i}].CostType[0]`;
      const ci = specialIdx.get(cKey);
      const bi = specialIdx.get(costKey);
      const ii = specialIdx.get(itemKey);
      if (ci == null || bi == null || ii == null) break;

      const costType = specialIdx.get(ctKey) != null ? toNum(row[specialIdx.get(ctKey)]) : 0;

      const itemId = toNum(row[ii]);
      if (!itemId) continue;

      const decoded = decodeSpecialShopCost({
        costType,
        currencyCost0: row[ci],
        itemCost0: row[bi],
        currencyIdToKind,
        currencyIdToName,
      });
      if (!decoded) continue;

      let rec = acc.get(itemId);
      if (!rec) {
        rec = { itemId };
        acc.set(itemId, rec);
      }

      if (decoded.kind === 'tomestone') {
        const prev = rec.tomestone;
        if (!prev || decoded.amount > prev.amount) {
          rec.tomestone = {
            currencyId: decoded.currencyId,
            amount: decoded.amount,
            currencyName: decoded.currencyName,
          };
        }
      } else {
        const branch = scripBranchFromName(decoded.currencyName);
        const prev = rec.scrip;
        const next = {
          currencyId: decoded.currencyId,
          amount: decoded.amount,
          currencyName: decoded.currencyName,
          branch: branch ?? 'crafter',
        };
        if (!prev || decoded.amount > prev.amount) rec.scrip = next;
      }
    }
  }

  const classJobCategoryNameById = new Map();
  for (const r of classJobCategory.rows) {
    const id = toNum(r[0]);
    const name = r[cjcIdx.get('Name')] ?? '';
    if (id && name) classJobCategoryNameById.set(id, name);
  }
  const uiCategoryNameById = new Map();
  for (const r of itemUiCategory.rows) {
    const id = toNum(r[0]);
    const name = r[uiIdx.get('Name')] ?? '';
    if (id && name) uiCategoryNameById.set(id, name);
  }
  const baseParamNameById = new Map();
  for (const r of baseParam.rows) {
    const id = toNum(r[0]);
    const name = r[bpIdx.get('Name')] ?? '';
    if (id && name) baseParamNameById.set(id, name);
  }

  const out = {};
  for (const [itemId, rec] of acc) {
    const r = item.byId.get(itemId);
    if (!r) continue;

    const levelEquip = toNum(r[itemIdx.get('LevelEquip')]);
    const ilvl = toNum(r[itemIdx.get('LevelItem')]);
    if (levelEquip <= 0 || ilvl <= 0 || ilvl >= 10000) continue;

    const classJobCategoryId = toNum(r[itemIdx.get('ClassJobCategory')]);
    const uiCatId = toNum(r[itemIdx.get('ItemUICategory')]);

    const stats = {};
    for (let s = 0; s < 6; s++) {
      const p = toNum(r[itemIdx.get(`BaseParam[${s}]`)]);
      const v = toNum(r[itemIdx.get(`BaseParamValue[${s}]`)]);
      if (!p || !v) continue;
      const rawName = baseParamNameById.get(p);
      if (!rawName) continue;
      stats[normalizeStatName(rawName)] = (stats[normalizeStatName(rawName)] ?? 0) + v;
    }

    out[String(itemId)] = {
      itemId,
      tomestone: rec.tomestone ?? null,
      scrip: rec.scrip ?? null,
      levelEquip,
      ilvl,
      classJobCategory: classJobCategoryNameById.get(classJobCategoryId) ?? '',
      gearTypeRaw: uiCategoryNameById.get(uiCatId) ?? '',
      stats,
    };
  }

  const meta = {
    generatedAt: new Date().toISOString(),
    source: {
      specialShop: `${BASE}${LANG_ANY}/SpecialShop.csv`,
      item: `${BASE}${LANG_ANY}/Item.csv`,
      classJobCategory: `${BASE}${LANG_EN}/ClassJobCategory.csv`,
      itemUiCategory: `${BASE}${LANG_EN}/ItemUICategory.csv`,
      baseParam: `${BASE}${LANG_EN}/BaseParam.csv`,
    },
    currencyKinds: {
      tomestone: 'Item Name matches /^Allagan Tomestone of /',
      scrip: "Item Name matches Crafters'/Gatherers' Scrip (excludes Token)",
    },
    counts: {
      items: Object.keys(out).length,
    },
  };

  const content =
    `// AUTO-GENERATED. Do not hand edit.\n` +
    `// Generated: ${meta.generatedAt}\n` +
    `// Tomestones + scrips: all job groups (combat, DoH, DoL). Sources: ${Object.values(meta.source).join(' | ')}\n` +
    `export const SPECIAL_VENDOR_META = ${JSON.stringify(meta, null, 2)};\n\n` +
    `export const SPECIAL_VENDOR_ITEMS = ${JSON.stringify(out, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, content, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${Object.keys(out).length} items, hash=${sha1(content)})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
