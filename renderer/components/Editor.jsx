// FeatherMark — Editor component (Phase 04).
// CodeMirror 6 markdown editor configured as a quiet writing instrument:
// ink on warm paper, subtle syntax decorations, ~80ch measure, auto-pairing,
// custom markdown keybindings (Ctrl+B/I/K, Tab indent, Esc), 10k-line responsiveness.

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentMore, indentLess } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Subtle markdown syntax styling per DESIGN_TOKENS.md §2 (no rainbow, no VS Code-isms)
const featherMarkHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.45em', fontWeight: '700', color: 'var(--text-primary)' },
  { tag: t.heading2, fontSize: '1.25em', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading3, fontSize: '1.10em', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading4, fontSize: '1.00em', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading5, fontSize: '0.95em', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading6, fontSize: '0.90em', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading, color: 'var(--syntax-heading)', fontWeight: '600' }, // marker text
  { tag: t.processingInstruction, color: 'var(--syntax-heading)' },       // marker symbols (#, *, _)
  { tag: t.strong, fontWeight: '700', color: 'var(--syntax-bold)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--syntax-italic)' },
  { tag: t.link, color: 'var(--syntax-link)', textDecoration: 'none' },
  { tag: t.url, color: 'var(--syntax-link)', textDecoration: 'none' },
  { tag: t.monospace, color: 'var(--syntax-code)', backgroundColor: 'var(--accent-soft)', borderRadius: 'var(--radius-control)', padding: '1px 3px' },
  { tag: t.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--syntax-list)' },
  { tag: t.contentSeparator, color: 'var(--syntax-hr)' },
  { tag: t.meta, color: 'var(--text-muted)' },
]);

// Base theme: JetBrains Mono, 80ch measure, centered margins on wide screens, selection & cursor tokens
const featherMarkTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--editor-bg)',
    fontFamily: 'var(--font-editor)',
    fontSize: 'var(--text-base)',
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'inherit',
    lineHeight: '1.6',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: 'var(--space-8) var(--space-6)',
    maxWidth: '80ch',
    margin: '0 auto',
    caretColor: 'var(--cursor)',
  },
  '.cm-line': {
    padding: '0',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--cursor)',
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  'a.cm-link, .cm-link': {
    color: 'var(--syntax-link)',
    textDecoration: 'none',
  },
  'a.cm-link:hover, .cm-link:hover': {
    textDecoration: 'underline',
  },
  '.cm-line:has(blockquote), .cm-blockquote': {
    borderLeft: '3px solid var(--border-strong)',
    paddingLeft: 'var(--space-3)',
    color: 'var(--syntax-quote)',
  },
});

// Auto-pair table: *, _, `, [, (, {, "
const PAIRS = {
  '*': '*',
  '_': '_',
  '`': '`',
  '[': ']',
  '(': ')',
  '{': '}',
  '"': '"',
};
const CLOSING = new Set(['*', '_', '`', ']', ')', '}', '"']);

function wrapSelection(view, before, after = before) {
  const changes = view.state.changeByRange((range) => {
    const text = view.state.sliceDoc(range.from, range.to);
    // If already wrapped, unwrap
    if (
      range.from >= before.length &&
      view.state.sliceDoc(range.from - before.length, range.from) === before &&
      view.state.sliceDoc(range.to, range.to + after.length) === after
    ) {
      return {
        changes: [
          { from: range.from - before.length, to: range.from, insert: '' },
          { from: range.to, to: range.to + after.length, insert: '' },
        ],
        range: EditorSelection.range(range.from - before.length, range.to - before.length),
      };
    }
    const insert = before + text + after;
    return {
      changes: [{ from: range.from, to: range.to, insert }],
      range: text.length > 0
        ? EditorSelection.range(range.from + before.length, range.to + before.length)
        : EditorSelection.cursor(range.from + before.length),
    };
  });
  view.dispatch(changes, { scrollIntoView: true, userEvent: 'input.wrap' });
  return true;
}

function wrapLink(view) {
  const changes = view.state.changeByRange((range) => {
    const text = view.state.sliceDoc(range.from, range.to);
    const insert = `[${text || 'link text'}](url)`;
    const selStart = range.from + (text ? text.length + 3 : 1);
    const selEnd = range.from + (text ? text.length + 6 : 10);
    return {
      changes: [{ from: range.from, to: range.to, insert }],
      range: EditorSelection.range(selStart, selEnd),
    };
  });
  view.dispatch(changes, { scrollIntoView: true, userEvent: 'input.link' });
  return true;
}

