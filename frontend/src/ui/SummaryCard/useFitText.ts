import { useLayoutEffect, useRef } from 'react';

const SMALLEST_PX = 16;

/** Steps the font of a one-line value down until it fits its box, never below 16 px; a figure never breaks. */
export function useFitText<T extends HTMLElement>(text: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const fit = () => {
      element.style.fontSize = '';
      element.style.whiteSpace = 'nowrap';
      let size = parseFloat(getComputedStyle(element).fontSize);
      while (element.scrollWidth > element.clientWidth && size > SMALLEST_PX) {
        size -= 1;
        element.style.fontSize = `${size}px`;
      }
      if (element.scrollWidth > element.clientWidth) {
        element.style.whiteSpace = '';
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element.parentElement ?? element);
    return () => observer.disconnect();
  }, [text]);
  return ref;
}
