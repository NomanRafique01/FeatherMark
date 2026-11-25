// FeatherMark — Preview component (Phase 05 rendering, Phase 06 layout).
// Renders markdown via markdown-it with strict XSS boundary, debounced render,
// in-place DOM morph (content diffing to preserve scroll stability), and scroll-sync.

import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { renderMarkdown } from '../markdown.js';

// ---------------------------------------------------------------------------
// DOM morpher — syncs CHILDREN of dst to match CHILDREN of src.
//
// CRITICAL: Never touches dst's own attributes. When called as
//   morphChildren(article.preview-prose, body)
// the article keeps its class="preview-prose". Without this split, the
// original single morph() would strip class="preview-prose" on every
// keystroke because <body> carries no class — killing all prose styles.
// ---------------------------------------------------------------------------
function morphChildren(dst, src) {
  let curDst = dst.firstChild;
  let curSrc = src.firstChild;

  while (curSrc) {
    if (!curDst) {
      dst.appendChild(curSrc.cloneNode(true));
      curSrc = curSrc.nextSibling;
    } else if (curDst.nodeType !== curSrc.nodeType || curDst.nodeName !== curSrc.nodeName) {
      const nextDst = curDst.nextSibling;
      dst.replaceChild(curSrc.cloneNode(true), curDst);
      curDst = nextDst;
      curSrc = curSrc.nextSibling;
    } else if (curDst.nodeType === Node.TEXT_NODE) {
      if (curDst.nodeValue !== curSrc.nodeValue) {
        curDst.nodeValue = curSrc.nodeValue;
      }
      curDst = curDst.nextSibling;
      curSrc = curSrc.nextSibling;
    } else {
      morphElement(curDst, curSrc);
      curDst = curDst.nextSibling;
      curSrc = curSrc.nextSibling;
    }
  }

  while (curDst) {
    const nextDst = curDst.nextSibling;
    dst.removeChild(curDst);
    curDst = nextDst;
  }
}

function morphElement(dst, src) {
  for (const attr of Array.from(src.attributes || [])) {
    if (dst.getAttribute(attr.name) !== attr.value) dst.setAttribute(attr.name, attr.value);
  }
  for (const attr of Array.from(dst.attributes || [])) {
    if (!src.hasAttribute(attr.name)) dst.removeAttribute(attr.name);
  }
  morphChildren(dst, src);
}

// ---------------------------------------------------------------------------
// Instant scroll helper — bypasses any CSS scroll-behavior so programmatic
// position restores are always frame-perfect, never animated.
// ---------------------------------------------------------------------------
function scrollInstant(el, top) {
  el.style.scrollBehavior = 'auto';
  el.scrollTop = top;
  el.style.scrollBehavior = '';
}

// ---------------------------------------------------------------------------
// RAF-throttled smooth lerp scroller for editor→preview continuous sync.
//
// RULE: Never call scrollTo({ behavior:'smooth' }) inside a scroll event
// handler — repeated calls launch competing animations that fight each other
// and produce rubbery lag. Instead: RAF-throttle + direct scrollTop (instant)
// gives zero-lag sync. Smooth only for one-shot user actions (anchor clicks).
// ---------------------------------------------------------------------------
function makeSyncScroller() {
  let rafId = null;
  let targetTop = null;

  function cancel() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    targetTop = null;
  }

  function scrollTo(el, top) {
    targetTop = top;
    if (rafId !== null) return; // already scheduled; latest target wins
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (el && targetTop !== null) {
        scrollInstant(el, targetTop);
        targetTop = null;
      }
    });
  }

  return { scrollTo, cancel };
}

