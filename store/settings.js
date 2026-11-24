// FeatherMark — settings store: one flat JSON file at ~/.feathermark/settings.json.
// No database. Atomic writes; corrupt file is backed up and reset, never silently lost.

const path = require('path');
const os = require('os');
const fs = require('fs');

const DIR = path.join(os.homedir(), '.feathermark');
const FILE = path.join(DIR, 'settings.json');

const RECENT_MAX = 15;

let cache = null;
let recoveryNotice = null; // set once per run when a corrupt file was reset

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    cache = {};
    if (err.code !== 'ENOENT') {
      // Corrupt settings: keep the evidence, start clean, tell the user how it was recovered.
      const backup = FILE + '.corrupt-' + Date.now();
      try {
        fs.copyFileSync(FILE, backup);
        recoveryNotice = { backupPath: backup };
      } catch (_) {
        recoveryNotice = { backupPath: null };
      }
    }
  }
  return cache;
}

function persist() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, FILE); // atomic on same volume
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      try {
        fs.copyFileSync(tmp, FILE);
        fs.unlinkSync(tmp);
        return;
      } catch (_) {}
    }
    throw err;
  }
}

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

function write(key, value) {
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
}

module.exports = {
  FILE,

  get(key, fallback) {
    const data = load();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
  },

  set(key, value) {
    return write(key, value);
  },

  // ---- Recent files: MRU, max 15, deduped by absolute path ----

  getRecent() {
    const list = load().recentFiles;
    return Array.isArray(list) ? list : [];
  },

  addRecent(filePath) {
    const list = module.exports.getRecent().filter((p) => p !== filePath);
    list.unshift(filePath);
    write('recentFiles', list.slice(0, RECENT_MAX));
    return list;
  },

  removeRecent(filePath) {
    const list = module.exports.getRecent().filter((p) => p !== filePath);
    write('recentFiles', list);
    return list;
  },

  // ---- Session snapshot: open tabs + cursor/scroll per tab, restored on launch ----

  getSession() {
    const s = load().session;
    return s && Array.isArray(s.tabs) ? s : null;
  },

  setSession(snapshot) {
    return write('session', snapshot);
  },

  clearSession() {
    return write('session', null);
  },

  // One-shot: reported once per run, then cleared so the notice doesn't linger.
  takeRecoveryNotice() {
    load();
    const n = recoveryNotice;
    recoveryNotice = null;
    return n;
  },
};
