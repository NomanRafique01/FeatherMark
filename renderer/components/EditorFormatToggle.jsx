// FeatherMark — source-format switch for the editor pane.
// Uses the same sliding-pill language as the global theme/view controls.

import { h } from 'preact';
import { useSlidingPill } from './ThemeToggle.jsx';

function FormatIcon({ name }) {
  const common = {
    width: '14',
    height: '14',
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };

  if (name === 'plain') {
    return h('svg', common,
      h('line', { x1: '2', y1: '4', x2: '14', y2: '4' }),
      h('line', { x1: '2', y1: '8', x2: '11', y2: '8' }),
      h('line', { x1: '2', y1: '12', x2: '14', y2: '12' }),
    );
  }

  // A geometric M mark makes Markdown distinct without introducing a new
  // filled glyph or competing with FeatherMark's existing icon language.
  return h('svg', common,
    h('path', { d: 'M2.5 12V4h2l3.5 5 3.5-5h2v8' }),
  );
}

export function EditorFormatToggle({ value = 'markdown', onChange }) {
  const { containerRef, pillRef } = useSlidingPill(value);
  const options = [
    { value: 'plain', label: 'Plain text', icon: 'plain' },
    { value: 'markdown', label: 'Markdown', icon: 'markdown' },
  ];

  return h('div', {
    ref: containerRef,
    class: 'editor-format-toggle',
    role: 'group',
    'aria-label': 'Editing format',
  },
    h('span', { ref: pillRef, class: 'editor-format-pill', 'aria-hidden': 'true' }),
    options.map((option) => h('button', {
      key: option.value,
      type: 'button',
      class: 'editor-format-option',
      'aria-pressed': String(value === option.value),
      'aria-label': `Edit as ${option.label}`,
      title: `Edit as ${option.label}`,
      onClick: () => onChange && onChange(option.value),
    },
      h('span', { class: 'editor-format-icon' }, h(FormatIcon, { name: option.icon })),
      h('span', { class: 'editor-format-label' }, option.label),
    )),
  );
}
