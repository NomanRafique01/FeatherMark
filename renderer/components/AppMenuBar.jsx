// FeatherMark — Row 2: Menu Bar (34px) + Row 3: Toolbar (40px).
// Row 2 Layout: [File] [Edit] [View] [Help] (left aligned, no other elements)
// Row 3 Layout: [flex spacer] [Theme toggle group] [gap 10px] [Mode toggle group] (all right-aligned)

import { h, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ThemeToggle } from './ThemeToggle.jsx';
import { SegmentedToggle } from './SegmentedToggle.jsx';

const MENUS = {
  File: [
    ['New file', 'new-file'],
    ['Open file', 'open-file'],
    ['Open folder', 'open-folder'],
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

const MODE_OPTIONS = [
  { value: 'editor', label: 'Editor', icon: 'editor' },
  { value: 'split', label: 'Split', icon: 'split' },
  { value: 'preview', label: 'Preview', icon: 'preview' },
  { value: 'focus', label: 'Focus', icon: 'focus' },
];

function ModeToggle({ value, onChange }) {
  return h(SegmentedToggle, {
    options: MODE_OPTIONS,
    value,
    onChange,
    ariaLabel: 'Editor mode',
    className: 'menu-segmented',
    pillClassName: 'menu-segment-pill',
    optionClassName: (option) => 'menu-segment is-' + option.value,
    renderOption: (option) => [
      h('span', { class: 'menu-segment-icon' }, h(ModeIcon, { name: option.icon })),
      h('span', { class: 'menu-segment-label' }, option.label),
    ],
  });
}

function FindIcon() {
  return h('svg', {
    width: '15', height: '15', viewBox: '0 0 16 16',
    fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
    h('circle', { cx: '7', cy: '7', r: '4.5' }),
    h('line', { x1: '10.3', y1: '10.3', x2: '13.5', y2: '13.5' }),
  );
}

function ToolbarIcon() {
  return h('svg', {
    width: '17', height: '17', viewBox: '0 0 16 16',
    fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
    h('path', { d: 'M2.5 3.5h6M5.5 3.5v9M4 12.5h3' }),
    h('line', { x1: '10', y1: '4.5', x2: '13.5', y2: '4.5' }),
    h('line', { x1: '10', y1: '8', x2: '13.5', y2: '8' }),
    h('line', { x1: '10', y1: '11.5', x2: '12.5', y2: '11.5' }),
  );
}

function FolderIcon() {
  return h('svg', {
    width: '15', height: '15', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.35', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, h('path', { d: 'M1.8 4.5A1.5 1.5 0 0 1 3.3 3h3l1.3 1.5h5.1A1.5 1.5 0 0 1 14.2 6v5.6a1.5 1.5 0 0 1-1.5 1.5H3.3a1.5 1.5 0 0 1-1.5-1.5V4.5Z' }));
}

export function AppMenuBar({
  mode,
  onModeChange,
  themePref,
  onThemeChange,
  onMenuAction,
  findOpen,
  toolbarOpen,
  explorerOpen = false,
  folderName = null,
}) {
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
      h('div', { class: 'app-menu-context' },
        folderName && h('button', {
          type: 'button',
          class: 'app-folder-context' + (explorerOpen ? ' is-open' : ' is-closed'),
          title: folderName,
          'aria-label': 'Opened folder: ' + folderName,
          'aria-pressed': String(!!explorerOpen),
          onClick: () => onMenuAction && onMenuAction('toggle-explorer'),
        },
          h('span', { class: 'app-folder-context-icon', 'aria-hidden': 'true' }, h(FolderIcon)),
          h('span', { class: 'app-folder-context-name' }, folderName),
        ),
      ),
      h('div', { class: 'app-menu-spacer' }),
      h('button', {
        type: 'button',
        class: 'chrome-icon-btn toolbar-toggle-chrome-btn' + (toolbarOpen ? ' is-active' : ''),
        'aria-pressed': String(!!toolbarOpen),
        title: 'Toggle formatting toolbar (Alt+T)',
        'aria-label': 'Toggle formatting toolbar',
        onClick: () => onMenuAction && onMenuAction('toggle-toolbar'),
      }, h(ToolbarIcon)),
      h('button', {
        type: 'button',
        class: 'chrome-icon-btn find-toggle-chrome-btn' + (findOpen ? ' is-active' : ''),
        'aria-pressed': String(!!findOpen),
        title: 'Find and replace (Ctrl+F)',
        'aria-label': 'Find and replace',
        onClick: () => onMenuAction && onMenuAction('find-replace'),
      }, h(FindIcon)),
      h('span', { class: 'app-menu-divider', 'aria-hidden': 'true' }),
      h(ThemeToggle, { value: themePref, onChange: onThemeChange }),
      h(ModeToggle, { value: mode, onChange: onModeChange }),
    ),
  );
}
