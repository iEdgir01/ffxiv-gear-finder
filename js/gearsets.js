import { FIRESTORE } from './api.js';
import { JOB_IDS, CLASSJOB_NAME_TO_ID } from './constants.js';

/** Abbreviation (CRP, BSM, …) → ClassJob id */
const ABBR_TO_ID = {};
for (const [idStr, info] of Object.entries(JOB_IDS)) {
  const id = Number(idStr);
  if (info?.abbr) ABBR_TO_ID[info.abbr.toUpperCase()] = id;
}

function normalizeNameKey(s) {
  return String(s).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Resolve Teamcraft / Firestore job field to our ClassJob id (8–40), or null.
 * Handles numeric ids, abbreviations, and English job names.
 */
export function resolveGearsetJobId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && raw !== null) {
    return resolveGearsetJobId(raw.id ?? raw.jobId ?? raw.classJobId ?? raw.name ?? raw.abbr);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return JOB_IDS[raw] ? raw : null;
  }
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return JOB_IDS[n] ? n : null;
  }
  if (/^[A-Za-z]{2,4}$/.test(s)) {
    const id = ABBR_TO_ID[s.toUpperCase()];
    if (id != null) return id;
  }
  const norm = normalizeNameKey(s);
  for (const [name, id] of Object.entries(CLASSJOB_NAME_TO_ID)) {
    if (normalizeNameKey(name) === norm) return id;
  }
  return null;
}

// Built once at module load from JOB_IDS — maps lowercase name/abbr keywords to base-class job id.
const BASE_CLASS_NAME_TO_ID = (() => {
  const m = {};
  for (const [idStr, info] of Object.entries(JOB_IDS)) {
    if (!info.promotedJobIds) continue;
    const id = Number(idStr);
    m[info.name.toLowerCase()] = id;
    m[info.abbr.toLowerCase()] = id;
  }
  // Abbreviation variant not derivable from JOB_IDS abbr
  m['acn'] = 41;
  return m;
})();

/**
 * Decide which job tab to display for a Teamcraft gearset.
 * We prefer the *gearset name* because Teamcraft job ids can collide with XIVAPI ids (e.g. Rogue vs Machinist),
 * and users can intentionally create base-class gearsets.
 * Returns a job id from JOB_IDS (including synthetic ids like 41/42).
 */
function resolveDisplayJobId({ jobId, gearsetName }) {
  const name = String(gearsetName ?? '').trim().toLowerCase();
  if (name) {
    for (const [key, id] of Object.entries(BASE_CLASS_NAME_TO_ID)) {
      if (name.includes(key)) return id;
    }
  }
  return jobId;
}

function pickJobField(fields) {
  return (
    fields.job ??
    fields.jobId ??
    fields.classJob ??
    fields.classJobId ??
    fields.jobID ??
    fields.classjob
  );
}

function fireVal(v) {
  if (!v) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fireVal);
  if ('mapValue' in v) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields ?? {})) o[k] = fireVal(val);
    return o;
  }
  return null;
}

function slotItemId(slot) {
  if (slot == null) return null;
  if (typeof slot === 'number') return slot;
  if (typeof slot === 'object') {
    if (slot.itemId != null) return Number(slot.itemId);
    if (slot.id != null) return Number(slot.id);
  }
  return null;
}

/**
 * Legacy nested bag (older / alternate shapes).
 */
const LEGACY_SLOT_KEYS = [
  ['mainHand', 'mainHand'],
  ['offHand', 'offHand'],
  ['head', 'head'],
  ['body', 'body'],
  ['hands', 'hands'],
  ['legs', 'legs'],
  ['feet', 'feet'],
  ['necklace', 'necklace'],
  ['earrings', 'earrings'],
  ['bracelet', 'bracelet'],
  ['ring1', 'ring1'],
  ['ring2', 'ring2'],
];

/**
 * Current Teamcraft Firestore: one field per slot at document root (see gearsets collection).
 * chest → body, gloves → hands, earRings → earrings (keys expected by upgrade.js).
 */
const TEAMCRAFT_ROOT_SLOTS = [
  ['mainHand', 'mainHand'],
  ['offHand', 'offHand'],
  ['head', 'head'],
  ['chest', 'body'],
  ['gloves', 'hands'],
  ['legs', 'legs'],
  ['feet', 'feet'],
  ['earRings', 'earrings'],
  ['necklace', 'necklace'],
  ['bracelet', 'bracelet'],
  ['ring1', 'ring1'],
  ['ring2', 'ring2'],
];

function extractSlotsFromNestedItems(items) {
  const slots = {};
  if (!items || typeof items !== 'object') return slots;
  for (const [out, inn] of LEGACY_SLOT_KEYS) {
    const id = slotItemId(items[inn] ?? items[out]);
    if (id) slots[out] = id;
  }
  return slots;
}

function extractSlotsFromRootFields(fields) {
  const slots = {};
  for (const [tcKey, outKey] of TEAMCRAFT_ROOT_SLOTS) {
    const id = slotItemId(fields[tcKey]);
    if (id) slots[outKey] = id;
  }
  return slots;
}

function slotCount(slots) {
  return Object.keys(slots ?? {}).length;
}

/**
 * Fetch user's gearsets from Firestore (public read).
 * Returns Map<tabKey, { jobId, slots, name }>, where `tabKey` is `${jobId}:${abbr}`.
 */
export async function fetchGearsetsForUser(uid) {
  if (!uid) return new Map();

  const url = FIRESTORE + ':runQuery';
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'gearsets' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'authorId' },
          op: 'EQUAL',
          value: { stringValue: String(uid) },
        },
      },
      limit: 100,
    },
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return new Map();
  }

  if (!res.ok) return new Map();

  const rows = await res.json();
  const byTab = new Map();

  for (const row of rows) {
    const doc = row.document;
    if (!doc?.fields) continue;
    const fields = {};
    for (const [k, v] of Object.entries(doc.fields)) fields[k] = fireVal(v);

    const rawJob = pickJobField(fields);
    const parsedJobId = resolveGearsetJobId(rawJob);
    if (parsedJobId == null) continue;
    const gearsetName = fields.name ?? '';
    const displayJobId = resolveDisplayJobId({ jobId: parsedJobId, gearsetName });
    const info = JOB_IDS[displayJobId];
    if (!info) continue;
    const tabKey = String(displayJobId) + ':' + info.abbr;

    let slots = extractSlotsFromNestedItems(fields.items ?? fields.gear ?? fields.equipment);
    if (slotCount(slots) === 0) {
      slots = extractSlotsFromRootFields(fields);
    }

    if (slotCount(slots) === 0) continue;

    const prev = byTab.get(tabKey);
    if (prev && slotCount(prev.slots) > slotCount(slots)) continue;
    byTab.set(tabKey, { jobId: displayJobId, slots, name: gearsetName || info.name });
  }

  return byTab;
}
