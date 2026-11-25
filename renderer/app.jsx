// FeatherMark — Preact root. Phase 03: real workspace shell — tabs model, file
// semantics (open/save/save-as/dirty/recents/session), drop target, honest states.
// CodeMirror replaces the plain editor surface in phase 04; everything else here is final.

import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-600.css';
import '@fontsource/newsreader/latin-400-italic.css';

import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { initTheme, setThemePref, getThemePref } from './theme.js';
import { TabBar } from './components/TabBar.jsx';
import { Editor } from './components/Editor.jsx';
import { Preview } from './components/Preview.jsx';
import { Outline } from './components/Outline.jsx';
import { Toolbar } from './components/Toolbar.jsx';
import { FindReplace } from './components/FindReplace.jsx';
import { AppMenuBar } from './components/AppMenuBar.jsx';
import { AppHeader } from './components/AppHeader.jsx';

const THEME_PREFS = ['auto', 'light', 'dark'];
const VIEW_MODES = ['split', 'preview-only', 'editor-only'];
const SESSION_TEXT_CAP = 256 * 1024; // per dirty tab, keep session file sane

let nextTabId = 1; // session-restored ids use 'r' prefix, never collide
const newTabId = () => 't' + nextTabId++;

function basename(p) {
  return p.split(/[\\/]/).pop();
}

function makeTab(path, text) {
  return { id: newTabId(), path: path || null, name: path ? basename(path) : 'Untitled',
    text, dirty: false, cursor: 0, scroll: 0, previewScroll: 0 };
}

// ---- Recents (empty state) ----

