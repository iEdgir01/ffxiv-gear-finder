/** Find SpecialShop rows that list a reward item id. */
const parseLine = line => {
  const o = [];
  let c = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === ',' && !q) {
      o.push(c);
      c = '';
    } else c += ch;
  }
  o.push(c);
  return o;
};

const dumpLine = process.argv[2] === '--dump-line' ? Number(process.argv[3]) : null;
const id = dumpLine ? null : (process.argv[2] ?? '10053');
const text = await fetch(
  'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/SpecialShop.csv'
).then(r => r.text());
const lines = text.split(/\r?\n/).filter(Boolean);
const h = parseLine(lines[0]);
const idx = n => h.indexOf(n);

for (let L = 1; L < lines.length; L++) {
  const r = parseLine(lines[L]);
  if (dumpLine && L + 1 === dumpLine) {
    console.log('DUMP line', L + 1, r[1]);
    for (let slot = 0; slot < 20; slot++) {
      const ii = idx(`Item[${slot}].Item[0]`);
      if (ii < 0) break;
      const item = r[ii];
      if (!item || item === '0') continue;
      console.log(
        ' slot',
        slot,
        'item',
        item,
        'CC',
        r[idx(`Item[${slot}].CurrencyCost[0]`)],
        r[idx(`Item[${slot}].CurrencyCost[1]`)],
        'IC',
        r[idx(`Item[${slot}].ItemCost[0]`)]
      );
    }
    process.exit(0);
  }
  for (let slot = 0; slot < 60; slot++) {
    const ii = idx(`Item[${slot}].Item[0]`);
    if (ii < 0) break;
    if (String(r[ii]) !== String(id)) continue;
    const cc0 = idx(`Item[${slot}].CurrencyCost[0]`);
    const cc1 = idx(`Item[${slot}].CurrencyCost[1]`);
    const ic0 = idx(`Item[${slot}].ItemCost[0]`);
    console.log(
      JSON.stringify({
        line: L + 1,
        shop: r[1],
        slot,
        CurrencyCost: [r[cc0], r[cc1], r[idx(`Item[${slot}].CurrencyCost[2]`)]],
        ItemCost: [r[ic0], r[idx(`Item[${slot}].ItemCost[1]`)]],
      })
    );
  }
}
