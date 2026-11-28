// FeatherMark — Electron main process
// Owns ALL filesystem access. Renderer talks only through preload.js (window.feathermark.*).

const { app, BrowserWindow, Menu, dialog, nativeTheme, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fsp = fs.promises;
const settings = require('./store/settings');

// Keep development/test data completely separate from installed-user data.
// Production data stays in the normal per-app directory so upgrades retain
// user state, while a source checkout cannot leak its state into an install.
const appDataFolder = app.isPackaged ? 'FeatherMark' : 'FeatherMark-Development';
const appUserData = path.join(app.getPath('appData'), appDataFolder);
app.setPath('userData', appUserData);
app.setAppUserModelId('com.feathermark.app');
settings.configure(appUserData);

const MARKDOWN_FILE_RE = /\.(md|markdown|mdown|mkdn|mkd|mdwn)$/i;
const EXPLORER_TEXT_FILE_RE = /\.(md|markdown|txt)$/i;
const hasSingleInstanceLock = app.requestSingleInstanceLock();
let pendingExternalFile = findMarkdownArgument(process.argv);
let rendererReady = false;

const THEME_BG = { light: '#F5F3ED', dark: '#20231F' }; // DESIGN_TOKENS.md --app-bg
const FILE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] },
];
const MAX_OPEN_BYTES = 10 * 1024 * 1024; // refuse anything huge before it hits the renderer
const SESSION_SNAPSHOT_DEBOUNCE = 2000;

// Stored pref ('auto'|'light'|'dark') -> nativeTheme.themeSource ('system'|'light'|'dark')
function toThemeSource(pref) {
  return pref === 'light' || pref === 'dark' ? pref : 'system';
}

let mainWindow = null;