// ---------------------------------------------------------------------------
// Preview component
// ---------------------------------------------------------------------------
export function Preview({
  text = '',
  initialScroll = 0,
  onScrollChange,
  onPreviewScroll,
  previewHandleRef,
  searchQuery = '',
  searchOpts = {},
}) {
  const containerRef = useRef(null);
  const proseRef = useRef(null);
  const prevHtmlRef = useRef(null);
  const isExternalScrollRef = useRef(false);
  const externalScrollTimerRef = useRef(null);
  const syncScrollerRef = useRef(makeSyncScroller());
  const lineBlocksRef = useRef([]);
  const previewScrollRafRef = useRef(null);
  const callbacksRef = useRef({ onScrollChange, onPreviewScroll });
  callbacksRef.current = { onScrollChange, onPreviewScroll };

  // Helper to re-index all [data-line] offsets in prose
  function refreshLineBlocks() {
    const prose = proseRef.current;
    if (!prose) {
      lineBlocksRef.current = [];
      return;
    }
    const els = prose.querySelectorAll('[data-line]');
    const blocks = [];
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const line = parseInt(el.getAttribute('data-line'), 10);
      if (!isNaN(line)) {
        blocks.push({
          line,
          offsetTop: el.offsetTop,
          offsetHeight: el.offsetHeight,
        });
      }
    }
    lineBlocksRef.current = blocks;
  }

  // Expose control handles to parent
  useEffect(() => {
    if (!previewHandleRef) return;
    previewHandleRef.current = {
      getScrollTop() {
        return containerRef.current ? containerRef.current.scrollTop : 0;
      },

      setScrollTop(top) {
        if (containerRef.current) scrollInstant(containerRef.current, top);
      },

      // Called from editor scroll events (continuous, 60fps+).
      // Uses RAF-throttle + cached line offsets — zero lag, zero layout thrashing.
      scrollToLine(line, ratio = 0) {
        const container = containerRef.current;
        if (!container) return;

        // Mark as external so the preview's own scroll listener doesn't echo back
        isExternalScrollRef.current = true;
        clearTimeout(externalScrollTimerRef.current);
        externalScrollTimerRef.current = setTimeout(() => {
          isExternalScrollRef.current = false;
        }, 120);

        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll <= 0 || line <= 0) {
          syncScrollerRef.current.scrollTo(container, 0);
          return;
        }

        const blocks = lineBlocksRef.current;
        if (blocks.length === 0) {
          syncScrollerRef.current.scrollTo(container, 0);
          return;
        }

        let prevBlock = null;
        let nextBlock = null;
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (b.line <= line) prevBlock = b;
          else { nextBlock = b; break; }
        }

        let target = 0;
        if (!prevBlock && nextBlock) {
          const nLine = nextBlock.line;
          target = nLine > 0 ? (nextBlock.offsetTop * line) / nLine : 0;
        } else if (prevBlock && !nextBlock) {
          target = prevBlock.offsetTop;
        } else if (prevBlock && nextBlock) {
          const pLine = prevBlock.line;
          const nLine = nextBlock.line;
          const span = Math.max(1, nLine - pLine);
          const progress = (line - pLine + Math.max(0, Math.min(1, ratio))) / span;
          target = prevBlock.offsetTop + (nextBlock.offsetTop - prevBlock.offsetTop) * progress;
        }

        syncScrollerRef.current.scrollTo(container, Math.min(target, maxScroll));
      },
    };
  }, [previewHandleRef]);

  // Debounced render (≥150ms idle) + in-place DOM morph (preserves scroll)
  useEffect(() => {
    const timer = setTimeout(() => {
      const rawHtml = renderMarkdown(text);
      if (rawHtml === prevHtmlRef.current) return;
      prevHtmlRef.current = rawHtml;

      const prose = proseRef.current;
      const container = containerRef.current;
      if (!prose) return;

      // Save scroll before DOM changes
      const savedScroll = container ? container.scrollTop : 0;

      const parsed = new DOMParser().parseFromString(
        rawHtml || '<p class="preview-empty">Start typing to see the rendered preview.</p>',
        'text/html'
      );

      // morphChildren — NEVER morphs article's own class="preview-prose" attribute
      morphChildren(prose, parsed.body);
      refreshLineBlocks();

      // Restore scroll instantly (no animation — this is not a user action)
      if (container && !isExternalScrollRef.current) {
        scrollInstant(container, savedScroll);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [text]);

  // Highlight search matches in rendered preview using CSS Custom Highlight API
  useEffect(() => {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
    const prose = proseRef.current;
    if (!prose || !searchQuery) {
      CSS.highlights.delete('fm-search-match');
      return;
    }

    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = searchOpts?.wholeWord ? `\\b${escaped}\\b` : escaped;
    const flags = searchOpts?.caseSensitive ? 'g' : 'gi';
    let regex;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      CSS.highlights.delete('fm-search-match');
      return;
    }

    const ranges = [];
    const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue;
      if (!val) continue;
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(val)) !== null) {
        if (match[0].length === 0) break;
        const range = new Range();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push(range);
      }
    }

    if (ranges.length > 0) {
      CSS.highlights.set('fm-search-match', new Highlight(...ranges));
    } else {
      CSS.highlights.delete('fm-search-match');
    }

    return () => {
      CSS.highlights.delete('fm-search-match');
    };
  }, [searchQuery, searchOpts?.caseSensitive, searchOpts?.wholeWord, text]);

  // Immediate render on mount (innerHTML, no morph needed — DOM is empty)
  useEffect(() => {
    const rawHtml = renderMarkdown(text);
    prevHtmlRef.current = rawHtml;
    const prose = proseRef.current;
    if (prose) {
      prose.innerHTML = rawHtml || '<p class="preview-empty">Start typing to see the rendered preview.</p>';
      refreshLineBlocks();
      if (initialScroll > 0 && containerRef.current) {
        scrollInstant(containerRef.current, initialScroll);
      }
    }

    // ResizeObserver on prose to keep cached block line offsets exact if fonts load or window resizes
    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && proseRef.current) {
      ro = new ResizeObserver(() => {
        refreshLineBlocks();
      });
      ro.observe(proseRef.current);
    }

    // Cancel any pending RAF sync on unmount
    return () => {
      if (ro) ro.disconnect();
      if (previewScrollRafRef.current !== null) cancelAnimationFrame(previewScrollRafRef.current);
      clearTimeout(externalScrollTimerRef.current);
      syncScrollerRef.current.cancel();
    };
  }, []);

  // Scroll listener: save position + fire preview→editor reverse sync
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    if (callbacksRef.current.onScrollChange && !isExternalScrollRef.current) {
      callbacksRef.current.onScrollChange(scrollTop);
    }

    if (isExternalScrollRef.current) return; // skip echo from our own sync

    if (previewScrollRafRef.current !== null) return;
    previewScrollRafRef.current = requestAnimationFrame(() => {
      previewScrollRafRef.current = null;
      if (!containerRef.current || !proseRef.current || isExternalScrollRef.current) return;

      const st = containerRef.current.scrollTop;
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (maxScroll <= 0 || st <= 0) {
        if (callbacksRef.current.onPreviewScroll) {
          callbacksRef.current.onPreviewScroll({ line: 0, ratio: 0 });
        }
        return;
      }

      const blocks = lineBlocksRef.current;
      if (blocks.length === 0) return;

      if (st >= maxScroll - 2) {
        const lastLine = blocks[blocks.length - 1].line;
        if (callbacksRef.current.onPreviewScroll) {
          callbacksRef.current.onPreviewScroll({ line: lastLine, ratio: 1 });
        }
        return;
      }

      let visibleBlock = null;
      let nextBlock = null;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.offsetTop <= st) visibleBlock = b;
        else { nextBlock = b; break; }
      }

      if (visibleBlock && callbacksRef.current.onPreviewScroll) {
        const bLine = visibleBlock.line;
        const nLine = nextBlock ? nextBlock.line : bLine + 1;
        const bTop = visibleBlock.offsetTop;
        const nTop = nextBlock ? nextBlock.offsetTop : bTop + visibleBlock.offsetHeight;
        const progress = nTop > bTop ? (st - bTop) / (nTop - bTop) : 0;
        const line = bLine + progress * (nLine - bLine);
        callbacksRef.current.onPreviewScroll({ line: Math.floor(line), ratio: line - Math.floor(line) });
      }
    });
  };

  // Anchor clicks: smooth scroll is correct here — single one-shot user action
  const handleClick = (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = proseRef.current ? proseRef.current.querySelector(href) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (href) {
      e.preventDefault();
    }
  };

  return h('div', {
    ref: containerRef,
    class: 'preview-pane-container',
    onScroll: handleScroll,
    onClick: handleClick,
  },
    h('article', { ref: proseRef, class: 'preview-prose' })
  );
}
