import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLevelRange,
  getRecipeSearchRange,
  filterItems,
  sortByStat,
  sortGearForDisplay,
  findTopPickIdsByMaxGroupStat,
  maxGroupStatScore,
  maxSingleGroupStatValue,
  jobCanEquipCategory,
  normalizeGearType,
  isEquipGearItem,
  canPlayerCraftRecipe,
  collectPriorityStatOptions,
  applyFinderSortMode,
  filterByJobGroupStats,
  itemStatsMatchJobGroup,
} from '../js/search.js';

describe('normalizeGearType', () => {
  it('maps Primary Tool to MainHand', () => {
    assert.equal(normalizeGearType("Carpenter's Primary Tool"), 'MainHand');
  });
  it('maps Secondary Tool to OffHand', () => {
    assert.equal(normalizeGearType("Carpenter's Secondary Tool"), 'OffHand');
  });
  it('passes through canonical pill keys', () => {
    assert.equal(normalizeGearType('Ring'), 'Ring');
  });
  it("maps combat weapon categories ending in 's Arm to MainHand", () => {
    assert.equal(normalizeGearType("Gladiator's Arm"), 'MainHand');
  });
});

describe('getRecipeSearchRange', () => {
  it('legacy range object (finder pool no longer uses recipe-level band)', () => {
    assert.deepEqual(getRecipeSearchRange(51), { min: 1, max: 51 });
  });
  it('clamps min at 1 for low levels', () => {
    assert.deepEqual(getRecipeSearchRange(5), { min: 1, max: 5 });
  });
});

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
  { id: 1, name: 'Alpha Ring',   recipeLevel: 44, equipLevel: 40, gearTypeRaw: 'Finger', gearType: 'Ring',     stats: { CP: 6, Control: 3 } },
  { id: 2, name: 'Beta Ring',    recipeLevel: 46, equipLevel: 44, gearTypeRaw: 'Finger', gearType: 'Ring',     stats: { CP: 5 } },
  { id: 3, name: 'Gamma Neck',   recipeLevel: 48, equipLevel: 48, gearTypeRaw: 'Necklace', gearType: 'Necklace', stats: { GP: 7 } },
  { id: 4, name: 'Delta Head',   recipeLevel: 55, equipLevel: 50, gearTypeRaw: 'Head', gearType: 'Head',     stats: { CP: 4 } },
  { id: 5, name: 'Epsilon Ring', recipeLevel: 52, equipLevel: 52, gearTypeRaw: 'Finger', gearType: 'Ring',     stats: { Craftsmanship: 20 } },
];

