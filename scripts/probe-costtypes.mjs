import fs from 'node:fs';

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

function rowSample(lineNo, slot) {
  const r = parseLine(lines[lineNo - 1]);
  const s = slot;
  console.log(
    lines[lineNo - 1].split(',')[1],
    'CostType',
    r[idx(`Item[${s}].CostType[0]`)],
    r[idx(`Item[${s}].CostType[1]`)],
    'CC',
    r[idx(`Item[${s}].CurrencyCost[0]`)],
    r[idx(`Item[${s}].CurrencyCost[1]`)],
    'IC',
    r[idx(`Item[${s}].ItemCost[0]`)],
    r[idx(`Item[${s}].ItemCost[1]`)]
  );
}

rowSample(33, 26); // Allied Seals
// Neo-Ishgardian Accessories — find line
for (let L = 1; L < lines.length; L++) {
  if (parseLine(lines[L])[1]?.includes('Neo-Ishgardian Equipment (Accessories)')) {
    console.log('Neo line', L + 1);
    rowSample(L + 1, 0);
    break;
  }
}
