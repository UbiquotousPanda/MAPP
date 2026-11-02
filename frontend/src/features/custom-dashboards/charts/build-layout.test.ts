import { describe, expect, it } from 'vitest';
import type { WidgetType } from '../model';
import { buildOption } from './build-option';
import { column, seriesData, THEME, twoMeasureData, widget, widgetData } from './widget-fixtures';

const TOKENS = new Set([
  THEME.ink,
  THEME.ink2,
  THEME.hairline,
  THEME.surface,
  ...Object.values(THEME.palettes).flat(),
]);

function at(value: unknown, ...path: (string | number)[]): unknown {
  let current: unknown = value;
  for (const step of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = Reflect.get(current, step);
  }
  return current;
}

function call(value: unknown, ...args: unknown[]): unknown {
  if (typeof value !== 'function') {
    throw new Error('not a function');
  }
  return Reflect.apply(value, undefined, args);
}

function coloursIn(value: unknown, found: unknown[] = []): unknown[] {
  if (typeof value !== 'object' || value === null) {
    return found;
  }
  for (const [name, inner] of Object.entries(value)) {
    if (/colou?r$/i.test(name) && !Array.isArray(inner) && typeof inner !== 'object') {
      found.push(inner);
    } else if (/colou?r$/i.test(name) && Array.isArray(inner)) {
      found.push(...inner.flat(2).filter((part) => typeof part === 'string'));
    } else {
      coloursIn(inner, found);
    }
  }
  return found;
}

const ZOOMABLE: WidgetType[] = ['bar', 'line', 'area', 'combo', 'scatter'];

describe('051 FR-024: every colour drawn is a design token', () => {
  it.each(ZOOMABLE)('colours the %s zoom slider and legend pages from the tokens', (type) => {
    const option = buildOption(widget(type, { zoom: true }), twoMeasureData(), THEME);
    const zoom = at(option, 'dataZoom', 0);
    for (const path of [
      ['fillerColor'],
      ['borderColor'],
      ['handleStyle', 'color'],
      ['moveHandleStyle', 'color'],
      ['dataBackground', 'lineStyle', 'color'],
      ['dataBackground', 'areaStyle', 'color'],
      ['selectedDataBackground', 'lineStyle', 'color'],
      ['selectedDataBackground', 'areaStyle', 'color'],
      ['emphasis', 'handleStyle', 'borderColor'],
      ['emphasis', 'moveHandleStyle', 'color'],
    ]) {
      expect(TOKENS, path.join('.')).toContain(at(zoom, ...path));
    }
    expect(TOKENS).toContain(at(option, 'legend', 'pageIconColor'));
    expect(TOKENS).toContain(at(option, 'legend', 'pageIconInactiveColor'));
    expect(coloursIn(option).filter((colour) => !TOKENS.has(colour))).toEqual([]);
  });

  it('bands a heatmap’s rows and columns in token colours', () => {
    const option = buildOption(widget('heatmap'), seriesData(), THEME);
    for (const axis of ['xAxis', 'yAxis']) {
      const bands = at(option, axis, 'splitArea', 'areaStyle', 'color');
      expect(Array.isArray(bands) && bands.every((colour) => TOKENS.has(colour))).toBe(true);
    }
    expect(coloursIn(option).filter((colour) => !TOKENS.has(colour))).toEqual([]);
  });
});

describe('051 FR-025: nothing on a chart covers anything else', () => {
  it('puts the zoom slider above a bottom legend, and the plot above both', () => {
    const option = buildOption(widget('line', { zoom: true }), widgetData(), THEME);
    const legendRoom = 32;
    expect(Number(at(option, 'dataZoom', 0, 'bottom'))).toBeGreaterThanOrEqual(legendRoom);
    const sliderTop =
      Number(at(option, 'dataZoom', 0, 'bottom')) + Number(at(option, 'dataZoom', 0, 'height'));
    expect(Number(at(option, 'grid', 'bottom'))).toBeGreaterThan(sliderTop);
  });

  it('puts a horizontal chart’s slider beside a legend on the right', () => {
    const option = buildOption(
      widget('bar', {
        zoom: true,
        orientation: 'horizontal',
        legend: { show: true, position: 'right' },
      }),
      widgetData(),
      THEME,
    );
    expect(Number(at(option, 'dataZoom', 0, 'right'))).toBeGreaterThanOrEqual(140);
  });

  it.each(['bar', 'scatter'] as const)(
    'leaves room between the %s horizontal axis title and a bottom legend',
    (type) => {
      const option = buildOption(
        widget(type, { axisTitles: { x: 'Cost', y: '', y2: '' } }),
        twoMeasureData(),
        THEME,
      );
      const gap = Number(at(option, 'xAxis', 'nameGap'));
      const labels = 20;
      const legendRoom = 32;
      expect(Number(at(option, 'grid', 'bottom')) + labels - gap).toBeGreaterThan(legendRoom);
    },
  );

  it('writes the reference line’s label inside the plot, where it is never cut off', () => {
    const option = buildOption(
      widget('bar', { referenceLine: { value: '10000', label: 'Target' } }),
      widgetData(),
      THEME,
    );
    expect(at(option, 'series', 0, 'markLine', 'label', 'position')).toBe('insideEndTop');
  });

  it('shows only the minimum and maximum on a gauge’s scale, clear of its value', () => {
    const data = widgetData({ columns: [column('m0', 'Sum of Planned cost')], rows: [] });
    const series = at(buildOption(widget('gauge'), data, THEME), 'series', 0);
    const label = at(series, 'axisLabel', 'formatter');
    expect(call(label, 0)).toBe('$0');
    expect(call(label, 12500)).toBe('');
    expect(call(label, 25000)).toBe('$25K');
  });
});

describe('051 edge cases: a very long label is shortened with "…" on the chart', () => {
  it('shortens category names and legend entries, keeping the full name for the tooltip', () => {
    const option = buildOption(widget('bar'), seriesData(), THEME);
    expect(at(option, 'xAxis', 'axisLabel')).toMatchObject({ overflow: 'truncate', ellipsis: '…' });
    expect(at(option, 'xAxis', 'axisLabel', 'width')).toEqual(expect.any(Number));
    expect(at(option, 'legend', 'textStyle')).toMatchObject({
      overflow: 'truncate',
      ellipsis: '…',
    });
    expect(at(option, 'legend', 'tooltip', 'show')).toBe(true);
  });
});

describe('051 FR-025: data labels people can read', () => {
  it('writes a bar’s value beyond its end, in ink on the background', () => {
    const vertical = buildOption(widget('bar', { dataLabels: true }), widgetData(), THEME);
    expect(at(vertical, 'series', 0, 'label')).toMatchObject({ position: 'top', color: THEME.ink });
    const horizontal = buildOption(
      widget('bar', { dataLabels: true, orientation: 'horizontal' }),
      widgetData(),
      THEME,
    );
    expect(at(horizontal, 'series', 0, 'label', 'position')).toBe('right');
    const combo = buildOption(widget('combo', { dataLabels: true }), twoMeasureData(), THEME);
    expect(at(combo, 'series', 0, 'label', 'position')).toBe('top');
  });

  it('writes stacked values inside their bars, in the background colour', () => {
    const option = buildOption(
      widget('bar', { dataLabels: true, stack: 'stacked' }),
      seriesData(),
      THEME,
    );
    expect(at(option, 'series', 0, 'label')).toMatchObject({
      position: 'inside',
      color: THEME.surface,
    });
  });
});
