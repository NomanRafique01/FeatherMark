// FeatherMark — Toolbar component (Phase 06).
// 32px height formatting bar with geometric 1.5px line icons,
// keyboard reachable (Alt+T then arrows), tooltips with shortcuts, grouped by tone steps.
// Strictly NO emoji glyphs, NO filled icon squares, NO text labels.

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

// 14x14 geometric vector icons with 1.5px stroke
function SvgIcon({ children, viewBox = '0 0 16 16' }) {
  return h('svg', {
    width: '14',
    height: '14',
    viewBox,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, children);
}

const TOOLS = [
  {
    id: 'bold',
    label: 'Bold (Ctrl+B)',
    action: 'bold',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M4 2.5h4.5a2.5 2.5 0 0 1 0 5H4V2.5z' }),
      h('path', { d: 'M4 7.5h5.5a2.5 2.5 0 0 1 0 5H4V7.5z' })
    ),
  },
  {
    id: 'italic',
    label: 'Italic (Ctrl+I)',
    action: 'italic',
    icon: () => h(SvgIcon, null,
      h('line', { x1: '10', y1: '2.5', x2: '6', y2: '13.5' }),
      h('line', { x1: '7', y1: '2.5', x2: '12', y2: '2.5' }),
      h('line', { x1: '4', y1: '13.5', x2: '9', y2: '13.5' })
    ),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    action: 'strike',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M11.5 5.5a3 3 0 0 0-5-1.5c-1.5 1-1.5 2.5 0 3.5' }),
      h('path', { d: 'M4.5 10.5a3 3 0 0 0 5 1.5c1.5-1 1.5-2.5 0-3.5' }),
      h('line', { x1: '2', y1: '8', x2: '14', y2: '8' })
    ),
  },
  {
    id: 'code',
    label: 'Inline code',
    action: 'code',
    icon: () => h(SvgIcon, null,
      h('polyline', { points: '5 5 2 8 5 11' }),
      h('polyline', { points: '11 5 14 8 11 11' }),
      h('line', { x1: '9.5', y1: '3.5', x2: '6.5', y2: '12.5' })
    ),
  },
  { type: 'sep' },
  {
    id: 'h1',
    label: 'Heading 1',
    action: 'h1',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M2 3.5v9M8 3.5v9M2 8h6' }),
      h('path', { d: 'M12 5.5l1.5-1v8' })
    ),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    action: 'h2',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M2 3.5v9M7 3.5v9M2 8h5' }),
      h('path', { d: 'M10.5 6a1.8 1.8 0 0 1 3.2 1c0 1.2-1.2 2-2.2 3.5h3.5' })
    ),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    action: 'h3',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M2 3.5v9M7 3.5v9M2 8h5' }),
      h('path', { d: 'M10.5 5h3.5l-2 3a1.8 1.8 0 1 1-1.2 2.5' })
    ),
  },
  { type: 'sep' },
  {
    id: 'quote',
    label: 'Blockquote',
    action: 'quote',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M3 8.5h2.5a1.5 1.5 0 0 0 1.5-1.5V5.5a1.5 1.5 0 0 0-1.5-1.5H3v4.5zm0 0c0 2 1.5 3.5 3 3.5' }),
      h('path', { d: 'M9.5 8.5H12a1.5 1.5 0 0 0 1.5-1.5V5.5A1.5 1.5 0 0 0 12 4H9.5v4.5zm0 0c0 2 1.5 3.5 3 3.5' })
    ),
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    action: 'bullet',
    icon: () => h(SvgIcon, null,
      h('circle', { cx: '3', cy: '4.5', r: '1', fill: 'currentColor' }),
      h('line', { x1: '6.5', y1: '4.5', x2: '14', y2: '4.5' }),
      h('circle', { cx: '3', cy: '8', r: '1', fill: 'currentColor' }),
      h('line', { x1: '6.5', y1: '8', x2: '14', y2: '8' }),
      h('circle', { cx: '3', cy: '11.5', r: '1', fill: 'currentColor' }),
      h('line', { x1: '6.5', y1: '11.5', x2: '14', y2: '11.5' })
    ),
  },
  {
    id: 'task',
    label: 'Task list',
    action: 'task',
    icon: () => h(SvgIcon, null,
      h('rect', { x: '2', y: '3', width: '5', height: '5', rx: '1' }),
      h('polyline', { points: '3 5.5 4.5 7 7 4' }),
      h('line', { x1: '9.5', y1: '5.5', x2: '14', y2: '5.5' }),
      h('rect', { x: '2', y: '10', width: '5', height: '5', rx: '1' }),
      h('line', { x1: '9.5', y1: '12.5', x2: '14', y2: '12.5' })
    ),
  },
  {
    id: 'table',
    label: 'Table',
    action: 'table',
    icon: () => h(SvgIcon, null,
      h('rect', { x: '2', y: '3', width: '12', height: '10', rx: '1' }),
      h('line', { x1: '2', y1: '7', x2: '14', y2: '7' }),
      h('line', { x1: '8', y1: '3', x2: '8', y2: '13' })
    ),
  },
  {
    id: 'hr',
    label: 'Horizontal line',
    action: 'hr',
    icon: () => h(SvgIcon, null,
      h('line', { x1: '2', y1: '8', x2: '14', y2: '8' })
    ),
  },
  {
    id: 'fence',
    label: 'Code block',
    action: 'fence',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M5 3.5c-1.5 0-2 .5-2 2v1.5c0 1-.5 1.5-1.5 1.5 1 0 1.5.5 1.5 1.5V11c0 1.5.5 2 2 2' }),
      h('path', { d: 'M11 3.5c1.5 0 2 .5 2 2v1.5c0 1 .5 1.5 1.5 1.5-1 0-1.5.5-1.5 1.5V11c0 1.5-.5 2-2 2' })
    ),
  },
  {
    id: 'link',
    label: 'Link (Ctrl+K)',
    action: 'link',
    icon: () => h(SvgIcon, null,
      h('path', { d: 'M6.5 9.5a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24l-1 1' }),
      h('path', { d: 'M9.5 6.5a3 3 0 0 0-4.24 0l-2 2a3 3 0 0 0 4.24 4.24l1-1' })
    ),
  },
  {
    id: 'image',
    label: 'Image',
    action: 'image',
    icon: () => h(SvgIcon, null,
      h('rect', { x: '2', y: '3', width: '12', height: '10', rx: '1' }),
      h('circle', { cx: '5.5', cy: '6.5', r: '1' }),
      h('path', { d: 'M14 11l-3.5-3.5-5 5' })
    ),
  },
];

