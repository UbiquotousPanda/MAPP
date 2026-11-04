const CATEGORY_COLOURS = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
  'var(--chart-cat-6)',
  'var(--chart-cat-7)',
];

export const OTHER_COLOUR = 'var(--chart-cat-8)';

// Past seven categories the colours repeat striped, so no two series look alike (design system §4.7).
export function categoryFill(index: number): string {
  const colour = CATEGORY_COLOURS[index % CATEGORY_COLOURS.length];
  if (index < CATEGORY_COLOURS.length) {
    return colour;
  }
  return `repeating-linear-gradient(135deg, ${colour} 0 4px, var(--surface) 4px 6px)`;
}
