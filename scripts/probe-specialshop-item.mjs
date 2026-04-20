/**
 * One-off: find SpecialShop rows for an item id and print currency/cost columns.
 * Usage: node scripts/probe-specialshop-item.mjs 7523
 */
const id = Number(process.argv[2] || 7523);
const u = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/de/SpecialShop.csv';
const t = await (await fetch(u)).text();
const lines = t.split(/\r?\n/).filter(Boolean);
const h = lines[0].split(',');
const idx = k => h.indexOf(k);

for (let i = 1; i < lines.length; i++) {
  const r = lines[i].split(',');
  for (let j = 0; j < 60; j++) {
    const ik = idx(`Item[${j}].Item[0]`);
    if (ik < 0) break;
    if (Number(r[ik]) !== id) continue;
    console.log('shop row id', r[0], 'slot', j);
    for (let k = 0; k < 5; k++) {
      const cc = `Item[${j}].CurrencyCost[${k}]`;
      const ic = `Item[${j}].ItemCost[${k}]`;
      const ci = idx(cc);
      const ii = idx(ic);
      if (ci >= 0 && ii >= 0 && (Number(r[ci]) || Number(r[ii]))) {
        console.log(' ', cc, r[ci], ic, r[ii]);
      }
    }
    console.log('---');
  }
}