export function Toolbar({
  isOpen = false,
  onAction,
  onClose,
}) {
  const barRef = useRef(null);

  // Roving keyboard navigation: ArrowLeft/ArrowRight to move, Esc to close
  const handleKeyDown = (e) => {
    if (!barRef.current) return;
    const buttons = Array.from(barRef.current.querySelectorAll('.toolbar-btn, .toolbar-close'));
    const curIndex = buttons.indexOf(document.activeElement);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (curIndex + 1) % buttons.length;
      buttons[next].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (curIndex - 1 + buttons.length) % buttons.length;
      buttons[prev].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  return h('div', {
    ref: barRef,
    class: 'editor-toolbar',
    role: 'toolbar',
    'aria-label': 'Markdown formatting tools',
    onKeyDown: handleKeyDown,
  },
    TOOLS.map((t, idx) => {
      if (t.type === 'sep') {
        return h('span', { key: `sep-${idx}`, class: 'toolbar-sep', role: 'separator' });
      }
      return h('button', {
        key: t.id,
        class: 'toolbar-btn',
        title: t.label,
        'aria-label': t.label,
        tabIndex: 0,
        onClick: () => onAction && onAction(t.action),
      },
        t.icon()
      );
    }),
    onClose && h('button', {
      class: 'toolbar-close',
      title: 'Hide toolbar (Alt+T)',
      'aria-label': 'Hide toolbar',
      tabIndex: 0,
      onClick: onClose,
    }, '×')
  );
}
