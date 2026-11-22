// FeatherDown — preload bridge (contextIsolation on, sandbox on, no Node exposure)
//
// IPC CONTRACT — the complete surface of window.featherdown.
// Any new channel must be registered in main.js AND listed here AND below.
//
// Settings & theme
//   getSettings(key, fallback)        -> Promise<any>          featherdown:get-settings
//   setSettings(key, value)           -> Promise<boolean>      featherdown:set-settings
//   getTheme()                        -> Promise<'light'|'dark'> featherdown:get-theme
//   setThemePref('auto'|'light'|'dark') -> Promise<'light'|'dark'> featherdown:set-theme-pref
//   onThemeChanged(cb)                -> unsubscribe fn        ipc event featherdown:theme-changed
//   onMenu(cb)                        -> unsubscribe fn        ipc event featherdown:menu
//                                                  ('new-file'|'open-file'|'save-file'|'save-file-as'|'find-replace'|'toggle-preview'|'toggle-outline')
// Files (phase 03)
//   openFileDialog()                  -> Promise<string|null>  featherdown:open-file-dialog
//   readFile(path) / writeFile(path, text) / saveFileAs(...) / getRecent() / setRecent(...)
//                                     -> registered in phase 03, not yet available
//
// Renderer NEVER gets fs, ipcRenderer, require, or process. Only the methods above.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('featherdown', {
  getSettings: (key, fallback) => ipcRenderer.invoke('featherdown:get-settings', key, fallback),
  setSettings: (key, value) => ipcRenderer.invoke('featherdown:set-settings', key, value),

  getTheme: () => ipcRenderer.invoke('featherdown:get-theme'),
  setThemePref: (pref) => ipcRenderer.invoke('featherdown:set-theme-pref', pref),

  openFileDialog: () => ipcRenderer.invoke('featherdown:open-file-dialog'),

  onThemeChanged: (cb) => {
    const listener = (_e, theme) => cb(theme);
    ipcRenderer.on('featherdown:theme-changed', listener);
    return () => ipcRenderer.removeListener('featherdown:theme-changed', listener);
  },

  onMenu: (cb) => {
    const listener = (_e, action) => cb(action);
    ipcRenderer.on('featherdown:menu', listener);
    return () => ipcRenderer.removeListener('featherdown:menu', listener);
  },
});
