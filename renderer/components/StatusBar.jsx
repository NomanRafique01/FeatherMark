// FeatherMark — Status bar component (Phase 06).
// 28px height, quiet tone-separated bottom chrome.
// Shows word/character counts, reading time (words/240), cursor Ln/Col,
// selection count, format badge (sentence-case, no pill), view mode, and theme.

import { h } from 'preact';

const THEME_PREFS = ['auto', 'light', 'dark'];
const VIEW_MODES = [
  { id: 'editor-only', label: 'Editor' },
  { id: 'split', label: 'Split' },
  { id: 'preview-only', label: 'Preview' },
];

export function StatusBar({
  active,
  cursorPos = { line: 1, col: 1, selectionLength: 0 },
  viewMode = 'split',
  onViewModeChange,
  themePref = 'auto',
  onThemeChange,
  focusMode = false,
  onToggleFocusMode,
  savedBeat = false,
}) {
  const text = active ? active.text || '' : '';
  const wordCount = (text.match(/\S+/g) || []).length;
  const charCount = text.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 240));

  const formatBadge = active && active.path && active.path.endsWith('.txt')
    ? 'Plain text'
    : 'Markdown';

  return h('footer', {
    class: 'statusbar' + (savedBeat ? ' is-saved' : '') + (focusMode ? ' is-focus' : ''),
    role: 'status',
  },
    h('div', { class: 'statusbar-left' },
      h('span', { class: 'status-file' }, active
        ? active.name + (active.dirty ? ' ·' : '') + ' — ' + (active.path || 'not saved yet')
        : 'No file open'),
      active && h('span', { class: 'status-format' }, formatBadge)
    ),
    h('div', { class: 'statusbar-right' },
      active && h('span', { class: 'status-cursor' },
        `Ln ${cursorPos.line}, Col ${cursorPos.col}` +
        (cursorPos.selectionLength > 0 ? ` (${cursorPos.selectionLength} selected)` : '')
      ),
      active && h('span', { class: 'status-count' },
        `${wordCount} words · ${charCount} chars · ${readingTimeMinutes} min read`
      ),
      h('button', {
        class: 'status-saved',
        'aria-live': 'polite',
        disabled: !savedBeat,
      }, savedBeat ? 'Saved' : ' '),
      onToggleFocusMode && h('button', {
        class: 'status-focus-toggle' + (focusMode ? ' is-active' : ''),
        'aria-pressed': focusMode,
        title: 'Toggle focus mode (F11)',
        onClick: onToggleFocusMode,
      }, 'Focus'),
      onViewModeChange && h('div', { class: 'statusbar-viewmode', role: 'group', 'aria-label': 'View mode' },
        VIEW_MODES.map((m) => h('button', {
          key: m.id,
          'aria-pressed': viewMode === m.id,
          onClick: () => onViewModeChange(m.id),
        }, m.label))
      ),
      onThemeChange && h('div', { class: 'statusbar-theme', role: 'group', 'aria-label': 'Theme' },
        THEME_PREFS.map((p) => h('button', {
          key: p,
          'aria-pressed': themePref === p,
          onClick: () => onThemeChange(p),
        }, p === 'auto' ? 'System' : p[0].toUpperCase() + p.slice(1)))
      )
    )
  );
}
