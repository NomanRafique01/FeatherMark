// FeatherMark — workspace folder explorer.
// The main process owns traversal; this component only renders the safe tree
// metadata returned through preload.js and routes Markdown clicks to the app.

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

const EXPLORER_MIN_WIDTH = 216;
const EXPLORER_MAX_WIDTH = 420;

function explorerWidthBounds() {
  const viewport = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const max = viewport <= 860
    ? Math.min(EXPLORER_MAX_WIDTH, Math.max(EXPLORER_MIN_WIDTH, Math.floor(viewport * 0.86)))
    : Math.min(EXPLORER_MAX_WIDTH, Math.max(EXPLORER_MIN_WIDTH, Math.floor(viewport * 0.42)));
  return { min: EXPLORER_MIN_WIDTH, max };
}

function clampExplorerWidth(value) {
  const bounds = explorerWidthBounds();
  return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
}

function normalizePath(value) {
  return typeof value === 'string' ? value.replace(/\\/g, '/').toLowerCase() : '';
}
function ExplorerIcon({ children, size = 15 }) {
  return h('svg', {
    width: String(size),
    height: String(size),
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.35',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, children);
}

function ChevronIcon({ expanded }) {
  return h(ExplorerIcon, { size: 13 },
    expanded
      ? h('polyline', { points: '4.5,6 8,9.5 11.5,6' })
      : h('polyline', { points: '6,4.5 9.5,8 6,11.5' })
  );
}

function SidebarToggleIcon({ expanded }) {
  return h('svg', {
    width: '18',
    height: '18',
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.45',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
    h('path', { d: 'M3.5 3.25v11.5M7 3.25v11.5' }),
    expanded
      ? h('polyline', { points: '12.1,5.7 9.25,9 12.1,12.3' })
      : h('polyline', { points: '8.8,5.7 11.65,9 8.8,12.3' }),
  );
}

function WorkspaceIcon() {
  return h('svg', {
    width: '18',
    height: '18',
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.35',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
    h('path', { d: 'M2.5 5.15a1.4 1.4 0 0 1 1.4-1.4h3.35l1.25 1.5h5.6a1.4 1.4 0 0 1 1.4 1.4v6.2a1.4 1.4 0 0 1-1.4 1.4H3.9a1.4 1.4 0 0 1-1.4-1.4V5.15Z' }),
    h('path', { d: 'M5.5 8.3v3.95M5.5 10.25h3.2M8.7 10.25V8.35h2.95' }),
    h('circle', { cx: '5.5', cy: '8.3', r: '0.9', fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: '8.7', cy: '10.25', r: '0.9', fill: 'currentColor', stroke: 'none' }),
    h('circle', { cx: '11.65', cy: '8.35', r: '0.9', fill: 'currentColor', stroke: 'none' }),
  );
}

function FolderIcon({ expanded }) {
  return h(ExplorerIcon, null,
    expanded
      ? h('path', { d: 'M1.8 5.4h12.4l-1.1 6.8a1.1 1.1 0 0 1-1.1.9H3.9a1.1 1.1 0 0 1-1.1-.9L1.8 5.4Z' })
      : h('path', { d: 'M1.8 4.5A1.5 1.5 0 0 1 3.3 3h3l1.3 1.5h5.1A1.5 1.5 0 0 1 14.2 6v5.6a1.5 1.5 0 0 1-1.5 1.5H3.3a1.5 1.5 0 0 1-1.5-1.5V4.5Z' })
  );
}

function MarkdownIcon() {
  return h(ExplorerIcon, null,
    h('path', { d: 'M3 1.8h6l3.8 3.8v8.6H3V1.8Z' }),
    h('path', { d: 'M9 1.8v3.8h3.8' }),
    h('path', { d: 'M5 9.6V7.8l1.6 1.7 1.8-1.7v1.8M10 7.9v3' })
  );
}

function ErrorIcon() {
  return h(ExplorerIcon, { size: 13 },
    h('path', { d: 'M8 2.2 14 13H2L8 2.2Z' }),
    h('line', { x1: '8', y1: '6', x2: '8', y2: '9.3' }),
    h('circle', { cx: '8', cy: '11.2', r: '0.45', fill: 'currentColor', stroke: 'none' })
  );
}

function TreeNode({ node, depth, isRoot = false, expandedPaths, activePath, onToggleFolder, onOpenFile }) {
  if (node.type === 'file') {
    const active = activePath && normalizePath(activePath) === normalizePath(node.path);
    return h('li', { key: node.path, role: 'treeitem', 'aria-selected': String(active) },
      h('button', {
        type: 'button',
        class: 'explorer-item explorer-file' + (active ? ' is-active' : ''),
        style: { '--explorer-depth': String(depth) },
        title: node.path,
        onClick: () => onOpenFile(node.path),
      },
        h('span', { class: 'explorer-chevron-spacer', 'aria-hidden': 'true' }),
        h('span', { class: 'explorer-item-icon', 'aria-hidden': 'true' }, h(MarkdownIcon)),
        h('span', { class: 'explorer-item-name' }, node.name),
      )
    );
  }

  const expanded = isRoot || expandedPaths.has(node.path);
  const hasChildren = node.children && node.children.length > 0;
  const rowContent = [
    !isRoot && h('span', { class: 'explorer-chevron' }, hasChildren ? h(ChevronIcon, { expanded }) : h('span', { class: 'explorer-chevron-empty' })),
    isRoot && h('span', { class: 'explorer-chevron-spacer', 'aria-hidden': 'true' }),
    h('span', { class: 'explorer-item-icon', 'aria-hidden': 'true' }, h(FolderIcon, { expanded })),
    h('span', { class: 'explorer-item-name' }, node.name),
    node.error && h('span', { class: 'explorer-item-error', 'aria-label': node.error }, h(ErrorIcon)),
  ];
  const row = isRoot
    ? h('div', {
        class: 'explorer-item explorer-folder explorer-root' + (node.error ? ' has-error' : ''),
        style: { '--explorer-depth': String(depth) },
        title: node.error ? `${node.path} — ${node.error}` : node.path,
      }, rowContent)
    : h('button', {
        type: 'button',
        class: 'explorer-item explorer-folder' + (node.error ? ' has-error' : ''),
        style: { '--explorer-depth': String(depth) },
        title: node.error ? `${node.path} — ${node.error}` : node.path,
        'aria-expanded': String(expanded),
        onClick: () => onToggleFolder(node.path),
      }, rowContent);

  return h('li', { key: node.path, class: 'explorer-node', role: 'treeitem', 'aria-expanded': String(expanded) },
    row,
    expanded && hasChildren && h('ul', { class: 'explorer-children', role: 'group' },
      node.children.map((child) => h(TreeNode, {
        key: child.path,
        node: child,
        depth: depth + 1,
        isRoot: false,
        expandedPaths,
        activePath,
        onToggleFolder,
        onOpenFile,
      })),
    ),
  )
}

export function FolderExplorer({
  root,
  isOpen = false,
  expandedPaths = new Set(),
  activePath = null,
  loading = false,
  error = null,
  onToggleFolder,
  onOpenFile,
  onClose,
  width = null,
  onResize,
  onResizeEnd,
  onResetWidth,
}) {
  const rootHasChildren = root && root.children && root.children.length > 0;
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  useEffect(() => () => {
    if (resizeRef.current && resizeRef.current.raf !== null) cancelAnimationFrame(resizeRef.current.raf);
    resizeRef.current = null;
  }, []);

  function emitResize(value, flush = false) {
    const state = resizeRef.current;
    if (!state || !onResize) return;
    state.pending = clampExplorerWidth(value);
    state.last = state.pending;
    if (flush) {
      if (state.raf !== null) cancelAnimationFrame(state.raf);
      state.raf = null;
      onResize(state.last);
      return;
    }
    if (state.raf !== null) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = null;
      if (resizeRef.current === state) onResize(state.pending);
    });
  }

  function startResize(event) {
    if (!isOpen || !onResize) return;
    event.preventDefault();
    event.stopPropagation();
    const currentWidth = Number.isFinite(width)
      ? width
      : event.currentTarget.parentElement.getBoundingClientRect().width;
    const startWidth = clampExplorerWidth(currentWidth);
    resizeRef.current = { startX: event.clientX, startWidth, pending: startWidth, last: startWidth, raf: null };
    setIsResizing(true);
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event) {
    const state = resizeRef.current;
    if (!state) return;
    emitResize(state.startWidth + event.clientX - state.startX);
  }

  function finishResize(event) {
    const state = resizeRef.current;
    if (!state) return;
    emitResize(state.last, true);
    if (onResizeEnd) onResizeEnd(state.last);
    if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeRef.current = null;
    setIsResizing(false);
  }

  function resizeFromKeyboard(event) {
    if (!isOpen || !onResize) return;
    const bounds = explorerWidthBounds();
    const current = clampExplorerWidth(Number.isFinite(width) ? width : bounds.min);
    let next = current;
    const step = event.shiftKey ? 32 : 8;
    if (event.key === 'ArrowLeft') next = current - step;
    else if (event.key === 'ArrowRight') next = current + step;
    else if (event.key === 'Home') next = bounds.min;
    else if (event.key === 'End') next = bounds.max;
    else return;
    event.preventDefault();
    next = clampExplorerWidth(next);
    onResize(next);
    if (onResizeEnd) onResizeEnd(next);
  }

  return h('aside', {
    class: 'folder-explorer' + (isOpen ? ' is-open' : ' is-closed') + (isResizing ? ' is-resizing' : ''),
    style: Number.isFinite(width)
      ? { '--explorer-width': `clamp(${EXPLORER_MIN_WIDTH}px, ${width}px, 86vw)` }
      : undefined,
    'aria-label': 'Workspace files',
  },
    h('div', { class: 'explorer-inner' },
      h('div', { class: 'explorer-header' },
        h('div', { class: 'explorer-heading' },
          h('span', { class: 'explorer-heading-icon', 'aria-hidden': 'true' }, h(WorkspaceIcon)),
          h('h2', { class: 'explorer-title' }, 'Workspace'),
        ),
        h('button', {
          type: 'button',
          class: 'explorer-collapse-toggle',
          'aria-expanded': String(!!isOpen),
          'aria-label': isOpen ? 'Collapse folder sidebar' : 'Expand folder sidebar',
          title: isOpen ? 'Collapse folder sidebar' : 'Expand folder sidebar',
          onClick: onClose,
        }, h(SidebarToggleIcon, { expanded: !!isOpen })),
      ),
      loading && h('div', { class: 'explorer-status', role: 'status' }, 'Reading folder…'),
      error && h('div', { class: 'explorer-status is-error', role: 'alert' }, error),
      root && !loading && h('div', { class: 'explorer-tree-wrap' },
        h('ul', { class: 'explorer-tree', role: 'tree', 'aria-label': root.name },
          h(TreeNode, {
            node: root,
            depth: 0,
            isRoot: true,
            expandedPaths,
            activePath,
            onToggleFolder,
            onOpenFile,
          }),
        ),
        !rootHasChildren && h('p', { class: 'explorer-empty' }, 'No Markdown or text files here.'),
      )
    ),
    isOpen && h('div', {
      class: 'explorer-resize-handle',
      role: 'separator',
      tabIndex: 0,
      'aria-label': 'Resize workspace files sidebar',
      'aria-orientation': 'vertical',
      'aria-valuemin': String(EXPLORER_MIN_WIDTH),
      'aria-valuemax': String(explorerWidthBounds().max),
      'aria-valuenow': String(Number.isFinite(width) ? Math.round(width) : EXPLORER_MIN_WIDTH),
      title: 'Drag to resize workspace files sidebar · Double-click to reset',
      onPointerDown: startResize,
      onPointerMove: moveResize,
      onPointerUp: finishResize,
      onPointerCancel: finishResize,
      onKeyDown: resizeFromKeyboard,
      onDoubleClick: () => onResetWidth && onResetWidth(),
    }),
  )
}
