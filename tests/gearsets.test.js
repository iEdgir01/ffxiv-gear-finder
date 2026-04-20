import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGearsetJobId } from '../js/gearsets.js';

describe('resolveGearsetJobId', () => {
  it('maps numeric and string ids', () => {
    assert.equal(resolveGearsetJobId(8), 8);
    assert.equal(resolveGearsetJobId('9'), 9);
  });
  it('maps abbreviations', () => {
    assert.equal(resolveGearsetJobId('CRP'), 8);
    assert.equal(resolveGearsetJobId('BSM'), 9);
    assert.equal(resolveGearsetJobId('WVR'), 13);
  });
  it('maps English job names', () => {
    assert.equal(resolveGearsetJobId('Carpenter'), 8);
    assert.equal(resolveGearsetJobId('Blacksmith'), 9);
    assert.equal(resolveGearsetJobId('White Mage'), 24);
  });
  it('maps nested objects', () => {
    assert.equal(resolveGearsetJobId({ id: 10 }), 10);
    assert.equal(resolveGearsetJobId({ jobId: '12' }), 12);
  });
  it('returns null for unknown', () => {
    assert.equal(resolveGearsetJobId(null), null);
    assert.equal(resolveGearsetJobId(''), null);
    assert.equal(resolveGearsetJobId(99999), null);
    assert.equal(resolveGearsetJobId('NotAJob'), null);
  });
});
