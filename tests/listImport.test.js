import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemLines, resolveItems } from '../js/listImport.js';

describe('parseItemLines — Name x{qty} format', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Iron Hoplon x1');
    assert.deepEqual(result, [{ rawName: 'Iron Hoplon', qty: 1 }]);
  });
});

describe('parseItemLines — Name ×{qty} format (unicode multiply)', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Electrum Circlet ×3');
    assert.deepEqual(result, [{ rawName: 'Electrum Circlet', qty: 3 }]);
  });
});

describe('parseItemLines — Name {trailing number} format', () => {
  it('parses name and qty', () => {
    const result = parseItemLines('Iron Ingot 5');
    assert.deepEqual(result, [{ rawName: 'Iron Ingot', qty: 5 }]);
  });
});

describe('parseItemLines — bare name', () => {
  it('defaults qty to 1', () => {
    const result = parseItemLines('Iron Ore');
    assert.deepEqual(result, [{ rawName: 'Iron Ore', qty: 1 }]);
  });
});

describe('parseItemLines — qty minimum 1', () => {
  it('treats x0 as qty 1 (matches list storage)', () => {
    const result = parseItemLines('Iron Hoplon x0');
    assert.deepEqual(result, [{ rawName: 'Iron Hoplon', qty: 1 }]);
  });
});

describe('parseItemLines — skips all-caps header line', () => {
  it('returns empty array', () => {
    assert.deepEqual(parseItemLines('BLACKSMITH'), []);
  });
});

describe('parseItemLines — skips job-abbr prefix lines', () => {
  it('skips ARM20 prefix line', () => {
    assert.deepEqual(parseItemLines('ARM20Iron Hoplon'), []);
  });
  it('skips BSM with level prefix', () => {
    assert.deepEqual(parseItemLines('BSM15'), []);
  });
});

describe('parseItemLines — mixed block', () => {
  it('extracts all valid lines', () => {
    const text = [
      'BLACKSMITH',
      'ARM20',
      'Iron Hoplon x1',
      'Electrum Circlet ×3',
      'Iron Ingot 2',
      'Raw Tourmaline',
    ].join('\n');
    assert.deepEqual(parseItemLines(text), [
      { rawName: 'Iron Hoplon', qty: 1 },
      { rawName: 'Electrum Circlet', qty: 3 },
      { rawName: 'Iron Ingot', qty: 2 },
      { rawName: 'Raw Tourmaline', qty: 1 },
    ]);
  });
});

const pool = [
  { id: 1, name: 'Iron Hoplon' },
  { id: 2, name: 'Electrum Circlet' },
  { id: 3, name: 'Iron Ingot' },
  { id: 4, name: 'Iron Ore' },
];

describe('resolveItems — exact match', () => {
  it('returns status matched with correct id', () => {
    const [row] = resolveItems([{ rawName: 'Iron Hoplon', qty: 1 }], pool);
    assert.equal(row.status, 'matched');
    assert.equal(row.id, 1);
    assert.equal(row.name, 'Iron Hoplon');
  });
});

describe('resolveItems — case-insensitive exact match', () => {
  it('returns status matched', () => {
    const [row] = resolveItems([{ rawName: 'iron hoplon', qty: 1 }], pool);
    assert.equal(row.status, 'matched');
    assert.equal(row.id, 1);
  });
});

describe('resolveItems — single partial match', () => {
  it('returns status partial with correct id', () => {
    const [row] = resolveItems([{ rawName: 'Electrum', qty: 2 }], pool);
    assert.equal(row.status, 'partial');
    assert.equal(row.id, 2);
  });
});

describe('resolveItems — multiple partial matches', () => {
  it('returns status unmatched (Iron matches Iron Hoplon, Iron Ingot, Iron Ore)', () => {
    const [row] = resolveItems([{ rawName: 'Iron', qty: 1 }], pool);
    assert.equal(row.status, 'unmatched');
    assert.equal(row.id, undefined);
  });
});

describe('resolveItems — no match', () => {
  it('returns status unmatched', () => {
    const [row] = resolveItems([{ rawName: 'Foobar Widget', qty: 1 }], pool);
    assert.equal(row.status, 'unmatched');
    assert.equal(row.id, undefined);
  });
});

describe('resolveItems — duplicate rawName lines sum qty', () => {
  it('merges same name (case-insensitive) into one matched row', () => {
    const [row] = resolveItems(
      [
        { rawName: 'Iron Ingot', qty: 2 },
        { rawName: 'iron ingot', qty: 3 },
      ],
      pool,
    );
    assert.equal(row.status, 'matched');
    assert.equal(row.id, 3);
    assert.equal(row.qty, 5);
  });
});

describe('resolveItems — duplicate display names in craft pool', () => {
  it('returns unmatched when two pool rows share the same name', () => {
    const dupPool = [
      { id: 10, name: 'Twin Brand' },
      { id: 11, name: 'Twin Brand' },
    ];
    const [row] = resolveItems([{ rawName: 'Twin Brand', qty: 1 }], dupPool);
    assert.equal(row.status, 'unmatched');
    assert.equal(row.id, undefined);
  });

  it('sums qty for duplicate input lines even when pool name is unique', () => {
    const [row] = resolveItems(
      [
        { rawName: 'Iron Hoplon', qty: 1 },
        { rawName: 'Iron Hoplon', qty: 4 },
      ],
      pool,
    );
    assert.equal(row.status, 'matched');
    assert.equal(row.qty, 5);
    assert.equal(row.id, 1);
  });
});
