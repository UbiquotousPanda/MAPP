import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFitText } from './useFitText';

const BOX = 120;

function Value({ text }: { text: string }) {
  const ref = useFitText<HTMLParagraphElement>(text);
  return (
    <>
      <style>{'.value { font-size: 28px; }'}</style>
      <p ref={ref} className="value" data-testid="value">
        {text}
      </p>
    </>
  );
}

// jsdom lays nothing out: a character is 0.6 of the font size wide, and the box is 120 px.
function measureLikeABrowser() {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(BOX);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function width(
    this: HTMLElement,
  ) {
    const size = parseFloat(this.style.fontSize) || 28;
    return Math.ceil((this.textContent ?? '').length * size * 0.6);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('useFitText', () => {
  it('keeps a short figure at its full size, on one line', () => {
    measureLikeABrowser();
    const { getByTestId } = render(<Value text="39" />);

    expect(getByTestId('value').style.fontSize).toBe('');
    expect(getByTestId('value').style.whiteSpace).toBe('nowrap');
  });

  it('steps a long figure down until it fits, so it never breaks mid-number', () => {
    measureLikeABrowser();
    const { getByTestId } = render(<Value text="₹1,770.00" />);

    expect(getByTestId('value').style.fontSize).toBe('22px');
    expect(getByTestId('value').style.whiteSpace).toBe('nowrap');
  });

  it('stops at 16 px and lets a figure too long even then wrap rather than spill out', () => {
    measureLikeABrowser();
    const { getByTestId } = render(<Value text="₹1,102,849,000.00" />);

    expect(getByTestId('value').style.fontSize).toBe('16px');
    expect(getByTestId('value').style.whiteSpace).toBe('');
  });
});
