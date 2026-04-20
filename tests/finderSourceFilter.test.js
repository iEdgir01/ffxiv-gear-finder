import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { passesFinderSourceMode } from '../js/finderSourceFilter.js';

const alwaysCraft = { canCraftRow: () => true };
const neverCraft = { canCraftRow: () => false };

describe('passesFinderSourceMode', () => {
  it('all: always true', () => {
    assert.equal(passesFinderSourceMode({}, null, 'all', alwaysCraft), true);
    assert.equal(passesFinderSourceMode({ gcInfo: {} }, null, 'all', neverCraft), true);
  });

  it('craft: uses canCraftRow only', () => {
    assert.equal(passesFinderSourceMode({ id: 1 }, null, 'craft', alwaysCraft), true);
    assert.equal(passesFinderSourceMode({ id: 1 }, null, 'craft', neverCraft), false);
  });

  it('gc: true when row has gcInfo (datamined seal row)', () => {
    assert.equal(
      passesFinderSourceMode({ id: 7300, gcInfo: { seals: 27 } }, null, 'gc', neverCraft),
      true
    );
  });

  it('gc: true when Garland says GC-exclusive (no craft, no mb, gc set)', () => {
    const acq = { craft: [], vendors: [], tradeable: 0, gc: true };
    assert.equal(passesFinderSourceMode({ id: 99 }, acq, 'gc', neverCraft), true);
  });

  it('gc: false for pure craft with no gcInfo and non-exclusive acq', () => {
    const acq = { craft: [{}], vendors: [], tradeable: 0, gc: null };
    assert.equal(passesFinderSourceMode({ id: 1, recipeLevel: 50 }, acq, 'gc', alwaysCraft), false);
  });

  it('tomestone: true when row has tomestoneInfo', () => {
    assert.equal(
      passesFinderSourceMode({ id: 1, tomestoneInfo: { amount: 10 } }, null, 'tomestone', neverCraft),
      true
    );
    assert.equal(passesFinderSourceMode({ id: 1, recipeLevel: 50 }, null, 'tomestone', alwaysCraft), false);
  });

  it('scrip: true when row has scripInfo', () => {
    assert.equal(
      passesFinderSourceMode({ id: 1, scripInfo: { amount: 50 } }, null, 'scrip', neverCraft),
      true
    );
    assert.equal(passesFinderSourceMode({ id: 1, gcInfo: {} }, null, 'scrip', alwaysCraft), false);
  });

  it('master: true when recipe has star tier', () => {
    assert.equal(passesFinderSourceMode({ id: 1, recipeStars: 2 }, null, 'master', neverCraft), true);
    assert.equal(passesFinderSourceMode({ id: 1, recipeStars: 0 }, null, 'master', alwaysCraft), false);
  });
});
