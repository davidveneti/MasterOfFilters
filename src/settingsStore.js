import { DEFAULT_GLOBALS } from './config.js';

const PREFIX = 'ar-settings-v2:';
const GLOBAL_KEY = 'ar-globals-v2';
export const LAST_FILTER_KEY = 'ar-last-filter-v1';

export function defaultsFromSchema(schema) {
  const d = {};
  for (const def of schema) d[def.key] = def.default;
  return d;
}

function mergeSaved(target, key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    for (const k in target) if (k in saved && typeof saved[k] === typeof target[k]) target[k] = saved[k];
  } catch { /* storage unavailable: use defaults */ }
  return target;
}

function save(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch { /* ignore */ }
}

export const loadFilterSettings = (id, schema) => mergeSaved(defaultsFromSchema(schema), PREFIX + id);
export const saveFilterSettings = (id, obj) => save(PREFIX + id, obj);
export const loadGlobals = () => mergeSaved({ ...DEFAULT_GLOBALS }, GLOBAL_KEY);
export const saveGlobals = (obj) => save(GLOBAL_KEY, obj);