describe('jobCanEquipCategory', () => {
  it('allows Disciple of the Hand for any crafter', () => {
    assert.equal(jobCanEquipCategory(8, 'Disciple of the Hand'), true);
  });
  it('excludes Weaver-only gear for Carpenter', () => {
    assert.equal(jobCanEquipCategory(8, 'Weaver'), false);
  });
  it('allows Weaver-only gear for Weaver', () => {
    assert.equal(jobCanEquipCategory(13, 'Weaver'), true);
  });
  it('excludes Culinarian-only for non-CUL', () => {
    assert.equal(jobCanEquipCategory(8, 'Culinarian'), false);
    assert.equal(jobCanEquipCategory(15, 'Culinarian'), true);
  });
  it('excludes when ClassJobCategory is empty or whitespace', () => {
    assert.equal(jobCanEquipCategory(8, ''), false);
    assert.equal(jobCanEquipCategory(8, '   '), false);
  });
  it('excludes unknown category strings (fail closed)', () => {
    assert.equal(jobCanEquipCategory(8, 'Totally Unknown Category'), false);
  });
  it('allows datamining job abbr as category (e.g. CRP for Carpenter tools)', () => {
    assert.equal(jobCanEquipCategory(8, 'CRP'), true);
    assert.equal(jobCanEquipCategory(9, 'CRP'), false);
  });
  it('handles space-separated abbreviation list — WAR allowed in tank list', () => {
    assert.equal(jobCanEquipCategory(21, 'GLA MRD PLD WAR DRK GNB'), true);
  });
  it('handles space-separated abbreviation list — WHM excluded from tank list', () => {
    assert.equal(jobCanEquipCategory(24, 'GLA MRD PLD WAR DRK GNB'), false);
  });
  it('handles space-separated abbreviation list — CRP allowed in DoH abbr list', () => {
    assert.equal(jobCanEquipCategory(8, 'CRP BSM ARM GSM LTW WVR ALC CUL'), true);
  });
  it('handles space-separated abbreviation list — WAR excluded from DoH abbr list', () => {
    assert.equal(jobCanEquipCategory(21, 'CRP BSM ARM GSM LTW WVR ALC CUL'), false);
  });
  it('Arcana: treats SMN/SCH-only categories as equippable', () => {
    assert.equal(jobCanEquipCategory(41, 'Summoner'), true);
    assert.equal(jobCanEquipCategory(41, 'Scholar'), false);
  });
  it('Arcana: treats SMN/SCH in abbreviation lists as equippable', () => {
    assert.equal(jobCanEquipCategory(41, 'SMN SCH'), true);
    assert.equal(jobCanEquipCategory(41, 'SMN'), true);
    assert.equal(jobCanEquipCategory(41, 'SCH'), false);
  });

  // Parameterized base-class delegation tests
  const BASE_CLASS_CASES = [
    { id: 43, abbr: 'GLA', promotedAbbr: 'PLD', promotedId: 19, category: 'Paladin',   spaceList: 'GLA MRD PLD WAR DRK GNB' },
    { id: 44, abbr: 'PGL', promotedAbbr: 'MNK', promotedId: 20, category: 'Monk',      spaceList: 'PGL MNK' },
    { id: 45, abbr: 'MRD', promotedAbbr: 'WAR', promotedId: 21, category: 'Warrior',   spaceList: 'GLA MRD PLD WAR DRK GNB' },
    { id: 46, abbr: 'LNC', promotedAbbr: 'DRG', promotedId: 22, category: 'Dragoon',   spaceList: 'LNC DRG' },
    { id: 47, abbr: 'ARC', promotedAbbr: 'BRD', promotedId: 23, category: 'Bard',      spaceList: 'ARC BRD' },
    { id: 48, abbr: 'CNJ', promotedAbbr: 'WHM', promotedId: 24, category: 'White Mage',spaceList: 'CNJ WHM' },
    { id: 49, abbr: 'THM', promotedAbbr: 'BLM', promotedId: 25, category: 'Black Mage',spaceList: 'THM BLM' },
    { id: 42, abbr: 'ROG', promotedAbbr: 'NIN', promotedId: 28, category: 'Ninja',     spaceList: 'ROG NIN' },
  ];

  for (const { id, abbr, category, spaceList } of BASE_CLASS_CASES) {
    it(`${abbr}: can equip '${category}' category`, () => {
      assert.equal(jobCanEquipCategory(id, category), true, `${abbr} should equip ${category}`);
    });
    it(`${abbr}: can equip space-separated list including promoted job`, () => {
      assert.equal(jobCanEquipCategory(id, spaceList), true, `${abbr} should equip list: ${spaceList}`);
    });
    it(`${abbr}: can equip Disciple of War or Magic`, () => {
      const group = [43,44,45,46,47,42].includes(id) ? 'Disciple of War' : 'Disciple of Magic';
      assert.equal(jobCanEquipCategory(id, group), true, `${abbr} should equip ${group}`);
    });
  }

  it('GLA: cannot equip Scholar-only gear (healer path)', () => {
    assert.equal(jobCanEquipCategory(43, 'Scholar'), false);
  });
  it('CNJ: cannot equip Summoner-only gear (caster path)', () => {
    assert.equal(jobCanEquipCategory(48, 'Summoner'), false);
  });
});

describe('maxGroupStatScore', () => {
  it('returns sum of DoH stats so balanced gear beats single-stat specialists', () => {
    assert.equal(maxGroupStatScore({ stats: { CP: 23, Control: 2 } }, 'doh'), 25);
    assert.equal(maxGroupStatScore({ stats: { Craftsmanship: 50, Control: 48 } }, 'doh'), 98);
    assert.ok(
      maxGroupStatScore({ stats: { Craftsmanship: 100, Control: 112 } }, 'doh') >
      maxGroupStatScore({ stats: { Craftsmanship: 120 } }, 'doh'),
      'balanced (212) should outscore single-stat (120)'
    );
  });
  it('returns sum for combat (DoW) stats — balanced beats single-stat', () => {
    assert.equal(maxGroupStatScore({ stats: { Strength: 50, Vitality: 48 } }, 'dow'), 98);
    assert.ok(
      maxGroupStatScore({ stats: { Strength: 50, Vitality: 48, CriticalHit: 30 } }, 'dow') >
      maxGroupStatScore({ stats: { Strength: 100 } }, 'dow'),
      'multi-stat (128) should outscore single-stat (100)'
    );
  });
});

