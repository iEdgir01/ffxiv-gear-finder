import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOB_IDS, DOH_JOB_IDS, DOL_JOB_IDS, DOW_JOB_IDS, DOM_JOB_IDS, COMBAT_JOB_IDS,
  JOB_IDS_BY_GROUP, STATS_BY_GROUP, CLASSJOB_CATEGORY_TO_JOBS, PRIMARY_STAT_BY_JOB,
} from '../js/constants.js';

describe('DOW_JOB_IDS', () => {
  it('contains PLD MNK WAR DRG BRD NIN MCH DRK SAM GNB DNC RPR VPR', () => {
    for (const id of [19, 20, 21, 22, 23, 28, 29, 30, 32, 35, 36, 37, 39]) {
      assert.ok(DOW_JOB_IDS.includes(id), `missing job id ${id}`);
    }
  });
  it('does not contain DoM jobs', () => {
    for (const id of [24, 25, 26, 27, 31, 33, 34, 38, 40]) {
      assert.ok(!DOW_JOB_IDS.includes(id), `DoM job ${id} should not be in DOW`);
    }
  });
});

describe('DOM_JOB_IDS', () => {
  it('contains WHM BLM SMN SCH AST RDM BLU SGE PCT', () => {
    for (const id of [24, 25, 26, 27, 31, 33, 34, 38, 40]) {
      assert.ok(DOM_JOB_IDS.includes(id), `missing job id ${id}`);
    }
  });
});

describe('DOW + DOM cover all 22 combat-role jobs', () => {
  it('union equals all 22 jobs', () => {
    const all = new Set([...DOW_JOB_IDS, ...DOM_JOB_IDS]);
    for (const id of [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]) {
      assert.ok(all.has(id), `job ${id} missing from DOW+DOM`);
    }
    assert.equal(all.size, 22);
  });
});

describe('JOB_IDS groups updated', () => {
  it('PLD has group dow', () => assert.equal(JOB_IDS[19].group, 'dow'));
  it('WHM has group dom', () => assert.equal(JOB_IDS[24].group, 'dom'));
  it('MIN has group dol', () => assert.equal(JOB_IDS[16].group, 'dol'));
  it('CRP has group doh', () => assert.equal(JOB_IDS[8].group, 'doh'));
});

describe('JOB_IDS_BY_GROUP', () => {
  it('doh maps to DOH_JOB_IDS', () => assert.deepEqual(JOB_IDS_BY_GROUP.doh, DOH_JOB_IDS));
  it('dow maps to DOW_JOB_IDS', () => assert.deepEqual(JOB_IDS_BY_GROUP.dow, DOW_JOB_IDS));
  it('dom maps to DOM_JOB_IDS', () => assert.deepEqual(JOB_IDS_BY_GROUP.dom, DOM_JOB_IDS));
});

describe('STATS_BY_GROUP', () => {
  it('has dow key with Tenacity', () => assert.ok(STATS_BY_GROUP.dow.includes('Tenacity')));
  it('has dom key with Piety', () => assert.ok(STATS_BY_GROUP.dom.includes('Piety')));
  it('has dom key with SpellSpeed', () => assert.ok(STATS_BY_GROUP.dom.includes('SpellSpeed')));
  it('has dow key with SkillSpeed', () => assert.ok(STATS_BY_GROUP.dow.includes('SkillSpeed')));
});

describe('PRIMARY_STAT_BY_JOB', () => {
  it('covers all 33 jobs (DoH + DoL + DoW + DoM)', () => {
    const allIds = [...DOH_JOB_IDS, ...DOL_JOB_IDS, ...DOW_JOB_IDS, ...DOM_JOB_IDS];
    for (const id of allIds) {
      assert.ok(PRIMARY_STAT_BY_JOB[id], `missing primary stat for job ${id}`);
    }
  });
  it('PLD → Vitality (tank)', () => assert.equal(PRIMARY_STAT_BY_JOB[19], 'Vitality'));
  it('BRD → Dexterity (phys ranged)', () => assert.equal(PRIMARY_STAT_BY_JOB[23], 'Dexterity'));
  it('WHM → Mind (healer)', () => assert.equal(PRIMARY_STAT_BY_JOB[24], 'Mind'));
  it('BLM → Intelligence (caster)', () => assert.equal(PRIMARY_STAT_BY_JOB[25], 'Intelligence'));
  it('MNK → Strength (melee)', () => assert.equal(PRIMARY_STAT_BY_JOB[20], 'Strength'));
  it('CRP → Craftsmanship', () => assert.equal(PRIMARY_STAT_BY_JOB[8], 'Craftsmanship'));
  it('MIN → Gathering', () => assert.equal(PRIMARY_STAT_BY_JOB[16], 'Gathering'));
});

describe('CLASSJOB_CATEGORY_TO_JOBS', () => {
  it('Disciple of the Land → [MIN, BTN, FSH]', () => {
    assert.deepEqual(CLASSJOB_CATEGORY_TO_JOBS['Disciple of the Land'], ['MIN', 'BTN', 'FSH']);
  });
  it('Miner → [MIN]', () => {
    assert.deepEqual(CLASSJOB_CATEGORY_TO_JOBS['Miner'], ['MIN']);
  });
  it('All Classes → 33 jobs', () => {
    assert.equal(CLASSJOB_CATEGORY_TO_JOBS['All Classes'].length, 33);
  });
});

describe('COMBAT_JOB_IDS backward compat', () => {
  it('equals DOW_JOB_IDS + DOM_JOB_IDS union', () => {
    const expected = new Set([...DOW_JOB_IDS, ...DOM_JOB_IDS]);
    assert.deepEqual(new Set(COMBAT_JOB_IDS), expected);
  });
});
