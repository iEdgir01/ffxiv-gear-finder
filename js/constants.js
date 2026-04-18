export const JOB_IDS = {
  8:  { abbr: 'CRP', name: 'Carpenter',     group: 'doh' },
  9:  { abbr: 'BSM', name: 'Blacksmith',    group: 'doh' },
  10: { abbr: 'ARM', name: 'Armorer',       group: 'doh' },
  11: { abbr: 'GSM', name: 'Goldsmith',     group: 'doh' },
  12: { abbr: 'LTW', name: 'Leatherworker', group: 'doh' },
  13: { abbr: 'WVR', name: 'Weaver',        group: 'doh' },
  14: { abbr: 'ALC', name: 'Alchemist',     group: 'doh' },
  15: { abbr: 'CUL', name: 'Culinarian',    group: 'doh' },
  16: { abbr: 'MIN', name: 'Miner',         group: 'dol' },
  17: { abbr: 'BTN', name: 'Botanist',      group: 'dol' },
  18: { abbr: 'FSH', name: 'Fisher',        group: 'dol' },
  19: { abbr: 'PLD', name: 'Paladin',       group: 'combat' },
  20: { abbr: 'MNK', name: 'Monk',          group: 'combat' },
  21: { abbr: 'WAR', name: 'Warrior',       group: 'combat' },
  22: { abbr: 'DRG', name: 'Dragoon',       group: 'combat' },
  23: { abbr: 'BRD', name: 'Bard',          group: 'combat' },
  24: { abbr: 'WHM', name: 'White Mage',    group: 'combat' },
  25: { abbr: 'BLM', name: 'Black Mage',    group: 'combat' },
  26: { abbr: 'SMN', name: 'Summoner',      group: 'combat' },
  27: { abbr: 'SCH', name: 'Scholar',       group: 'combat' },
  28: { abbr: 'NIN', name: 'Ninja',         group: 'combat' },
  29: { abbr: 'MCH', name: 'Machinist',     group: 'combat' },
  30: { abbr: 'DRK', name: 'Dark Knight',   group: 'combat' },
  31: { abbr: 'AST', name: 'Astrologian',   group: 'combat' },
  32: { abbr: 'SAM', name: 'Samurai',       group: 'combat' },
  33: { abbr: 'RDM', name: 'Red Mage',      group: 'combat' },
  34: { abbr: 'BLU', name: 'Blue Mage',     group: 'combat' },
  35: { abbr: 'GNB', name: 'Gunbreaker',    group: 'combat' },
  36: { abbr: 'DNC', name: 'Dancer',        group: 'combat' },
  37: { abbr: 'RPR', name: 'Reaper',        group: 'combat' },
  38: { abbr: 'SGE', name: 'Sage',          group: 'combat' },
  39: { abbr: 'VPR', name: 'Viper',         group: 'combat' },
  40: { abbr: 'PCT', name: 'Pictomancer',   group: 'combat' },
};

export const DOH_JOB_IDS    = [8, 9, 10, 11, 12, 13, 14, 15];
export const DOL_JOB_IDS    = [16, 17, 18];
export const COMBAT_JOB_IDS = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];

export const STATS_BY_GROUP = {
  doh: ['CP', 'Craftsmanship', 'Control'],
  dol: ['GP', 'Gathering', 'Perception'],
  combat: [
    'Strength', 'Dexterity', 'Mind', 'Intelligence', 'Vitality',
    'CriticalHit', 'DirectHitRate', 'Determination',
    'SkillSpeed', 'SpellSpeed', 'Tenacity', 'Piety',
  ],
};

export const GEAR_TYPES = [
  'Ring', 'Earring', 'Necklace', 'Bracelet',
  'Head', 'Body', 'Hands', 'Legs', 'Feet',
  'MainHand', 'OffHand',
];

export const LEVEL_RANGE_RADIUS = 5;
