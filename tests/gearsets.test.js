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

  // Promoted jobs (unchanged behavior)
  it('resolves "Paladin" to 19', () => assert.equal(resolveGearsetJobId('Paladin'), 19));
  it('resolves "summoner" to 26', () => assert.equal(resolveGearsetJobId('summoner'), 26));
  it('resolves "scholar" to 27', () => assert.equal(resolveGearsetJobId('scholar'), 27));
  it('resolves "ninja" to 28', () => assert.equal(resolveGearsetJobId('ninja'), 28));

  // Base classes — must resolve to their synthetic ids
  it('resolves "Arcanist" to 41', () => assert.equal(resolveGearsetJobId('Arcanist'), 41));
  it('resolves "arcana" to 41', () => assert.equal(resolveGearsetJobId('arcana'), 41));
  it('resolves "Rogue" to 42', () => assert.equal(resolveGearsetJobId('Rogue'), 42));
  it('resolves "Gladiator" to 43', () => assert.equal(resolveGearsetJobId('Gladiator'), 43));
  it('resolves "gladiator" to 43', () => assert.equal(resolveGearsetJobId('gladiator'), 43));
  it('resolves "Pugilist" to 44', () => assert.equal(resolveGearsetJobId('Pugilist'), 44));
  it('resolves "Marauder" to 45', () => assert.equal(resolveGearsetJobId('Marauder'), 45));
  it('resolves "Lancer" to 46', () => assert.equal(resolveGearsetJobId('Lancer'), 46));
  it('resolves "Archer" to 47', () => assert.equal(resolveGearsetJobId('Archer'), 47));
  it('resolves "Conjurer" to 48', () => assert.equal(resolveGearsetJobId('Conjurer'), 48));
  it('resolves "Thaumaturge" to 49', () => assert.equal(resolveGearsetJobId('Thaumaturge'), 49));

  // Unknown input
  it('returns null for unknown string', () => assert.equal(resolveGearsetJobId('Heretic'), null));
});
