import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemStats } from '../js/api.js';

describe('parseItemStats', () => {
  it('extracts basic fields', () => {
    const raw = {
      ID: 5059, Name: 'Iron Ingot', LevelItem: 13, LevelEquip: 11,
      Stats: { Craftsmanship: { NQ: 5, HQ: 7 } },
      ItemUICategory: { Name: 'Ingot' },
      IsUntradable: 0,
      ClassJobCategory: { Name: 'Blacksmith' },
    };
    const r = parseItemStats(raw);
    assert.equal(r.id, 5059);
    assert.equal(r.name, 'Iron Ingot');
    assert.equal(r.ilvl, 13);
    assert.equal(r.equipLevel, 11);
    assert.equal(r.gearType, 'Ingot');
    assert.equal(r.stats.Craftsmanship, 5);
  });

  it('sets isUntradable true when IsUntradable === 1', () => {
    const raw = { ID: 1, Name: 'X', LevelItem: 1, LevelEquip: 1, Stats: {}, IsUntradable: 1, ClassJobCategory: { Name: '' } };
    assert.equal(parseItemStats(raw).isUntradable, true);
  });

  it('sets isUntradable false when IsUntradable === 0', () => {
    const raw = { ID: 1, Name: 'X', LevelItem: 1, LevelEquip: 1, Stats: {}, IsUntradable: 0, ClassJobCategory: { Name: '' } };
    assert.equal(parseItemStats(raw).isUntradable, false);
  });

  it('stores classJobCategory name string', () => {
    const raw = { ID: 1, Name: 'X', LevelItem: 1, LevelEquip: 1, Stats: {}, IsUntradable: 0, ClassJobCategory: { Name: 'Disciple of the Land' } };
    assert.equal(parseItemStats(raw).classJobCategory, 'Disciple of the Land');
  });

  it('handles missing ClassJobCategory gracefully', () => {
    const raw = { ID: 1, Name: 'X', LevelItem: 1, LevelEquip: 1, Stats: {}, IsUntradable: 0 };
    assert.equal(parseItemStats(raw).classJobCategory, '');
  });
});
