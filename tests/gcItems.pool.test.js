import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GC_ITEMS } from '../js/gcData.js';

/**
 * Integration-style checks on generated `gcData.js` (not the live CSV).
 * Regenerate after `npm run build:gc-data` (uses GCScripShopItem + SpecialShop CSVs only).
 */

function countByGearTypeRaw() {
  /** @type {Record<string, number>} */
  const m = {};
  for (const g of Object.values(GC_ITEMS)) {
    const k = (g.gearTypeRaw ?? '').trim() || '?';
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

describe('GC_ITEMS pool (gcData.js)', () => {
  it('includes expected meta size', () => {
    const n = Object.keys(GC_ITEMS).length;
    assert.ok(n >= 100 && n <= 2000, `unexpected GC item count: ${n}`);
  });

  it('has Body rows including Lv 50+ GC gear (GCScripShopItem + SpecialShop)', () => {
    const bodies = Object.values(GC_ITEMS).filter(g => g.gearTypeRaw === 'Body');
    assert.ok(bodies.length >= 1, 'expected at least one Body row');
    const high = bodies.filter(b => Number(b.levelEquip) >= 50);
    assert.ok(high.length >= 1, 'expected at least one Body row at Lv 50+');
  });

  it('includes classic accessory sets (e.g. Noct) with shared seal cost column', () => {
    const w7300 = GC_ITEMS['7300'];
    assert.ok(w7300, 'item 7300 should exist');
    assert.equal(w7300.gearTypeRaw, 'Bracelets');
    assert.equal(Number(w7300.seals), 27);
    assert.equal(w7300.currencyId, 20);
  });

  it('includes artisan DoH primary tools at GC quartermaster seal cost (7500)', () => {
    const saw = GC_ITEMS['7523'];
    assert.ok(saw, 'Artisan\'s Chocobotail Saw (7523) should be in GC extract');
    assert.equal(saw.gearTypeRaw, "Carpenter's Primary Tool");
    assert.equal(Number(saw.seals), 7500);
  });

  it('summarizes slot distribution for debugging (accessories dominate)', () => {
    const m = countByGearTypeRaw();
    const acc =
      (m.Bracelets ?? 0) +
      (m.Earrings ?? 0) +
      (m.Necklace ?? 0) +
      (m.Ring ?? 0);
    assert.ok(acc >= 40, `expected many accessory rows, got ${acc}`);
    assert.ok((m.Body ?? 0) >= 1);
  });
});
