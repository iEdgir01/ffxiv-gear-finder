import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGroupAverage,
  getLevelRange,
  filterItems,
  sortByStat,
} from '../js/search.js';

const JOBS = {
  8:  { level: 44 }, 9:  { level: 46 }, 10: { level: 45 },
  11: { level: 47 }, 12: { level: 44 }, 13: { level: 46 },
  14: { level: 44 }, 15: { level: 44 },
  16: { level: 38 }, 17: { level: 40 }, 18: { level: 36 },
};
const DOH_IDS = [8, 9, 10, 11, 12, 13, 14, 15];
const DOL_IDS = [16, 17, 18];

describe('getGroupAverage', () => {
  it('returns floor of average for doh jobs', () => {
    assert.equal(getGroupAverage(JOBS, DOH_IDS), 45);
  });
  it('returns floor of average for dol jobs', () => {
    assert.equal(getGroupAverage(JOBS, DOL_IDS), 38);
  });
  it('returns 1 when all levels are 1', () => {
    assert.equal(getGroupAverage({ 8: { level: 1 }, 9: { level: 1 } }, [8, 9]), 1);
  });
  it('ignores job IDs not present in jobs map', () => {
    assert.equal(getGroupAverage({ 8: { level: 40 } }, [8, 9]), 40);
  });
  it('treats level 0 as 1 (locked job fallback)', () => {
    assert.equal(getGroupAverage({ 8: { level: 0 }, 9: { level: 0 } }, [8, 9]), 1);
  });
});

describe('getLevelRange', () => {
  it('returns avg +-5', () => {
    assert.deepEqual(getLevelRange(45), { min: 40, max: 50 });
  });
  it('clamps min to 1', () => {
    assert.deepEqual(getLevelRange(3), { min: 1, max: 8 });
  });
  it('clamps max to 100', () => {
    assert.deepEqual(getLevelRange(98), { min: 93, max: 100 });
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
      filterItems(ITEMS, { levelMin: 40, levelMax: 50, stat: null, gearType: null }).length,
      3
    );
  });
  it('returns empty array when no items match', () => {
    assert.deepEqual(filterItems(ITEMS, { levelMin: 60, levelMax: 70, stat: null, gearType: null }), []);
  });
  it('does not throw when item has no stats property', () => {
    const noStats = [{ id: 99, recipeLevel: 44, gearType: 'Ring' }];
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
    const items = [{ id: 1, stats: {} }, { id: 2, ilvl: 50, stats: {} }];
    const sorted = sortByStat(items, null);
    assert.equal(sorted[0].id, 2);
    assert.equal(sorted[1].id, 1);
  });
});
