// js/api.js
import { CLASSJOB_NAME_TO_ID, JOB_IDS, isBaseClass } from './constants.js';
import { normalizeGearType } from './search.js';

/** Collapse Lodestone / UI spellings ("Dark Knight", "Whitemage") for lookup. */
function normalizeClassJobLabel(label) {
  return String(label ?? '')
    .trim()
    .replace(/[\s_-]+/g, '')
    .toLowerCase();
}

const NORMALIZED_CLASSJOB_LABEL_TO_ID = new Map();
for (const [label, id] of Object.entries(CLASSJOB_NAME_TO_ID)) {
  NORMALIZED_CLASSJOB_LABEL_TO_ID.set(normalizeClassJobLabel(label), id);
}

function resolveClassJobLabelToId(label) {
  if (label == null || label === '') return null;
  return NORMALIZED_CLASSJOB_LABEL_TO_ID.get(normalizeClassJobLabel(label)) ?? null;
}

/**
 * Lodestone `ClassJobs` rows from `lodestone.ffxivteamcraft.com` sometimes put `Level` on the wrong
 * job key while `Unlockstate` names the class that actually owns the level (e.g. Astrologian row
 * + Rogue unlock). Prefer Unlockstate in those cases; keep specialization rows when Unlockstate
 * is the legitimate starter for that job (e.g. Paladin + Gladiator).
 */
function pickLodestoneLevelTargetId(keyId, unlockId) {
  if (keyId == null && unlockId == null) return null;
  if (unlockId == null || unlockId === keyId) return keyId;

  // Arcanist XP often appears on Summoner/Scholar rows while Unlockstate is still Arcanist.
  if (unlockId === 41 && (keyId === 26 || keyId === 27)) return 41;

  // Row is the specialization; Unlockstate is its real starter class (level belongs on the row key).
  if (isBaseClass(unlockId)) {
    const promoted = JOB_IDS[unlockId]?.promotedJobIds;
    if (promoted?.includes(keyId)) return keyId;
  }

  return unlockId;
}

/**
 * Parse `Character?data=CJ` → `ClassJobs` into `{ [classJobId]: { level } }`.
 * Exported for unit tests.
 */
export function parseLodestoneClassJobs(classJobs) {
  const jobs = {};
  if (!classJobs || typeof classJobs !== 'object') return jobs;
  for (const [keyName, cj] of Object.entries(classJobs)) {
    if (!cj || typeof cj !== 'object') continue;
    if (keyName === 'Bozja' || keyName === 'Eureka') continue;
    const levelRaw = cj?.Level;
    if (levelRaw == null || levelRaw === '-') continue;
    const level = Number(levelRaw);
    if (!Number.isFinite(level) || level < 1) continue;

    const keyId = resolveClassJobLabelToId(keyName);
    const unlockRaw = cj?.Unlockstate;
    const unlockId =
      unlockRaw != null && unlockRaw !== '-' && String(unlockRaw).trim() !== ''
        ? resolveClassJobLabelToId(String(unlockRaw))
        : null;

    const targetId = pickLodestoneLevelTargetId(keyId, unlockId);
    if (targetId == null) continue;

    const prev = jobs[targetId]?.level ?? 0;
    if (level > prev) jobs[targetId] = { level };
  }
  return jobs;
}

const XIVAPI    = 'https://xivapi.com';
const LODESTONE = 'https://lodestone.ffxivteamcraft.com';
export const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/ffxivteamcraft/databases/(default)/documents';

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
  const s = String(url ?? '').trim();
  let m = s.match(/ffxivteamcraft\.com\/profile\/([A-Za-z0-9]+)/i);
  if (m) return m[1];
  m = s.match(/(?:^|\/)profile\/([A-Za-z0-9]+)/i);
  if (m) return m[1];
  if (/^[A-Za-z0-9]+$/.test(s) && s.length >= 16) return s;
  return null;
}