// Auto-pair input handler: wraps selection or inserts pair
const autoPairHandler = EditorView.inputHandler.of((view, from, to, text) => {
  // If cursor is right before the typed closing character, skip over it
  if (from === to && CLOSING.has(text)) {
    const nextChar = view.state.sliceDoc(from, from + text.length);
    if (nextChar === text) {
      view.dispatch({
        selection: EditorSelection.cursor(from + text.length),
        scrollIntoView: true,
      });
      return true;
    }
  }

  // Auto-pair matching characters
  if (PAIRS[text]) {
    const close = PAIRS[text];
    if (from !== to) {
      // Wrap selection
      const selected = view.state.sliceDoc(from, to);
      view.dispatch({
        changes: { from, to, insert: text + selected + close },
        selection: EditorSelection.range(from + text.length, to + text.length),
        scrollIntoView: true,
      });
      return true;
    } else {
      // Empty selection: insert pair with cursor in middle
      view.dispatch({
        changes: { from, to, insert: text + close },
        selection: EditorSelection.cursor(from + text.length),
        scrollIntoView: true,
      });
      return true;
    }
  }
  return false;
});

export function Editor({
  tabId,
  initialText = '',
  initialCursor = 0,
  initialScroll = 0,
  onChange,
  onCursorChange,
  onScrollChange,
}) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const currentTabIdRef = useRef(tabId);
  const callbacksRef = useRef({ onChange, onCursorChange, onScrollChange });
  callbacksRef.current = { onChange, onCursorChange, onScrollChange };

  useEffect(() => {
    if (!containerRef.current) return;

    const editorKeymap = [
      { key: 'Mod-b', run: (v) => wrapSelection(v, '**') },
      { key: 'Mod-i', run: (v) => wrapSelection(v, '*') },
      { key: 'Mod-k', run: (v) => wrapLink(v) },
      { key: 'Tab', run: indentMore },
      { key: 'Shift-Tab', run: indentLess },
      {
        key: 'Escape',
        run: (v) => {
          if (!v.state.selection.main.empty) {
            v.dispatch({
              selection: { anchor: v.state.selection.main.to },
              scrollIntoView: false,
            });
            return true;
          }
          v.contentDOM.blur();
          return true;
        },
      },
      ...historyKeymap,
      ...defaultKeymap,
    ];

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && callbacksRef.current.onChange) {
        const doc = update.state.doc.toString();
        callbacksRef.current.onChange(doc);
      }
      if (update.selectionSet && callbacksRef.current.onCursorChange) {
        const cursor = update.state.selection.main.head;
        callbacksRef.current.onCursorChange(cursor);
      }
    });

    const scrollListener = EditorView.domEventHandlers({
      scroll(event, view) {
        if (callbacksRef.current.onScrollChange) {
          callbacksRef.current.onScrollChange(view.scrollDOM.scrollTop);
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        history(),
        markdown(),
        syntaxHighlighting(featherMarkHighlightStyle),
        EditorView.lineWrapping,
        featherMarkTheme,
        autoPairHandler,
        keymap.of(editorKeymap),
        updateListener,
        scrollListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    currentTabIdRef.current = tabId;

    // Restore initial cursor and scroll
    if (initialCursor > 0 && initialCursor <= view.state.doc.length) {
      view.dispatch({
        selection: EditorSelection.cursor(initialCursor),
      });
    }
    if (initialScroll > 0) {
      requestAnimationFrame(() => {
        if (view.scrollDOM) view.scrollDOM.scrollTop = initialScroll;
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // When tabId changes, swap the document and restore cursor/scroll without remounting the EditorView
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (currentTabIdRef.current !== tabId) {
      currentTabIdRef.current = tabId;

      const currentDoc = view.state.doc.toString();
      if (currentDoc !== initialText) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: initialText },
          selection: EditorSelection.cursor(Math.min(initialCursor, initialText.length)),
        });
      } else {
        view.dispatch({
          selection: EditorSelection.cursor(Math.min(initialCursor, initialText.length)),
        });
      }

      requestAnimationFrame(() => {
        if (view.scrollDOM) {
          view.scrollDOM.scrollTop = initialScroll;
        }
      });
    }
  }, [tabId, initialText, initialCursor, initialScroll]);

  return h('div', { class: 'editor-pane-container' },
    h('div', { ref: containerRef, class: 'editor-cm-wrapper' })
  );
}
