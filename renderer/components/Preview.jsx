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
}) {
  const containerRef = useRef(null);
  const proseRef = useRef(null);
  const prevHtmlRef = useRef(null);
  const isExternalScrollRef = useRef(false);
  const externalScrollTimerRef = useRef(null);
  const syncScrollerRef = useRef(makeSyncScroller());

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
      // Uses RAF-throttle + instant scroll — zero lag, no competing animations.
      scrollToLine(line, ratio = 0) {
        const container = containerRef.current;
        const prose = proseRef.current;
        if (!container || !prose) return;

        // Mark as external so the preview's own scroll listener doesn't echo back
        isExternalScrollRef.current = true;
        clearTimeout(externalScrollTimerRef.current);
        externalScrollTimerRef.current = setTimeout(() => {
          isExternalScrollRef.current = false;
        }, 80); // short: just enough to skip the scroll echo, no lag

        const maxScroll = container.scrollHeight - container.clientHeight;
        if (maxScroll <= 0 || line <= 0) {
          syncScrollerRef.current.scrollTo(container, 0);
          return;
        }

        const blocks = prose.querySelectorAll('[data-line]');
        if (blocks.length === 0) {
          syncScrollerRef.current.scrollTo(container, 0);
          return;
        }

        let prevBlock = null;
        let nextBlock = null;
        for (let i = 0; i < blocks.length; i++) {
          const bLine = parseInt(blocks[i].getAttribute('data-line'), 10);
          if (bLine <= line) prevBlock = blocks[i];
          else { nextBlock = blocks[i]; break; }
        }

        let target = 0;
        if (!prevBlock && nextBlock) {
          const nLine = parseInt(nextBlock.getAttribute('data-line'), 10);
          target = nLine > 0 ? (nextBlock.offsetTop * line) / nLine : 0;
        } else if (prevBlock && !nextBlock) {
          target = prevBlock.offsetTop;
        } else if (prevBlock && nextBlock) {
          const pLine = parseInt(prevBlock.getAttribute('data-line'), 10);
          const nLine = parseInt(nextBlock.getAttribute('data-line'), 10);
          const span = Math.max(1, nLine - pLine);
          const progress = (line - pLine + Math.max(0, Math.min(1, ratio))) / span;
          target = prevBlock.offsetTop + (nextBlock.offsetTop - prevBlock.offsetTop) * progress;
        }

        syncScrollerRef.current.scrollTo(container, Math.min(target, maxScroll));
      },
    };
  }, [previewHandleRef]);

  // Restore initial scroll position (instant — no animation on load)
  useEffect(() => {
    if (initialScroll > 0 && containerRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) scrollInstant(containerRef.current, initialScroll);
      });
    }
  }, [initialScroll]);

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

      // Restore scroll instantly (no animation — this is not a user action)
      if (container && !isExternalScrollRef.current) {
        scrollInstant(container, savedScroll);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [text]);

  // Immediate render on mount (innerHTML, no morph needed — DOM is empty)
  useEffect(() => {
    const rawHtml = renderMarkdown(text);
    prevHtmlRef.current = rawHtml;
    const prose = proseRef.current;
    if (prose) {
      prose.innerHTML = rawHtml || '<p class="preview-empty">Start typing to see the rendered preview.</p>';
      if (initialScroll > 0 && containerRef.current) {
        scrollInstant(containerRef.current, initialScroll);
      }
    }
    // Cancel any pending RAF sync on unmount
    return () => syncScrollerRef.current.cancel();
  }, []);

  // Scroll listener: save position + fire preview→editor reverse sync
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    if (onScrollChange) onScrollChange(scrollTop);

    if (isExternalScrollRef.current) return; // skip echo from our own sync

    if (onPreviewScroll && proseRef.current) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0 || scrollTop <= 0) {
        onPreviewScroll({ line: 0, ratio: 0 });
        return;
      }

      const blocks = proseRef.current.querySelectorAll('[data-line]');
      let visibleBlock = null;
      let nextBlock = null;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.offsetTop <= scrollTop) visibleBlock = b;
        else { nextBlock = b; break; }
      }

      if (visibleBlock) {
        const bLine = parseInt(visibleBlock.getAttribute('data-line'), 10);
        const nLine = nextBlock ? parseInt(nextBlock.getAttribute('data-line'), 10) : bLine + 1;
        const bTop = visibleBlock.offsetTop;
        const nTop = nextBlock ? nextBlock.offsetTop : bTop + visibleBlock.offsetHeight;
        const progress = nTop > bTop ? (scrollTop - bTop) / (nTop - bTop) : 0;
        const line = bLine + progress * (nLine - bLine);
        onPreviewScroll({ line: Math.floor(line), ratio: line - Math.floor(line) });
      }
    }
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
