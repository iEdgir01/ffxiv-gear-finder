/**
 * Build `js/gcData.js` from xivapi/ffxiv-datamining CSVs only (no Garland).
 *
 * Primary source: GCScripShopItem + GCScripShopCategory (seal costs, item, rank).
 * Supplement: SpecialShop rows with CostType 0 + seal currency 20/21/22.
 *
 * Output fields per item id match previous consumer: companyId, seals, currencyId,
 * requiredRankId, requiredRankOrder, levelEquip, ilvl, classJobCategory, gearTypeRaw, stats.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { sealCostFromShopColumns } from '../js/gcSealCost.js';
import {
  fetchText,
  parseSheet,
  parseCompositeSheet,
  headerIndex,
  toNum,
} from './lib/datamineCsv.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'js', 'gcData.js');

const BASE = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/';
const LANG_EN = 'en';
const LANG_ANY = 'de';

const SEAL_TO_COMPANY = new Map([
  [20, 1],
  [21, 2],
  [22, 3],
]);

const COMPANY_TO_SEAL_CURRENCY = new Map([
  [1, 20],
  [2, 21],
  [3, 22],
]);

const STAT_NAME_MAP = {
  'Critical Hit': 'CriticalHit',
  'Direct Hit Rate': 'DirectHitRate',
  'Skill Speed': 'SkillSpeed',
  'Spell Speed': 'SpellSpeed',
};
function normalizeStatName(name) {
  return STAT_NAME_MAP[name] ?? name;
}

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
}

/** @typedef {{ itemId: number, companyId: number, currencyId: number, seals: number, receiveCount: number, questId: number|null, requiredRankId: number|null, requiredRankOrder: number|null, _source: string }} Listing */

/** Merge: prefer gcScripShop over specialShop; else higher seals */
function mergeListing(existing, incoming) {
  if (!existing) return incoming;
  if (incoming._source === 'gcScripShop' && existing._source !== 'gcScripShop') return incoming;
  if (existing._source === 'gcScripShop' && incoming._source !== 'gcScripShop') return existing;
  if (incoming.seals > existing.seals) return incoming;
  return existing;
}

function stripSource(listing) {
  const { _source, ...rest } = listing;
  return rest;
}

