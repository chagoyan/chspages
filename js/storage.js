const key = 'chs-pages:v1';
// Builds before the rename saved here; carry that data forward once.
const legacyKey = 'thursday-pages:v1';
let state = {};

try {
  let saved = localStorage.getItem(key);
  if (saved === null) {
    saved = localStorage.getItem(legacyKey);
    if (saved !== null) {
      localStorage.setItem(key, saved);
      localStorage.removeItem(legacyKey);
    }
  }
  saved = JSON.parse(saved);
  if (saved && typeof saved === 'object') state = saved;
} catch {
  // Keep the current session usable when browser storage is unavailable.
}

export function read(section, id) {
  return state[section]?.[id];
}

export function save(section, id, value) {
  state[section] = { ...state[section], [id]: value };
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
