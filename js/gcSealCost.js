/**
 * Grand Company seal currency: Item.csv rows 20 / 21 / 22 = Storm / Serpent / Flame Seal.
 * Must stay aligned with `scripts/build-gc-data.mjs` and `garland.js` (GC_SEAL_IDS).
 */
export const GC_SEAL_CURRENCY_IDS = new Set([20, 21, 22]);

/**
 * Seal purchase cost as stored in SpecialShop for **one** item slot when
 * `Item[n].CostType[0] === 0` (classic rows): `CurrencyCost[0]` ∈ {20,21,22} (seal **item** ids)
 * and amount from `ItemCost[0]`.
 *
 * Rows with `CostType[0] !== 0` use other currencies; GC seal gear is taken from
 * `GCScripShopItem` + `SpecialShop` CostType 0 in `build-gc-data.mjs` (no Garland).
 *
 * **Note:** Some rows also set `CurrencyCost[1]`; this helper does not read it yet.
 *
 * @param {string|number} currencyCost0
 * @param {string|number} itemCost0
 * @returns {number|null} seal amount, or null if not a seal currency row
 */
export function sealCostFromShopColumns(currencyCost0, itemCost0) {
  const c0 = Number(currencyCost0);
  if (!Number.isFinite(c0) || !GC_SEAL_CURRENCY_IDS.has(c0)) return null;
  const n = Number(itemCost0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