function EmptyIcon({ size = 16, children }) {
  return h('svg', {
    width: String(size), height: String(size), viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, children);
}

const FolderOpenIcon = () => h(EmptyIcon, { size: 15 },
  h('path', { d: 'M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.3 1.5h4.7A1.5 1.5 0 0 1 14 6v1.5' }),
  h('path', { d: 'M2 7.5h12l-1.1 5a1.2 1.2 0 0 1-1.2 1H4.3a1.2 1.2 0 0 1-1.2-1L2 7.5Z' }),
);

const FilePlusIcon = () => h(EmptyIcon, { size: 15 },
  h('path', { d: 'M3.5 2h6l3 3v9h-9V2Z' }),
  h('path', { d: 'M9.5 2v3h3' }),
  h('path', { d: 'M8 7.5v4M6 9.5h4' }),
);

const ClockIcon = () => h(EmptyIcon, { size: 14 },
  h('circle', { cx: '8', cy: '8', r: '6' }),
  h('path', { d: 'M8 4.8V8l2.2 1.4' }),
);

const RecentDocIcon = () => h(EmptyIcon, { size: 16 },
  h('path', { d: 'M3.5 2h6l3 3v9h-9V2Z' }),
  h('path', { d: 'M9.5 2v3h3' }),
  h('path', { d: 'M5.5 8h5M5.5 10.5h3.5' }),
);

const MissingDocIcon = () => h(EmptyIcon, { size: 16 },
  h('path', { d: 'M3.5 2h6l3 3v9h-9V2Z' }),
  h('path', { d: 'M9.5 2v3h3' }),
  h('path', { d: 'M8 6.8v3.2' }),
  h('circle', { cx: '8', cy: '11.8', r: '0.5', fill: 'currentColor', stroke: 'none' }),
);

function RecentFiles({ recents, onOpen, onForget, onClearMissing }) {
  if (recents.length === 0) return null;
  const missingCount = recents.filter((r) => !r.exists).length;

  return h('section', { class: 'recents', 'aria-label': 'Recent files' },
    h('div', { class: 'recents-header' },
      h('div', { class: 'recents-heading' },
        h('span', { class: 'recents-heading-icon' }, h(ClockIcon)),
        h('h2', { class: 'recents-title' }, 'Recent files'),
        h('span', { class: 'recents-count' }, recents.length),
      ),
      missingCount > 0 && onClearMissing && h('button', {
        type: 'button',
        class: 'recents-clear-missing',
        onClick: onClearMissing,
        title: `Remove ${missingCount} missing ${missingCount === 1 ? 'file' : 'files'} from list`,
      }, `Clear missing (${missingCount})`),
    ),
    h('ul', { class: 'recents-list' },
      recents.map((r) => {
        const name = basename(r.path);
        const dir = r.path.slice(0, Math.max(0, r.path.length - name.length - 1));
        return h('li', { key: r.path, class: 'recents-item' + (r.exists ? '' : ' is-missing') },
          h('button', {
            type: 'button',
            class: 'recents-open',
            title: r.path,
            onClick: () => onOpen(r),
          },
            h('span', { class: 'recents-icon', 'aria-hidden': 'true' },
              r.exists ? h(RecentDocIcon) : h(MissingDocIcon),
            ),
            h('span', { class: 'recents-meta' },
              h('span', { class: 'recents-row-top' },
                h('span', { class: 'recents-name' }, name),
                !r.exists && h('span', { class: 'recents-flag' }, 'Missing'),
              ),
              dir && h('span', { class: 'recents-dir' }, dir),
            ),
          ),
          h('button', {
            type: 'button',
            class: 'recents-forget',
            'aria-label': `Remove ${name} from recent files`,
            title: 'Remove from recent files',
            onClick: () => onForget(r.path),
          }, h('svg', {
            width: '12', height: '12', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.5', 'stroke-linecap': 'round', 'aria-hidden': 'true',
          }, h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' }))),
        );
      }),
    ),
  );
}

// ---- Confirm close dialog ----

function ConfirmCloseDialog({ title, description, primaryLabel, onResolve }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResolve(2);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onResolve]);

  return h('div', {
    class: 'confirm-backdrop',
    role: 'presentation',
    onMouseDown: (e) => {
      if (e.target === e.currentTarget) onResolve(2);
    },
  },
    h('div', {
      class: 'confirm-dialog',
      role: 'alertdialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-close-title',
      'aria-describedby': 'confirm-close-desc',
    },
      h('div', { class: 'confirm-header' },
        h('span', { class: 'confirm-icon', 'aria-hidden': 'true' },
          h('svg', {
            width: '16', height: '16', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          },
            h('path', { d: 'M8 2.2 14.2 13H1.8L8 2.2Z' }),
            h('line', { x1: '8', y1: '6.2', x2: '8', y2: '9.4' }),
            h('circle', { cx: '8', cy: '11.3', r: '0.6', fill: 'currentColor', stroke: 'none' }),
          ),
        ),
        h('div', { class: 'confirm-titles' },
          h('h2', { id: 'confirm-close-title', class: 'confirm-title' }, title),
          h('p', { id: 'confirm-close-desc', class: 'confirm-desc' }, description),
        ),
        h('button', {
          type: 'button',
          class: 'confirm-close-x',
          'aria-label': 'Cancel',
          onClick: () => onResolve(2),
        },
          h('svg', {
            width: '12', height: '12', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.5', 'stroke-linecap': 'round', 'aria-hidden': 'true',
          }, h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' })),
        ),
      ),
      h('div', { class: 'confirm-actions' },
        h('button', {
          type: 'button',
          class: 'confirm-btn is-discard',
          onClick: () => onResolve(1),
        }, 'Don’t save'),
        h('button', {
          type: 'button',
          class: 'confirm-btn is-cancel',
          onClick: () => onResolve(2),
        }, 'Cancel'),
        h('button', {
          type: 'button',
          class: 'confirm-btn is-primary',
          autoFocus: true,
          onClick: () => onResolve(0),
        }, primaryLabel),
      ),
    ),
  );
}

// ---- App ----

function App() {
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [viewMode, setViewMode] = useState('split');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, selectionLength: 0 });
  const [matchesCount, setMatchesCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const [searchState, setSearchState] = useState({ query: '', caseSensitive: false, wholeWord: false });

  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const panesContainerRef = useRef(null);

  // Fire once: switch to preview-only on the very first file open of a fresh session.
  // After that the user owns the mode; this never triggers again.
  const firstOpenRef = useRef(true);

  const [recents, setRecents] = useState([]);
  const [notice, setNotice] = useState(null); // recovery/error banner, dismissible
  const [savedBeat, setSavedBeat] = useState(false); // status surface --success for a beat
  const [loading, setLoading] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [pref, setPref] = useState('auto');
  const [closeConfirm, setCloseConfirm] = useState(null); // { name, resolve }
  const editorHandleRef = useRef(null);
  const previewHandleRef = useRef(null);
  const activeScrollerRef = useRef('editor');
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const stateRef = useRef({ tabs: [], activeId: null });
  stateRef.current = { tabs, activeId };

  const active = tabs.find((t) => t.id === activeId) || null;

  function cycleViewMode() {
    setViewMode((cur) => {
      const next = VIEW_MODES[(VIEW_MODES.indexOf(cur) + 1) % VIEW_MODES.length];
      window.feathermark.setSettings('viewMode', next);
      return next;
    });
  }

  function setChromeMode(mode) {
    if (mode === 'focus') {
      if (!focusMode) toggleFocusMode();
      focusEditor();
      return;
    }
    if (focusMode) toggleFocusMode();
    const next = mode === 'editor' ? 'editor-only' : mode === 'preview' ? 'preview-only' : 'split';
    setViewMode(next);
    window.feathermark.setSettings('viewMode', next);
    if (mode === 'editor' || mode === 'split') focusEditor();
  }

  function runChromeMenuAction(action) {
    if (action === 'new-file') newFile();
    else if (action === 'open-file') window.feathermark.openFileDialog().then((p) => p && openPath(p));
    else if (action === 'save-file') saveActive();
    else if (action === 'save-file-as') saveAsActive();
    else if (action === 'find-replace') setFindOpen(true);
    else if (action === 'toggle-toolbar') toggleToolbar();
    else if (action === 'toggle-outline') toggleOutline();
    else if (action === 'toggle-focus') toggleFocusMode();
    else if (action === 'about') setNotice({
      tone: 'info',
      text: 'FeatherMark is a quiet, distraction-free Markdown editor built for plain-text writing.',
    });
  }

  function handleWindowAction(action) {
    window.feathermark.windowControl(action);
  }

  function toggleOutline() {
    setOutlineOpen((cur) => {
      const next = !cur;
      window.feathermark.setSettings('outlineOpen', next);
      return next;
    });
  }

  function toggleToolbar() {
    setToolbarOpen((cur) => {
      const next = !cur;
      window.feathermark.setSettings('toolbarOpen', next);
      return next;
    });
  }

  function toggleFocusMode() {
    setFocusMode((cur) => {
      const next = !cur;
      window.feathermark.setSettings('focusMode', next);
      return next;
    });
  }

  function onSelectHeading(item) {
    activeScrollerRef.current = 'editor';
    if (editorHandleRef.current) {
      editorHandleRef.current.scrollToLine(item.line, 0);
      editorHandleRef.current.jumpToPos(item.pos);
    }
  }

  function onToolbarAction(action) {
    if (editorHandleRef.current) {
      editorHandleRef.current.format(action);
    }
  }

  function onSearchChange(query, opts) {
    setSearchState({ query, caseSensitive: !!opts?.caseSensitive, wholeWord: !!opts?.wholeWord });
    if (editorHandleRef.current) {
      const count = editorHandleRef.current.setSearch(query, opts);
      setMatchesCount(count);
      setMatchIndex(0);
    }
  }

  function onFindNext() {
    if (editorHandleRef.current) {
      editorHandleRef.current.findNext();
      setMatchIndex((idx) => (matchesCount > 0 ? (idx + 1) % matchesCount : 0));
    }
  }

  function onFindPrev() {
    if (editorHandleRef.current) {
      editorHandleRef.current.findPrev();
      setMatchIndex((idx) => (matchesCount > 0 ? (idx - 1 + matchesCount) % matchesCount : 0));
    }
  }

  function onReplace(query, replaceText, opts) {
    if (editorHandleRef.current) {
      editorHandleRef.current.replace(replaceText, query, opts);
      const count = editorHandleRef.current.setSearch(query, opts);
      setMatchesCount(count);
    }
  }

  function onReplaceAll(query, replaceText, opts) {
    if (editorHandleRef.current) {
      editorHandleRef.current.replaceAll(replaceText, query, opts);
      const count = editorHandleRef.current.setSearch(query, opts);
      setMatchesCount(count);
      setMatchIndex(0);
    }
  }

  function handleSplitterMouseDown(e) {
    e.preventDefault();
    setIsDraggingSplitter(true);
    const container = panesContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent) => {
      const offsetX = moveEvent.clientX - rect.left;
      const rawRatio = offsetX / rect.width;
      const clamped = Math.max(0.2, Math.min(0.8, rawRatio));
      setSplitRatio(clamped);
    };

    const onMouseUp = (upEvent) => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const offsetX = upEvent.clientX - rect.left;
      const rawRatio = offsetX / rect.width;
      const finalRatio = Math.max(0.2, Math.min(0.8, rawRatio));
      setSplitRatio(finalRatio);
      window.feathermark.setSettings('splitRatio', finalRatio);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function resetSplitter() {
    setSplitRatio(0.5);
    window.feathermark.setSettings('splitRatio', 0.5);
  }

  function handleSplitterKeyDown(e) {
    let delta = 0;
    const step = e.shiftKey ? 0.05 : 0.02;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === '-') {
      delta = -step;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      delta = step;
    } else if (e.key === 'Home') {
      delta = -1;
    } else if (e.key === 'End') {
      delta = 1;
    } else if (e.key === 'Enter') {
      resetSplitter();
      return;
    }
    if (delta !== 0) {
      e.preventDefault();
      setSplitRatio((cur) => {
        const next = Math.max(0.2, Math.min(0.8, cur + delta));
        window.feathermark.setSettings('splitRatio', next);
        return next;
      });
    }
  }

  function onCloseFind() {
    setFindOpen(false);
    setSearchState({ query: '', caseSensitive: false, wholeWord: false });
    if (editorHandleRef.current) {
      editorHandleRef.current.clearSearch();
      editorHandleRef.current.focus();
    }
  }

  // ---- core actions ----

  function saveCurrentTabScroll() {
    const curId = stateRef.current.activeId;
    if (!curId) return;
    const curTab = stateRef.current.tabs.find((t) => t.id === curId);
    if (!curTab) return;
    if (editorHandleRef.current) {
      curTab.scroll = editorHandleRef.current.getScrollTop();
    }
    if (previewHandleRef.current) {
      curTab.previewScroll = previewHandleRef.current.getScrollTop();
    }
  }

  function focusTab(id) {
    if (id !== stateRef.current.activeId) {
      saveCurrentTabScroll();
    }
    setActiveId(id);
    window.feathermark.tabActivated(id);
    focusEditor();
  }

  async function addTab(tab, register = true) {
    setTabs((ts) => [...ts, tab]);
    setActiveId(tab.id);
    if (register) await window.feathermark.tabOpened(tab.id, tab.path);
    return tab.id;
  }

  async function openPath(pathToOpen) {
    const existing = stateRef.current.tabs.find((t) => t.path === pathToOpen);
    if (existing) { focusTab(existing.id); return; }
    setLoading(true);
    setNotice(null);
    const result = await window.feathermark.open(pathToOpen);
    setLoading(false);
    if (!result.ok) {
      setNotice({ text: result.error, tone: 'danger', path: pathToOpen });
      refreshRecents();
      return;
    }
    // First file opened on a fresh session → switch to preview so the user
    // sees their document rendered. After this the user owns the mode.
    if (firstOpenRef.current && stateRef.current.tabs.length === 0) {
      firstOpenRef.current = false;
      setViewMode('preview-only');
      window.feathermark.setSettings('viewMode', 'preview-only');
    }
    await addTab(makeTab(pathToOpen, result.content));
    refreshRecents();
  }

  async function newFile() {
    await addTab(makeTab(null, ''), true); // untitled starts dirty (deliverable 1: no path yet)
    focusEditor();
  }

  function focusEditor() {
    requestAnimationFrame(() => editorHandleRef.current && editorHandleRef.current.focus());
  }

  function markDirty(tabId, dirty) {
    setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, dirty } : t)));
    window.feathermark.tabDirty(tabId, dirty);
  }

  async function saveActive() {
    const tab = stateRef.current.tabs.find((t) => t.id === stateRef.current.activeId);
    if (!tab) return;
    if (!tab.dirty) return; // Ctrl+S on a clean file is a no-op, not an error
    if (!tab.path) return saveAsActive();
    const result = await window.feathermark.save(tab.id, tab.text);
    handleSaveResult(tab.id, result);
  }

  async function saveAsActive() {
    const tab = stateRef.current.tabs.find((t) => t.id === stateRef.current.activeId);
    if (!tab) return;
    const result = await window.feathermark.saveAs(tab.id, tab.text);
    handleSaveResult(tab.id, result);
  }

  function handleSaveResult(tabId, result) {
    if (result.ok) {
      markDirty(tabId, false);
      setTabs((ts) => ts.map((t) => (t.id === tabId
        ? { ...t, dirty: false, path: result.path || t.path, name: result.path ? basename(result.path) : t.name }
        : t)));
      setSavedBeat(true);
      setTimeout(() => setSavedBeat(false), 1200);
      refreshRecents();
      takeSnapshot(); // persist immediately: a crash right after saving must not lose the new path
    } else if (!result.canceled) {
      setNotice({ text: result.error, tone: 'danger' });
    }
  }

  function requestCloseConfirm({ title, description, primaryLabel }) {
    return new Promise((resolve) => {
      setCloseConfirm({
        title,
        description,
        primaryLabel,
        resolve: (choice) => {
          setCloseConfirm(null);
          resolve(choice);
        },
      });
    });
  }

  async function closeTab(tabId) {
    saveCurrentTabScroll();
    const tab = stateRef.current.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.dirty) {
      const choice = await requestCloseConfirm({
        title: `Save changes to “${tab.name}”?`,
        description: 'Your changes will be lost if you close this tab without saving.',
        primaryLabel: 'Save & close',
      });
      if (choice === 2) return; // cancel — text intact
      if (choice === 0) {
        const result = tab.path
          ? await window.feathermark.save(tab.id, tab.text)
          : await window.feathermark.saveAs(tab.id, tab.text);
        if (!result.ok) {
          if (!result.canceled) setNotice({ text: result.error, tone: 'danger' });
          return; // save failed or user backed out of dialog — tab stays open
        }
      }
    }
    setTabs((ts) => {
      const rest = ts.filter((t) => t.id !== tabId);
      if (rest.length === 0) setActiveId(null);
      else if (stateRef.current.activeId === tabId) focusTab(rest[rest.length - 1].id);
      return rest;
    });
    await window.feathermark.tabClosed(tabId);
  }

  function reorderTabs(sourceId, targetId) {
    setTabs((ts) => {
      const srcIdx = ts.findIndex((t) => t.id === sourceId);
      const tgtIdx = ts.findIndex((t) => t.id === targetId);
      if (srcIdx < 0 || tgtIdx < 0 || srcIdx === tgtIdx) return ts;
      const copy = [...ts];
      const [moved] = copy.splice(srcIdx, 1);
      copy.splice(tgtIdx, 0, moved);
      return copy;
    });
  }

  function cycleTab(forward = true) {
    const { tabs: ts, activeId: a } = stateRef.current;
    if (ts.length <= 1) return;
    const curIdx = ts.findIndex((t) => t.id === a);
    const nextIdx = forward
      ? (curIdx + 1) % ts.length
      : (curIdx - 1 + ts.length) % ts.length;
    focusTab(ts[nextIdx].id);
  }

  function onEditorChange(text) {
    const tabId = stateRef.current.activeId;
    if (!tabId) return;
    setTabs((ts) => ts.map((t) => {
      if (t.id !== tabId) return t;
      const wasClean = !t.dirty;
      if (wasClean) window.feathermark.tabDirty(tabId, true);
      return { ...t, text, dirty: true };
    }));
  }

  function onCursorChange(cursor) {
    const tabId = stateRef.current.activeId;
    if (!tabId) return;
    setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, cursor } : t)));
  }

  function onScrollChange(scroll) {
    const tabId = stateRef.current.activeId;
    if (!tabId) return;
    const curTab = stateRef.current.tabs.find((t) => t.id === tabId);
    if (curTab) curTab.scroll = scroll;
  }

  function onPreviewScrollChange(previewScroll) {
    const tabId = stateRef.current.activeId;
    if (!tabId) return;
    const curTab = stateRef.current.tabs.find((t) => t.id === tabId);
    if (curTab) curTab.previewScroll = previewScroll;
  }

  function onEditorScroll({ line, ratio }) {
    if (activeScrollerRef.current !== 'editor') return;
    if (previewHandleRef.current && (viewModeRef.current === 'split' || viewModeRef.current === 'preview-only')) {
      previewHandleRef.current.scrollToLine(line, ratio);
    }
  }

  function onPreviewScroll({ line, ratio }) {
    if (activeScrollerRef.current !== 'preview') return;
    if (editorHandleRef.current && (viewModeRef.current === 'split' || viewModeRef.current === 'editor-only')) {
      editorHandleRef.current.scrollToLine(line, ratio);
    }
  }

  // ---- session snapshot / restore ----

  function buildSnapshot() {
    saveCurrentTabScroll();
    const { tabs: ts, activeId: a } = stateRef.current;
    return {
      active: ts.findIndex((t) => t.id === a),
      tabs: ts.map((t) => ({
        id: t.id, path: t.path, dirty: t.dirty, cursor: t.cursor, scroll: t.scroll || 0, previewScroll: t.previewScroll || 0,
        text: t.dirty && t.text.length <= SESSION_TEXT_CAP ? t.text : undefined,
      })),
    };
  }

  function takeSnapshot() {
    return window.feathermark.snapshot(buildSnapshot());
  }

  async function restoreSession() {
    const session = await window.feathermark.getSession();
    if (!session || session.tabs.length === 0) { await newFile(); return; } // honest start: one empty tab, no void
    const seenIds = new Set();
    const restored = [];
    for (const t of session.tabs) {
      let text = t.text;
      if (text === undefined && t.path) {
        const result = await window.feathermark.open(t.path);
        text = result.ok ? result.content : '';
        if (!result.ok) setNotice({ text: result.error, tone: 'danger', path: t.path });
      }
      const m = typeof t.id === 'string' && /^t(\d+)$/.exec(t.id);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= nextTabId) nextTabId = n + 1;
      }
      const id = (!t.id || seenIds.has(t.id)) ? newTabId() : t.id;
      seenIds.add(id);
      restored.push({ id, path: t.path || null,
        name: t.path ? basename(t.path) : 'Untitled',
        text: text || '', dirty: !!t.dirty, cursor: t.cursor || 0, scroll: t.scroll || 0, previewScroll: t.previewScroll || 0 });
    }
    for (const tab of restored) {
      await window.feathermark.tabOpened(tab.id, tab.path);
      if (tab.dirty) await window.feathermark.tabDirty(tab.id, true);
    }
    setTabs(restored);
    const idx = Math.max(0, Math.min(session.active ?? 0, restored.length - 1));
    focusTab(restored[idx].id);
    requestAnimationFrame(() => {
      if (editorHandleRef.current && restored[idx].scroll) {
        editorHandleRef.current.setScrollTop(restored[idx].scroll);
      }
      if (previewHandleRef.current && restored[idx].previewScroll) {
        previewHandleRef.current.setScrollTop(restored[idx].previewScroll);
      }
    });
  }

  // ---- save-all (quit flow driven by main) ----

  async function saveAll(tabIds) {
    let ok = true;
    for (const publicId of tabIds) {
      const tab = stateRef.current.tabs.find((t) => t.id === publicId);
      if (!tab || !tab.dirty) continue;
      const result = tab.path
        ? await window.feathermark.save(tab.id, tab.text)
        : await window.feathermark.saveAs(tab.id, tab.text);
      if (!result.ok) ok = false;
      else markDirty(tab.id, false);
    }
    window.feathermark.saveAllDone(ok);
  }

  // ---- recents ----

  async function refreshRecents() {
    setRecents(await window.feathermark.getRecent());
  }

  async function forgetRecent(pathToForget) {
    await window.feathermark.forgetRecent(pathToForget);
    refreshRecents();
  }

  async function clearMissingRecents() {
    const missing = recents.filter((r) => !r.exists);
    for (const r of missing) {
      await window.feathermark.forgetRecent(r.path);
    }
    refreshRecents();
  }

  function onRecentClick(r) {
    if (r.exists) return openPath(r.path);
    // explain, never fail silently (copy rules: what went wrong + the fix)
    setNotice({
      tone: 'warning',
      text: '“' + basename(r.path) + '” is no longer at ' + r.path + ' — it was moved, renamed, or deleted. Open it by name from its new location, or remove it from the list.',
    });
  }

  // ---- effects: IPC wiring, once ----

  useEffect(() => {
    const off = [];
    off.push(initTheme());
    getThemePref().then(setPref);

    off.push(window.feathermark.onMenu((action) => {
      if (action === 'open-file') window.feathermark.openFileDialog().then((p) => p && openPath(p));
      else if (action === 'new-file') newFile();
      else if (action === 'save-file') saveActive();
      else if (action === 'save-file-as') saveAsActive();
      else if (action === 'close-tab') closeTab(stateRef.current.activeId);
      else if (action === 'toggle-preview') cycleViewMode();
      else if (action === 'toggle-outline') toggleOutline();
      else if (action === 'toggle-toolbar') toggleToolbar();
      else if (action === 'toggle-focus') toggleFocusMode();
      else if (action === 'find-replace') setFindOpen(true);
      else if (action === 'undo') { if (editorHandleRef.current) editorHandleRef.current.undo(); }
      else if (action === 'redo') { if (editorHandleRef.current) editorHandleRef.current.redo(); }
    }));

    window.feathermark.getSettings('viewMode', 'split').then((v) => {
      if (VIEW_MODES.includes(v)) setViewMode(v);
    });
    window.feathermark.getSettings('outlineOpen', false).then((v) => setOutlineOpen(!!v));
    window.feathermark.getSettings('toolbarOpen', false).then((v) => setToolbarOpen(!!v));
    window.feathermark.getSettings('focusMode', false).then((v) => setFocusMode(!!v));
    // Always start split divider at center (0.5); never restore a saved ratio.
    setSplitRatio(0.5);
    window.feathermark.setSettings('splitRatio', 0.5);

    off.push(window.feathermark.onDropOpen((p) => openPath(p)));
    off.push(window.feathermark.onSnapshotRequest(() => takeSnapshot()));
    off.push(window.feathermark.onSaveAllRequest((tabIds) => saveAll(tabIds)));
    off.push(window.feathermark.onConfirmExitRequest(async ({ count, name }) => {
      const choice = await requestCloseConfirm({
        title: count === 1 ? `Save changes to “${name}”?` : `Save changes to ${count} unsaved files?`,
        description: 'Your changes will be lost if you close the app without saving.',
        primaryLabel: count === 1 ? 'Save & quit' : 'Save all',
      });
      window.feathermark.confirmExitDone(choice);
    }));
    off.push(window.feathermark.onRecoveryNotice((n) => {
      setNotice({
        tone: 'warning',
        text: n.backupPath
          ? 'Your settings file was corrupt and could not be read. FeatherMark saved a copy at ' + n.backupPath + ' and started with fresh settings. If your recent files or theme were lost, copy the values back from that file.'
          : 'Your settings file was corrupt and could not be recovered to a copy. FeatherMark started with fresh settings.',
      });
    }));

    refreshRecents();
    restoreSession();
    if (window.feathermark.getRecoveryNotice) {
      window.feathermark.getRecoveryNotice().then((n) => {
        if (n) {
          setNotice({
            tone: 'warning',
            text: n.backupPath
              ? 'Your settings file was corrupt and could not be read. FeatherMark saved a copy at ' + n.backupPath + ' and started with fresh settings. If your recent files or theme were lost, copy the values back from that file.'
              : 'Your settings file was corrupt and could not be recovered to a copy. FeatherMark started with fresh settings.',
          });
        }
      });
    }
    return () => { off.forEach((f) => f()); };
  }, []);

  // Autosave session snapshot debounced on state change
  useEffect(() => {
    const timer = setTimeout(() => {
      takeSnapshot();
    }, 1000);
    return () => clearTimeout(timer);
  }, [tabs, activeId]);

  // Restore scroll positions across viewMode changes
  useEffect(() => {
    requestAnimationFrame(() => {
      const cur = stateRef.current.tabs.find((t) => t.id === stateRef.current.activeId);
      if (!cur) return;
      if (viewMode !== 'preview-only' && editorHandleRef.current && cur.scroll) {
        editorHandleRef.current.setScrollTop(cur.scroll);
      }
      if (viewMode !== 'editor-only' && previewHandleRef.current && cur.previewScroll) {
        previewHandleRef.current.setScrollTop(cur.previewScroll);
      }
    });
  }, [viewMode, activeId]);

  // Window-level keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFocusMode();
      } else if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleToolbar();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        toggleOutline();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFocusMode();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'f' || key === 'h') {
          e.preventDefault();
          setFindOpen(true);
        } else if (key === 'z' && !e.shiftKey) {
          // Ctrl+Z — undo. Route to CodeMirror (native Electron role is replaced;
          // we must handle it here to avoid execCommand clobbering CM6's history).
          e.preventDefault();
          if (editorHandleRef.current) editorHandleRef.current.undo();
        } else if (key === 'z' && e.shiftKey) {
          // Ctrl+Shift+Z — redo (macOS standard; also common on Windows)
          e.preventDefault();
          if (editorHandleRef.current) editorHandleRef.current.redo();
        } else if (key === 'y' && !e.shiftKey) {
          // Ctrl+Y — redo (Windows standard shortcut)
          e.preventDefault();
          if (editorHandleRef.current) editorHandleRef.current.redo();
        } else if (key === 's' && !e.shiftKey) {
          e.preventDefault();
          saveActive();
        } else if (key === 's' && e.shiftKey) {
          e.preventDefault();
          saveAsActive();
        } else if (key === 'o' && !e.shiftKey) {
          e.preventDefault();
          window.feathermark.openFileDialog().then((p) => p && openPath(p));
        } else if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          newFile();
        } else if (key === 'w' && !e.shiftKey) {
          e.preventDefault();
          if (stateRef.current.activeId) closeTab(stateRef.current.activeId);
        } else if (key === 'e' && !e.shiftKey) {
          e.preventDefault();
          cycleViewMode();
        } else if (key === 'tab') {
          e.preventDefault();
          cycleTab(!e.shiftKey);
        }
      } else if (e.key === 'Escape' && findOpen) {
        e.preventDefault();
        onCloseFind();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [findOpen]);

  // ---- drag over window (visual affordance; content arrives via main or webUtils) ----

  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e) => { e.preventDefault(); depth += 1; setDropping(true); };
    const onDragOver = (e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; };
    const onDragLeave = (e) => { e.preventDefault(); depth -= 1; if (depth <= 0) setDropping(false); };
    const onDrop = (e) => {
      e.preventDefault();
      depth = 0;
      setDropping(false);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          let p = null;
          try {
            if (window.feathermark.getPathForFile) {
              p = window.feathermark.getPathForFile(files[i]);
            }
          } catch (_) {}
          if (!p && files[i].path) {
            p = files[i].path;
          }
          if (p && /\.(md|markdown|txt)$/i.test(p)) {
            openPath(p);
            break;
          }
        }
      }
    };
    document.addEventListener('dragenter', onDragEnter);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onDragEnter);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);

  // ---- render ----

  return h('div', { class: 'shell' + (dropping ? ' is-dropping' : '') + (focusMode ? ' is-focus' : '') },
    h(AppHeader, { onWindowAction: handleWindowAction }),
    h('div', { class: 'workspace' },
      h(AppMenuBar, {
        mode: focusMode ? 'focus' : viewMode === 'editor-only' ? 'editor' : viewMode === 'preview-only' ? 'preview' : 'split',
        onModeChange: setChromeMode,
        themePref: pref,
        onThemeChange: (p) => setThemePref(p).then(setPref),
        onMenuAction: runChromeMenuAction,
        findOpen,
        toolbarOpen,
      }),
      h(TabBar, { tabs, activeId, onSelect: focusTab, onClose: closeTab, onNew: newFile, onReorder: reorderTabs }),
      tabs.length > 0 && h(Toolbar, {
        isOpen: toolbarOpen,
        onAction: onToolbarAction,
        onClose: () => toggleToolbar(),
      }),
      notice && h('div', { class: 'notice notice-' + notice.tone, role: 'alert' },
        h('span', {}, notice.text),
        h('button', { class: 'notice-close', 'aria-label': 'Dismiss', onClick: () => setNotice(null) },
          h('svg', {
            width: '12', height: '12', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.5', 'stroke-linecap': 'round', 'aria-hidden': 'true',
          }, h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' }))),
      ),
      loading && h('div', { class: 'loading' }, h('span', { class: 'loading-bar', 'aria-label': 'Loading file' })),
      tabs.length === 0 ? h('main', { class: 'empty' },
        h('div', { class: 'empty-shell' },
          h('div', { class: 'empty-hero' },
            h('p', { class: 'empty-hint' }, 'Open a file to start writing, or press Ctrl+O.'),
            h('div', { class: 'empty-actions' },
              h('button', {
                type: 'button',
                class: 'empty-action',
                onClick: () => window.feathermark.openFileDialog().then((p) => p && openPath(p)),
              }, h(FolderOpenIcon), h('span', null, 'Open a file')),
              h('button', {
                type: 'button',
                class: 'empty-action-secondary',
                onClick: newFile,
              }, h(FilePlusIcon), h('span', null, 'New document')),
            ),
          ),
          h(RecentFiles, { recents, onOpen: onRecentClick, onForget: forgetRecent, onClearMissing: clearMissingRecents }),
        ),
      ) : h('div', { class: 'workspace-content' },
        h(Outline, {
          text: active ? active.text : '',
          activeLine: cursorPos.line - 1,
          isOpen: outlineOpen,
          onSelectHeading,
          onClose: () => toggleOutline(),
        }),
        h('main', { ref: panesContainerRef, class: 'workspace-panes is-' + viewMode },
          active && h(FindReplace, {
            isOpen: findOpen,
            matchesCount,
            currentIndex: matchIndex,
            onSearchChange,
            onFindNext,
            onFindPrev,
            onReplace,
            onReplaceAll,
            onClose: onCloseFind,
          }),
          active && h('div', {
            class: 'editor-surface',
            onMouseEnter: () => { activeScrollerRef.current = 'editor'; },
            onWheel: () => { activeScrollerRef.current = 'editor'; },
            style: viewMode === 'split' ? { flex: `0 0 calc(${splitRatio * 100}% - 2.5px)`, width: `calc(${splitRatio * 100}% - 2.5px)` } : undefined,
          },
            h(Editor, {
              key: active.id,
              tabId: active.id,
              initialText: active.text,
              initialCursor: active.cursor,
              initialScroll: active.scroll,
              onChange: onEditorChange,
              onCursorChange: onCursorChange,
              onCursorInfoChange: setCursorPos,
              onScrollChange: onScrollChange,
              onEditorScroll: onEditorScroll,
              editorHandleRef: editorHandleRef,
            })
          ),
          active && viewMode === 'split' && h('div', {
            class: 'splitter' + (isDraggingSplitter ? ' is-dragging' : ''),
            role: 'separator',
            tabIndex: 0,
            'aria-label': 'Resize editor and preview panes',
            'aria-valuenow': Math.round(splitRatio * 100),
            'aria-valuemin': 20,
            'aria-valuemax': 80,
            onMouseDown: handleSplitterMouseDown,
            onDoubleClick: resetSplitter,
            onKeyDown: handleSplitterKeyDown,
          }),
          active && h('div', {
            class: 'preview-surface',
            onMouseEnter: () => { activeScrollerRef.current = 'preview'; },
            onWheel: () => { activeScrollerRef.current = 'preview'; },
            style: viewMode === 'split' ? { flex: '1 1 0px', minWidth: 0 } : undefined,
          },
            h(Preview, {
              key: 'prev-' + active.id,
              text: active.text,
              initialScroll: active.previewScroll || 0,
              onScrollChange: onPreviewScrollChange,
              onPreviewScroll: onPreviewScroll,
              previewHandleRef: previewHandleRef,
              searchQuery: findOpen ? searchState.query : '',
              searchOpts: searchState,
              matchIndex,
            })
          ),
        ),
      ),
    ),
    dropping && h('div', { class: 'drop-overlay' },
      h('div', { class: 'drop-frame' }, 'Drop a Markdown or text file to open it'),
    ),
    closeConfirm && h(ConfirmCloseDialog, {
      title: closeConfirm.title,
      description: closeConfirm.description,
      primaryLabel: closeConfirm.primaryLabel,
      onResolve: closeConfirm.resolve,
    }),
    h('footer', {
      class: 'statusbar' + (savedBeat ? ' is-saved' : '') + (focusMode ? ' is-focus' : ''),
      'aria-hidden': 'true',
    })
  );
}

render(h(App, null), document.getElementById('root'));
