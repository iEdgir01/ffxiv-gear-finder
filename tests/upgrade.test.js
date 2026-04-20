import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findBestUpgrades } from '../js/upgrade.js';

describe('findBestUpgrades', () => {
  it('picks upgrade by max DoH group stat, not primary (Craftsmanship) alone', () => {
    const gearset = { hands: 1 };
    const statsById = {
      1: {
        id: 1,
        name: 'Velveteen',
        gearTypeRaw: 'Hands',
        classJobCategory: 'Disciple of the Hand',
        stats: { Craftsmanship: 52, Control: 48 },
      },
      2: {
        id: 2,
        name: 'Archaeoskin',
        gearTypeRaw: 'Hands',
        classJobCategory: 'Disciple of the Hand',
        stats: { Craftsmanship: 48, Control: 62 },
      },
    };
    const pool = [{ id: 2, recipeLevel: 48, classJobCategory: 'Disciple of the Hand' }];
    const rows = findBestUpgrades(8, 51, gearset, statsById, pool);
    const hands = rows.find(r => r.label === 'Hands');
    assert.ok(hands?.best);
    assert.equal(hands.best.id, 2);
    assert.ok((hands.delta ?? 0) > 0);
  });
});