function findMarkdownArgument(args) {
  if (!Array.isArray(args)) return null;
  for (const value of args) {
    if (typeof value !== 'string' || value.startsWith('-')) continue;
    const candidate = path.resolve(value);
    if (MARKDOWN_FILE_RE.test(candidate) && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function folderDisplayName(folderPath) {
  const normalized = folderPath.replace(/[\\/]+$/, '');
  return path.basename(normalized) || path.parse(normalized).root || normalized;
}

function folderErrorMessage(err) {
  if (!err || !err.code) return 'This folder could not be read.';
  if (err.code === 'EACCES' || err.code === 'EPERM') return 'Access denied.';
  if (err.code === 'ENOENT') return 'This folder no longer exists.';
  return 'Could not read this folder (' + err.code + ').';
}

function sortFolderEntries(a, b) {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

async function readFolderNode(directoryPath) {
  let entries;
  try {
    entries = await fsp.readdir(directoryPath, { withFileTypes: true });
  } catch (err) {
    return {
      type: 'folder',
      name: folderDisplayName(directoryPath),
      path: directoryPath,
      children: [],
      error: folderErrorMessage(err),
    };
  }

  const children = [];
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      // Directory symlinks are intentionally not followed. This keeps the
      // tree finite and prevents linked directories from creating cycles.
      children.push(await readFolderNode(entryPath));
    } else if (entry.isFile() && EXPLORER_TEXT_FILE_RE.test(entry.name)) {
      children.push({ type: 'file', name: entry.name, path: entryPath });
    }
  }

  children.sort(sortFolderEntries);
  return {
    type: 'folder',
    name: folderDisplayName(directoryPath),
    path: directoryPath,
    children,
  };
}

async function readFolderTree(folderPath) {
  if (typeof folderPath !== 'string' || folderPath.trim().length === 0) {
    return { ok: false, error: 'Choose a folder to open.' };
  }

  const resolvedPath = path.resolve(folderPath);
  let stat;
  try {
    stat = await fsp.stat(resolvedPath);
  } catch (err) {
    return { ok: false, error: 'The folder could not be opened (' + (err.code || 'unknown error') + ').' };
  }
  if (!stat.isDirectory()) return { ok: false, error: 'That path is not a folder.' };

  try {
    return { ok: true, root: await readFolderNode(resolvedPath) };
  } catch (err) {
    return { ok: false, error: 'The folder could not be scanned (' + (err.code || 'unknown error') + ').' };
  }
}

// ---- Lightweight live filesystem watching ---------------------------------
//
// Watchers are deliberately scoped to files opened in tabs and folders opened
// in the workspace. fs.watch is event-driven (no polling and no render loop),
// and each directory is watched once even when it has several subscribers.
const fileDirectoryWatchers = new Map(); // directory key -> { path, watcher, files:Set<file key> }
const watchedFiles = new Map();          // file key -> Set<tab id>
const watchedFileByTab = new Map();       // tab id -> file key
const fileWatchState = new Map();         // file key -> { path, fingerprint, exists, timer, reading, again }
const folderWatchSessions = new Map();    // folder key -> { root, watchers:Map<dir key, record>, timer }

function watchPathKey(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function contentFingerprint(text) {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStableMarkdownFile(filePath) {
  // Editors and agents sometimes write in place. Wait until the size and
  // mtime agree before reading, while keeping the retry window tiny.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let before;
    try {
      before = await fsp.stat(filePath);
    } catch (_) {
      return readMarkdownFile(filePath);
    }

    const result = await readMarkdownFile(filePath);
    if (!result.ok) return result;

    let after;
    try {
      after = await fsp.stat(filePath);
    } catch (_) {
      return result;
    }
    if (before.size === after.size && before.mtimeMs === after.mtimeMs) return result;
    await waitMs(25 * (attempt + 1));
  }
  return readMarkdownFile(filePath);
}

function emitFileChange(filePath, payload) {
  sendToRenderer('feathermark:file-changed', { path: filePath, ...payload });
}

async function flushFileChange(fileKey) {
  const state = fileWatchState.get(fileKey);
  if (!state || state.reading) {
    if (state) state.again = true;
    return;
  }

  state.reading = true;
  try {
    const result = await readStableMarkdownFile(state.path);
    if (result.ok) {
      const fingerprint = contentFingerprint(result.content);
      const changed = state.exists === false || state.fingerprint !== fingerprint;
      state.exists = true;
      state.fingerprint = fingerprint;
      if (changed) emitFileChange(state.path, { kind: 'change', content: result.content, fingerprint });
    } else if (/no longer where|not a file/i.test(result.error || '')) {
      if (state.exists !== false) emitFileChange(state.path, { kind: 'remove' });
      state.exists = false;
      state.fingerprint = null;
    } else {
      emitFileChange(state.path, { kind: 'error', error: result.error });
    }
  } finally {
    state.reading = false;
    if (state.again) {
      state.again = false;
      queueFileChange(state.path);
    }
  }
}

function queueFileChange(filePath) {
  const fileKey = watchPathKey(filePath);
  const state = fileWatchState.get(fileKey);
  if (!state) return;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    flushFileChange(fileKey);
  }, 120);
}

function ensureFileDirectoryWatcher(directoryPath) {
  const directoryKey = watchPathKey(directoryPath);
  const existing = fileDirectoryWatchers.get(directoryKey);
  if (existing) return existing;

  let watcher;
  try {
    watcher = fs.watch(directoryPath, { persistent: false }, (_eventType, filename) => {
      const record = fileDirectoryWatchers.get(directoryKey);
      if (!record) return;
      const name = filename ? String(filename) : null;
      for (const fileKey of record.files) {
        const state = fileWatchState.get(fileKey);
        if (!state) continue;
        if (!name || watchPathKey(path.join(directoryPath, name)) === fileKey) queueFileChange(state.path);
      }
    });
    watcher.on('error', () => {
      const record = fileDirectoryWatchers.get(directoryKey);
      if (record && record.watcher === watcher) fileDirectoryWatchers.delete(directoryKey);
    });
  } catch (_) {
    return null;
  }

  const record = { path: directoryPath, watcher, files: new Set() };
  fileDirectoryWatchers.set(directoryKey, record);
  return record;
}

function watchFileForTab(tabId, filePath) {
  unwatchFileForTab(tabId);
  if (!filePath) return;

  const resolved = path.resolve(filePath);
  const fileKey = watchPathKey(resolved);
  const directoryRecord = ensureFileDirectoryWatcher(path.dirname(resolved));
  if (!directoryRecord) return;
  directoryRecord.files.add(fileKey);

  if (!watchedFiles.has(fileKey)) watchedFiles.set(fileKey, new Set());
  watchedFiles.get(fileKey).add(tabId);
  watchedFileByTab.set(tabId, fileKey);
  if (!fileWatchState.has(fileKey)) {
    fileWatchState.set(fileKey, { path: resolved, fingerprint: null, exists: true, timer: null, reading: false, again: false });
  }
}

function unwatchFileForTab(tabId) {
  const fileKey = watchedFileByTab.get(tabId);
  if (!fileKey) return;
  watchedFileByTab.delete(tabId);
  const subscribers = watchedFiles.get(fileKey);
  if (subscribers) {
    subscribers.delete(tabId);
    if (subscribers.size > 0) return;
    watchedFiles.delete(fileKey);
  }

  const state = fileWatchState.get(fileKey);
  if (state) clearTimeout(state.timer);
  fileWatchState.delete(fileKey);

  for (const [directoryKey, record] of fileDirectoryWatchers) {
    record.files.delete(fileKey);
    if (record.files.size === 0) {
      record.watcher.close();
      fileDirectoryWatchers.delete(directoryKey);
    }
  }
}

function primeFileFingerprint(filePath, text) {
  const state = fileWatchState.get(watchPathKey(filePath));
  if (!state || typeof text !== 'string') return;
  state.fingerprint = contentFingerprint(text);
  state.exists = true;
}

async function collectDirectoryPaths(rootPath) {
  const directories = [];
  async function visit(directoryPath) {
    directories.push(directoryPath);
    let entries;
    try {
      entries = await fsp.readdir(directoryPath, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) await visit(path.join(directoryPath, entry.name));
    }
  }
  await visit(rootPath);
  return directories;
}

async function syncFolderWatchSession(session) {
  const directories = await collectDirectoryPaths(session.root);
  const wanted = new Set(directories.map(watchPathKey));

  for (const directoryPath of directories) {
    const directoryKey = watchPathKey(directoryPath);
    if (session.watchers.has(directoryKey)) continue;
    try {
      const watcher = fs.watch(directoryPath, { persistent: false }, () => queueFolderChange(session.root));
      watcher.on('error', () => {
        const record = session.watchers.get(directoryKey);
        if (record && record.watcher === watcher) session.watchers.delete(directoryKey);
        queueFolderChange(session.root);
      });
      session.watchers.set(directoryKey, { path: directoryPath, watcher });
    } catch (_) {
      // The next folder event or explicit refresh will retry inaccessible paths.
    }
  }

  for (const [directoryKey, record] of session.watchers) {
    if (!wanted.has(directoryKey)) {
      record.watcher.close();
      session.watchers.delete(directoryKey);
    }
  }
}

function queueFolderChange(folderPath) {
  const session = folderWatchSessions.get(watchPathKey(folderPath));
  if (!session) return;
  clearTimeout(session.timer);
  session.timer = setTimeout(async () => {
    session.timer = null;
    await syncFolderWatchSession(session);
    sendToRenderer('feathermark:folder-changed', { root: session.root });
  }, 160);
}

async function watchFolder(folderPath) {
  const root = path.resolve(folderPath);
  const key = watchPathKey(root);
  if (folderWatchSessions.has(key)) return true;
  const session = { root, watchers: new Map(), timer: null };
  folderWatchSessions.set(key, session);
  await syncFolderWatchSession(session);
  return true;
}

function unwatchFolder(folderPath) {
  const key = watchPathKey(folderPath);
  const session = folderWatchSessions.get(key);
  if (!session) return false;
  clearTimeout(session.timer);
  for (const record of session.watchers.values()) record.watcher.close();
  folderWatchSessions.delete(key);
  return true;
}

function bringToFront() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    if (app.isReady()) createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function openExternalFile(filePath) {
  if (!filePath) return;
  pendingExternalFile = filePath;
  bringToFront();
  if (!rendererReady) return; // app-ready flushes pendingExternalFile once the renderer listens
  const nextPath = pendingExternalFile;
  pendingExternalFile = null;
  sendToRenderer('feathermark:drop-open', nextPath);
}

if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, commandLine) => {
    const filePath = findMarkdownArgument(commandLine);
    if (filePath) openExternalFile(filePath);
    else bringToFront();
  });
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    openExternalFile(filePath);
  });
} else {
  app.quit();
}

