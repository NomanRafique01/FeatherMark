// FeatherMark — Shared ThemeToggle (system / light / dark) + sliding pill hook.
// Used in both AppMenuBar (standard 34px) and Toolbar (compact 26px).

import { h } from 'preact';
import { SegmentedToggle } from './SegmentedToggle.jsx';

export const THEME_OPTIONS = [
  { value: 'auto', label: 'Follow system theme', icon: 'system' },
  { value: 'light', label: 'Use light theme', icon: 'light' },
  { value: 'dark', label: 'Use dark theme', icon: 'dark' },
];

export function ThemeIcon({ name, size = 16 }) {
  if (name === 'dark') {
    return h('svg', {
      width: String(size),
      height: String(size),
      viewBox: '0 0 16 16',
      fill: 'currentColor',
      stroke: 'none',
      'aria-hidden': 'true',
    },
      h('path', { d: 'M 6.61 2.89 A 5.6 5.6 0 1 0 13.11 9.39 A 4.6 4.6 0 0 1 6.61 2.89 Z' }),
    );
  }

  const common = {
    width: String(size),
    height: String(size),
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };

  if (name === 'light') {
    return h('svg', common,
      h('circle', { cx: '8', cy: '8', r: '3' }),
      h('line', { x1: '8', y1: '4', x2: '8', y2: '1.5' }),
      h('line', { x1: '12', y1: '8', x2: '14.5', y2: '8' }),
      h('line', { x1: '8', y1: '12', x2: '8', y2: '14.5' }),
      h('line', { x1: '4', y1: '8', x2: '1.5', y2: '8' }),
      h('line', { x1: '10.83', y1: '5.17', x2: '12.10', y2: '3.90' }),
      h('line', { x1: '10.83', y1: '10.83', x2: '12.10', y2: '12.10' }),
      h('line', { x1: '5.17', y1: '10.83', x2: '3.90', y2: '12.10' }),
      h('line', { x1: '5.17', y1: '5.17', x2: '3.90', y2: '3.90' }),
    );
  }

  // system (Monitor)
  return h('svg', common,
    h('rect', { x: '2', y: '3', width: '12', height: '8', rx: '1.5' }),
    h('line', { x1: '8', y1: '11', x2: '8', y2: '13.5' }),
    h('line', { x1: '5.5', y1: '13.5', x2: '10.5', y2: '13.5' }),
    h('line', { x1: '4', y1: '9', x2: '12', y2: '9', opacity: '0.4' }),
  );
}

export function ThemeToggle({ value, onChange, compact = false }) {
  const iconSize = compact ? 13 : 16;

  return h(SegmentedToggle, {
    options: THEME_OPTIONS,
    value,
    onChange,
    ariaLabel: 'Color theme',
    className: 'theme-segmented' + (compact ? ' is-compact' : ''),
    pillClassName: 'theme-segment-pill',
    optionClassName: (option) => 'theme-segment is-' + option.value,
    renderOption: (option) => h(ThemeIcon, { name: option.icon, size: iconSize }),
  });
}
