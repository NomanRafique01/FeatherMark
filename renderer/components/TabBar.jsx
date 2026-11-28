// FeatherMark — TabBar component (Phase 04).
// Tabs model: active tab joins the editor surface (green top border, open bottom edge),
// inactive tabs recessed; unsaved dot + always-visible close button; drag-reorder,
// middle-click close, "+" new tab. All glyphs are inline SVG — no unicode icons.

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

function TabIcon({ children, size = 12 }) {
  return h('svg', {
    width: String(size), height: String(size), viewBox: '0 0 16 16', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '1.4', 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, children);
}

const DocIcon = () => h(TabIcon, null,
  h('path', { d: 'M3.5 2h6l3 3v9h-9V2Z' }),
  h('path', { d: 'M9.5 2v3h3' }),
);

const CloseIcon = () => h(TabIcon, null,
  h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' }),
);

const PlusIcon = () => h(TabIcon, { size: 14 },
  h('path', { d: 'M8 4v8M4 8h8' }),
);

function parentDirName(filePath) {
  if (!filePath) return '';
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

export function TabBar({ tabs, activeId, onSelect, onClose, onNew, onReorder }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const tabNodesRef = useRef(new Map());

  const nameCounts = new Map();
  for (const t of tabs) {
    nameCounts.set(t.name, (nameCounts.get(t.name) || 0) + 1);
  }

  useEffect(() => {
    const node = tabNodesRef.current.get(activeId);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  function handleTabWheel(event) {
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY) && event.deltaY !== 0) {
      event.preventDefault();
      event.currentTarget.scrollBy({ left: event.deltaY, behavior: 'auto' });
    }
  }

  function handleKeyDown(e, tabId, index) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = tabs[(index + 1) % tabs.length];
      if (next) onSelect(next.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = tabs[(index - 1 + tabs.length) % tabs.length];
      if (prev) onSelect(prev.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(tabId);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      onClose(tabId);
    }
  }

  return h('nav', { class: 'tabbar', role: 'tablist', 'aria-label': 'Open files' },
    h('div', {
      class: 'tabbar-scroll',
      onWheel: handleTabWheel,
    },
    tabs.map((tab, idx) => {
      const isActive = tab.id === activeId;
      const isTarget = dropTargetId === tab.id && draggingId !== tab.id;
      return h('div', {
        key: tab.id,
        ref: (node) => {
          if (node) tabNodesRef.current.set(tab.id, node);
          else tabNodesRef.current.delete(tab.id);
        },
        class: 'tab' + (isActive ? ' is-active' : '') + (isTarget ? ' is-drop-target' : '') + (tab.missing ? ' is-missing' : ''),
        role: 'tab',
        'aria-selected': isActive,
        tabIndex: isActive ? 0 : -1,
        title: tab.missing ? 'File is missing on disk' : tab.path || 'Not saved yet',
        draggable: true,
        onClick: () => onSelect(tab.id),
        onKeyDown: (e) => handleKeyDown(e, tab.id, idx),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault(); // prevent autoscroll on middle click
          } else if (e.button === 0 && !e.target.closest('.tab-close')) {
            onSelect(tab.id);
          }
        },
        onAuxClick: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            onClose(tab.id); // middle-click closes with unsaved confirm flow
          }
        },
        onDragStart: (e) => {
          e.dataTransfer.setData('text/plain', tab.id);
          e.dataTransfer.effectAllowed = 'move';
          setDraggingId(tab.id);
        },
        onDragOver: (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dropTargetId !== tab.id) setDropTargetId(tab.id);
        },
        onDragLeave: () => {
          if (dropTargetId === tab.id) setDropTargetId(null);
        },
        onDrop: (e) => {
          e.preventDefault();
          const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
          if (sourceId && sourceId !== tab.id && onReorder) {
            onReorder(sourceId, tab.id);
          }
          setDraggingId(null);
          setDropTargetId(null);
        },
        onDragEnd: () => {
          setDraggingId(null);
          setDropTargetId(null);
        },
      },
        h('span', { class: 'tab-file-icon', 'aria-hidden': 'true' }, h(DocIcon)),
        h('span', { class: 'tab-name' }, tab.name),
        nameCounts.get(tab.name) > 1 && tab.path && h('span', { class: 'tab-dir' }, parentDirName(tab.path)),
        tab.dirty && h('span', {
          class: 'tab-dirty',
          title: 'Unsaved changes',
          'aria-label': 'Unsaved changes',
        }),
        h('button', {
          class: 'tab-close',
          'aria-label': 'Close ' + tab.name,
          title: 'Close tab (Ctrl+W)',
          tabIndex: 0,
          onClick: (e) => {
            e.stopPropagation();
            onClose(tab.id);
          },
        }, h(CloseIcon)),
      );
    })),
    h('button', {
      class: 'tab-new',
      'aria-label': 'New file',
      title: 'New file (Ctrl+N)',
      tabIndex: 0,
      onClick: onNew,
    }, h(PlusIcon)),
  );
}
