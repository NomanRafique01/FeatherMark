// FeatherMark — preload bridge (contextIsolation on, sandbox on, no Node exposure)
//
// IPC CONTRACT — the complete surface of window.feathermark.
// Any new channel must be registered in main.js AND listed here AND below.
//
// Settings & theme
//   getSettings(key, fallback)        -> Promise<any>          feathermark:get-settings
//   setSettings(key, value)           -> Promise<boolean>      feathermark:set-settings
//   getTheme()                        -> Promise<'light'|'dark'> feathermark:get-theme
//   setThemePref('auto'|'light'|'dark') -> Promise<'light'|'dark'> feathermark:set-theme-pref
//   windowControl('minimize'|'maximize'|'close') -> Promise<boolean> feathermark:window-control
//   onThemeChanged(cb)                -> unsubscribe fn        ipc event feathermark:theme-changed
//   onMenu(cb)                        -> unsubscribe fn        ipc event feathermark:menu
//                                                  ('new-file'|'open-file'|'save-file'|'save-file-as'|'close-tab'|'find-replace'|'toggle-preview'|'toggle-outline')
// Files (phase 03)
//   openFileDialog()                  -> Promise<string|null>  feathermark:open-file-dialog
//   open(path)                        -> Promise<{ok, content?} | {ok:false, error}>   feathermark:open
//   save(tabId, text)                 -> Promise<{ok, path?} | {ok:false, error}>      feathermark:save
//   saveAs(tabId, text)               -> same, or {ok:false, canceled:true}            feathermark:save-as
//   tabOpened(tabId, path|null)       -> Promise<boolean>      feathermark:tab-opened   (registers tab in main; no path => untitled, dirty)
//   tabClosed(tabId)                  -> Promise<boolean>      feathermark:tab-closed
//   tabActivated(tabId)               -> Promise<boolean>      feathermark:tab-activated
//   tabDirty(tabId, isDirty)          -> Promise<boolean>      feathermark:tab-dirty    (main owns dirty truth from here)
//   snapshot({tabs, active})          -> Promise<boolean>      feathermark:snapshot     (session restore data)
//   getSession()                      -> Promise<{tabs, active}|null> feathermark:get-session
//   getRecent()                       -> Promise<{path, exists}[]>    feathermark:get-recent
//   forgetRecent(path)                -> Promise<string[]>     feathermark:forget-recent
//   confirmCloseTab(name)             -> Promise<0|1|2>        feathermark:confirm-close-tab (0 save+close, 1 discard, 2 cancel)
//   onDropOpen(cb)                    -> unsubscribe fn        ipc event feathermark:drop-open (path)
//   onDirtyChanged(cb)                -> unsubscribe fn        ipc event feathermark:dirty-changed (boolean)
//   onRecoveryNotice(cb)              -> unsubscribe fn        ipc event feathermark:recovery-notice ({backupPath})
//   onSnapshotRequest(cb)             -> unsubscribe fn        ipc event feathermark:snapshot-request
//   onSaveAllRequest(cb)              -> unsubscribe fn        ipc event feathermark:save-all-request (tabIds[])
//   saveAllDone(ok)                   -> (fire and forget)     feathermark:save-all-done
//
// Renderer NEVER gets fs, ipcRenderer, require, or process. Only the methods above.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

function relay(channel, cb) {
  const listener = (_e, ...args) => cb(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('feathermark', {
  getSettings: (key, fallback) => ipcRenderer.invoke('feathermark:get-settings', key, fallback),
  setSettings: (key, value) => ipcRenderer.invoke('feathermark:set-settings', key, value),

  getTheme: () => ipcRenderer.invoke('feathermark:get-theme'),
  setThemePref: (pref) => ipcRenderer.invoke('feathermark:set-theme-pref', pref),
  windowControl: (action) => ipcRenderer.invoke('feathermark:window-control', action),

  openFileDialog: () => ipcRenderer.invoke('feathermark:open-file-dialog'),
  open: (filePath) => ipcRenderer.invoke('feathermark:open', filePath),
  save: (tabId, text) => ipcRenderer.invoke('feathermark:save', tabId, text),
  saveAs: (tabId, text) => ipcRenderer.invoke('feathermark:save-as', tabId, text),

  tabOpened: (tabId, filePath) => ipcRenderer.invoke('feathermark:tab-opened', tabId, filePath),
  tabClosed: (tabId) => ipcRenderer.invoke('feathermark:tab-closed', tabId),
  tabActivated: (tabId) => ipcRenderer.invoke('feathermark:tab-activated', tabId),
  tabDirty: (tabId, isDirty) => ipcRenderer.invoke('feathermark:tab-dirty', tabId, isDirty),
  snapshot: (session) => ipcRenderer.invoke('feathermark:snapshot', session),
  getSession: () => ipcRenderer.invoke('feathermark:get-session'),

  getRecent: () => ipcRenderer.invoke('feathermark:get-recent'),
  forgetRecent: (filePath) => ipcRenderer.invoke('feathermark:forget-recent', filePath),

  confirmCloseTab: (name) => ipcRenderer.invoke('feathermark:confirm-close-tab', name),
  getRecoveryNotice: () => ipcRenderer.invoke('feathermark:get-recovery-notice'),
  getPathForFile: (file) => (webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file && file.path)),

  saveAllDone: (ok) => ipcRenderer.send('feathermark:save-all-done', ok),
  confirmExitDone: (choice) => ipcRenderer.send('feathermark:confirm-exit-done', choice),

  onThemeChanged: (cb) => relay('feathermark:theme-changed', cb),
  onMenu: (cb) => relay('feathermark:menu', cb),
  onDropOpen: (cb) => relay('feathermark:drop-open', cb),
  onDirtyChanged: (cb) => relay('feathermark:dirty-changed', cb),
  onRecoveryNotice: (cb) => relay('feathermark:recovery-notice', cb),
  onSnapshotRequest: (cb) => relay('feathermark:snapshot-request', cb),
  onSaveAllRequest: (cb) => relay('feathermark:save-all-request', cb),
  onConfirmExitRequest: (cb) => relay('feathermark:confirm-exit-request', cb),
});