async function main() {
  const [
    gcScripShopItemText,
    gcScripShopCategoryText,
    specialShopText,
    itemText,
    classJobCategoryText,
    itemUiCategoryText,
    baseParamText,
    gcRankText,
  ] = await Promise.all([
    fetchText(`${BASE}${LANG_EN}/GCScripShopItem.csv`),
    fetchText(`${BASE}${LANG_EN}/GCScripShopCategory.csv`),
    fetchText(`${BASE}${LANG_ANY}/SpecialShop.csv`),
    fetchText(`${BASE}${LANG_ANY}/Item.csv`),
    fetchText(`${BASE}${LANG_EN}/ClassJobCategory.csv`),
    fetchText(`${BASE}${LANG_EN}/ItemUICategory.csv`),
    fetchText(`${BASE}${LANG_EN}/BaseParam.csv`),
    fetchText(`${BASE}${LANG_ANY}/GrandCompanyRank.csv`),
  ]);

  const gcScripShopItem = parseCompositeSheet(gcScripShopItemText);
  const gcScripShopCategory = parseSheet(gcScripShopCategoryText);
  const specialShop = parseSheet(specialShopText);
  const item = parseSheet(itemText);
  const classJobCategory = parseSheet(classJobCategoryText);
  const itemUiCategory = parseSheet(itemUiCategoryText);
  const baseParam = parseSheet(baseParamText);
  const gcRank = parseSheet(gcRankText);

  const gcsIdx = headerIndex(gcScripShopItem.header);
  const gccIdx = headerIndex(gcScripShopCategory.header);
  const specialIdx = headerIndex(specialShop.header);
  const itemIdx = headerIndex(item.header);
  const cjcIdx = headerIndex(classJobCategory.header);
  const uiIdx = headerIndex(itemUiCategory.header);
  const bpIdx = headerIndex(baseParam.header);
  const rankIdx = headerIndex(gcRank.header);

  /** category id (GCScripShopCategory #) -> GrandCompany 1..3 */
  const categoryToCompany = new Map();
  for (const r of gcScripShopCategory.rows) {
    const id = toNum(r[0]);
    const gc = toNum(r[gccIdx.get('GrandCompany')]);
    if (id && gc >= 1 && gc <= 3) categoryToCompany.set(id, gc);
  }

  const questToRank = new Map();
  for (const r of gcRank.rows) {
    const rankId = toNum(r[0]);
    const order = toNum(r[rankIdx.get('Order')]);
    const qm = toNum(r[rankIdx.get('QuestMaelstrom')]);
    const qs = toNum(r[rankIdx.get('QuestSerpents')]);
    const qf = toNum(r[rankIdx.get('QuestFlames')]);
    if (qm) questToRank.set(`1:${qm}`, { rankId, order });
    if (qs) questToRank.set(`2:${qs}`, { rankId, order });
    if (qf) questToRank.set(`3:${qf}`, { rankId, order });
  }

  const rankOrderById = new Map();
  for (const r of gcRank.rows) {
    const id = toNum(r[0]);
    const order = toNum(r[rankIdx.get('Order')]);
    if (id) rankOrderById.set(id, order);
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

  /** @type {Map<number, Listing>} */
  const gcListings = new Map();

  // ── 1) GCScripShopItem (authoritative GC quartermaster listings) ──────────
  const colHash = gcsIdx.get('#');
  const colSeals = gcsIdx.get('CostGCSeals');
  const colItem = gcsIdx.get('Item');
  const colRank = gcsIdx.get('RequiredGrandCompanyRank');
  for (const row of gcScripShopItem.rows) {
    const rawId = row[colHash]?.trim() ?? '';
    const m = rawId.match(/^(\d+)\.(\d+)$/);
    if (!m) continue;
    const categoryId = toNum(m[1]);
    const companyId = categoryToCompany.get(categoryId);
    if (!companyId) continue;

    const seals = toNum(row[colSeals]);
    const itemId = toNum(row[colItem]);
    if (!itemId || seals <= 0) continue;

    const currencyId = COMPANY_TO_SEAL_CURRENCY.get(companyId) ?? 20;
    const rankReqId = toNum(row[colRank]);
    const requiredRankOrder = rankReqId ? rankOrderById.get(rankReqId) ?? null : null;

    const listing = {
      itemId,
      companyId,
      currencyId,
      seals,
      receiveCount: 1,
      questId: null,
      requiredRankId: rankReqId || null,
      requiredRankOrder: requiredRankOrder,
      _source: 'gcScripShop',
    };
    const prev = gcListings.get(itemId);
    gcListings.set(itemId, mergeListing(prev, listing));
  }

  // ── 2) SpecialShop CostType 0 + seal currency (legacy / overlap) ───────────
  for (const row of specialShop.rows) {
    for (let i = 0; i < 60; i++) {
      const cKey = `Item[${i}].CurrencyCost[0]`;
      const costKey = `Item[${i}].ItemCost[0]`;
      const itemKey = `Item[${i}].Item[0]`;
      const cntKey = `Item[${i}].ReceiveCount[0]`;
      const qKey = `Item[${i}].Quest`;
      const ctKey = `Item[${i}].CostType[0]`;
      const ci = specialIdx.get(cKey);
      const ii = specialIdx.get(itemKey);
      const bi = specialIdx.get(costKey);
      if (ci == null || ii == null || bi == null) break;

      const currencyRaw = toNum(row[ci]);
      const costType = specialIdx.get(ctKey) != null ? toNum(row[specialIdx.get(ctKey)]) : 0;
      if (costType !== 0) continue;

      const companyId = SEAL_TO_COMPANY.get(currencyRaw);
      if (!companyId) continue;
      const sc = sealCostFromShopColumns(currencyRaw, toNum(row[bi]));
      if (sc == null || sc <= 0) continue;

      const itemId = toNum(row[ii]);
      if (!itemId) continue;

      const questId = qKey && specialIdx.get(qKey) != null ? toNum(row[specialIdx.get(qKey)]) : 0;
      const receiveCount = cntKey && specialIdx.get(cntKey) != null ? toNum(row[specialIdx.get(cntKey)]) : 1;
      const rank = questId ? questToRank.get(`${companyId}:${questId}`) : null;

      const listing = {
        itemId,
        companyId,
        currencyId: currencyRaw,
        seals: sc,
        receiveCount: receiveCount || 1,
        questId: questId || null,
        requiredRankId: rank?.rankId ?? null,
        requiredRankOrder: rank?.order ?? null,
        _source: 'specialShop',
      };
      const prev = gcListings.get(itemId);
      gcListings.set(itemId, mergeListing(prev, listing));
    }
  }

  // ── 3) Final item payloads ─────────────────────────────────────────────────
  const out = {};
  for (const [itemId, raw] of gcListings) {
    const listing = stripSource(raw);
    const r = item.byId.get(itemId);
    if (!r) continue;

    const levelEquip = toNum(r[itemIdx.get('LevelEquip')]);
    const ilvl = toNum(r[itemIdx.get('LevelItem')]);
    const classJobCategoryId = toNum(r[itemIdx.get('ClassJobCategory')]);
    const uiCatId = toNum(r[itemIdx.get('ItemUICategory')]);

    const stats = {};
    for (let s = 0; s < 6; s++) {
      const p = toNum(r[itemIdx.get(`BaseParam[${s}]`)]);
      const v = toNum(r[itemIdx.get(`BaseParamValue[${s}]`)]);
      if (!p || !v) continue;
      const rawName = baseParamNameById.get(p);
      if (!rawName) continue;
      const name = normalizeStatName(rawName);
      stats[name] = (stats[name] ?? 0) + v;
    }

    out[itemId] = {
      ...listing,
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
      gcScripShopItem: `${BASE}${LANG_EN}/GCScripShopItem.csv`,
      gcScripShopCategory: `${BASE}${LANG_EN}/GCScripShopCategory.csv`,
      specialShop: `${BASE}${LANG_ANY}/SpecialShop.csv`,
      item: `${BASE}${LANG_ANY}/Item.csv`,
      classJobCategory: `${BASE}${LANG_EN}/ClassJobCategory.csv`,
      itemUiCategory: `${BASE}${LANG_EN}/ItemUICategory.csv`,
      baseParam: `${BASE}${LANG_EN}/BaseParam.csv`,
      grandCompanyRank: `${BASE}${LANG_ANY}/GrandCompanyRank.csv`,
    },
    notes:
      'GC seal gear from GCScripShopItem + GCScripShopCategory; SpecialShop CostType 0 seal rows merged. No Garland.',
    counts: {
      listings: gcListings.size,
      items: Object.keys(out).length,
    },
  };

  const content =
    `// AUTO-GENERATED. Do not hand edit.\n` +
    `// Generated: ${meta.generatedAt}\n` +
    `// Sources: ${Object.values(meta.source).join(' | ')}\n` +
    `export const GC_DATA_META = ${JSON.stringify(meta, null, 2)};\n\n` +
    `export const GC_ITEMS = ${JSON.stringify(out, null, 2)};\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, content, 'utf8');

  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${Object.keys(out).length} items, hash=${sha1(content)})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
