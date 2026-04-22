import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemStats, parseLodestoneClassJobs } from '../js/api.js';

describe('parseItemStats', () => {
  it('extracts basic fields and normalizes crafter tool categories', () => {
    const raw = {
      ID: 5059, Name: "Armorer's Visor", LevelItem: 13, LevelEquip: 11,
      Stats: { Craftsmanship: { NQ: 5, HQ: 7 } },
      ItemUICategory: { Name: "Armorer's Primary Tool" },
      IsUntradable: 0,
      ClassJobCategory: { Name: 'Blacksmith' },
    };
    const r = parseItemStats(raw);
    assert.equal(r.id, 5059);
    assert.equal(r.name, "Armorer's Visor");
    assert.equal(r.ilvl, 13);
    assert.equal(r.equipLevel, 11);
    assert.equal(r.gearTypeRaw, "Armorer's Primary Tool");
    assert.equal(r.gearType, 'MainHand');
    assert.equal(r.stats.Craftsmanship, 7);
  });

  it('decodes HTML entities in item names', () => {
    const raw = {
      ID: 1,
      Name: 'Tiger&#39;s Eye',
      LevelItem: 1,
      LevelEquip: 1,
      Stats: {},
      ItemUICategory: { Name: 'Head' },
      IsUntradable: 0,
      ClassJobCategory: { Name: '' },
    };
    assert.equal(parseItemStats(raw).name, "Tiger's Eye");
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

describe('parseLodestoneClassJobs', () => {
  it('maps Arcanist unlock on Summoner row to Arcanist (41), not Summoner', () => {
    const jobs = parseLodestoneClassJobs({
      Summoner: { Level: 17, Unlockstate: 'Arcanist' },
    });
    assert.deepEqual(jobs[41], { level: 17 });
    assert.equal(jobs[26], undefined);
  });

  it('maps misaligned Astrologian row with Rogue unlock to Rogue (42)', () => {
    const jobs = parseLodestoneClassJobs({
      Astrologian: { Level: 6, Unlockstate: 'Rogue' },
    });
    assert.deepEqual(jobs[42], { level: 6 });
    assert.equal(jobs[31], undefined);
  });

  it('keeps Paladin level on Paladin when unlock is Gladiator', () => {
    const jobs = parseLodestoneClassJobs({
      Paladin: { Level: 80, Unlockstate: 'Gladiator' },
    });
    assert.deepEqual(jobs[19], { level: 80 });
    assert.equal(jobs[43], undefined);
  });

  it('merges Warrior row from real Lodestone-style payload', () => {
    const jobs = parseLodestoneClassJobs({
      Warrior: { Level: 62, Unlockstate: 'Warrior' },
    });
    assert.deepEqual(jobs[21], { level: 62 });
  });
});
