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
  19: { abbr: 'PLD', name: 'Paladin',       group: 'dow' },
  20: { abbr: 'MNK', name: 'Monk',          group: 'dow' },
  21: { abbr: 'WAR', name: 'Warrior',       group: 'dow' },
  22: { abbr: 'DRG', name: 'Dragoon',       group: 'dow' },
  23: { abbr: 'BRD', name: 'Bard',          group: 'dow' },
  24: { abbr: 'WHM', name: 'White Mage',    group: 'dom' },
  25: { abbr: 'BLM', name: 'Black Mage',    group: 'dom' },
  26: { abbr: 'SMN', name: 'Summoner',      group: 'dom' },
  27: { abbr: 'SCH', name: 'Scholar',       group: 'dom' },
  28: { abbr: 'NIN', name: 'Ninja',         group: 'dow' },
  29: { abbr: 'MCH', name: 'Machinist',     group: 'dow' },
  30: { abbr: 'DRK', name: 'Dark Knight',   group: 'dow' },
  31: { abbr: 'AST', name: 'Astrologian',   group: 'dom' },
  32: { abbr: 'SAM', name: 'Samurai',       group: 'dow' },
  33: { abbr: 'RDM', name: 'Red Mage',      group: 'dom' },
  34: { abbr: 'BLU', name: 'Blue Mage',     group: 'dom' },
  35: { abbr: 'GNB', name: 'Gunbreaker',    group: 'dow' },
  36: { abbr: 'DNC', name: 'Dancer',        group: 'dow' },
  37: { abbr: 'RPR', name: 'Reaper',        group: 'dow' },
  38: { abbr: 'SGE', name: 'Sage',          group: 'dom' },
  39: { abbr: 'VPR', name: 'Viper',         group: 'dow' },
  40: { abbr: 'PCT', name: 'Pictomancer',   group: 'dom' },
};

export const DOH_JOB_IDS = [8, 9, 10, 11, 12, 13, 14, 15];
export const DOL_JOB_IDS = [16, 17, 18];
export const DOW_JOB_IDS = [19, 20, 21, 22, 23, 28, 29, 30, 32, 35, 36, 37, 39];
export const DOM_JOB_IDS = [24, 25, 26, 27, 31, 33, 34, 38, 40];
// Deprecated: use DOW_JOB_IDS / DOM_JOB_IDS. Kept for backward compatibility with ui.js/main.js until Tasks 5-6.
export const COMBAT_JOB_IDS = [...DOW_JOB_IDS, ...DOM_JOB_IDS];

export const JOB_IDS_BY_GROUP = {
  doh: DOH_JOB_IDS,
  dol: DOL_JOB_IDS,
  dow: DOW_JOB_IDS,
  dom: DOM_JOB_IDS,
};

export const STATS_BY_GROUP = {
  doh: ['CP', 'Craftsmanship', 'Control'],
  dol: ['GP', 'Gathering', 'Perception'],
  dow: ['Strength', 'Dexterity', 'Vitality', 'CriticalHit', 'Determination', 'DirectHitRate', 'SkillSpeed', 'Tenacity'],
  dom: ['Mind', 'Intelligence', 'Vitality', 'CriticalHit', 'Determination', 'DirectHitRate', 'SpellSpeed', 'Piety'],
};

export const GEAR_TYPES = [
  'Ring', 'Earring', 'Necklace', 'Bracelet',
  'Head', 'Body', 'Hands', 'Legs', 'Feet',
  'MainHand', 'OffHand',
];

export const LEVEL_RANGE_RADIUS = 5;

export const CLASSJOB_NAME_TO_ID = {
  Carpenter: 8, Blacksmith: 9, Armorer: 10, Goldsmith: 11,
  Leatherworker: 12, Weaver: 13, Alchemist: 14, Culinarian: 15,
  Miner: 16, Botanist: 17, Fisher: 18,
  Paladin: 19, Monk: 20, Warrior: 21, Dragoon: 22,
  Bard: 23, Whitemage: 24, Blackmage: 25, Summoner: 26,
  Scholar: 27, Ninja: 28, Machinist: 29, Darkknight: 30,
  Astrologian: 31, Samurai: 32, Redmage: 33, Bluemage: 34,
  Gunbreaker: 35, Dancer: 36, Reaper: 37, Sage: 38,
  Viper: 39, Pictomancer: 40,
};

