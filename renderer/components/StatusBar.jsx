// FeatherMark — Status bar component (Phase 06).
// 28px height, quiet tone-separated bottom chrome.
// Shows word/character counts, reading time (words/240), cursor Ln/Col,
// selection count, and a compact format label. Primary controls live in the top app chrome.

import { h } from 'preact';

export function StatusBar({
  active,
  cursorPos = { line: 1, col: 1, selectionLength: 0 },
  savedBeat = false,
  focusMode = false,
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
    )
  );
}
