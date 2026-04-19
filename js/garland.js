const GARLAND_BASE = 'https://www.garlandtools.org/db/doc/item/en/3/';
const GT_TTL = 7 * 24 * 60 * 60 * 1000;

export function parseGarlandDoc(doc) {
  const item = doc.item ?? {};
  const partials = doc.partials ?? [];
  const partialMap = {};
  for (const p of partials) {
    const name = p.obj?.n ?? String(p.id);
    partialMap[String(p.id)] = name;
  }

  const resolve = id => partialMap[String(id)] ?? String(id);

  return {
    tradeable: item.tradeable ?? 0,
    craft:     item.craft ?? [],
    vendors:   (item.vendors ?? []).map(resolve),
    quests:    (item.quests ?? []).map(resolve),
    drops:     (item.drops ?? []).map(resolve),
    gc:        item.gc ?? null,
  };
}

function getCached(id) {
  try {
    const raw = localStorage.getItem('gt_item_' + id);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > GT_TTL) { localStorage.removeItem('gt_item_' + id); return null; }
    return data;
  } catch { return null; }
}

function setCached(id, data) {
  try { localStorage.setItem('gt_item_' + id, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export async function fetchItemAcquisition(itemId) {
  const cached = getCached(itemId);
  if (cached) return cached;
  try {
    const res = await fetch(GARLAND_BASE + itemId + '.json');
    if (!res.ok) return null;
    const doc = await res.json();
    const data = parseGarlandDoc(doc);
    setCached(itemId, data);
    return data;
  } catch { return null; }
}