export const CLASSJOB_CATEGORY_TO_JOBS = {
  'All Classes':          ['CRP','BSM','ARM','GSM','LTW','WVR','ALC','CUL','MIN','BTN','FSH','PLD','MNK','WAR','DRG','BRD','WHM','BLM','SMN','SCH','NIN','MCH','DRK','AST','SAM','RDM','BLU','GNB','DNC','RPR','SGE','VPR','PCT'],
  'Disciple of the Hand': ['CRP','BSM','ARM','GSM','LTW','WVR','ALC','CUL'],
  'Disciple of the Land': ['MIN','BTN','FSH'],
  'Disciple of War':      ['PLD','MNK','WAR','DRG','BRD','NIN','MCH','DRK','SAM','GNB','DNC','RPR','VPR'],
  'Disciple of Magic':    ['WHM','BLM','SMN','SCH','AST','RDM','BLU','SGE','PCT'],
  'Carpenter': ['CRP'], 'Blacksmith': ['BSM'], 'Armorer': ['ARM'], 'Goldsmith': ['GSM'],
  'Leatherworker': ['LTW'], 'Weaver': ['WVR'], 'Alchemist': ['ALC'], 'Culinarian': ['CUL'],
  'Miner': ['MIN'], 'Botanist': ['BTN'], 'Fisher': ['FSH'],
  'Paladin': ['PLD'], 'Monk': ['MNK'], 'Warrior': ['WAR'], 'Dragoon': ['DRG'],
  'Bard': ['BRD'], 'White Mage': ['WHM'], 'Black Mage': ['BLM'], 'Summoner': ['SMN'],
  'Scholar': ['SCH'], 'Ninja': ['NIN'], 'Machinist': ['MCH'], 'Dark Knight': ['DRK'],
  'Astrologian': ['AST'], 'Samurai': ['SAM'], 'Red Mage': ['RDM'], 'Blue Mage': ['BLU'],
  'Gunbreaker': ['GNB'], 'Dancer': ['DNC'], 'Reaper': ['RPR'], 'Sage': ['SGE'],
  'Viper': ['VPR'], 'Pictomancer': ['PCT'],
};

export const PRIMARY_STAT_BY_JOB = {
  // DoH
  8: 'Craftsmanship', 9: 'Craftsmanship', 10: 'Craftsmanship', 11: 'Craftsmanship',
  12: 'Craftsmanship', 13: 'Craftsmanship', 14: 'Craftsmanship', 15: 'Craftsmanship',
  // DoL
  16: 'Gathering', 17: 'Gathering', 18: 'Gathering',
  // Tanks (PLD/WAR/DRK/GNB)
  19: 'Vitality', 21: 'Vitality', 30: 'Vitality', 35: 'Vitality',
  // Melee DPS (MNK/DRG/NIN/SAM/RPR/VPR)
  20: 'Strength', 22: 'Strength', 28: 'Strength', 32: 'Strength', 37: 'Strength', 39: 'Strength',
  // Physical Ranged (BRD/MCH/DNC)
  23: 'Dexterity', 29: 'Dexterity', 36: 'Dexterity',
  // Healers (WHM/SCH/AST/SGE)
  24: 'Mind', 27: 'Mind', 31: 'Mind', 38: 'Mind',
  // Casters (BLM/SMN/RDM/BLU/PCT)
  25: 'Intelligence', 26: 'Intelligence', 33: 'Intelligence', 34: 'Intelligence', 40: 'Intelligence',
};

export const SERVERS_BY_DC = {
  'Aether':    ['Adamantoise','Cactuar','Faerie','Gilgamesh','Jenova','Midgardsormr','Sargatanas','Siren'],
  'Crystal':   ['Balmung','Brynhildr','Coeurl','Diabolos','Goblin','Malboro','Mateus','Zalera'],
  'Dynamis':   ['Cuchulainn','Golem','Halicarnassus','Kraken','Maduin','Marilith','Rafflesia','Seraph'],
  'Primal':    ['Behemoth','Excalibur','Exodus','Famfrit','Hyperion','Lamia','Leviathan','Ultros'],
  'Chaos':     ['Cerberus','Louisoix','Moogle','Omega','Phantom','Ragnarok','Sagittarius','Spriggan'],
  'Light':     ['Alpha','Lich','Odin','Phoenix','Raiden','Shiva','Twintania','Zodiark'],
  'Elemental': ['Aegis','Atomos','Carbuncle','Garuda','Gungnir','Kujata','Tonberry','Typhon'],
  'Gaia':      ['Alexander','Bahamut','Durandal','Fenrir','Ifrit','Ridill','Tiamat','Ultima'],
  'Mana':      ['Anima','Asura','Chocobo','Hades','Ixion','Masamune','Pandaemonium','Titan'],
  'Meteor':    ['Belias','Mandragora','Ramuh','Shinryu','Unicorn','Valefor','Yojimbo','Zeromus'],
  'Materia':   ['Bismarck','Ravana','Sephirot','Sophia','Zurvan'],
};