function effectiveTheme() {
  const pref = settings.get('theme', 'auto');
  if (pref === 'light' || pref === 'dark') return pref;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

// ---- Tab/file registry: THE single source of truth for dirty state ----
// tabs: Map<tabId, { path: string|null, dirty: boolean }>
const tabs = new Map();
let activeTabId = null;

function updateSaveMenuItems() {
  // enabled only while a tab is active; content lives in renderer, main only routes
  const has = activeTabId !== null && tabs.has(activeTabId);
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  for (const item of menu.items) {
    for (const sub of item.submenu ? item.submenu.items : []) {
      if (sub.id === 'save-file' || sub.id === 'save-file-as') sub.enabled = has;
    }
  }
}

function dirtyTabs() {
  return [...tabs.entries()].filter(([, t]) => t.dirty);
}

function refreshDirtyFlag() {
  sendToRenderer('feathermark:dirty-changed', dirtyTabs().length > 0);
}

// Clamp a window's bounds so it stays fully within the display it's on.
// Called on restore so a saved position never ends up off-screen (e.g. after
// moving to a monitor with different resolution or DPI).
function clampBoundsToDisplay(bounds) {
  // Find the display that contains the top-left corner of the window, falling
  // back to the primary display if the point is not on any screen.
  const display =
    screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const wa = display.workArea; // excludes taskbar
  const w = Math.min(bounds.width,  wa.width);
  const h = Math.min(bounds.height, wa.height);
  const x = Math.max(wa.x, Math.min(bounds.x, wa.x + wa.width  - w));
  const y = Math.max(wa.y, Math.min(bounds.y, wa.y + wa.height - h));
  return { x, y, width: w, height: h };
}

function createWindow() {
  rendererReady = false;
  // Size the window as ~80% of the primary display's work area for normal/restored
  // bounds, then honour whatever the user saved in settings.
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  const defaultWidth  = Math.round(primaryWorkArea.width  * 0.80);
  const defaultHeight = Math.round(primaryWorkArea.height * 0.80);

  // Restore saved bounds if they exist; clamp to the current display so the
  // window is never placed off-screen after a monitor change.
  const savedBounds = settings.get('windowBounds', null);
  const normalBounds = savedBounds
    ? clampBoundsToDisplay(savedBounds)
    : {
        x: primaryWorkArea.x + Math.round((primaryWorkArea.width  - defaultWidth)  / 2),
        y: primaryWorkArea.y + Math.round((primaryWorkArea.height - defaultHeight) / 2),
        width:  defaultWidth,
        height: defaultHeight,
      };

  // Start maximised on first launch (no savedBounds) or when last closed maximised.
  // Crucially, create the BrowserWindow at the target display's full workArea size
  // so Chromium's very first paint is already full-bleed — avoiding the Windows
  // frameless-window lag where an 80%-sized surface briefly renders inside a
  // maximised frame before snapping to full size.
  const shouldStartMaximized = settings.get('windowMaximized', !savedBounds);
  const targetWorkArea = screen.getDisplayNearestPoint({ x: normalBounds.x, y: normalBounds.y }).workArea;
  const initialBounds = shouldStartMaximized ? targetWorkArea : normalBounds;

  mainWindow = new BrowserWindow({
    ...initialBounds,
    // Minimum size: enough to show all chrome without clipping.
    // 768px wide keeps the toolbar + tab bar readable; 500px tall fits
    // the header + tab bar + 1 line of content + status bar comfortably.
    minWidth: 768,
    minHeight: 500,
    frame: false,
    backgroundColor: THEME_BG[effectiveTheme()],
    show: false,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // If we created the window at targetWorkArea size so it paints full-bleed,
  // restore to normalBounds the first time the user unmaximizes.
  let pendingRestoreBounds = shouldStartMaximized ? normalBounds : null;

  // Persist window bounds every time the user moves or resizes.
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Don't save maximised/minimised state — restore a sensible normal size.
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      settings.set('windowBounds', mainWindow.getBounds());
    }
  };
  mainWindow.on('resized', saveBounds);
  mainWindow.on('moved',   saveBounds);
  mainWindow.on('maximize', () => {
    settings.set('windowMaximized', true);
  });
  mainWindow.on('unmaximize', () => {
    settings.set('windowMaximized', false);
    if (pendingRestoreBounds && mainWindow && !mainWindow.isDestroyed()) {
      const restoreTo = pendingRestoreBounds;
      pendingRestoreBounds = null;
      mainWindow.setBounds(restoreTo);
    }
  });

  let hasShown = false;

  const showWhenReady = () => {
    if (hasShown || !mainWindow || mainWindow.isDestroyed()) return;
    hasShown = true;
    clearTimeout(showFallbackTimer);
    if (shouldStartMaximized) mainWindow.maximize();
    mainWindow.show();
    const notice = settings.takeRecoveryNotice();
    if (notice) sendToRenderer('feathermark:recovery-notice', notice);
  };

  // Showing is tied to the renderer's first paint, not async hydration. The
  // renderer renders a real welcome surface immediately, so slow file recovery
  // can never leave the user staring at a blank window.
  const showFallbackTimer = setTimeout(showWhenReady, 1500);

  mainWindow.once('ready-to-show', () => {
    showWhenReady();
  });
  mainWindow.webContents.once('did-finish-load', showWhenReady);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Keep renderer startup failures visible when the window is blank. Electron's
  // default window gives no useful feedback for a preload/runtime exception.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('renderer failed to load:', errorCode, errorDescription, validatedURL);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('renderer process exited:', details.reason, details.exitCode);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`renderer console [${sourceId}:${line}]: ${message}`);
  });

  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());

  // Dropped files resolve to real paths only in main (sandboxed renderer never sees them).
  mainWindow.webContents.on('drag-drop', ({ files }) => {
    for (const file of files) {
      if (/\.(md|markdown|txt)$/i.test(file.path)) {
        sendToRenderer('feathermark:drop-open', file.path);
      }
    }
  });

  // Snapshot the session while working, not only on quit — a crash should cost little.
  let snapshotTimer = null;
  const requestSnapshot = () => {
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => sendToRenderer('feathermark:snapshot-request'), SESSION_SNAPSHOT_DEBOUNCE);
  };
  tabEvents.requestSnapshot = requestSnapshot;

  mainWindow.on('close', (event) => {
    checkUnsavedBeforeExit(event);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// hook set from createWindow; no-op until the window exists
const tabEvents = { requestSnapshot: () => {} };

// ---- File IO helpers (all fs stays in this file) ----

async function readMarkdownFile(filePath) {
  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (err) {
    return { ok: false, error: err.code === 'ENOENT'
      ? 'This file is no longer where it was last saved — it may have been moved, renamed, or deleted. Opening it by name again, or Save As to a new location, will replace it.'
      : 'The file could not be read (' + err.code + ').' };
  }
  if (!stat.isFile()) return { ok: false, error: 'That path is not a file.' };
  if (stat.size > MAX_OPEN_BYTES) return { ok: false, error: 'That file is larger than 10 MB — FeatherMark will not open it.' };
  let buffer;
  try {
    buffer = await fsp.readFile(filePath);
  } catch (err) {
    return { ok: false, error: 'The file could not be read (' + err.code + '). Check that you have permission to open it.' };
  }
  if (buffer.subarray(0, 8000).includes(0)) return { ok: false, error: 'That file is not text — FeatherMark opens Markdown and plain text only.' };
  return { ok: true, content: buffer.toString('utf8') };
}

function atomicWriteFileSync(filePath, text) {
  const tmp = filePath + '.feathermark-tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, filePath);
}

async function writeMarkdownFile(filePath, text) {
  try {
    atomicWriteFileSync(filePath, text);
    return { ok: true };
  } catch (err) {
    // One retry on a busy/locked file (Windows antivirus/indexer races are common).
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      await new Promise((r) => setTimeout(r, 250));
      try {
        atomicWriteFileSync(filePath, text);
        return { ok: true };
      } catch (retryErr) {
        return { ok: false, error: 'The file is locked by another program and could not be saved (' + retryErr.code + ').' };
      }
    }
    return { ok: false, error: 'The file could not be saved (' + err.code + '). Check the folder exists and you have permission to write to it.' };
  }
}

// ---- IPC contract (mirrors preload.js exactly; see header there) ----

const fileHandlers = {
  async open(pathToOpen) {
    const result = await readMarkdownFile(pathToOpen);
    if (result.ok) settings.addRecent(pathToOpen);
    return result;
  },

  // Save: text comes from the renderer (main never holds content), path is the tab's.
  save(tabId, text) {
    const tab = tabs.get(tabId);
    if (!tab || !tab.path) return { ok: false, error: 'This tab has no file yet — use Save As.' };
    return fileHandlers.saveAsPath(tabId, text, tab.path);
  },

  async saveAs(tabId, text) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save as',
      filters: FILE_FILTERS,
      defaultPath: tabs.get(tabId) && tabs.get(tabId).path,
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    return fileHandlers.saveAsPath(tabId, text, result.filePath);
  },

  async saveAsPath(tabId, text, filePath) {
    const ensured = await writeMarkdownFile(filePath, text);
    if (!ensured.ok) return ensured;
    const tab = tabs.get(tabId);
    if (tab) {
      const previous = tab.path;
      tab.path = filePath;
      tab.dirty = false;
      if (previous !== filePath) settings.removeRecent(previous);
      settings.addRecent(filePath);
      watchFileForTab(tabId, filePath);
      primeFileFingerprint(filePath, text);
      tabEvents.requestSnapshot();
      refreshDirtyFlag();
      updateSaveMenuItems();
    }
    return { ok: true, path: filePath };
  },

  tabOpened(tabId, filePath) {
    tabs.set(tabId, { path: filePath || null, dirty: false });
    if (filePath) settings.addRecent(filePath);
    watchFileForTab(tabId, filePath);
    activeTabId = tabId;
    tabEvents.requestSnapshot();
    refreshDirtyFlag();
    updateSaveMenuItems();
    return true;
  },

  tabClosed(tabId) {
    unwatchFileForTab(tabId);
    tabs.delete(tabId);
    if (activeTabId === tabId) activeTabId = tabs.keys().next().value ?? null;
    tabEvents.requestSnapshot();
    refreshDirtyFlag();
    updateSaveMenuItems();
    return true;
  },

  tabActivated(tabId) {
    activeTabId = tabs.has(tabId) ? tabId : null;
    updateSaveMenuItems();
    return true;
  },

  tabDirty(tabId, dirty) {
    const tab = tabs.get(tabId);
    if (!tab) return false;
    tab.dirty = !!dirty;
    refreshDirtyFlag();
    if (dirty) tabEvents.requestSnapshot();
    return true;
  },

  snapshot(session) {
    if (session && Array.isArray(session.tabs)) settings.setSession(session);
    return true;
  },
};

