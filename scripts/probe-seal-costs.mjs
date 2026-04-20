/** List high seal (20/21/22) costs in SpecialShop to validate CC1 vs IC0. */
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

const text = await fetch(
  'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv/en/SpecialShop.csv'
).then(r => r.text());
const lines = text.split(/\r?\n/).filter(Boolean);
const h = parseLine(lines[0]);
const idx = n => h.indexOf(n);

const samples = [];
for (let L = 1; L < lines.length; L++) {
  const r = parseLine(lines[L]);
  for (let slot = 0; slot < 60; slot++) {
    const cc0 = idx(`Item[${slot}].CurrencyCost[0]`);
    const cc1 = idx(`Item[${slot}].CurrencyCost[1]`);
    const ic0 = idx(`Item[${slot}].ItemCost[0]`);
    const ii = idx(`Item[${slot}].Item[0]`);
    if (cc0 < 0 || ii < 0) break;
    const c0 = r[cc0];
    if (c0 !== '20' && c0 !== '21' && c0 !== '22') continue;
    const v1 = Number(r[cc1]) || 0;
    const v0 = Number(r[ic0]) || 0;
    const item = r[ii];
    if (v0 >= 5000 && v0 <= 15000 && v1 === 0) {
      samples.push({
        line: L + 1,
        shop: (r[1] ?? '').slice(0, 50),
        slot,
        item,
        CC1: v1,
        IC0: v0,
      });
    }
  }
}
samples.sort((a, b) => Math.max(b.CC1, b.IC0) - Math.max(a.CC1, a.IC0));
console.log(JSON.stringify(samples.slice(0, 25), null, 2));
