// FeatherMark — Find and Replace overlay component (Phase 06).
// Anchored top-right of the editor pane, tone-step surface with 1px border.
// Esc dismisses, Enter/Shift+Enter navigates matches, case/word toggles,
// single undoable replace-all transaction.

import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

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
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const findInputRef = useRef(null);

  // Focus find input whenever overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (findInputRef.current) {
          findInputRef.current.focus();
          findInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);

  // Notify parent of search state changes
  useEffect(() => {
    if (isOpen && onSearchChange) {
      onSearchChange(query, { caseSensitive, wholeWord });
    }
  }, [isOpen, query, caseSensitive, wholeWord]);

  if (!isOpen) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onClose) onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (onFindPrev) onFindPrev(query, { caseSensitive, wholeWord });
      } else {
        if (onFindNext) onFindNext(query, { caseSensitive, wholeWord });
      }
    }
  };

  const countDisplay = query.length === 0
    ? ''
    : matchesCount > 999
      ? '>999 matches'
      : matchesCount > 0
        ? `${currentIndex + 1} of ${matchesCount}`
        : '0 of 0';

  return h('div', {
    class: 'find-replace-overlay',
    role: 'region',
    'aria-label': 'Find and replace',
    onKeyDown: handleKeyDown,
  },
    h('div', { class: 'find-row' },
      h('input', {
        ref: findInputRef,
        class: 'find-input',
        type: 'text',
        placeholder: 'Find',
        value: query,
        onInput: (e) => setQuery(e.target.value),
      }),
      h('div', { class: 'find-options' },
        h('button', {
          class: 'find-opt-btn' + (caseSensitive ? ' is-active' : ''),
          'aria-pressed': caseSensitive,
          title: 'Match case',
          onClick: () => setCaseSensitive(!caseSensitive),
        }, 'Aa'),
        h('button', {
          class: 'find-opt-btn' + (wholeWord ? ' is-active' : ''),
          'aria-pressed': wholeWord,
          title: 'Whole word',
          onClick: () => setWholeWord(!wholeWord),
        }, '\\b')
      ),
      h('span', { class: 'find-count' }, countDisplay),
      h('button', {
        class: 'find-nav-btn',
        title: 'Previous match (Shift+Enter)',
        'aria-label': 'Previous match',
        disabled: matchesCount === 0,
        onClick: () => onFindPrev && onFindPrev(query, { caseSensitive, wholeWord }),
      }, '↑'),
      h('button', {
        class: 'find-nav-btn',
        title: 'Next match (Enter)',
        'aria-label': 'Next match',
        disabled: matchesCount === 0,
        onClick: () => onFindNext && onFindNext(query, { caseSensitive, wholeWord }),
      }, '↓'),
      h('button', {
        class: 'find-close-btn',
        title: 'Close (Esc)',
        'aria-label': 'Close find and replace',
        onClick: onClose,
      }, '×')
    ),
    h('div', { class: 'replace-row' },
      h('input', {
        class: 'replace-input',
        type: 'text',
        placeholder: 'Replace with',
        value: replaceText,
        onInput: (e) => setReplaceText(e.target.value),
      }),
      h('button', {
        class: 'replace-action-btn',
        disabled: matchesCount === 0,
        onClick: () => onReplace && onReplace(query, replaceText, { caseSensitive, wholeWord }),
      }, 'Replace'),
      h('button', {
        class: 'replace-action-btn',
        disabled: matchesCount === 0,
        onClick: () => onReplaceAll && onReplaceAll(query, replaceText, { caseSensitive, wholeWord }),
      }, 'Replace all')
    )
  );
}
