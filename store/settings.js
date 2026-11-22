// FeatherDown — settings store: one flat JSON file at ~/.featherdown/settings.json.
// No database. Atomic writes; corrupt file is backed up and reset, never silently lost.

const path = require('path');
const os = require('os');
const fs = require('fs');

const DIR = path.join(os.homedir(), '.featherdown');
const FILE = path.join(DIR, 'settings.json');

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    cache = {};
    if (err.code !== 'ENOENT') {
      // Corrupt settings: keep the evidence, start clean.
      try { fs.copyFileSync(FILE, FILE + '.corrupt-' + Date.now()); } catch (_) {}
    }
  }
  return cache;
}

function persist() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, FILE); // atomic on same volume
}

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

module.exports = {
  get(key, fallback) {
    const data = load();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
  },

  set(key, value) {
    ensureDir();
    load();
    cache[key] = value;
    try {
      persist();
      return true;
    } catch (err) {
      console.error('settings write failed:', err.message);
      return false;
    }
  },
};