describe('itemStatsMatchJobGroup / filterByJobGroupStats', () => {
  it('DoH: allows only CP / Craftsmanship / Control', () => {
    assert.equal(itemStatsMatchJobGroup({ stats: { Craftsmanship: 10, Control: 5 } }, 'doh'), true);
    assert.equal(itemStatsMatchJobGroup({ stats: { CP: 3 } }, 'doh'), true);
    assert.equal(itemStatsMatchJobGroup({ stats: { Gathering: 70, GP: 4 } }, 'doh'), false);
    assert.equal(itemStatsMatchJobGroup({ stats: { Intelligence: 12, DirectHitRate: 22 } }, 'doh'), false);
    assert.equal(itemStatsMatchJobGroup({ stats: { Craftsmanship: 5, Mind: 1 } }, 'doh'), false);
  });
  it('DoH: empty stats pass through (stats unavailable)', () => {
    assert.equal(itemStatsMatchJobGroup({ stats: {} }, 'doh'), true);
    assert.equal(itemStatsMatchJobGroup({}, 'doh'), true);
  });
  it('DoL: allows gathering stats only', () => {
    assert.equal(itemStatsMatchJobGroup({ stats: { Gathering: 5, Perception: 3 } }, 'dol'), true);
    assert.equal(itemStatsMatchJobGroup({ stats: { Strength: 10 } }, 'dol'), false);
  });
  it('filterByJobGroupStats removes mismatched rows', () => {
    const items = [
      { id: 1, stats: { Craftsmanship: 10 } },
      { id: 2, stats: { Gathering: 10 } },
    ];
    assert.deepEqual(filterByJobGroupStats(items, 'doh').map(i => i.id), [1]);
  });
});

describe('maxSingleGroupStatValue', () => {
  it('returns the largest single DoH stat, not the sum (badge highlight under Best overall)', () => {
    assert.equal(maxSingleGroupStatValue({ stats: { CP: 43, Craftsmanship: 105, Control: 0 } }, 'doh'), 105);
    assert.equal(maxSingleGroupStatValue({ stats: { Craftsmanship: 27, Gathering: 19 } }, 'doh'), 27);
  });
  it('returns -Infinity when no group stats are present', () => {
    assert.equal(maxSingleGroupStatValue({ stats: { Gathering: 19 } }, 'doh'), -Infinity);
  });
});

describe('sortGearForDisplay', () => {
  it('orders by max group stat desc, then equip level, recipe level, slot, ilvl', () => {
    const items = [
      { id: 1, recipeLevel: 50, equipLevel: 50, gearTypeRaw: 'Finger', gearType: 'Ring', ilvl: 40, stats: { CP: 5 } },
      { id: 2, recipeLevel: 50, equipLevel: 50, gearTypeRaw: 'Head', gearType: 'Head', ilvl: 50, stats: { Control: 30 } },
      { id: 3, recipeLevel: 50, equipLevel: 50, gearTypeRaw: 'Body', gearType: 'Body', ilvl: 50, stats: { CP: 10 } },
    ];
    assert.deepEqual(sortGearForDisplay(items, 'doh').map(i => i.id), [2, 3, 1]);
  });
  it('with priorityStat, orders by that stat value', () => {
    const items = [
      { id: 1, recipeLevel: 50, gearTypeRaw: 'Finger', gearType: 'Ring', ilvl: 40, stats: { CP: 5, Craftsmanship: 99 } },
      { id: 2, recipeLevel: 50, gearTypeRaw: 'Head', gearType: 'Head', ilvl: 50, stats: { CP: 40, Craftsmanship: 10 } },
    ];
    const sorted = sortGearForDisplay(items, 'doh', { priorityStat: 'CP' });
    assert.deepEqual(sorted.map(i => i.id), [2, 1]);
  });
});

describe('collectPriorityStatOptions', () => {
  it('with no gear filter returns full group stat list', () => {
    const o = collectPriorityStatOptions('doh', null, []);
    assert.ok(o.includes('CP') && o.includes('Control'));
  });
  it('with gear filter narrows to stats present on items', () => {
    const items = [{ stats: { CP: 5 } }, { stats: { CP: 3, Craftsmanship: 10 } }];
    const o = collectPriorityStatOptions('doh', 'Ring', items);
    assert.deepEqual(o, ['CP', 'Craftsmanship']);
  });
});

