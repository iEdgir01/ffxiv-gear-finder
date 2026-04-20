import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGarlandDoc, classifyAcquisition, isGcExclusiveAcquisition, syntheticAcqFromItem } from '../js/garland.js';

const MOCK_DOC = {
  item: {
    tradeable: 1,
    craft: [{ job: 8, lvl: 15, ingredients: [] }],
    vendors: [101],
    quests: [201],
    drops: [301],
    gc: null,
  },
  partials: [
    { id: 101, type: 'npc', obj: { n: 'Merchant Moogle' } },
    { id: 201, type: 'quest', obj: { n: 'A Test Quest' } },
    { id: 301, type: 'mob', obj: { n: 'Goblin Thug' } },
  ],
};

describe('parseGarlandDoc', () => {
  it('extracts tradeable flag', () => {
    assert.equal(parseGarlandDoc(MOCK_DOC).tradeable, 1);
  });
  it('extracts craft array', () => {
    assert.equal(parseGarlandDoc(MOCK_DOC).craft.length, 1);
    assert.equal(parseGarlandDoc(MOCK_DOC).craft[0].job, 8);
  });
  it('resolves vendor names from partials', () => {
    assert.deepEqual(parseGarlandDoc(MOCK_DOC).vendors, ['Merchant Moogle']);
  });
  it('resolves quest names from partials', () => {
    assert.deepEqual(parseGarlandDoc(MOCK_DOC).quests, ['A Test Quest']);
  });
  it('resolves drop names from partials', () => {
    assert.deepEqual(parseGarlandDoc(MOCK_DOC).drops, ['Goblin Thug']);
  });
  it('returns null gc when gc is null', () => {
    assert.equal(parseGarlandDoc(MOCK_DOC).gc, null);
  });
  it('handles missing optional fields gracefully', () => {
    const minimal = { item: { tradeable: 0 }, partials: [] };
    const r = parseGarlandDoc(minimal);
    assert.deepEqual(r.craft, []);
    assert.deepEqual(r.vendors, []);
    assert.deepEqual(r.quests, []);
    assert.deepEqual(r.drops, []);
  });
});

describe('classifyAcquisition', () => {
  it('marks craftable when craft recipes exist', () => {
    const c = classifyAcquisition({ craft: [{}], vendors: [], tradeable: 1 });
    assert.equal(c.craftable, true);
    assert.equal(c.buyable, false);
  });
  it('marks buy when not craftable but tradeable (marketboard)', () => {
    const c = classifyAcquisition({ craft: [], vendors: [], tradeable: 1 });
    assert.equal(c.craftable, false);
    assert.equal(c.buyable, true);
  });
  it('marks buy for vendors without craft', () => {
    const c = classifyAcquisition({ craft: [], vendors: ['NPC'], tradeable: 0 });
    assert.equal(c.buyable, true);
  });
  it('unknown when null doc', () => {
    const c = classifyAcquisition(null);
    assert.equal(c.unknown, true);
  });
});

describe('isGcExclusiveAcquisition', () => {
  it('true when GC only (no craft, not tradeable, no vendors)', () => {
    assert.equal(isGcExclusiveAcquisition({ craft: [], gc: { id: 1 }, tradeable: 0, vendors: [] }), true);
  });
  it('false when craftable', () => {
    assert.equal(isGcExclusiveAcquisition({ craft: [{}], gc: {}, vendors: [], tradeable: 0 }), false);
  });
  it('false when tradeable (MB)', () => {
    assert.equal(isGcExclusiveAcquisition({ craft: [], gc: {}, vendors: [], tradeable: 1 }), false);
  });
  it('false when vendor', () => {
    assert.equal(isGcExclusiveAcquisition({ craft: [], gc: {}, vendors: ['NPC'], tradeable: 0 }), false);
  });
  it('false when null', () => {
    assert.equal(isGcExclusiveAcquisition(null), false);
  });
});

describe('syntheticAcqFromItem', () => {
  it('returns null for GC item (has gcInfo)', () => {
    assert.equal(syntheticAcqFromItem({ id: 1, gcInfo: { seals: 500 }, recipeLevel: null }), null);
  });
  it('returns null for tomestone vendor item (has tomestoneInfo)', () => {
    assert.equal(syntheticAcqFromItem({ id: 2, tomestoneInfo: { cost: 100 }, recipeLevel: null }), null);
  });
  it('returns null for scrip vendor item (has scripInfo)', () => {
    assert.equal(syntheticAcqFromItem({ id: 3, scripInfo: { cost: 50 }, recipeLevel: null }), null);
  });
  it('returns null for craftable item (recipeLevel is a number)', () => {
    assert.equal(syntheticAcqFromItem({ id: 4, recipeLevel: 90 }), null);
  });
  it('returns null for item that is both craftable and GC', () => {
    assert.equal(syntheticAcqFromItem({ id: 5, gcInfo: { seals: 200 }, recipeLevel: 50 }), null);
  });
  it('returns undefined for item with no classifiable metadata (recipeLevel null, no markers)', () => {
    assert.equal(syntheticAcqFromItem({ id: 6, recipeLevel: null }), undefined);
  });
  it('returns undefined for null input', () => {
    assert.equal(syntheticAcqFromItem(null), undefined);
  });

  describe('null return is safe with all downstream consumers', () => {
    it('isGcExclusiveAcquisition(null) returns false — craft items are not GC-exclusive', () => {
      assert.equal(isGcExclusiveAcquisition(null), false);
    });
    it('classifyAcquisition(null) marks unknown — never reached for pool items due to metadata-first checks', () => {
      const c = classifyAcquisition(null);
      assert.equal(c.unknown, true);
      assert.equal(c.craftable, false);
      assert.equal(c.buyable, false);
    });
  });
});
