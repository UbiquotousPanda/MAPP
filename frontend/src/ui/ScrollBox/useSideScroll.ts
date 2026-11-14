import { useCallback, useEffect, useRef, useState } from 'react';

// Which edges of a sideways-scrolling box hide content: start once scrolled, end while columns remain.
export interface SideScroll {
  start: boolean;
  end: boolean;
}

const NONE: SideScroll = { start: false, end: false };

export function useSideScroll<T extends HTMLElement>(): {
  ref: (element: T | null) => void;
  scroll: SideScroll;
} {
  const [element, setElement] = useState<T | null>(null);
  const [scroll, setScroll] = useState<SideScroll>(NONE);
  const frame = useRef(0);

  const measure = useCallback(() => {
    if (!element) {
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = element;
    const next = {
      start: scrollLeft > 1,
      end: scrollLeft + clientWidth < scrollWidth - 1,
    };
    setScroll((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, [element]);

  useEffect(() => {
    if (!element) {
      return undefined;
    }
    const onScroll = () => {
      window.cancelAnimationFrame(frame.current);
      frame.current = window.requestAnimationFrame(measure);
    };
    onScroll();
    element.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // The table grows when rows open or columns change; jsdom has no ResizeObserver.
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onScroll);
    observer?.observe(element);
    const table = element.firstElementChild;
    if (table) {
      observer?.observe(table);
    }
    return () => {
      window.cancelAnimationFrame(frame.current);
      element.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer?.disconnect();
    };
  }, [element, measure]);

  return { ref: setElement, scroll };
}
