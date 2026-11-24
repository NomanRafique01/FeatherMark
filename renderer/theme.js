// FeatherMark — theme logic: OS detection lives in main; this is the renderer half.
// Pref ('auto'|'light'|'dark') persists through settings; effective theme lands on <html data-theme>.

let current = null;
const listeners = new Set();

function apply(theme) {
  if (theme === current) return;
  current = theme;
  document.documentElement.dataset.theme = theme;
  listeners.forEach((cb) => cb(theme));
}

export function initTheme() {
  window.feathermark.getTheme().then(apply);
  return window.feathermark.onThemeChanged(apply); // unsubscribe fn
}

export async function setThemePref(pref) {
  const theme = await window.feathermark.setThemePref(pref);
  apply(theme);
  return pref;
}

export function getThemePref() {
  return window.feathermark.getSettings('theme', 'auto');
}

export function onThemeChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function effectiveTheme() {
  return current || 'light';
}
