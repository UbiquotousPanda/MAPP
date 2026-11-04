const NAMED_COLOURS = 7;

export const OTHER_COLOUR = 'var(--chart-cat-8)';

// Past seven categories the colours repeat striped, so no two series look alike (design system §4.7).
export function categoryFill(index: number): string {
  const colour = `var(--chart-cat-${(index % NAMED_COLOURS) + 1})`;
  if (index < NAMED_COLOURS) {
    return colour;
  }
  return `repeating-linear-gradient(135deg, ${colour} 0 4px, var(--surface) 4px 6px)`;
}
