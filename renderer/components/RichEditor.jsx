// FeatherMark — editable rendered Markdown surface.
// The DOM is a presentation of the one canonical Markdown source; every input
// is serialized back to Markdown before it reaches the existing save pipeline.

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderMarkdown } from '../markdown.js';

function escapeAttribute(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineText(value) {
  return String(value || '').replace(/\s+/g, ' ');
}

function serializeImage(node, asHtml = false) {
  const src = node.getAttribute('data-feathermark-src') || node.getAttribute('src') || '';
  const alt = node.getAttribute('alt') || '';
  const title = node.getAttribute('title');
  const width = node.getAttribute('width');
  const height = node.getAttribute('height');
  if (!src) return asHtml ? escapeHtml(alt) : alt;

  if (!asHtml && !width && !height) {
    return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
  }

  return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ''}${width ? ` width="${escapeAttribute(width)}"` : ''}${height ? ` height="${escapeAttribute(height)}"` : ''} />`;
}

function serializeInline(node) {
  if (node.nodeType === 3) return inlineText(node.nodeValue);
  if (node.nodeType !== 1) return '';

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map(serializeInline).join('');

  if (tag === 'br') return '\n';
  if (tag === 'strong' || tag === 'b') return `**${children}**`;
  if (tag === 'em' || tag === 'i') return `*${children}*`;
  if (tag === 'del' || tag === 's') return `~~${children}~~`;
  if (tag === 'code') {
    const value = node.textContent || '';
    const fence = value.includes('`') ? '``' : '`';
    return `${fence}${value}${fence}`;
  }
  if (tag === 'img') return serializeImage(node);
  if (tag === 'a') {
    const href = node.getAttribute('data-feathermark-href') || node.getAttribute('href') || '';
    return href ? `[${children}](${href})` : children;
  }
  if (tag === 'u') return `<u>${children}</u>`;
  return children;
}

function serializeInlineHtml(node) {
  if (node.nodeType === 3) return escapeHtml(node.nodeValue).replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes).map(serializeInlineHtml).join('');
  if (tag === 'br') return '<br />';
  if (tag === 'strong' || tag === 'b') return `<strong>${children}</strong>`;
  if (tag === 'em' || tag === 'i') return `<em>${children}</em>`;
  if (tag === 'del' || tag === 's') return `<del>${children}</del>`;
  if (tag === 'code') return `<code>${escapeHtml(node.textContent || '')}</code>`;
  if (tag === 'img') return serializeImage(node, true);
  if (tag === 'a') {
    const href = node.getAttribute('data-feathermark-href') || node.getAttribute('href') || '';
    return href ? `<a href="${escapeAttribute(href)}">${children}</a>` : children;
  }
  if (tag === 'u') return `<u>${children}</u>`;
  return children;
}

function alignedBlock(node) {
  const align = node.getAttribute('data-feathermark-align');
  if (!align) return '';
  const tag = node.tagName.toLowerCase();
  return `<${tag} align="${escapeAttribute(align)}">${serializeInlineHtml(node)}</${tag}>`;
}

function serializeBlocks(parent) {
  return Array.from(parent.childNodes).map((node) => {
    if (node.nodeType === 3) return inlineText(node.nodeValue).trim() ? `${inlineText(node.nodeValue)}\n\n` : '';
    if (node.nodeType !== 1) return '';

    const tag = node.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const content = serializeInline(node).trim();
      return (node.getAttribute('data-feathermark-align')
        ? alignedBlock(node)
        : `${'#'.repeat(Number(tag[1]))} ${content}`) + '\n\n';
    }
    if (tag === 'p') {
      return (node.getAttribute('data-feathermark-align')
        ? alignedBlock(node)
        : serializeInline(node).trim()) + '\n\n';
    }
    if (tag === 'div') {
      const content = serializeInline(node).trim();
      return (node.getAttribute('data-feathermark-align') ? alignedBlock(node) : content) + '\n\n';
    }
    if (tag === 'blockquote') {
      const content = serializeBlocks(node).trim();
      return content.split('\n').map((line) => `> ${line}`.trimEnd()).join('\n') + '\n\n';
    }
    if (tag === 'ul' || tag === 'ol') {
      const marker = tag === 'ol' ? (index) => `${index + 1}. ` : () => '- ';
      const items = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === 'li');
      return items.map((item, index) => `${marker(index)}${serializeInline(item).trim()}`).join('\n') + '\n\n';
    }
    if (tag === 'pre') {
      const code = node.querySelector('code');
      const value = (code ? code.textContent : node.textContent || '').replace(/\n$/, '');
      const language = code && code.className.match(/language-([\w-]+)/);
      return `\`\`\`${language ? language[1] : ''}\n${value}\n\`\`\`\n\n`;
    }
    if (tag === 'hr') return '---\n\n';
    if (tag === 'table' || tag === 'details') {
      const clone = node.cloneNode(true);
      clone.querySelectorAll('[data-line], [data-feathermark-grid]').forEach((element) => {
        element.removeAttribute('data-line');
        element.removeAttribute('data-feathermark-grid');
      });
      clone.removeAttribute('data-line');
      clone.removeAttribute('data-feathermark-grid');
      return `${clone.outerHTML}\n\n`;
    }
    return serializeBlocks(node);
  }).join('');
}

