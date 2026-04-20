import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GC_SEAL_CURRENCY_IDS, sealCostFromShopColumns } from '../js/gcSealCost.js';

describe('GC_SEAL_CURRENCY_IDS', () => {
  it('matches Item.csv currency tokens for the three Grand Companies', () => {
    assert.ok(GC_SEAL_CURRENCY_IDS.has(20));
    assert.ok(GC_SEAL_CURRENCY_IDS.has(21));
    assert.ok(GC_SEAL_CURRENCY_IDS.has(22));
    assert.equal(GC_SEAL_CURRENCY_IDS.size, 3);
  });
});

describe('sealCostFromShopColumns', () => {
  it('returns null when the slot is not paid with seals', () => {
    assert.equal(sealCostFromShopColumns(1, 100), null);
  });

  /**
   * Fixture from `en/SpecialShop.csv` line 33, shop "Allied Seals (DoW)", slot 26,
   * reward item 7300 (Noct Wristlets): CurrencyCost[0]=20, ItemCost[0]=27.
   * This is what `gcData.js` encodes today.
   */
  it('Storm Seal row: amount is ItemCost[0] (27 for Noct Wristlets)', () => {
    assert.equal(sealCostFromShopColumns(20, 27), 27);
  });

  /**
   * Augmented Neo-Ishgardian Equipment (Accessories) — currency Serpent (21),
   * CurrencyCost[1]=2, ItemCost[0]=30589, ItemCost[1]=30588.
   * The generator uses ItemCost[0] as "seals", which would be wrong if interpreted as seal count.
   * Documented so we can change parsing once CostType / multi-cost rules are implemented.
   */
  it('known limitation: does not use CurrencyCost[1] (Neo-Ishgardian would mis-read if passed blindly)', () => {
    assert.equal(sealCostFromShopColumns(21, 30589), 30589);
    // A future implementation might return 2 when CC1 holds the seal component:
    // assert.equal(sealCostFromShopColumnsResolved(21, 2, 30589, ...costTypes), expected);
  });
});
