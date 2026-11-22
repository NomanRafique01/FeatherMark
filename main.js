// FeatherDown — Electron main process
// Owns ALL filesystem access. Renderer talks only through preload.js (window.featherdown.*).

const { app, BrowserWindow, Menu, dialog, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const settings = require('./store/settings');

const THEME_BG = { light: '#F5F3ED', dark: '#20231F' }; // DESIGN_TOKENS.md --app-bg

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 768,
    minHeight: 480,
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

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.on('context-menu', (e) => e.preventDefault());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// Single instance: focus existing window instead of opening a second one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function sendToRenderer(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// ---- IPC contract (mirrors preload.js exactly; see header there) ----

ipcMain.handle('featherdown:get-settings', (_e, key, fallback) => settings.get(key, fallback));
ipcMain.handle('featherdown:set-settings', (_e, key, value) => settings.set(key, value));
ipcMain.handle('featherdown:get-theme', () => effectiveTheme());

ipcMain.handle('featherdown:open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open markdown file',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0]; // content read added in phase 03
});

// Phase 03 will register: featherdown:read-file, featherdown:write-file,
// featherdown:save-file-as, featherdown:get-recent, featherdown:set-recent.
// New channels must be added to BOTH this registry and preload.js.

// ---- Theme: OS changes + manual override both flow to renderer and window bg ----

nativeTheme.on('updated', () => {
  const theme = effectiveTheme();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(THEME_BG[theme]);
  }
  sendToRenderer('featherdown:theme-changed', theme);
});

ipcMain.handle('featherdown:set-theme-pref', (_e, pref) => {
  settings.set('theme', pref);
  nativeTheme.themeSource = toThemeSource(pref); // pref: 'auto' | 'light' | 'dark'
  const theme = effectiveTheme();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(THEME_BG[theme]);
  }
  sendToRenderer('featherdown:theme-changed', theme);
  return theme;
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
      sendToRenderer('featherdown:theme-changed', theme);
      Menu.setApplicationMenu(buildMenu()); // refresh radio state
    },
  };
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New file', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('featherdown:menu', 'new-file') },
        { label: 'Open file…', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('featherdown:menu', 'open-file') },
        { type: 'separator' },
        { label: 'Save file', accelerator: 'CmdOrCtrl+S', enabled: false, click: () => sendToRenderer('featherdown:menu', 'save-file') },
        { label: 'Save file as…', accelerator: 'CmdOrCtrl+Shift+S', enabled: false, click: () => sendToRenderer('featherdown:menu', 'save-file-as') },
        { type: 'separator' },
        { role: 'close', label: 'Close tab', accelerator: 'CmdOrCtrl+W' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find and replace', accelerator: 'CmdOrCtrl+H', enabled: false, click: () => sendToRenderer('featherdown:menu', 'find-replace') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle preview', accelerator: 'CmdOrCtrl+E', enabled: false, click: () => sendToRenderer('featherdown:menu', 'toggle-preview') },
        { label: 'Toggle outline', accelerator: 'CmdOrCtrl+Shift+O', enabled: false, click: () => sendToRenderer('featherdown:menu', 'toggle-outline') },
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
        { label: 'About FeatherDown', click: () => dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'FeatherDown',
          message: 'FeatherDown ' + app.getVersion(),
          detail: 'A quiet, distraction-free markdown editor.',
          noLink: true,
        }) },
      ],
    },
  ]);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = toThemeSource(settings.get('theme', 'auto'));
  Menu.setApplicationMenu(buildMenu());
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
