import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIAL_VENDOR_ITEMS } from '../js/specialVendorData.js';

test('specialVendorData includes Poetics (CostType=2) vendor gear', () => {
  // Augmented Ironworks Helm of Fending
  const it = SPECIAL_VENDOR_ITEMS['8876'];
  assert.ok(it, 'expected item 8876 to exist in SPECIAL_VENDOR_ITEMS');
  assert.equal(it.levelEquip, 50);
  assert.equal(it.ilvl, 130);
  assert.equal(it.tomestone?.currencyId, 28);
  assert.equal(it.tomestone?.currencyName, 'Allagan Tomestone of Poetics');
  assert.ok(Number(it.tomestone?.amount) > 0);
});

test('specialVendorData includes at least one scrip-currency vendor gear item', () => {
  const anyScrip = Object.values(SPECIAL_VENDOR_ITEMS).some(r => r?.scrip?.currencyId);
  assert.ok(anyScrip, 'expected at least one scrip vendor item');
});

