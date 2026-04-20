// GC seal currency IDs: 20=Storm, 21=Serpent, 22=Flame
const GC_SEAL_IDS = new Set([20, 21, 22]);

export function parseGarlandDoc(doc) {
  const item = doc.item ?? {};
  const partials = doc.partials ?? [];
  const partialMap = {};
  for (const p of partials) {
    const name = p.obj?.n ?? String(p.id);
    partialMap[String(p.id)] = name;
  }

  const resolve = id => partialMap[String(id)] ?? String(id);

  // GC items appear in tradeShops (currency IDs 20/21/22), not item.gc
  const tradeShops = item.tradeShops ?? [];
  const hasGcTrade = tradeShops.some(shop => {
    if ((shop.currency ?? []).some(c => GC_SEAL_IDS.has(Number(c.id)))) return true;
    return (shop.listings ?? []).some(l =>
      (l.currency ?? []).some(c => GC_SEAL_IDS.has(Number(c.id)))
    );
  });
  const gc = item.gc != null ? item.gc : (hasGcTrade ? true : null);

  return {
    tradeable: item.tradeable ?? 0,
    craft:     item.craft ?? [],
    vendors:   (item.vendors ?? []).map(resolve),
    quests:    (item.quests ?? []).map(resolve),
    drops:     (item.drops ?? []).map(resolve),
    gc,
  };
}

/**
 * Craft vs buy: craftable if any recipe exists; buy if not craftable but obtainable (vendor / GC / MB).
 */
export function classifyAcquisition(acq) {
  if (!acq) return { craftable: false, buyable: false, unknown: true };
  const craftable = Array.isArray(acq.craft) && acq.craft.length > 0;
  const tradeOk = acq.tradeable === 1 || acq.tradeable === true;
  const hasVendor = (acq.vendors?.length ?? 0) > 0;
  const buyable =
    !craftable &&
    (hasVendor || acq.gc != null || tradeOk);
  return { craftable, buyable, unknown: false };
}

/**
 * True when the item is obtainable from Grand Company seals but has no craft recipe and
 * no vendor/MB path in Garland — matches "hide GC gear" in external tools. If Garland
 * data is missing, returns false (do not hide the row).
 */
export function isGcExclusiveAcquisition(acq) {
  if (!acq) return false;
  if (Array.isArray(acq.craft) && acq.craft.length > 0) return false;
  const tradeOk = acq.tradeable === 1 || acq.tradeable === true;
  if (tradeOk) return false;
  if ((acq.vendors?.length ?? 0) > 0) return false;
  return acq.gc != null;
}

export function syntheticAcqFromItem(item) {
  if (!item) return undefined;
  if (item.gcInfo || item.tomestoneInfo || item.scripInfo || item.recipeLevel != null) return null;
  return undefined;
}
