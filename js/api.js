// js/api.js

const XIVAPI    = 'https://xivapi.com';
const LODESTONE = 'https://lodestone.ffxivteamcraft.com';
export const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/ffxivteamcraft/databases/(default)/documents';

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
  if (!/^\d+$/.test(String(characterId))) throw new Error('Invalid character ID');
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

// --- localStorage cache helpers ---

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheKey(id) {
  return 'xivapi_item_' + id;
}

function cacheGet(id) {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(id));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet(id, data) {
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore quota errors
  }
}

// --- fetchItemStats ---

const ITEM_COLUMNS = 'ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory,IsUntradable,ClassJobCategory';
const CHUNK_SIZE = 10;

export async function fetchItemStats(itemIds) {
  if (itemIds.length === 0) return {};
  const results = {};

  // Split into cached vs uncached
  const uncached = [];
  for (const id of itemIds) {
    const cached = cacheGet(id);
    if (cached !== null) {
      results[id] = cached;
    } else {
      uncached.push(id);
    }
  }

  // Fetch uncached in chunks of CHUNK_SIZE (concurrency cap)
  for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
    const chunk = uncached.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async id => {
      try {
        const url = XIVAPI + '/item/' + id + '?columns=' + ITEM_COLUMNS;
        const res = await fetch(url);
        if (!res.ok) return;
        const item = await res.json();
        const parsed = parseItemStats(item);
        cacheSet(id, parsed);
        results[id] = parsed;
      } catch {
        // skip failed items
      }
    }));
  }

  return results;
}

export function parseItemStats(item) {
  const rawStats = item.Stats ?? {};
  const stats = {};
  for (const [key, val] of Object.entries(rawStats)) {
    const value = typeof val === 'object' ? (val.NQ ?? val.Value ?? 0) : Number(val);
    if (value > 0) stats[key] = value;
  }
  return {
    id:               item.ID,
    name:             escapeHtml(item.Name ?? ''),
    ilvl:             item.LevelItem,
    equipLevel:       item.LevelEquip,
    gearType:         escapeHtml(item.ItemUICategory?.Name ?? 'Unknown'),
    isUntradable:     item.IsUntradable === 1,
    classJobCategory: item.ClassJobCategory?.Name ?? '',
    stats,
  };
}
