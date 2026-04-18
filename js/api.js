// js/api.js

const XIVAPI = 'https://xivapi.com';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function searchCharacter(name, server) {
  let url = XIVAPI + '/character/search?name=' + encodeURIComponent(name);
  if (server) url += '&server=' + encodeURIComponent(server);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Character search failed (' + res.status + ')');
  const data = await res.json();
  return (data.Results ?? []).map(c => ({
    id: c.ID,
    name: escapeHtml(c.Name),
    server: escapeHtml(c.Server),
    avatar: c.Avatar,
  }));
}

export async function fetchCharacterJobs(characterId) {
  const res = await fetch(XIVAPI + '/character/' + characterId + '?data=CJ');
  if (!res.ok) throw new Error('Character fetch failed (' + res.status + ')');
  const data = await res.json();
  const classJobs = data.Character?.ClassJobs ?? data.ClassJobs ?? [];
  if (classJobs.length === 0) {
    throw new Error('No job data found. The character profile may be private.');
  }
  const jobs = {};
  for (const cj of classJobs) {
    if (cj.JobID != null && cj.Level != null) {
      jobs[cj.JobID] = { level: cj.Level };
    }
  }
  return {
    name: escapeHtml(data.Character?.Name ?? 'Unknown'),
    server: escapeHtml(data.Character?.Server ?? ''),
    jobs,
  };
}

export function extractCharacterIdFromUrl(url) {
  const match = url.match(/character\/(\d+)/);
  if (!match) throw new Error('Invalid Lodestone URL. Expected: .../character/12345678/');
  return match[1];
}

export async function fetchItemStats(itemIds) {
  if (itemIds.length === 0) return {};
  const columns = 'ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory';
  const results = {};
  const batches = [];
  for (let i = 0; i < itemIds.length; i += 100) {
    batches.push(itemIds.slice(i, i + 100));
  }
  await Promise.all(batches.map(async batch => {
    const url = XIVAPI + '/search?indexes=Item&filters=ID|=' + batch.join(',') + '&columns=' + columns;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    for (const item of (data.Results ?? [])) {
      results[item.ID] = parseItemStats(item);
    }
  }));
  return results;
}

function parseItemStats(item) {
  const rawStats = item.Stats ?? {};
  const stats = {};
  for (const [key, val] of Object.entries(rawStats)) {
    const value = typeof val === 'object' ? (val.NQ ?? val.Value ?? 0) : Number(val);
    if (value > 0) stats[key] = value;
  }
  return {
    id: item.ID,
    name: escapeHtml(item.Name ?? ''),
    ilvl: item.LevelItem,
    equipLevel: item.LevelEquip,
    gearType: escapeHtml(item.ItemUICategory?.Name ?? 'Unknown'),
    stats,
  };
}
