// FeatherMark — Row 1: Title Bar (40px).
// Layout: [Official feather icon 20x20] [gap 8px] ["FeatherMark" 13.5px 600] [flex spacer] [window controls]

import { h } from 'preact';

function WindowIcon({ type }) {
  const children = {
    minimize: h('line', { x1: '3', y1: '8', x2: '13', y2: '8' }),
    maximize: h('rect', { x: '3.5', y: '3.5', width: '9', height: '9' }),
    close: [
      h('line', { x1: '4', y1: '4', x2: '12', y2: '12' }),
      h('line', { x1: '12', y1: '4', x2: '4', y2: '12' }),
    ],
  };
  return h('svg', {
    width: '14',
    height: '14',
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.35',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, children[type]);
}

export function AppHeader({ onWindowAction }) {
  const controls = [
    ['minimize', 'Minimize'],
    ['maximize', 'Maximize or restore'],
    ['close', 'Close FeatherMark'],
  ];

  return h('header', { class: 'app-header' },
    h('div', { class: 'app-brand', 'aria-label': 'FeatherMark' },
      h('img', {
        class: 'app-brand-icon',
        src: '../assets/icon.png',
        alt: '',
        width: 20,
        height: 20,
        draggable: false,
      }),
      h('span', { class: 'app-brand-name' }, 'FeatherMark'),
    ),
    h('div', { class: 'app-drag-region', 'aria-hidden': 'true' }),
    h('div', { class: 'app-window-controls', role: 'group', 'aria-label': 'Window controls' },
      controls.map(([type, label]) => h('button', {
        key: type,
        type: 'button',
        class: 'app-window-control is-' + type,
        'aria-label': label,
        title: label,
        onClick: () => onWindowAction(type),
      }, h(WindowIcon, { type }))),
    ),
  );
}
