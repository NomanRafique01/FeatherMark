// FeatherMark — Row 2: Menu Bar (34px) + Row 3: Toolbar (40px).
// Row 2 Layout: [File] [Edit] [View] [Help] (left aligned, no other elements)
// Row 3 Layout: [flex spacer] [Theme toggle group] [gap 10px] [Mode toggle group] (all right-aligned)

import { h, Fragment } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const MENUS = {
  File: [
    ['New file', 'new-file'],
    ['Open file', 'open-file'],
    ['Save file', 'save-file'],
    ['Save file as…', 'save-file-as'],
  ],
  Edit: [
    ['Find and replace', 'find-replace'],
    ['Show toolbar', 'toggle-toolbar'],
  ],
  View: [
    ['Toggle outline', 'toggle-outline'],
    ['Toggle focus mode', 'toggle-focus'],
  ],
  Help: [
    ['About FeatherMark', 'about'],
  ],
};

function ThemeIcon({ name }) {
  if (name === 'dark') {
    return h('svg', {
      width: '16',
      height: '16',
      viewBox: '0 0 16 16',
      fill: 'currentColor',
      stroke: 'none',
      style: { transform: 'rotate(15deg)' },
      'aria-hidden': 'true',
    },
      h('path', { d: 'M 11 3.5 A 5.5 5.5 0 1 0 11 12.5 A 4 4 0 1 1 11 3.5 Z' }),
    );
  }

  const common = {
    width: '16',
    height: '16',
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
      // Long rays (N/E/S/W): 1px gap from r=3 -> start at r=4, length 2.5px -> end at r=6.5
      h('line', { x1: '8', y1: '4', x2: '8', y2: '1.5' }),
      h('line', { x1: '12', y1: '8', x2: '14.5', y2: '8' }),
      h('line', { x1: '8', y1: '12', x2: '8', y2: '14.5' }),
      h('line', { x1: '4', y1: '8', x2: '1.5', y2: '8' }),
      // Short rays (NE/SE/SW/NW): 1px gap from r=3 -> start at r=4, length 1.8px -> end at r=5.8
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

function ModeIcon({ name }) {
  const common = {
    width: '15',
    height: '15',
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };

  if (name === 'editor') {
    return h('svg', common,
      h('path', { d: 'M 9.8 3.2 L 12.8 6.2 L 5.5 13.5 L 2.5 13.5 L 2.5 10.5 Z' }),
      h('line', { x1: '8.4', y1: '4.6', x2: '11.4', y2: '7.6' }),
      h('line', { x1: '8.5', y1: '13.5', x2: '14', y2: '13.5' }),
    );
  }

  if (name === 'split') {
    return h('svg', common,
      h('rect', { x: '1', y: '1', width: '14', height: '14', rx: '2', opacity: '0.3' }),
      h('line', { x1: '8', y1: '2', x2: '8', y2: '14' }),
      h('line', { x1: '2', y1: '5', x2: '6', y2: '5' }),
      h('line', { x1: '2', y1: '8', x2: '6', y2: '8' }),
      h('line', { x1: '2', y1: '11', x2: '5', y2: '11' }),
      h('line', { x1: '10', y1: '5', x2: '14', y2: '5' }),
      h('line', { x1: '10', y1: '8', x2: '14', y2: '8' }),
      h('line', { x1: '10', y1: '11', x2: '13', y2: '11' }),
    );
  }

  if (name === 'preview') {
    return h('svg', common,
      h('path', { d: 'M 2 8 Q 5 3 8 3 Q 11 3 14 8 Q 11 13 8 13 Q 5 13 2 8 Z' }),
      h('circle', { cx: '8', cy: '8', r: '2.8' }),
      h('circle', { cx: '8', cy: '8', r: '1.2', fill: 'currentColor', stroke: 'none' }),
    );
  }

  // focus: four inward corner arrows
  return h('svg', common,
    h('polyline', { points: '2,6 2,2 6,2' }),
    h('line', { x1: '2.2', y1: '2.2', x2: '5.8', y2: '5.8' }),
    h('polyline', { points: '3.8,5.8 5.8,5.8 5.8,3.8' }),
    h('polyline', { points: '10,2 14,2 14,6' }),
    h('line', { x1: '13.8', y1: '2.2', x2: '10.2', y2: '5.8' }),
    h('polyline', { points: '10.2,3.8 10.2,5.8 12.2,5.8' }),
    h('polyline', { points: '2,10 2,14 6,14' }),
    h('line', { x1: '2.2', y1: '13.8', x2: '5.8', y2: '10.2' }),
    h('polyline', { points: '3.8,10.2 5.8,10.2 5.8,12.2' }),
    h('polyline', { points: '10,14 14,14 14,10' }),
    h('line', { x1: '13.8', y1: '13.8', x2: '10.2', y2: '10.2' }),
    h('polyline', { points: '10.2,12.2 10.2,10.2 12.2,10.2' }),
  );
}

function useSlidingPill(value) {
  const containerRef = useRef(null);
  const pillRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return undefined;

    const syncPill = () => {
      const activeBtn = container.querySelector('[aria-pressed="true"]');
      if (!activeBtn) return;
      const rect = activeBtn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      pill.style.transform = `translateX(${rect.left - containerRect.left - 5}px)`;
      pill.style.width = `${rect.width}px`;
    };

    syncPill();
    const observer = new ResizeObserver(syncPill);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value]);

  return { containerRef, pillRef };
}

