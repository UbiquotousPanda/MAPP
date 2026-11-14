export function linesAt(widths: number[], gap: number, width: number): number {
  let lines = 1;
  let used = 0;
  for (const w of widths) {
    const next = used === 0 ? w : used + gap + w;
    if (next > width && used > 0) {
      lines += 1;
      used = w;
    } else {
      used = next;
    }
  }
  return lines;
}

/** The narrowest width keeping the fewest lines `available` allows, so the lines come out about equal. */
export function balancedWidth(widths: number[], gap: number, available: number): number | null {
  if (widths.length === 0 || linesAt(widths, gap, available) <= 1) {
    return null;
  }
  const lines = linesAt(widths, gap, available);
  let low = Math.max(...widths);
  let high = available;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (linesAt(widths, gap, mid) > lines) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Math.ceil(high);
}