function normalizeTables(root) {
  if (!root) return;

  root.querySelectorAll('table').forEach((table) => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return;

    const columnCount = Math.max(
      1,
      ...rows.map((row) => row.querySelectorAll(':scope > th, :scope > td').length),
    );

    rows.forEach((row) => {
      const cells = Array.from(row.children).filter((child) => (
        child.tagName && (child.tagName.toLowerCase() === 'th' || child.tagName.toLowerCase() === 'td')
      ));
      while (cells.length < columnCount) {
        const cell = document.createElement(row.querySelector('th') ? 'th' : 'td');
        cell.appendChild(document.createElement('br'));
        row.appendChild(cell);
        cells.push(cell);
      }
    });

    table.setAttribute('data-feathermark-grid', String(columnCount));
  });
}

function placeCaretAtEnd(element) {
  if (!element) return;
  element.focus();
  const selection = document.getSelection && document.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function createTableRow(row, columnCount) {
  const nextRow = document.createElement('tr');
  const useHeaders = row && row.querySelector('th');
  for (let index = 0; index < columnCount; index += 1) {
    const cell = document.createElement(useHeaders ? 'th' : 'td');
    cell.appendChild(document.createElement('br'));
    nextRow.appendChild(cell);
  }
  return nextRow;
}

function moveTableCaret(root, cell, backwards = false) {
  const table = cell && cell.closest('table');
  if (!table) return false;

  const cells = Array.from(table.querySelectorAll('tr > th, tr > td'));
  const currentIndex = cells.indexOf(cell);
  if (currentIndex < 0) return false;

  let target = cells[currentIndex + (backwards ? -1 : 1)];
  if (!target && !backwards) {
    const lastRow = cell.closest('tr');
    const columnCount = Number(table.getAttribute('data-feathermark-grid')) || lastRow.children.length;
    const nextRow = createTableRow(lastRow, columnCount);
    lastRow.parentElement.appendChild(nextRow);
    target = nextRow.firstElementChild;
  }

  if (!target) return false;
  placeCaretAtEnd(target);
  return true;
}

function runRichCommand(root, action) {
  if (!root) return false;
  root.focus();

  const commands = {
    bold: ['bold'],
    italic: ['italic'],
    strike: ['strikeThrough'],
    bullet: ['insertUnorderedList'],
    h1: ['formatBlock', 'h1'],
    h2: ['formatBlock', 'h2'],
    h3: ['formatBlock', 'h3'],
    quote: ['formatBlock', 'blockquote'],
    fence: ['formatBlock', 'pre'],
    hr: ['insertHorizontalRule'],
  };

  if (commands[action]) {
    const [command, value] = commands[action];
    try {
      document.execCommand(command, false, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  if (action === 'code') {
    try {
      document.execCommand('formatBlock', false, 'code');
      return true;
    } catch (_) {
      return false;
    }
  }

  if (action === 'task') {
    try {
      document.execCommand('insertUnorderedList');
      root.querySelectorAll('ul:not(.contains-task-list) > li').forEach((item) => {
        if (!item.querySelector('input.task-list-item-checkbox')) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'task-list-item-checkbox';
          checkbox.setAttribute('aria-label', 'Task');
          item.prepend(checkbox);
        }
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  if (action === 'table') {
    const html = '<table><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table><p><br></p>';
    try {
      document.execCommand('insertHTML', false, html);
      return true;
    } catch (_) {
      return false;
    }
  }

  return false;
}

export function serializeRichMarkdown(root) {
  return serializeBlocks(root).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function selectionInfo(root) {
  const selection = document.getSelection && document.getSelection();
  if (!selection || !selection.anchorNode || !root.contains(selection.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  const before = range.toString();
  const line = before.split('\n').length;
  const col = before.length - before.lastIndexOf('\n');
  return { line, col, selectionLength: Math.abs(selection.toString().length) };
}

export function RichEditor({
  text = '',
  filePath = null,
  initialScroll = 0,
  onChange,
  onCursorChange,
  onCursorInfoChange,
  onScrollChange,
  onEditorScroll,
  editorHandleRef,
}) {
  const rootRef = useRef(null);
  const lastSourceRef = useRef(null);
  const callbacksRef = useRef({ onChange, onCursorChange, onCursorInfoChange, onScrollChange, onEditorScroll });
  callbacksRef.current = { onChange, onCursorChange, onCursorInfoChange, onScrollChange, onEditorScroll };

  function emitChange() {
    const root = rootRef.current;
    if (!root) return;
    normalizeTables(root);
    const source = serializeRichMarkdown(root);
    lastSourceRef.current = source;
    if (callbacksRef.current.onChange && source !== text) callbacksRef.current.onChange(source);
    reportSelection();
  }

  function reportSelection() {
    const root = rootRef.current;
    const info = root && selectionInfo(root);
    if (!info) return;
    if (callbacksRef.current.onCursorChange) callbacksRef.current.onCursorChange(0);
    if (callbacksRef.current.onCursorInfoChange) callbacksRef.current.onCursorInfoChange(info);
  }

  function renderSource(source, preserveScroll = true) {
    const root = rootRef.current;
    if (!root) return;
    const scrollTop = preserveScroll ? root.scrollTop : 0;
    root.innerHTML = renderMarkdown(source, { filePath });
    normalizeTables(root);
    root.scrollTop = preserveScroll ? scrollTop : initialScroll;
    lastSourceRef.current = source;
  }

  useEffect(() => {
    renderSource(text, lastSourceRef.current !== null);
    requestAnimationFrame(() => {
      if (rootRef.current && initialScroll > 0 && lastSourceRef.current === text) rootRef.current.scrollTop = initialScroll;
      reportSelection();
    });
  }, [filePath]);

  useEffect(() => {
    if (lastSourceRef.current !== text) renderSource(text);
  }, [text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const onInput = () => {
      const source = serializeRichMarkdown(root);
      lastSourceRef.current = source;
      if (callbacksRef.current.onChange && source !== text) callbacksRef.current.onChange(source);
      reportSelection();
    };
    const onSelectionChange = () => reportSelection();
    root.addEventListener('input', onInput);
    root.addEventListener('keyup', reportSelection);
    root.addEventListener('mouseup', reportSelection);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      root.removeEventListener('input', onInput);
      root.removeEventListener('keyup', reportSelection);
      root.removeEventListener('mouseup', reportSelection);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [text]);

  useEffect(() => {
    if (!editorHandleRef) return undefined;
    editorHandleRef.current = {
      focus() { if (rootRef.current) rootRef.current.focus(); },
      getScrollTop() { return rootRef.current ? rootRef.current.scrollTop : 0; },
      setScrollTop(top) { if (rootRef.current) rootRef.current.scrollTop = top; },
      scrollToLine(line, ratio = 0) {
        const root = rootRef.current;
        if (!root) return;
        const blocks = Array.from(root.querySelectorAll('[data-line]'));
        const target = blocks.find((block) => Number(block.getAttribute('data-line')) >= line) || blocks[blocks.length - 1];
        if (target) {
          const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
          const targetTop = target.offsetTop - Math.round(root.clientHeight * 0.12) + (target.offsetHeight * Math.max(0, Math.min(1, ratio)));
          root.scrollTop = Math.min(maxScroll, Math.max(0, targetTop));
        }
      },
      jumpToPos() { if (rootRef.current) rootRef.current.focus(); },
      format(action) { handleFormat(action); },
      setSearch() { return 0; },
      findNext() {},
      findPrev() {},
      replace() {},
      replaceAll() {},
      clearSearch() {},
      undo() { document.execCommand('undo'); },
      redo() { document.execCommand('redo'); },
    };
    return () => { editorHandleRef.current = null; };
  }, [editorHandleRef]);

  function handleScroll() {
    const root = rootRef.current;
    if (!root) return;
    if (callbacksRef.current.onScrollChange) callbacksRef.current.onScrollChange(root.scrollTop);
    if (callbacksRef.current.onEditorScroll) {
      const blocks = Array.from(root.querySelectorAll('[data-line]'));
      const visible = blocks.filter((block) => block.offsetTop <= root.scrollTop).pop();
      if (visible) callbacksRef.current.onEditorScroll({
        line: Number(visible.getAttribute('data-line')),
        ratio: visible.offsetHeight > 0
          ? Math.max(0, Math.min(1, (root.scrollTop - visible.offsetTop) / visible.offsetHeight))
          : 0,
        scrollTop: root.scrollTop,
      });
    }
  }

  function handleKeyDown(event) {
    const root = rootRef.current;
    const cell = event.target && event.target.closest && event.target.closest('td, th');
    if (!root || !cell || !root.contains(cell)) return;

    if (event.key === 'Tab') {
      event.preventDefault();
      moveTableCaret(root, cell, event.shiftKey);
      emitChange();
      return;
    }

    // Keep Enter inside a cell as a line break. This prevents Chromium from
    // creating an accidental table row and keeps every column on the same row.
    if (event.key === 'Enter') {
      event.preventDefault();
      document.execCommand('insertLineBreak');
      emitChange();
    }
  }

  function handleInput() {
    emitChange();
  }

  function handleFormat(action) {
    if (runRichCommand(rootRef.current, action)) {
      requestAnimationFrame(() => emitChange());
    }
  }

  return h('article', {
    ref: rootRef,
    class: 'rich-editor-container preview-prose',
    contentEditable: true,
    spellCheck: true,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': 'Plain text editor',
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onFocus: reportSelection,
    onScroll: handleScroll,
  });
}
