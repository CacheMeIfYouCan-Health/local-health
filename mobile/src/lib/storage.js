import AsyncStorage from '@react-native-async-storage/async-storage';

export async function list(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function save(key, items) {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function add(key, item) {
  const items = await list(key);
  items.unshift({ ...item, id: item.id ?? `${Date.now()}` });
  await save(key, items);
  return items;
}

export async function update(key, id, patch) {
  const items = await list(key);
  const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  await save(key, next);
  return next;
}

export async function remove(key, id) {
  const items = await list(key);
  const next = items.filter((i) => i.id !== id);
  await save(key, next);
  return next;
}