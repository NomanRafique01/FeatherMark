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
      clone.querySelectorAll('[data-line]').forEach((element) => element.removeAttribute('data-line'));
      return `${clone.outerHTML}\n\n`;
    }
    return serializeBlocks(node);
  }).join('');
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
      scrollToLine(line) {
        const root = rootRef.current;
        if (!root) return;
        const blocks = Array.from(root.querySelectorAll('[data-line]'));
        const target = blocks.find((block) => Number(block.getAttribute('data-line')) >= line) || blocks[blocks.length - 1];
        if (target) root.scrollTop = Math.max(0, target.offsetTop - 16);
      },
      jumpToPos() { if (rootRef.current) rootRef.current.focus(); },
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
        ratio: 0,
        scrollTop: root.scrollTop,
      });
    }
  }

  return h('article', {
    ref: rootRef,
    class: 'rich-editor-container preview-prose',
    contentEditable: true,
    spellCheck: false,
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': 'Rendered Markdown editor',
    onScroll: handleScroll,
  });
}