describe('findTopPickIdsByMaxGroupStat', () => {
  it('single gear type: includes every item tied at max group score', () => {
    const items = [
      { id: 1, ilvl: 55, gearTypeRaw: 'Finger', gearType: 'Ring', stats: { CP: 15 } },
      { id: 2, ilvl: 47, gearTypeRaw: 'Finger', gearType: 'Ring', stats: { CP: 15 } },
      { id: 3, ilvl: 40, gearTypeRaw: 'Finger', gearType: 'Ring', stats: { CP: 10 } },
    ];
    const ids = findTopPickIdsByMaxGroupStat(items, 'doh', 'Ring');
    assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2]);
  });
  it('all gear types: best per slot; ties in a slot both marked', () => {
    const items = [
      { id: 1, gearTypeRaw: 'Head', gearType: 'Head', stats: { CP: 30 } },
      { id: 2, gearTypeRaw: 'Head', gearType: 'Head', stats: { CP: 30 } },
      { id: 3, gearTypeRaw: 'Finger', gearType: 'Ring', stats: { CP: 15 } },
      { id: 4, gearTypeRaw: 'Finger', gearType: 'Ring', stats: { CP: 12 } },
    ];
    const ids = findTopPickIdsByMaxGroupStat(items, 'doh', null);
    assert.deepEqual([...ids].sort((a, b) => a - b), [1, 2, 3]);
  });
});

describe('isEquipGearItem', () => {
  it('is true for armor / accessories with mapped UI category', () => {
    assert.equal(isEquipGearItem({ gearTypeRaw: 'Head', gearType: 'Head' }), true);
  });
  it('is false for crafting materials', () => {
    assert.equal(isEquipGearItem({ gearTypeRaw: 'Rivets', gearType: 'Rivets' }), false);
  });
  it('is false for food', () => {
    assert.equal(isEquipGearItem({ gearTypeRaw: 'Meals', gearType: 'Meals' }), false);
  });
});

describe('filterItems', () => {
  it('filters by equip level vs jobLevel', () => {
    const result = filterItems(ITEMS, { gearType: null, jobLevel: 50 });
    assert.deepEqual(result.map(i => i.id), [1, 2, 3, 4]);
  });
  it('includes higher-equip items when jobLevel allows', () => {
    const result = filterItems(ITEMS, { gearType: null, jobLevel: 55 });
    assert.ok(result.some(i => i.id === 5));
  });
  it('filters by gear type', () => {
    const result = filterItems(ITEMS, { gearType: 'Ring', jobLevel: 55 });
    assert.deepEqual(result.map(i => i.id), [1, 2, 5]);
  });
  it('returns all matching equip levels when gearType is null', () => {
    assert.equal(filterItems(ITEMS, { gearType: null, jobLevel: 50 }).length, 4);
  });
  it('returns empty array when no items match jobLevel', () => {
    assert.deepEqual(filterItems(ITEMS, { gearType: null, jobLevel: 15 }), []);
  });
  it('does not throw when item has no stats property', () => {
    const noStats = [{ id: 9, recipeLevel: 45, equipLevel: 45, gearTypeRaw: 'Finger', gearType: 'Ring' }];
    assert.doesNotThrow(() => filterItems(noStats, { gearType: null, jobLevel: 50 }));
  });
  it('excludes non-equipment (materials, consumables) when gearOnly', () => {
    const mixed = [
      { id: 1, recipeLevel: 45, equipLevel: 45, gearTypeRaw: 'Head', gearType: 'Head', stats: {} },
      { id: 2, recipeLevel: 45, equipLevel: 45, gearTypeRaw: 'Metal', gearType: 'Metal', stats: {} },
      { id: 3, recipeLevel: 45, equipLevel: 45, gearTypeRaw: 'Meals', gearType: 'Meals', stats: {} },
    ];
    const result = filterItems(mixed, { gearType: null, jobLevel: 50 });
    assert.deepEqual(result.map(i => i.id), [1]);
  });
  it('gearOnly: false includes non-gear', () => {
    const mixed = [
      { id: 1, recipeLevel: 45, equipLevel: 45, gearTypeRaw: 'Metal', gearType: 'Metal', stats: {} },
    ];
    const result = filterItems(mixed, { gearType: null, jobLevel: 50, gearOnly: false });
    assert.deepEqual(result.map(i => i.id), [1]);
  });
  it('equipJobId for DoH: uses ClassJobCategory (who can equip), not recipe crafter', () => {
    const rows = [
      {
        id: 1,
        recipeLevel: 45,
        equipLevel: 45,
        gearTypeRaw: 'Head',
        gearType: 'Head',
        classJobCategory: 'Disciple of the Hand',
        craftJobAbbr: 'WVR',
        stats: {},
      },
      {
        id: 2,
        recipeLevel: 45,
        equipLevel: 45,
        gearTypeRaw: 'Head',
        gearType: 'Head',
        classJobCategory: 'Weaver',
        craftJobAbbr: 'WVR',
        stats: {},
      },
    ];
    const result = filterItems(rows, {
      gearType: null,
      equipJobId: 8,
      jobLevel: 50,
    });
    assert.deepEqual(result.map(i => i.id), [1]);
  });
  it('MainHand: includes tools without CP when filtering by slot', () => {
    const rows = [
      {
        id: 1,
        recipeLevel: 50,
        equipLevel: 50,
        craftJobAbbr: 'BSM',
        classJobCategory: 'Carpenter',
        gearTypeRaw: "Carpenter's Primary Tool",
        gearType: 'MainHand',
        stats: { Craftsmanship: 81, Control: 71 },
      },
    ];
    const result = filterItems(rows, {
      gearType: 'MainHand',
      equipJobId: 8,
      jobLevel: 55,
    });
    assert.deepEqual(result.map(i => i.id), [1]);
  });
});