function ThemeToggle({ value, onChange }) {
  const { containerRef, pillRef } = useSlidingPill(value);
  const options = [
    { value: 'auto', label: 'Follow system theme', icon: 'system' },
    { value: 'light', label: 'Use light theme', icon: 'light' },
    { value: 'dark', label: 'Use dark theme', icon: 'dark' },
  ];

  return h('div', {
    ref: containerRef,
    class: 'theme-segmented',
    role: 'group',
    'aria-label': 'Color theme',
  },
    h('span', { ref: pillRef, class: 'theme-segment-pill', 'aria-hidden': 'true' }),
    options.map((option) => h('button', {
      key: option.value,
      type: 'button',
      class: 'theme-segment is-' + option.value,
      'aria-pressed': String(value === option.value),
      'aria-label': option.label,
      title: option.label,
      onClick: () => onChange(option.value),
    }, h(ThemeIcon, { name: option.icon }))),
  );
}

function ModeToggle({ value, onChange }) {
  const { containerRef, pillRef } = useSlidingPill(value);

  const options = [
    { value: 'editor', label: 'Editor', icon: 'editor' },
    { value: 'split', label: 'Split', icon: 'split' },
    { value: 'preview', label: 'Preview', icon: 'preview' },
    { value: 'focus', label: 'Focus', icon: 'focus' },
  ];

  return h('div', {
    ref: containerRef,
    class: 'menu-segmented',
    role: 'group',
    'aria-label': 'Editor mode',
  },
    h('span', { ref: pillRef, class: 'menu-segment-pill', 'aria-hidden': 'true' }),
    options.map((option) => h('button', {
      key: option.value,
      type: 'button',
      class: 'menu-segment is-' + option.value,
      'aria-pressed': String(value === option.value),
      'aria-label': option.label,
      title: option.label,
      onClick: () => onChange(option.value),
    },
      h('span', { class: 'menu-segment-icon' }, h(ModeIcon, { name: option.icon })),
      h('span', { class: 'menu-segment-label' }, option.label),
    )),
  );
}

export function AppMenuBar({ mode, onModeChange, themePref, onThemeChange, onMenuAction }) {
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null);
    };
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return h(Fragment, null,
    h('nav', {
      ref: navRef,
      class: 'app-nav-bar',
      role: 'menubar',
      'aria-label': 'Application menu',
    },
      Object.entries(MENUS).map(([name, entries]) =>
        h('div', { class: 'app-nav-wrap', key: name },
          h('button', {
            type: 'button',
            class: 'app-nav-item',
            role: 'menuitem',
            'aria-haspopup': 'menu',
            'aria-expanded': String(openMenu === name),
            onClick: () => setOpenMenu((cur) => cur === name ? null : name),
          }, name),
          openMenu === name && h('div', { class: 'app-nav-popover', role: 'menu', 'aria-label': name },
            entries.map(([label, action]) =>
              h('button', {
                key: action,
                type: 'button',
                role: 'menuitem',
                class: 'app-nav-action',
                onClick: () => {
                  setOpenMenu(null);
                  onMenuAction && onMenuAction(action);
                },
              }, label)
            ),
          ),
        )
      ),
    ),
    h('div', { class: 'app-menu-bar' },
      h('div', { class: 'app-menu-spacer' }),
      h(ThemeToggle, { value: themePref, onChange: onThemeChange }),
      h(ModeToggle, { value: mode, onChange: onModeChange }),
    ),
  );
}
