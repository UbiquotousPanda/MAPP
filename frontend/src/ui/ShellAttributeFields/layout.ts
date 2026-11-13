import type { FormAttribute } from './rules';

export function isWide(attribute: FormAttribute): boolean {
  return (
    attribute.type === 'longText' ||
    attribute.type === 'multipleChoiceSplit' ||
    (attribute.type === 'multipleChoice' && attribute.options.length > 2) ||
    attribute.options.length > 4
  );
}

// A wide field waits until the short one before it has a partner; reordered in the page, not by CSS,
// so the Tab order follows what people see.
export function pairedOrder(attributes: FormAttribute[]): FormAttribute[] {
  const order: FormAttribute[] = [];
  let waiting: FormAttribute[] = [];
  let halfRow = false;
  for (const attribute of attributes) {
    if (isWide(attribute) && halfRow) {
      waiting.push(attribute);
    } else if (isWide(attribute)) {
      order.push(attribute);
    } else {
      order.push(attribute);
      halfRow = !halfRow;
      if (!halfRow) {
        order.push(...waiting);
        waiting = [];
      }
    }
  }
  return [...order, ...waiting];
}

export const HEADING_LEVELS = { h2: 2, h3: 3, h4: 4, none: undefined } as const;