describe('canPlayerCraftRecipe', () => {
  it('returns true when crafter job level meets recipe level', () => {
    const jobs = { 9: { level: 50 } };
    assert.equal(canPlayerCraftRecipe(jobs, { craftJobId: 9, recipeLevel: 40 }), true);
  });
  it('returns false when crafter level is below recipe level', () => {
    const jobs = { 9: { level: 30 } };
    assert.equal(canPlayerCraftRecipe(jobs, { craftJobId: 9, recipeLevel: 40 }), false);
  });
  it('returns false when craft job is missing from import', () => {
    const jobs = {};
    assert.equal(canPlayerCraftRecipe(jobs, { craftJobId: 9, recipeLevel: 1 }), false);
  });
  it('requires masterStars when recipeStars > 0', () => {
    const jobs = { 9: { level: 90 } };
    const row = { craftJobId: 9, recipeLevel: 80, recipeStars: 3 };
    assert.equal(canPlayerCraftRecipe(jobs, row, {}), false);
    assert.equal(canPlayerCraftRecipe(jobs, row, { 9: 2 }), false);
    assert.equal(canPlayerCraftRecipe(jobs, row, { 9: 3 }), true);
    assert.equal(canPlayerCraftRecipe(jobs, row, { '9': 4 }), true);
  });
  it('ignores masterStars when recipeStars is 0', () => {
    const jobs = { 9: { level: 50 } };
    const row = { craftJobId: 9, recipeLevel: 40, recipeStars: 0 };
    assert.equal(canPlayerCraftRecipe(jobs, row, {}), true);
  });
});

describe('sortByStat', () => {
  it('sorts descending by stat value', () => {
    const items = [{ id: 1, stats: { CP: 5 } }, { id: 2, stats: { CP: 8 } }, { id: 3, stats: { CP: 3 } }];
    assert.deepEqual(sortByStat(items, 'CP').map(i => i.id), [2, 1, 3]);
  });
  it('when stat ties, prefers lower ilvl (leveling gear vs higher-ilvl rings with same CP)', () => {
    const items = [
      { id: 1, ilvl: 55, stats: { CP: 15 } },
      { id: 2, ilvl: 47, stats: { CP: 15 } },
    ];
    assert.deepEqual(sortByStat(items, 'CP').map(i => i.id), [2, 1]);
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

describe('applyFinderSortMode', () => {
  const items = [
    { id: 1, ilvl: 10, equipLevel: 20 },
    { id: 2, ilvl: 30, equipLevel: 15 },
    { id: 3, ilvl: 25, equipLevel: 40 },
  ];
  const picks = new Set([2]);

  it('bestMatch leaves order unchanged', () => {
    const out = applyFinderSortMode(items, 'bestMatch', picks);
    assert.deepEqual(out.map(i => i.id), [1, 2, 3]);
  });
  it('topPick moves picked ids first, preserves relative order', () => {
    const out = applyFinderSortMode(items, 'topPick', picks);
    assert.deepEqual(out.map(i => i.id), [2, 1, 3]);
  });
  it('ilvl sorts high first', () => {
    const out = applyFinderSortMode(items, 'ilvl', picks);
    assert.deepEqual(out.map(i => i.id), [2, 3, 1]);
  });
  it('equipLevel sorts high first', () => {
    const out = applyFinderSortMode(items, 'equipLevel', picks);
    assert.deepEqual(out.map(i => i.id), [3, 1, 2]);
  });
});
