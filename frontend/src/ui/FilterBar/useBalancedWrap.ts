import { useLayoutEffect, useRef, useState } from 'react';
import { balancedWidth } from './balanced-wrap';

/** A wrapping row whose lines come out about equal: its max width is set to the balanced width. */
export function useBalancedWrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const [maxWidth, setMaxWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const row = ref.current;
    const parent = row?.parentElement;
    if (!active || !row || !parent || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => {
      const widths = [...row.children].map((child) => child.getBoundingClientRect().width);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      setMaxWidth(balancedWidth(widths, gap, parent.clientWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [active]);

  return [ref, maxWidth === null ? undefined : { maxWidth }] as const;
}
