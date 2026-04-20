import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportTeamcraftUrl } from '../js/lists.js';

describe('exportTeamcraftUrl', () => {
  it('produces the correct Teamcraft import URL format', () => {
    const list = {
      id: 'l1',
      name: 'Test',
      items: [
        { itemId: 7854, name: 'Rose Gold Ring', qty: 2 },
        { itemId: 8543, name: 'Cobalt Saw', qty: 1 },
      ],
    };
    const url = exportTeamcraftUrl(list);

    // Must use the /import/ path
    assert.ok(url.startsWith('https://ffxivteamcraft.com/import/'), 'wrong base URL');

    // Extract and decode the base64 payload
    const b64 = url.replace('https://ffxivteamcraft.com/import/', '');
    const decoded = atob(b64);

    // Format must be: id,null,qty;id,null,qty (no trailing semicolon, no JSON)
    assert.equal(decoded, '7854,null,2;8543,null,1');
  });

  it('defaults qty to 1 when missing', () => {
    const list = {
      id: 'l1', name: 'Test',
      items: [{ itemId: 1234, name: 'Item', qty: undefined }],
    };
    const url = exportTeamcraftUrl(list);
    const decoded = atob(url.replace('https://ffxivteamcraft.com/import/', ''));
    assert.equal(decoded, '1234,null,1');
  });

  it('handles a single item with no trailing semicolon', () => {
    const list = {
      id: 'l1', name: 'Test',
      items: [{ itemId: 999, name: 'X', qty: 3 }],
    };
    const url = exportTeamcraftUrl(list);
    const decoded = atob(url.replace('https://ffxivteamcraft.com/import/', ''));
    assert.equal(decoded, '999,null,3');
    assert.ok(!decoded.endsWith(';'), 'must not have trailing semicolon');
  });
});
