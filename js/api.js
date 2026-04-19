// js/api.js
import { CLASSJOB_NAME_TO_ID } from './constants.js';

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

function fsVal(v) {
  if (!v) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue'  in v) return v.doubleValue;
  if ('stringValue'  in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue'    in v) return null;
  if ('arrayValue'   in v) return (v.arrayValue.values ?? []).map(fsVal);
  if ('mapValue'     in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields ?? {})) out[k] = fsVal(val);
    return out;
  }
  return null;
}

export function extractTeamcraftUid(url) {
  const match = url.match(/ffxivteamcraft\.com\/profile\/([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

export async function fetchByTeamcraftUID(uid) {
  const res = await fetch(FIRESTORE + '/users/' + uid);
  if (!res.ok) throw new Error('Teamcraft profile not found. Check the URL is correct.');
  const doc = await res.json();

  const fields = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) fields[k] = fsVal(v);

  const lodestoneId = fields.defaultLodestoneId;
  if (!lodestoneId) throw new Error('No character linked to this Teamcraft profile.');

  const entry = (fields.lodestoneIds ?? []).find(e => String(e.id) === String(lodestoneId))
             ?? fields.lodestoneIds?.[0];
  const stats = entry?.stats ?? [];

  const jobs = {};
  for (const s of (stats ?? [])) {
    if (s?.jobId && s?.level) jobs[s.jobId] = { level: s.level };
  }

  const charRes = await fetch(LODESTONE + '/Character/' + lodestoneId);
  const charData = charRes.ok ? await charRes.json() : {};

  if (Object.keys(jobs).length === 0) {
    return fetchCharacterJobs(lodestoneId);
  }

  return {
    name:   escapeHtml(charData.Character?.Name  ?? 'Unknown'),
    server: escapeHtml(charData.Character?.World ?? ''),
    jobs,
  };
}

export async function searchCharacter(name, server) {
  let url = LODESTONE + '/Character/Search?name=' + encodeURIComponent(name);
  if (server) url += '&server=' + encodeURIComponent(server);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Character search failed (' + res.status + ')');
  const data = await res.json();
  return (data.List ?? []).map(c => ({
    id: c.ID,
    name: escapeHtml(c.Name),
    server: escapeHtml(c.Server ?? ''),
    avatar: c.Avatar,
  }));
}

export async function fetchCharacterJobs(characterId) {
  if (!/^\d+$/.test(String(characterId))) throw new Error('Invalid character ID');
  const res = await fetch(LODESTONE + '/Character/' + characterId + '?data=CJ');
  if (!res.ok) throw new Error('Character fetch failed (' + res.status + ')');
  const data = await res.json();
  const classJobs = data.ClassJobs ?? {};
  const jobs = {};
  for (const [name, cj] of Object.entries(classJobs)) {
    const id = CLASSJOB_NAME_TO_ID[name];
    const level = cj?.Level;
    if (id != null && level != null && level !== '-') {
      jobs[id] = { level: Number(level) };
    }
  }
  if (Object.keys(jobs).length === 0) {
    throw new Error('No job data found. The character profile may be private.');
  }
  return {
    name: escapeHtml(data.Character?.Name ?? 'Unknown'),
    server: escapeHtml(data.Character?.World ?? ''),
    jobs,
  };
}

export function extractCharacterIdFromUrl(url) {
  const match = url.match(/character\/(\d+)/);
  if (!match) throw new Error('Invalid Lodestone URL. Expected: .../character/12345678/');
  return match[1];
}

// --- localStorage cache helpers ---

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

// --- fetchItemStats (XIVAPI items only; character endpoints stay on Teamcraft Lodestone proxy above) ---

const ITEM_COLUMNS = 'ID,Name,LevelItem,LevelEquip,Stats,ItemUICategory,IsUntradable,ClassJobCategory';
const CHUNK_SIZE = 10;

export async function fetchItemStats(itemIds) {
  if (itemIds.length === 0) return {};
  const results = {};

  const uncached = [];
  for (const id of itemIds) {
    const cached = cacheGet(id);
    if (cached !== null) {
      results[id] = cached;
    } else {
      uncached.push(id);
    }
  }

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
      } catch (err) {
        console.warn('[api] Failed to fetch item', id, err?.message ?? err);
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