export async function fetchByTeamcraftUID(uid) {
  const res = await fetch(FIRESTORE + '/users/' + uid);
  if (!res.ok) throw new Error('Teamcraft profile not found. Check the URL is correct.');
  const doc = await res.json();

  const fields = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) fields[k] = fsVal(v);

  const lodestoneId = fields.defaultLodestoneId;
  if (!lodestoneId) throw new Error('No character linked to this Teamcraft profile.');

  // Teamcraft user docs have evolved over time; job-level stats may be stored in different places.
  // We try a few plausible shapes and pick the first array that yields jobId+level pairs.
  const entry =
    (fields.lodestoneIds ?? []).find(e => String(e.id) === String(lodestoneId)) ??
    fields.lodestoneIds?.[0] ??
    null;
  const statsCandidates = [
    entry?.stats,
    fields.stats,
    fields.jobStats,
    fields.jobs,
    fields.classJobs,
  ].filter(v => Array.isArray(v));
  const stats = statsCandidates[0] ?? [];

  const jobs = {};
  for (const s of stats) {
    const jobId = s?.jobId ?? s?.jobID ?? s?.classJobId ?? s?.classjobId ?? s?.id ?? null;
    const level = s?.level ?? s?.lvl ?? s?.Level ?? null;
    if (jobId != null && level != null) {
      const jid = Number(jobId);
      const lv = Number(level);
      if (Number.isFinite(jid) && Number.isFinite(lv) && jid > 0 && lv > 0) jobs[jid] = { level: lv };
    }
  }

  const charRes = await fetch(LODESTONE + '/Character/' + lodestoneId);
  const charData = charRes.ok ? await charRes.json() : {};

  // If Teamcraft didn't yield any job levels, do not silently fall back to Lodestone here.
  // The caller already has Lodestone levels; returning them again would mask TC parse issues.
  if (Object.keys(jobs).length === 0) throw new Error('Teamcraft job levels unavailable for this profile.');

  return {
    name:   decodeHtmlEntities(charData.Character?.Name ?? 'Unknown'),
    server: decodeHtmlEntities(charData.Character?.World ?? ''),
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
    name: decodeHtmlEntities(c.Name),
    server: decodeHtmlEntities(c.Server ?? ''),
    avatar: c.Avatar,
  }));
}

export async function fetchCharacterJobs(characterId) {
  if (!/^\d+$/.test(String(characterId))) throw new Error('Invalid character ID');
  const res = await fetch(LODESTONE + '/Character/' + characterId + '?data=CJ');
  if (!res.ok) throw new Error('Character fetch failed (' + res.status + ')');
  const data = await res.json();
  const jobs = parseLodestoneClassJobs(data.ClassJobs ?? {});
  if (Object.keys(jobs).length === 0) {
    throw new Error('No job data found. The character profile may be private.');
  }
  const ch = data.Character ?? {};
  /** Prefer Avatar/Icon (headshot) over Portrait (full-body) for small UI thumbnails. */
  const rawPortrait = ch.Avatar ?? ch.Icon ?? ch.Portrait ?? null;
  const portrait =
    typeof rawPortrait === 'string' && /^https?:\/\//i.test(rawPortrait) ? rawPortrait : null;
  return {
    name: decodeHtmlEntities(ch.Name ?? 'Unknown'),
    server: decodeHtmlEntities(ch.World ?? ''),
    jobs,
    portrait,
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
  return 'xivapi_item_2_' + id;
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

export function clearItemStatsLocalStorageCache() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('xivapi_item_2_')) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
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

export function decodeHtmlEntities(str) {
  let s = String(str ?? '');
  if (!s.includes('&')) return s;
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/&#(\d{1,7});/g, (m, n) => {
    const code = Number(n);
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
  s = s.replace(/&apos;/gi, "'");
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&gt;/g, '>');
  s = s.replace(/&lt;/g, '<');
  s = s.replace(/&amp;/g, '&');
  return s;
}

export function parseItemStats(item) {
  const rawStats = item.Stats ?? {};
  const stats = {};
  for (const [key, val] of Object.entries(rawStats)) {
    const value =
      typeof val === 'object'
        ? Math.max(
            Number(val.NQ ?? 0),
            Number(val.HQ ?? 0),
            Number(val.Value ?? 0)
          )
        : Number(val);
    if (value > 0) stats[key] = value;
  }
  const rawCat = item.ItemUICategory?.Name ?? '';
  const normalized = normalizeGearType(rawCat);
  const cjc = item.ClassJobCategory ?? {};
  const classJobAbbrs = Object.entries(cjc)
    .filter(([k, v]) => v === 1 && /^[A-Z]{2,4}$/.test(k))
    .map(([k]) => k);
  return {
    id:               item.ID,
    name:             decodeHtmlEntities(item.Name ?? ''),
    ilvl:             item.LevelItem,
    equipLevel:       item.LevelEquip,
    gearTypeRaw:      rawCat,
    gearType:         normalized || rawCat,
    isUntradable:     item.IsUntradable === 1,
    classJobCategory: cjc.Name ?? '',
    classJobAbbrs,
    stats,
  };
}
