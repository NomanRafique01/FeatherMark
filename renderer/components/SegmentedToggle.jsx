// FeatherMark — measured, accessible segmented toggle with one shared liquid pill.

import { h } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export function SegmentedToggle({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  pillClassName,
  optionClassName,
  renderOption,
}) {
  const containerRef = useRef(null);
  const pillRef = useRef(null);
  const buttonRefs = useRef([]);
  const mountedRef = useRef(false);
  const previousXRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    const selected = buttonRefs.current.find((button) => button?.dataset.value === value);
    if (!container || !pill || !selected) return undefined;

    const placePill = (instant = false) => {
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      const paddingLeft = Number.parseFloat(getComputedStyle(container).paddingLeft) || 0;
      const nextX = selectedRect.left - containerRect.left - paddingLeft;
      const nextWidth = selectedRect.width;
      const previousX = previousXRef.current;
      previousXRef.current = nextX;

      if (instant) {
        pill.classList.remove('is-liquid');
        pill.style.transition = 'none';
        pill.style.transform = `translateX(${nextX}px)`;
        pill.style.width = `${nextWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = '';
        return;
      }

      const travel = Math.abs(nextX - previousX);
      const stretch = 1 + Math.min(travel / Math.max(nextWidth, 1), 1) * 0.1;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (travel > 1 && !reducedMotion) {
        // The fill leads in the direction of travel, then settles as a single body.
        pill.style.setProperty('--pill-stretch', String(stretch));
        pill.style.setProperty('--pill-stretch-origin', nextX > previousX ? 'left' : 'right');
        pill.classList.remove('is-liquid');
        void pill.offsetWidth;
        pill.classList.add('is-liquid');
      }

      pill.style.transform = `translateX(${nextX}px)`;
      pill.style.width = `${nextWidth}px`;
    };

    placePill(!mountedRef.current);
    mountedRef.current = true;

    // The pill never owns layout. It simply tracks a button whenever the
    // container's dimensions change (labels, fonts, or window size included).
    const resizeObserver = new ResizeObserver(() => placePill(true));
    resizeObserver.observe(container);
    const onResize = () => placePill(true);
    window.addEventListener('resize', onResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [value]);

  function handleKeyDown(event, index) {
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = options[nextIndex];
    onChange?.(next.value);
    requestAnimationFrame(() => buttonRefs.current[nextIndex]?.focus());
  }

  return h('div', {
    ref: containerRef,
    class: `${className} segmented-toggle`,
    role: 'radiogroup',
    'aria-label': ariaLabel,
  },
    h('span', {
      ref: pillRef,
      class: `${pillClassName} segmented-toggle-pill`,
      'aria-hidden': 'true',
      onAnimationEnd: (event) => {
        if (event.animationName !== 'fm-pill-liquid-settle') return;
        pillRef.current?.classList.remove('is-liquid');
        pillRef.current?.style.setProperty('--pill-stretch', '1');
      },
    }),
    options.map((option, index) => h('button', {
      key: option.value,
      ref: (button) => { buttonRefs.current[index] = button; },
      type: 'button',
      role: 'radio',
      class: `${optionClassName(option)} segmented-toggle-option`,
      'data-value': option.value,
      'aria-checked': String(value === option.value),
      'aria-pressed': String(value === option.value),
      'aria-label': option.ariaLabel || option.label,
      title: option.ariaLabel || option.label,
      tabIndex: value === option.value ? 0 : -1,
      onClick: () => onChange?.(option.value),
      onKeyDown: (event) => handleKeyDown(event, index),
    }, renderOption(option))),
  );
}
