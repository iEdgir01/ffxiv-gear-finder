const GC = new Set([20, 21, 22]);
async function hasGc(id) {
  const r = await fetch(`https://www.garlandtools.org/db/doc/item/en/3/${id}.json`);
  if (!r.ok) return null;
  const d = await r.json();
  const it = d.item;
  const tc = it?.tradeCurrency;
  const ts = it?.tradeShops;
  const walk = (node) => {
    if (!node) return false;
    const s = JSON.stringify(node);
    for (const c of GC) {
      if (s.includes(`"id":${c}`) || s.includes(`"id":"${c}"`)) return true;
    }
    return false;
  };
  return { id, gc: it?.gc, tradeCurrency: walk(tc), tradeShops: walk(ts), sample: tc?.[0] ?? ts?.[0] };
}

async function main() {
  for (let id = 1000; id < 40000; id += 500) {
    const x = await hasGc(id);
    if (x && (x.tradeCurrency || x.tradeShops || x.gc != null)) {
      console.log(JSON.stringify(x, null, 2));
      break;
    }
  }
}
main();
