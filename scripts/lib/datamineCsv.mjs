/**
 * Shared helpers for xivapi/ffxiv-datamining CSV fetches.
 * Sheets without quoted commas: simple split. Item.csv: use line-prefix regex elsewhere.
 */
export async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return await res.text();
}

export function csvLines(text) {
  return text.split(/\r?\n/).filter(Boolean);
}

/** Naive split — only for sheets that do not embed commas inside quoted fields. */
export function csvSplit(line) {
  return line.split(',');
}

export function parseSheet(text) {
  const lines = csvLines(text);
  const header = csvSplit(lines[0]);
  const rows = [];
  const byId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const r = csvSplit(lines[i]);
    const first = r[0]?.trim();
    if (/^\d+$/.test(first)) {
      const id = Number(first);
      byId.set(id, r);
      rows.push(r);
    }
  }
  return { header, rows, byId };
}

/**
 * GCScripShopItem uses composite ids like "1.0", "12.5" in the # column.
 */
export function parseCompositeSheet(text) {
  const lines = csvLines(text);
  const header = csvSplit(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const r = csvSplit(lines[i]);
    const first = r[0]?.trim();
    if (/^\d+\.\d+$/.test(first)) rows.push(r);
  }
  return { header, rows };
}

export function headerIndex(header) {
  const idx = new Map();
  for (let i = 0; i < header.length; i++) idx.set(header[i], i);
  return idx;
}

export function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
