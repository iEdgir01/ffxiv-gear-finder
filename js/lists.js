const STORAGE_KEY = 'gf_lists_v1';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lists: [], nextId: 1 };
    return JSON.parse(raw);
  } catch {
    return { lists: [], nextId: 1 };
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function getLists() {
  return readStore().lists;
}

/** Every item id that appears in at least one list (for + / ✓ UI). */
export function getListedItemIdSet() {
  const s = new Set();
  for (const list of getLists()) {
    for (const it of list.items) {
      s.add(Number(it.itemId));
    }
  }
  return s;
}

export function createList(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('List name required');
  const store = readStore();
  const id = 'l' + store.nextId++;
  store.lists.push({ id, name: trimmed, items: [] });
  writeStore(store);
  return store.lists[store.lists.length - 1];
}

export function addItemToList(listId, entry) {
  const itemId = Number(entry.itemId);
  const name = entry.name;
  const qty = Math.max(1, Math.round(Number(entry.qty) || 1));
  const store = readStore();
  const list = store.lists.find(l => l.id === listId);
  if (!list) throw new Error('List not found');
  if (!Number.isFinite(itemId)) throw new Error('Invalid item id');
  if (list.items.some(i => Number(i.itemId) === itemId)) return list;
  list.items.push({ itemId, name: String(name ?? ''), qty });
  writeStore(store);
  return list;
}

export function removeItemFromList(listId, itemId) {
  const store = readStore();
  const list = store.lists.find(l => l.id === listId);
  if (!list) return;
  const id = Number(itemId);
  list.items = list.items.filter(i => i.itemId !== id);
  writeStore(store);
}

export function deleteList(listId) {
  const store = readStore();
  store.lists = store.lists.filter(l => l.id !== listId);
  writeStore(store);
}

/** Teamcraft web import — JSON array of { id, amount } base64 in URL path */
export function exportTeamcraftUrl(list) {
  // Format: id,null,qty;id,null,qty  (matches TeamcraftListMaker plugin format)
  const str = list.items.map(i => `${i.itemId},null,${i.qty ?? 1}`).join(';');
  return 'https://ffxivteamcraft.com/import/' + btoa(str);
}