ipcMain.handle('feathermark:open', (_e, p) => fileHandlers.open(p));
ipcMain.handle('feathermark:save', (_e, tabId, text) => fileHandlers.save(tabId, text));
ipcMain.handle('feathermark:save-as', (_e, tabId, text) => fileHandlers.saveAs(tabId, text));
ipcMain.handle('feathermark:tab-opened', (_e, tabId, filePath) => fileHandlers.tabOpened(tabId, filePath));
ipcMain.handle('feathermark:tab-closed', (_e, tabId) => fileHandlers.tabClosed(tabId));
ipcMain.handle('feathermark:tab-activated', (_e, tabId) => fileHandlers.tabActivated(tabId));
ipcMain.handle('feathermark:tab-dirty', (_e, tabId, dirty) => fileHandlers.tabDirty(tabId, dirty));
ipcMain.handle('feathermark:snapshot', (_e, session) => fileHandlers.snapshot(session));

ipcMain.handle('feathermark:get-settings', (_e, key, fallback) => settings.get(key, fallback));
ipcMain.handle('feathermark:set-settings', (_e, key, value) => settings.set(key, value));
ipcMain.handle('feathermark:get-theme', () => effectiveTheme());

ipcMain.handle('feathermark:get-recent', () =>
  settings.getRecent().map((p) => ({ path: p, exists: fs.existsSync(p) })));

