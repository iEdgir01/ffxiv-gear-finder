import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOB_IDS, DOH_JOB_IDS, DOL_JOB_IDS, DOW_JOB_IDS, DOM_JOB_IDS,
  STATS_BY_GROUP, CLASSJOB_CATEGORY_TO_JOBS, PRIMARY_STAT_BY_JOB,
  isBaseClass,
} from '../js/constants.js';

describe('DOW_JOB_IDS', () => {
  it('contains PLD, MNK, WAR, DRG, BRD, NIN, MCH, DRK, SAM, GNB, DNC, RPR, VPR', () => {
    for (const id of [19, 20, 21, 22, 23, 28, 29, 30, 32, 35, 36, 37, 39]) {
      assert.ok(DOW_JOB_IDS.includes(id), `missing job id ${id}`);
    }
  });
  it('does not contain DoM jobs', () => {
    for (const id of [24, 25, 26, 27, 31, 33, 34, 38, 40, 41]) {
      assert.ok(!DOW_JOB_IDS.includes(id), `DoM job ${id} should not be in DOW`);
    }
  });
});

describe('DOM_JOB_IDS', () => {
  it('contains WHM, BLM, SMN, SCH, AST, RDM, BLU, SGE, PCT', () => {
    for (const id of [24, 25, 26, 27, 31, 33, 34, 38, 40, 41]) {
      assert.ok(DOM_JOB_IDS.includes(id), `missing job id ${id}`);
    }
  });
});

describe('DOW + DOM cover all combat jobs', () => {
  it('union of DOW and DOM includes all combat-role jobs', () => {
    const all = new Set([...DOW_JOB_IDS, ...DOM_JOB_IDS]);
    for (const id of [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49]) {
      assert.ok(all.has(id), `job ${id} missing from DOW+DOM`);
    }
    assert.equal(all.size, 31);
  });
});

describe('JOB_IDS groups updated', () => {
  it('PLD has group dow', () => assert.equal(JOB_IDS[19].group, 'dow'));
  it('WHM has group dom', () => assert.equal(JOB_IDS[24].group, 'dom'));
  it('MIN has group dol', () => assert.equal(JOB_IDS[16].group, 'dol'));
  it('CRP has group doh', () => assert.equal(JOB_IDS[8].group, 'doh'));
});

describe('STATS_BY_GROUP', () => {
  it('has dow key with Tenacity', () => assert.ok(STATS_BY_GROUP.dow.includes('Tenacity')));
  it('has dom key with Piety', () => assert.ok(STATS_BY_GROUP.dom.includes('Piety')));
  it('has dom key with SpellSpeed', () => assert.ok(STATS_BY_GROUP.dom.includes('SpellSpeed')));
});

describe('PRIMARY_STAT_BY_JOB', () => {
  it('covers all jobs in DOH+DOL+DOW+DOM', () => {
    const allIds = [...DOH_JOB_IDS, ...DOL_JOB_IDS, ...DOW_JOB_IDS, ...DOM_JOB_IDS];
    for (const id of allIds) {
      assert.ok(PRIMARY_STAT_BY_JOB[id], `missing primary stat for job ${id}`);
    }
  });
  it('PLD primary stat is Vitality', () => assert.equal(PRIMARY_STAT_BY_JOB[19], 'Vitality'));
  it('BRD primary stat is Dexterity', () => assert.equal(PRIMARY_STAT_BY_JOB[23], 'Dexterity'));
  it('WHM primary stat is Mind', () => assert.equal(PRIMARY_STAT_BY_JOB[24], 'Mind'));
  it('BLM primary stat is Intelligence', () => assert.equal(PRIMARY_STAT_BY_JOB[25], 'Intelligence'));
  it('CRP primary stat is Craftsmanship', () => assert.equal(PRIMARY_STAT_BY_JOB[8], 'Craftsmanship'));
  it('MIN primary stat is Gathering', () => assert.equal(PRIMARY_STAT_BY_JOB[16], 'Gathering'));
});

describe('CLASSJOB_CATEGORY_TO_JOBS', () => {
  it('Disciple of the Land maps to MIN BTN FSH', () => {
    assert.deepEqual(CLASSJOB_CATEGORY_TO_JOBS['Disciple of the Land'], ['MIN', 'BTN', 'FSH']);
  });
  it('Miner maps to [MIN]', () => {
    assert.deepEqual(CLASSJOB_CATEGORY_TO_JOBS['Miner'], ['MIN']);
  });
  it('All Classes maps to all 42 jobs', () => {
    assert.equal(CLASSJOB_CATEGORY_TO_JOBS['All Classes'].length, 42);
  });
});

describe('isBaseClass', () => {
  it('returns true for all 9 base-class ids', () => {
    for (const id of [41, 42, 43, 44, 45, 46, 47, 48, 49]) {
      assert.ok(isBaseClass(id), `isBaseClass(${id}) should be true`);
    }
  });
  it('returns false for promoted jobs', () => {
    for (const id of [19, 20, 21, 22, 23, 24, 25, 26, 27, 28]) {
      assert.ok(!isBaseClass(id), `isBaseClass(${id}) should be false`);
    }
  });
  it('returns false for DoH/DoL', () => {
    assert.ok(!isBaseClass(8));
    assert.ok(!isBaseClass(16));
  });
});

describe('promotedJobIds', () => {
  it('GLA (43) promotes to PLD (19)', () => assert.deepEqual(JOB_IDS[43].promotedJobIds, [19]));
  it('PGL (44) promotes to MNK (20)', () => assert.deepEqual(JOB_IDS[44].promotedJobIds, [20]));
  it('MRD (45) promotes to WAR (21)', () => assert.deepEqual(JOB_IDS[45].promotedJobIds, [21]));
  it('LNC (46) promotes to DRG (22)', () => assert.deepEqual(JOB_IDS[46].promotedJobIds, [22]));
  it('ARC (47) promotes to BRD (23)', () => assert.deepEqual(JOB_IDS[47].promotedJobIds, [23]));
  it('CNJ (48) promotes to WHM (24)', () => assert.deepEqual(JOB_IDS[48].promotedJobIds, [24]));
  it('THM (49) promotes to BLM (25)', () => assert.deepEqual(JOB_IDS[49].promotedJobIds, [25]));
  it('ARCA (41) promotes to SMN (26) and SCH (27)', () => assert.deepEqual(JOB_IDS[41].promotedJobIds, [26, 27]));
  it('ROG (42) promotes to NIN (28)', () => assert.deepEqual(JOB_IDS[42].promotedJobIds, [28]));
  it('PLD (19) has no promotedJobIds', () => assert.equal(JOB_IDS[19].promotedJobIds, undefined));
});
