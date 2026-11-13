import { useLayoutEffect, useRef, useState } from 'react';
import type { FormAttribute } from './rules';

const TWO_COLUMNS_PX = 600;
const THREE_COLUMNS_PX = 900;

export type Columns = 1 | 2 | 3;

export const HEADING_LEVELS = { h2: 2, h3: 3, h4: 4, none: undefined } as const;

export function isWide(attribute: FormAttribute): boolean {
  return (
    attribute.type === 'longText' ||
    attribute.type === 'multipleChoiceSplit' ||
    (attribute.type === 'multipleChoice' && attribute.options.length > 2)
  );
}

export function columnsFor(width: number): Columns {
  return width >= THREE_COLUMNS_PX ? 3 : width >= TWO_COLUMNS_PX ? 2 : 1;
}

// A wide field waits until the row of short ones before it is full; reordered in the page, not by CSS,
// so the Tab order follows what people see.
export function filledOrder(attributes: FormAttribute[], columns: Columns): FormAttribute[] {
  const order: FormAttribute[] = [];
  let waiting: FormAttribute[] = [];
  let used = 0;
  for (const attribute of attributes) {
    if (isWide(attribute) && used > 0) {
      waiting.push(attribute);
    } else if (isWide(attribute)) {
      order.push(attribute);
    } else {
      order.push(attribute);
      used = (used + 1) % columns;
      if (used === 0) {
        order.push(...waiting);
        waiting = [];
      }
    }
  }
  return [...order, ...waiting];
}

export function useColumns<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [columns, setColumns] = useState<Columns>(1);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const measure = () => setColumns(columnsFor(element.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, columns };
}
