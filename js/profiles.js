// js/profiles.js — multi-character + Teamcraft persistence (localStorage, same origin only)

const STORAGE_KEY = 'gf_profiles_v1';

/**
 * @typedef {{
 *   lodestoneId: string,
 *   name: string,
 *   server: string,
 *   portrait: string | null,
 *   jobs: Record<string, { level: number }>,
 *   teamcraftUid: string | null,
 *   teamcraftProfileUrl: string | null,
 *   masterStars?: Record<string, number>,
 *   finderIncludeGc?: boolean,
 *   finderIncludeTomestones?: boolean,
 *   finderIncludeScrips?: boolean,
 *   finderIncludeMasterCrafts?: boolean,
 *   upgradeIncludeGc?: boolean,
 *   upgradeIncludeTomestones?: boolean,
 *   upgradeIncludeScrips?: boolean,
 *   upgradeIncludeMasterCrafts?: boolean,
 *   upgradeSourceMode?: 'bestOverall' | 'craft',
 * }} StoredProfile
 */

function defaultStore() {
  return { version: 1, activeLodestoneId: null, profiles: /** @type {Record<string, StoredProfile>} */ ({}) };
}

export function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const o = JSON.parse(raw);
    if (!o || typeof o.profiles !== 'object' || o.profiles === null) return defaultStore();
    return { version: 1, activeLodestoneId: o.activeLodestoneId ?? null, profiles: o.profiles };
  } catch {
    return defaultStore();
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} lodestoneId
 * @param {{ name: string, server: string, portrait: string | null, jobs: Record<string, { level: number }> }} data
 */
export function upsertProfileFromImport(lodestoneId, data) {
  const s = readStore();
  const id = String(lodestoneId);
  const prev = s.profiles[id];
  s.profiles[id] = {
    lodestoneId: id,
    name: data.name,
    server: data.server,
    portrait: data.portrait,
    jobs: data.jobs,
    teamcraftUid: prev?.teamcraftUid ?? null,
    teamcraftProfileUrl: prev?.teamcraftProfileUrl ?? null,
    masterStars: prev?.masterStars && typeof prev.masterStars === 'object' ? { ...prev.masterStars } : {},
    finderIncludeGc: prev?.finderIncludeGc !== false,
    finderIncludeTomestones: prev?.finderIncludeTomestones !== false,
    finderIncludeScrips: prev?.finderIncludeScrips !== false,
    finderIncludeMasterCrafts: prev?.finderIncludeMasterCrafts !== false,
    upgradeIncludeGc: prev?.upgradeIncludeGc !== false,
    upgradeIncludeTomestones: prev?.upgradeIncludeTomestones !== false,
    upgradeIncludeScrips: prev?.upgradeIncludeScrips !== false,
    upgradeIncludeMasterCrafts: prev?.upgradeIncludeMasterCrafts !== false,
    upgradeSourceMode:
      prev?.upgradeSourceMode === 'craft' || prev?.upgradeSourceMode === 'bestOverall'
        ? prev.upgradeSourceMode
        : 'bestOverall',
  };
  s.activeLodestoneId = id;
  writeStore(s);
}

/**
 * @param {string} lodestoneId
 * @param {string} uid
 * @param {string} [profileUrlInput]
 */
export function patchTeamcraftForProfile(lodestoneId, uid, profileUrlInput) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  p.teamcraftUid = uid;
  if (profileUrlInput != null) p.teamcraftProfileUrl = profileUrlInput;
  writeStore(s);
}

/**
 * Merge master-star tiers (0…4 per DoH job id key) into the saved profile.
 * @param {string} lodestoneId
 * @param {Record<string, number>} partial — job id string → stars
 */
export function patchMasterStarsForProfile(lodestoneId, partial) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  if (!p.masterStars || typeof p.masterStars !== 'object') p.masterStars = {};
  for (const [k, v] of Object.entries(partial)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      delete p.masterStars[k];
    } else {
      p.masterStars[k] = Math.min(4, Math.max(1, Math.floor(n)));
    }
  }
  writeStore(s);
}

/** Replace all master-star entries for a profile (used when saving the full editor). */
export function setMasterStarsForProfile(lodestoneId, masterStars) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  const next = {};
  if (masterStars && typeof masterStars === 'object') {
    for (const [k, v] of Object.entries(masterStars)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) next[k] = Math.min(4, Math.floor(n));
    }
  }
  p.masterStars = next;
  writeStore(s);
}

/**
 * Persist Gear Finder / Upgrades “include” toggles for a character (saved with profile).
 * @param {string} lodestoneId
 * @param {{
 *   finderIncludeGc: boolean,
 *   finderIncludeTomestones: boolean,
 *   finderIncludeScrips: boolean,
 *   finderIncludeMasterCrafts: boolean,
 *   upgradeIncludeGc: boolean,
 *   upgradeIncludeTomestones: boolean,
 *   upgradeIncludeScrips: boolean,
 *   upgradeIncludeMasterCrafts: boolean,
 * }} toggles
 */
export function setIncludeTogglesForProfile(lodestoneId, toggles) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  p.finderIncludeGc = Boolean(toggles.finderIncludeGc);
  p.finderIncludeTomestones = Boolean(toggles.finderIncludeTomestones);
  p.finderIncludeScrips = Boolean(toggles.finderIncludeScrips);
  p.finderIncludeMasterCrafts = Boolean(toggles.finderIncludeMasterCrafts);
  p.upgradeIncludeGc = Boolean(toggles.upgradeIncludeGc);
  p.upgradeIncludeTomestones = Boolean(toggles.upgradeIncludeTomestones);
  p.upgradeIncludeScrips = Boolean(toggles.upgradeIncludeScrips);
  p.upgradeIncludeMasterCrafts = Boolean(toggles.upgradeIncludeMasterCrafts);
  writeStore(s);
}

/**
 * @param {string} lodestoneId
 * @param {'bestOverall'|'craft'} mode
 */
export function setUpgradeSourceModeForProfile(lodestoneId, mode) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  p.upgradeSourceMode = mode === 'craft' ? 'craft' : 'bestOverall';
  writeStore(s);
}

export function getActiveLodestoneId() {
  return readStore().activeLodestoneId;
}

/** @returns {StoredProfile | null} */
export function getActiveProfile() {
  const s = readStore();
  const id = s.activeLodestoneId;
  if (!id) return null;
  return s.profiles[id] ?? null;
}

/** @returns {StoredProfile[]} */
export function listProfilesSorted() {
  const s = readStore();
  return Object.values(s.profiles).sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
}

/**
 * @param {string} lodestoneId
 * @returns {string | null} new active id, or null if none left
 */
export function removeProfile(lodestoneId) {
  const s = readStore();
  const id = String(lodestoneId);
  delete s.profiles[id];
  if (s.activeLodestoneId === id) {
    const keys = Object.keys(s.profiles);
    s.activeLodestoneId = keys[0] ?? null;
  }
  writeStore(s);
  return s.activeLodestoneId;
}

export function setActiveLodestoneId(lodestoneId) {
  const s = readStore();
  const id = String(lodestoneId);
  if (!s.profiles[id]) return false;
  s.activeLodestoneId = id;
  writeStore(s);
  return true;
}

/**
 * Update stored job levels for a profile without changing which profile is active.
 * Safe for background refresh on page load/focus.
 * @param {string} lodestoneId
 * @param {Record<string, { level: number }>} jobs
 */
export function setJobsForProfile(lodestoneId, jobs) {
  const s = readStore();
  const id = String(lodestoneId);
  const p = s.profiles[id];
  if (!p) return;
  p.jobs = jobs ?? {};
  writeStore(s);
}
