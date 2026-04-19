import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGarlandDoc } from '../js/garland.js';

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
