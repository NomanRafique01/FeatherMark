// FeatherDown — Preact root. Phase 02: theme via theme.js, self-hosted fonts,
// temporary token proof panel (removed in phase 04).

import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-600.css';
import '@fontsource/newsreader/latin-400-italic.css';

import { h, render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { initTheme, setThemePref, getThemePref } from './theme.js';

const THEME_PREFS = ['auto', 'light', 'dark'];

const COLOUR_TOKENS = [
  '--app-bg', '--sidebar-bg', '--editor-bg', '--preview-bg',
  '--surface-hover', '--surface-active',
  '--border', '--border-strong',
  '--text-primary', '--text-secondary', '--text-muted',
  '--accent', '--accent-hover', '--accent-soft',
  '--success', '--warning', '--danger',
  '--syntax-heading', '--syntax-link', '--syntax-code', '--syntax-codeblock',
  '--selection', '--cursor', '--search-highlight', '--focus-mode-bg',
];

function TokenProof() {
  const [computed, setComputed] = useState({});

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const map = {};
      for (const t of COLOUR_TOKENS) map[t] = styles.getPropertyValue(t).trim();
      setComputed(map);
    };
    read();
    return initTheme(read); // refresh swatches when theme flips
  }, []);

  return h('div', { class: 'token-proof', role: 'dialog', 'aria-label': 'Design token proof' },
    h('h2', {}, 'Colour tokens — current theme'),
    h('div', { class: 'token-grid' },
      COLOUR_TOKENS.map((token) => h('div', { class: 'token-swatch', key: token },
        h('div', { class: 'chip', style: { background: `var(${token})` } }),
        h('div', {},
          h('div', { class: 'name' }, token),
          h('div', { class: 'value' }, computed[token] || '—'),
        ),
      )),
    ),
  );
}

function App() {
  const [pref, setPref] = useState('auto');
  const [lastPath, setLastPath] = useState(null);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    let mounted = true;
    const offTheme = initTheme();
    getThemePref().then((p) => { if (mounted) setPref(p); });
    const offMenu = window.featherdown.onMenu(handleMenu);
    return () => { mounted = false; offTheme(); offMenu(); };
  }, []);

  async function handleMenu(action) {
    if (action === 'open-file') {
      const path = await window.featherdown.openFileDialog();
      if (path) setLastPath(path); // file reading lands in phase 03
    }
  }

  async function choosePref(p) {
    setPref(await setThemePref(p));
  }

  return h('div', { class: 'shell' },
    h('main', { class: 'empty' },
      h('img', { class: 'empty-mark', src: '../assets/icon.png', alt: '', width: 96, height: 96 }),
      h('h1', { class: 'empty-title' }, 'FeatherDown'),
      h('p', { class: 'empty-hint' },
        'A quiet markdown editor. Open a file to start writing, or press Ctrl+O.'),
      h('button', { class: 'empty-action', onClick: () => handleMenu('open-file') }, 'Open file'),
    ),
    showTokens && h(TokenProof, null),
    h('footer', { class: 'statusbar' },
      h('span', {}, lastPath ? basename(lastPath) : 'No file open'),
      h('div', { class: 'statusbar-right' },
        h('button', {
          class: 'tokens-toggle',
          'aria-pressed': showTokens,
          onClick: () => setShowTokens((s) => !s),
        }, 'Tokens'),
        h('div', { class: 'statusbar-theme', role: 'group', 'aria-label': 'Theme' },
          THEME_PREFS.map((p) => h('button', {
            key: p,
            'aria-pressed': pref === p,
            onClick: () => choosePref(p),
          }, p === 'auto' ? 'System' : p[0].toUpperCase() + p.slice(1))),
        ),
      ),
    ),
  );
}

function basename(p) {
  return p.split(/[\\/]/).pop();
}

render(h(App, null), document.getElementById('root'));
