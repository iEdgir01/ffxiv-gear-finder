import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBaselineStats } from '../js/gearBaseline.js';

const cache = {
  10: { stats: { CP: 5, Craftsmanship: 100, Control: 80 } },
  11: { stats: { CP: 8, Craftsmanship: 90, Control: 100 } },
  20: { stats: { CP: 3, Craftsmanship: 50, Control: 40 } },
};

describe('resolveBaselineStats', () => {
  it('returns single-slot stats from gearset', () => {
    const gs = { body: 10 };
    const b = resolveBaselineStats('Body', gs, cache, 'doh');
    assert.equal(b.stats.CP, 5);
    assert.equal(b.stats.Craftsmanship, 100);
  });
  it('Ring: per-stat min of ring1 and ring2', () => {
    const gs = { ring1: 10, ring2: 11 };
    const b = resolveBaselineStats('Ring', gs, cache, 'doh');
    assert.equal(b.stats.CP, 5);
    assert.equal(b.stats.Craftsmanship, 90);
    assert.equal(b.stats.Control, 80);
  });
  it('returns null when slot empty', () => {
    assert.equal(resolveBaselineStats('Body', {}, cache, 'doh'), null);
  });
});