ipcMain.handle('feathermark:forget-recent', (_e, filePath) => settings.removeRecent(filePath));

ipcMain.handle('feathermark:get-session', () => settings.getSession());
ipcMain.handle('feathermark:get-recovery-notice', () => settings.takeRecoveryNotice());

ipcMain.handle('feathermark:confirm-close-tab', async (_e, name) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Unsaved changes',
    message: '“' + name + '” has unsaved changes.',
    detail: 'Saving writes the file before closing; discarding loses the changes since the last save; cancelling keeps the tab open.',
    buttons: ['Save and close', 'Don’t save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });
  return response; // 0 save+close, 1 discard, 2 cancel
});

ipcMain.handle('feathermark:open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open markdown file',
    filters: [...FILE_FILTERS, { name: 'All files', extensions: ['*'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('feathermark:open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open folder',
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('feathermark:read-folder-tree', (_event, folderPath) => readFolderTree(folderPath));
ipcMain.handle('feathermark:watch-folder', (_event, folderPath) => watchFolder(folderPath));
ipcMain.handle('feathermark:unwatch-folder', (_event, folderPath) => unwatchFolder(folderPath));

// ---- Theme: OS changes + manual override both flow to renderer and window bg ----

nativeTheme.on('updated', () => {
  const theme = effectiveTheme();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(THEME_BG[theme]);
  }
  sendToRenderer('feathermark:theme-changed', theme);
});

ipcMain.handle('feathermark:set-theme-pref', (_e, pref) => {
  settings.set('theme', pref);
  nativeTheme.themeSource = toThemeSource(pref);
  const theme = effectiveTheme();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(THEME_BG[theme]);
  }
  sendToRenderer('feathermark:theme-changed', theme);
  return theme;
});

ipcMain.handle('feathermark:window-control', (_e, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (action === 'minimize') mainWindow.minimize();
  else if (action === 'maximize') {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === 'close') mainWindow.close();
  else return false;
  return true;
});

ipcMain.on('feathermark:app-ready', (e) => {
  if (mainWindow && !mainWindow.isDestroyed() && e.sender === mainWindow.webContents) {
    rendererReady = true;
    if (pendingExternalFile) {
      const nextPath = pendingExternalFile;
      pendingExternalFile = null;
      sendToRenderer('feathermark:drop-open', nextPath);
    }
  }
});

// ---- Exit / Close: exactly one confirm flow, native, with Save all / Don’t save / Cancel ----
// The renderer owns text, so "Save all" asks it to flush every dirty tab, then quits
// when the renderer reports done. Cancel returns to the editor with everything intact.

let quitResolved = false;
let isClosingOrQuitting = false;

// Await the renderer's in-app banner. The window close is always preventDefault-ed
// before prompting, so the window stays alive while the user answers. A timeout
// covers a hung/crashed renderer: cancel, so nothing is ever lost silently.
function promptRenderer(requestChannel, doneChannel, payload) {
  return new Promise((resolve) => {
    let done = false;
    const finishPrompt = (choice) => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      ipcMain.removeListener(doneChannel, onChoice);
      resolve(choice);
    };
    const onChoice = (_e, choice) => finishPrompt(choice);
    ipcMain.on(doneChannel, onChoice);
    const guard = setTimeout(() => finishPrompt(2), 15000);
    sendToRenderer(requestChannel, payload);
  });
}

function resetCloseState() {
  isClosingOrQuitting = false;
}

function finalizeQuit() {
  resetCloseState();
  quitResolved = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close(); // close handler sees quitResolved and lets it through
  } else {
    app.quit();
  }
}

// Drives the whole exit: window 'close' calls this with the live close event
// (synchronous preventDefault below keeps the window up while banners are shown);
// 'before-quit' calls it without an event when no window is left.
async function checkUnsavedBeforeExit(event) {
  if (quitResolved) return;
  if (!mainWindow || mainWindow.isDestroyed() || !rendererReady) {
    // No live surface to run the banner flow — the quit stands as-is.
    quitResolved = true;
    return;
  }

  const unsaved = dirtyTabs();
  if (tabs.size < 2 && unsaved.length < 1) return; // nothing to confirm

  if (event) event.preventDefault();
  if (isClosingOrQuitting) return;
  isClosingOrQuitting = true;

  // A close request can originate from the taskbar while the window is
  // minimised or behind another app. Make the pending in-app confirmation
  // visible before asking the renderer to open it.
  bringToFront();

  if (tabs.size > 1) {
    const tabsChoice = await promptRenderer(
      'feathermark:confirm-tabs-exit-request',
      'feathermark:confirm-tabs-exit-done',
      { count: tabs.size },
    );
    if (tabsChoice === 2) {
      resetCloseState();
      return; // cancel — stay in app
    }
    if (tabsChoice === 1) {
      resetCloseState();
      sendToRenderer('feathermark:menu', 'close-tab');
      return; // close only the current tab, app stays open (its own save banner applies)
    }
    if (unsaved.length === 0) {
      finalizeQuit(); // close all tabs, nothing unsaved
      return;
    }
  }

  const names = unsaved.map(([, t]) => (t.path ? path.basename(t.path) : 'Untitled'));
  const response = await promptRenderer(
    'feathermark:confirm-exit-request',
    'feathermark:confirm-exit-done',
    { count: unsaved.length, name: names[0] },
  );

  if (response === 2) {
    resetCloseState();
    return; // cancel — back to work, nothing lost
  }

  if (response === 1) {
    settings.clearSession();
    finalizeQuit();
    return;
  }

  // Save all: renderer flushes dirty tabs (Save As dialog per untitled tab), then signals done.
  const onDone = (_e, ok) => {
    ipcMain.removeListener('feathermark:save-all-done', onDone);
    if (!ok) {
      resetCloseState();
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Could not save everything',
        message: 'Some files were not saved. Nothing was discarded — stay in the app, check the paths, then quit again.',
        noLink: true,
      });
      return;
    }
    finalizeQuit();
  };
  ipcMain.on('feathermark:save-all-done', onDone);
  sendToRenderer('feathermark:save-all-request', unsaved.map(([id]) => id));
}

