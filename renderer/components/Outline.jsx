// FeatherMark — Outline rail component (Phase 06).
// 260px wide left rail displaying live document headings.
// Indent per heading level via tone steps, active section tracking, keyboard navigation (Up/Down/Enter),
// and collapsible with Ctrl+Shift+O.

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export function extractHeadings(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const headings = [];
  let inFence = false;
  let charOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
    } else if (!inFence) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          title: match[2].trim(),
          line: i,
          pos: charOffset,
        });
      }
    }
    charOffset += line.length + 1;
  }
  return headings;
}

export function Outline({
  text = '',
  activeLine = 0,
  isOpen = true,
  onSelectHeading,
  onClose,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const headings = extractHeadings(text);
  const listRef = useRef(null);

  // Track active heading based on editor's current active line
  let activeIndex = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].line <= activeLine) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Handle keyboard navigation: Up/Down arrow moves, Enter jumps
  const handleKeyDown = (e) => {
    if (headings.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => Math.min(headings.length - 1, idx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => Math.max(0, idx - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hItem = headings[selectedIndex];
      if (hItem && onSelectHeading) {
        onSelectHeading(hItem);
      }
    } else if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return h('aside', {
    class: 'outline-rail',
    role: 'navigation',
    'aria-label': 'Document outline',
    tabIndex: 0,
    onKeyDown: handleKeyDown,
  },
    h('div', { class: 'outline-header' },
      h('span', { class: 'outline-title' }, 'Outline'),
      onClose && h('button', {
        class: 'outline-close',
        'aria-label': 'Close outline (Ctrl+Shift+O)',
        onClick: onClose,
      }, '×')
    ),
    headings.length === 0
      ? h('div', { class: 'outline-empty' },
          h('p', {}, 'No headings found in this document. Add # Headings to navigate.')
        )
      : h('ul', { ref: listRef, class: 'outline-list' },
          headings.map((item, idx) => {
            const isActive = idx === (activeIndex >= 0 ? activeIndex : 0);
            const isSelected = idx === selectedIndex;
            return h('li', {
              key: `${item.line}-${idx}`,
              class: `outline-item level-${item.level}` +
                (isActive ? ' is-active' : '') +
                (isSelected ? ' is-selected' : ''),
              onClick: () => {
                setSelectedIndex(idx);
                if (onSelectHeading) onSelectHeading(item);
              },
            },
              h('span', { class: 'outline-marker' }),
              h('span', { class: 'outline-text' }, item.title)
            );
          })
        )
  );
}
