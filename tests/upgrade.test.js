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

  it('includes pool rows for base-class job when XIVAPI lists promoted abbrs only (e.g. SMN/SCH for Arcanist)', () => {
    const gearset = { head: 100 };
    const statsById = {
      100: {
        id: 100,
        name: 'Hempen Hat',
        gearTypeRaw: 'Head',
        classJobAbbrs: ['SMN', 'SCH', 'ACN'],
        stats: { Intelligence: 2, Mind: 2 },
      },
      200: {
        id: 200,
        name: 'Cotton Cowl',
        gearTypeRaw: 'Head',
        classJobAbbrs: ['SMN', 'SCH', 'ACN'],
        stats: { Intelligence: 6, Mind: 6, Vitality: 2 },
      },
    };
    const pool = [
      {
        id: 200,
        recipeLevel: 10,
        gearTypeRaw: 'Head',
        classJobAbbrs: ['SMN', 'SCH', 'ACN'],
        stats: { Intelligence: 6, Mind: 6, Vitality: 2 },
      },
    ];
    const rows = findBestUpgrades(41, 17, gearset, statsById, pool);
    const head = rows.find(r => r.label === 'Head');
    assert.ok(head?.best);
    assert.equal(head.best.id, 200);
    assert.ok((head.delta ?? 0) > 0);
  });
});
