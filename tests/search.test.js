import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLevelRange,
  filterItems,
  sortByStat,
} from '../js/search.js';

describe('getLevelRange', () => {
  it('Lv 52 → 50-52', () => {
    assert.deepEqual(getLevelRange(52), { min: 50, max: 52 });
  });
  it('Lv 47 → 45-47', () => {
    assert.deepEqual(getLevelRange(47), { min: 45, max: 47 });
  });
  it('Lv 55 → 55-55 (exact tier boundary)', () => {
    assert.deepEqual(getLevelRange(55), { min: 55, max: 55 });
  });
  it('Lv 60 → 60-60 (exact tier boundary)', () => {
    assert.deepEqual(getLevelRange(60), { min: 60, max: 60 });
  });
  it('Lv 1 → 1-1', () => {
    assert.deepEqual(getLevelRange(1), { min: 1, max: 1 });
  });
  it('Lv 3 → 1-3 (below first tier, min clamp)', () => {
    assert.deepEqual(getLevelRange(3), { min: 1, max: 3 });
  });
  it('Lv 5 → 5-5', () => {
    assert.deepEqual(getLevelRange(5), { min: 5, max: 5 });
  });
  it('Lv 6 → 5-6', () => {
    assert.deepEqual(getLevelRange(6), { min: 5, max: 6 });
  });
});

const ITEMS = [
  { id: 1, name: 'Alpha Ring',   recipeLevel: 44, gearType: 'Ring',     stats: { CP: 6, Control: 3 } },
  { id: 2, name: 'Beta Ring',    recipeLevel: 46, gearType: 'Ring',     stats: { CP: 5 } },
  { id: 3, name: 'Gamma Neck',   recipeLevel: 48, gearType: 'Necklace', stats: { GP: 7 } },
  { id: 4, name: 'Delta Head',   recipeLevel: 55, gearType: 'Head',     stats: { CP: 4 } },
  { id: 5, name: 'Epsilon Ring', recipeLevel: 52, gearType: 'Ring',     stats: { Craftsmanship: 20 } },
];

describe('filterItems', () => {
  it('filters by level range', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: null });
    assert.deepEqual(result.map(i => i.id), [1, 2, 3]);
  });
  it('filters by stat — only items with that stat', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: 'CP', gearType: null });
    assert.deepEqual(result.map(i => i.id), [1, 2]);
  });
  it('filters by gear type', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 55, stat: null, gearType: 'Ring' });
    assert.deepEqual(result.map(i => i.id), [1, 2, 5]);
  });
  it('applies stat and gear type together', () => {
    const result = filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: 'CP', gearType: 'Ring' });
    assert.deepEqual(result.map(i => i.id), [1, 2]);
  });
  it('returns all in range when stat and gearType are null', () => {
    assert.equal(
      filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: null }).length, 3
    );
  });
  it('returns empty array when no items match', () => {
    assert.deepEqual(filterItems(ITEMS, { levelMin: 90, levelMax: 100, stat: null, gearType: null }), []);
  });
  it('does not throw when item has no stats property', () => {
    const noStats = [{ id: 9, recipeLevel: 45, gearType: 'Ring' }];
    assert.doesNotThrow(() => filterItems(noStats, { levelMin: 40, levelMax: 50, stat: 'CP', gearType: null }));
  });
});

describe('sortByStat', () => {
  it('sorts descending by stat value', () => {
    const items = [{ id: 1, stats: { CP: 5 } }, { id: 2, stats: { CP: 8 } }, { id: 3, stats: { CP: 3 } }];
    assert.deepEqual(sortByStat(items, 'CP').map(i => i.id), [2, 1, 3]);
  });
  it('sorts by ilvl descending when stat is null', () => {
    const items = [{ id: 1, ilvl: 48, stats: {} }, { id: 2, ilvl: 52, stats: {} }, { id: 3, ilvl: 46, stats: {} }];
    assert.deepEqual(sortByStat(items, null).map(i => i.id), [2, 1, 3]);
  });
  it('places items missing the stat after items that have it', () => {
    const items = [{ id: 1, stats: { CP: 5 } }, { id: 2, stats: { GP: 7 } }, { id: 3, stats: { CP: 8 } }];
    const sorted = sortByStat(items, 'CP');
    assert.equal(sorted[0].id, 3);
    assert.equal(sorted[1].id, 1);
    assert.equal(sorted[2].id, 2);
  });
  it('handles items with no ilvl when stat is null', () => {
    const items = [{ id: 1, stats: {} }, { id: 2, ilvl: 10, stats: {} }];
    assert.doesNotThrow(() => sortByStat(items, null));
  });
});
