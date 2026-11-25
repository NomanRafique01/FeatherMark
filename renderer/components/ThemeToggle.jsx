// FeatherMark — Shared ThemeToggle (system / light / dark) + sliding pill hook.
// Used in both AppMenuBar (standard 34px) and Toolbar (compact 26px).

import { h } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export const THEME_OPTIONS = [
  { value: 'auto', label: 'Follow system theme', icon: 'system' },
  { value: 'light', label: 'Use light theme', icon: 'light' },
  { value: 'dark', label: 'Use dark theme', icon: 'dark' },
];

export function useSlidingPill(value) {
  const containerRef = useRef(null);
  const pillRef = useRef(null);
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return undefined;

    const syncPill = (instant = false) => {
      const activeBtn = container.querySelector('[aria-pressed="true"]');
      if (!activeBtn) return;
      const padLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
      if (instant) pill.style.transition = 'none';
      pill.style.transform = `translateX(${activeBtn.offsetLeft - padLeft}px)`;
      pill.style.width = `${activeBtn.offsetWidth}px`;
      if (instant) {
        // Commit layout immediately so subsequent value changes still animate smoothly
        void pill.offsetWidth;
        pill.style.transition = '';
      }
    };

    // Instant on first mount (no startup slide-in); smooth on user value changes
    syncPill(!mountedRef.current);
    mountedRef.current = true;

    // Instant on container resize so the pill tracks fluid button widths with zero lag
    const observer = new ResizeObserver(() => syncPill(true));
    observer.observe(container);
    return () => observer.disconnect();
  }, [value]);

  return { containerRef, pillRef };
}

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
  const { containerRef, pillRef } = useSlidingPill(value);
  const iconSize = compact ? 13 : 16;

  return h('div', {
    ref: containerRef,
    class: 'theme-segmented' + (compact ? ' is-compact' : ''),
    role: 'group',
    'aria-label': 'Color theme',
  },
    h('span', { ref: pillRef, class: 'theme-segment-pill', 'aria-hidden': 'true' }),
    THEME_OPTIONS.map((option) => h('button', {
      key: option.value,
      type: 'button',
      class: 'theme-segment is-' + option.value,
      'aria-pressed': String(value === option.value),
      'aria-label': option.label,
      title: option.label,
      onClick: () => onChange && onChange(option.value),
    }, h(ThemeIcon, { name: option.icon, size: iconSize }))),
  );
}
