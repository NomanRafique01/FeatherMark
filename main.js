// FeatherMark — Electron main process
// Owns ALL filesystem access. Renderer talks only through preload.js (window.feathermark.*).

const { app, BrowserWindow, Menu, dialog, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const settings = require('./store/settings');

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 480,
    frame: false,
    backgroundColor: THEME_BG[effectiveTheme()],
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    const notice = settings.takeRecoveryNotice();
    if (notice) sendToRenderer('feathermark:recovery-notice', notice);
  });
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
      tabEvents.requestSnapshot();
      refreshDirtyFlag();
      updateSaveMenuItems();
    }
    return { ok: true, path: filePath };
  },

  tabOpened(tabId, filePath) {
    tabs.set(tabId, { path: filePath || null, dirty: false });
    if (filePath) settings.addRecent(filePath);
    activeTabId = tabId;
    tabEvents.requestSnapshot();
    refreshDirtyFlag();
    updateSaveMenuItems();
    return true;
  },

  tabClosed(tabId) {
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

// ---- Exit / Close: exactly one confirm flow, native, with Save all / Don’t save / Cancel ----
// The renderer owns text, so "Save all" asks it to flush every dirty tab, then quits
// when the renderer reports done. Cancel returns to the editor with everything intact.

let quitResolved = false;
let isClosingOrQuitting = false;

async function checkUnsavedBeforeExit(event) {
  if (quitResolved || !mainWindow || mainWindow.isDestroyed() || tabs.size === 0) return;

  const unsaved = dirtyTabs();
  if (unsaved.length === 0) {
    quitResolved = true; // nothing to confirm; the debounced snapshot already persisted
    return;
  }

  if (event) event.preventDefault();
  if (isClosingOrQuitting) return;
  isClosingOrQuitting = true;

  const names = unsaved.map(([, t]) => (t.path ? path.basename(t.path) : 'Untitled'));
  const response = await new Promise((resolve) => {
    let done = false;
    const finishPrompt = (choice) => {
      if (done) return;
      done = true;
      ipcMain.removeListener('feathermark:confirm-exit-done', onChoice);
      resolve(choice);
    };
    const onChoice = (_e, choice) => finishPrompt(choice);
    ipcMain.on('feathermark:confirm-exit-done', onChoice);
    mainWindow.once('closed', () => finishPrompt(2));
    sendToRenderer('feathermark:confirm-exit-request', {
      count: unsaved.length,
      name: names[0],
    });
  });

  if (response === 2) {
    isClosingOrQuitting = false;
    return; // cancel — back to work, nothing lost
  }

  if (response === 1) {
    settings.clearSession();
    quitResolved = true;
    isClosingOrQuitting = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.quit();
    return;
  }

  // Save all: renderer flushes dirty tabs (Save As dialog per untitled tab), then signals done.
  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    isClosingOrQuitting = false;
    if (!ok) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Could not save everything',
        message: 'Some files were not saved. Nothing was discarded — stay in the app, check the paths, then quit again.',
        noLink: true,
      });
      return;
    }
    quitResolved = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.quit();
  };
  const onDone = (_e, ok) => {
    ipcMain.removeListener('feathermark:save-all-done', onDone);
    finish(!!ok);
  };
  ipcMain.on('feathermark:save-all-done', onDone);
  sendToRenderer('feathermark:save-all-request', unsaved.map(([id]) => id));
}

app.on('before-quit', (event) => {
  checkUnsavedBeforeExit(event);
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
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
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

app.whenReady().then(() => {
  nativeTheme.themeSource = toThemeSource(settings.get('theme', 'auto'));
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
