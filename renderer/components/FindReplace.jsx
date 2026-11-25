// FeatherMark — Find and Replace panel (Phase 06, redesigned).
// Anchored top-right of editor-surface (position:relative container).
// Esc dismisses. Enter / Shift+Enter cycles matches.
// No Unicode arrows — all glyphs are inline SVG.

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

function Icon({ size = 14, children }) {
  return h('svg', {
    width: String(size), height: String(size), viewBox: '0 0 16 16',
    fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, children);
}

const ChevronUp   = () => h(Icon, null, h('polyline', { points: '3,10 8,5 13,10' }));
const ChevronDown = () => h(Icon, null, h('polyline', { points: '3,6 8,11 13,6' }));
const CloseIcon   = () => h(Icon, null, h('path', { d: 'M4.5 4.5l7 7M11.5 4.5l-7 7' }));
const SearchIcon  = () => h(Icon, { size: 13 },
  h('circle', { cx: '7', cy: '7', r: '4' }),
  h('line', { x1: '10.1', y1: '10.1', x2: '13', y2: '13' }),
);

export function FindReplace({
  isOpen = false,
  matchesCount = 0,
  currentIndex = 0,
  onSearchChange,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose,
}) {
  const [query, setQuery]               = useState('');
  const [replaceText, setReplaceText]   = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord]       = useState(false);
  const [showReplace, setShowReplace]   = useState(false);
  const findInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (findInputRef.current) {
          findInputRef.current.focus();
          findInputRef.current.select();
        }
      }, 40);
    } else {
      setShowReplace(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && onSearchChange) {
      onSearchChange(query, { caseSensitive, wholeWord });
    }
  }, [isOpen, query, caseSensitive, wholeWord]);

  if (!isOpen) return null;

  const handleFindKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onFindPrev && onFindPrev(query, { caseSensitive, wholeWord });
      else            onFindNext && onFindNext(query, { caseSensitive, wholeWord });
    }
  };

  const handleReplaceKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose && onClose(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      onReplace && onReplace(query, replaceText, { caseSensitive, wholeWord });
    }
  };

  const hasQuery  = query.length > 0;
  const noMatch   = hasQuery && matchesCount === 0;
  const countLabel = !hasQuery ? '' :
    matchesCount > 999  ? '>999' :
    matchesCount > 0    ? `${currentIndex + 1}/${matchesCount}` : '0';

  return h('div', {
    class: 'find-panel',
    role: 'region',
    'aria-label': 'Find and replace',
  },
    /* ── Find row ── */
    h('div', { class: 'find-panel-row' },

      /* toggle-replace chevron */
      h('button', {
        type: 'button',
        class: 'find-expand-btn',
        'aria-expanded': String(showReplace),
        'aria-label': showReplace ? 'Hide replace' : 'Show replace',
        title: showReplace ? 'Hide replace (Alt+R)' : 'Show replace (Alt+R)',
        onClick: () => setShowReplace((v) => !v),
      }, h('svg', {
        width: '10', height: '10', viewBox: '0 0 16 16',
        fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
      }, showReplace
        ? h('polyline', { points: '3,10 8,5 13,10' })
        : h('polyline', { points: '3,6 8,11 13,6' }),
      )),

      /* search input */
      h('div', { class: 'find-input-wrap' + (noMatch ? ' is-no-match' : '') },
        h('span', { class: 'find-search-icon', 'aria-hidden': 'true' }, h(SearchIcon)),
        h('input', {
          ref: findInputRef,
          class: 'find-input',
          type: 'text',
          placeholder: 'Find',
          spellcheck: false,
          autocomplete: 'off',
          'aria-label': 'Find text',
          value: query,
          onInput: (e) => setQuery(e.target.value),
          onKeyDown: handleFindKeyDown,
        }),
        hasQuery && h('span', {
          class: 'find-count' + (noMatch ? ' is-zero' : ''),
          'aria-live': 'polite',
          'aria-atomic': 'true',
        }, countLabel),
      ),

      /* case / word toggles */
      h('div', { class: 'find-toggles' },
        h('button', {
          type: 'button',
          class: 'find-toggle-btn' + (caseSensitive ? ' is-on' : ''),
          'aria-pressed': String(caseSensitive),
          title: 'Match case',
          onClick: () => setCaseSensitive((v) => !v),
        }, h('svg', {
          width: '14', height: '14', viewBox: '0 0 16 16',
          fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
        },
          h('path', { d: 'M2 12 L5 4 L8 12' }),
          h('line', { x1: '3', y1: '9.5', x2: '7', y2: '9.5' }),
          h('path', { d: 'M11 7.5a2 2 0 1 0 0.001 4 A2 2 0 0 0 11 7.5z' }),
          h('path', { d: 'M13 7.5v4.5' }),
        )),
        h('button', {
          type: 'button',
          class: 'find-toggle-btn' + (wholeWord ? ' is-on' : ''),
          'aria-pressed': String(wholeWord),
          title: 'Whole word',
          onClick: () => setWholeWord((v) => !v),
        }, h('svg', {
          width: '14', height: '14', viewBox: '0 0 16 16',
          fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
        },
          h('polyline', { points: '2,4 4.5,12 8,6 11.5,12 14,4' }),
          h('line', { x1: '1.5', y1: '14.5', x2: '14.5', y2: '14.5' }),
        )),
      ),

      /* prev / next nav */
      h('div', { class: 'find-nav' },
        h('button', {
          type: 'button', class: 'find-nav-btn',
          title: 'Previous match (Shift+Enter)', 'aria-label': 'Previous match',
          disabled: !hasQuery || matchesCount === 0,
          onClick: () => onFindPrev && onFindPrev(query, { caseSensitive, wholeWord }),
        }, h(ChevronUp)),
        h('button', {
          type: 'button', class: 'find-nav-btn',
          title: 'Next match (Enter)', 'aria-label': 'Next match',
          disabled: !hasQuery || matchesCount === 0,
          onClick: () => onFindNext && onFindNext(query, { caseSensitive, wholeWord }),
        }, h(ChevronDown)),
      ),

      /* close */
      h('button', {
        type: 'button', class: 'find-close-btn',
        title: 'Close (Esc)', 'aria-label': 'Close find',
        onClick: onClose,
      }, h(CloseIcon)),
    ),

    /* ── Replace row (collapsed by default) ── */
    showReplace && h('div', { class: 'find-panel-row find-replace-row' },
      h('span', { class: 'find-expand-spacer', 'aria-hidden': 'true' }),
      h('div', { class: 'find-input-wrap' },
        h('input', {
          class: 'find-input',
          type: 'text', placeholder: 'Replace', spellcheck: false, autocomplete: 'off',
          'aria-label': 'Replace text',
          value: replaceText,
          onInput: (e) => setReplaceText(e.target.value),
          onKeyDown: handleReplaceKeyDown,
        }),
      ),
      h('div', { class: 'find-replace-actions' },
        h('button', {
          type: 'button', class: 'find-replace-btn',
          disabled: !hasQuery || matchesCount === 0,
          title: 'Replace this match',
          onClick: () => onReplace && onReplace(query, replaceText, { caseSensitive, wholeWord }),
        }, 'Replace'),
        h('button', {
          type: 'button', class: 'find-replace-btn',
          disabled: !hasQuery || matchesCount === 0,
          title: 'Replace all matches',
          onClick: () => onReplaceAll && onReplaceAll(query, replaceText, { caseSensitive, wholeWord }),
        }, 'All'),
      ),
      h('span', { class: 'find-close-spacer', 'aria-hidden': 'true' }),
    ),
  );
}