app.on('before-quit', (event) => {
  if (quitResolved) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    // Windows can enter through before-quit (for example, the taskbar's
    // Close-window command) instead of delivering the BrowserWindow close
    // event first. Route that request back through close() so the existing
    // multi-tab and unsaved-work banners always get a live renderer surface.
    event.preventDefault();
    bringToFront();
    mainWindow.close();
    return;
  }

  checkUnsavedBeforeExit();
});

// ---- Menu ----

function themeRadioItem(label, pref) {
  return {
    label,
    type: 'radio',
    checked: settings.get('theme', 'auto') === pref,
    click: () => {
      nativeTheme.themeSource = toThemeSource(pref);
      settings.set('theme', pref);
      const theme = effectiveTheme();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBackgroundColor(THEME_BG[theme]);
      sendToRenderer('feathermark:theme-changed', theme);
      Menu.setApplicationMenu(buildMenu()); // refresh radio state
      updateSaveMenuItems();
    },
  };
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New file', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('feathermark:menu', 'new-file') },
        { label: 'Open file…', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('feathermark:menu', 'open-file') },
        { type: 'separator' },
        { id: 'save-file', label: 'Save file', accelerator: 'CmdOrCtrl+S', enabled: false, click: () => sendToRenderer('feathermark:menu', 'save-file') },
        { id: 'save-file-as', label: 'Save file as…', accelerator: 'CmdOrCtrl+Shift+S', enabled: false, click: () => sendToRenderer('feathermark:menu', 'save-file-as') },
        { type: 'separator' },
        { label: 'Close tab', accelerator: 'CmdOrCtrl+W', click: () => sendToRenderer('feathermark:menu', 'close-tab') },
        {
          label: 'Quit FeatherMark',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          // go through the window's close event so the confirm banners run;
          // a role:'quit' would fire app.quit() and close the window under them
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
            else { quitResolved = true; app.quit(); }
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendToRenderer('feathermark:menu', 'undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => sendToRenderer('feathermark:menu', 'redo'),
        },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find and replace', accelerator: 'CmdOrCtrl+H', enabled: true, click: () => sendToRenderer('feathermark:menu', 'find-replace') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle preview', accelerator: 'CmdOrCtrl+E', enabled: true, click: () => sendToRenderer('feathermark:menu', 'toggle-preview') },
        { label: 'Toggle outline', accelerator: 'CmdOrCtrl+Shift+O', enabled: true, click: () => sendToRenderer('feathermark:menu', 'toggle-outline') },
        { label: 'Toggle toolbar', accelerator: 'Alt+T', click: () => sendToRenderer('feathermark:menu', 'toggle-toolbar') },
        { label: 'Toggle focus mode', accelerator: 'F11', click: () => sendToRenderer('feathermark:menu', 'toggle-focus') },
        { type: 'separator' },
        { label: 'Theme', submenu: [
          themeRadioItem('Follow system', 'auto'),
          themeRadioItem('Light', 'light'),
          themeRadioItem('Dark', 'dark'),
        ] },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About FeatherMark', click: () => dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'FeatherMark',
          message: 'FeatherMark ' + app.getVersion(),
          detail: 'A quiet, distraction-free markdown editor.',
          noLink: true,
        }) },
      ],
    },
  ]);
}

if (hasSingleInstanceLock) {
  app.whenReady().then(() => {
    settings.initFirstRun(app.getVersion());
    nativeTheme.themeSource = toThemeSource(settings.get('theme', 'auto'));
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
