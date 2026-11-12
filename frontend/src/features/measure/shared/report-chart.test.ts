import { describe, expect, it } from 'vitest';
import type { ChartTheme } from '@/features/custom-dashboards';
import { moneyPoint, reportChartOption, shortPeriod, tickText } from './report-chart';
import type { ReportChartData, ReportSeries } from './report-chart';

const BUDGET = 'rgb(91, 107, 122)';
const ACTUAL_COLOUR = 'rgb(0, 133, 87)';
const THEME: ChartTheme = {
  ink: 'ink',
  ink2: 'ink-2',
  hairline: 'hairline',
  surface: 'surface',
  palettes: {
    categorical: [],
    planning: [BUDGET, 'planned', 'committed', ACTUAL_COLOUR],
    levels: [],
    sequential: [],
  },
};

const usd = (amount: string) => ({ amount, currency: 'USD' });
const text = (m: { amount: string }) => `$${m.amount}`;

function chart(series: ReportSeries[], extra: Partial<ReportChartData> = {}): ReportChartData {
  return { labels: ['Oct', 'Nov', 'Dec'], series, unit: { kind: 'count' }, today: 1, ...extra };
}

const ACTUAL: ReportSeries = {
  name: 'Actual',
  tone: 'actual',
  look: 'bar',
  points: [{ value: 5, text: '5' }, { value: 7, text: '7' }, null],
};
const GOAL: ReportSeries = {
  name: 'Goal',
  tone: 'budget',
  look: 'outline',
  points: [6, 6, 6].map((value) => ({ value, text: String(value) })),
};
const EMPTY: ReportSeries = { name: 'Projected', tone: 'planned', look: 'bar', points: [null] };

describe('report time charts (039, 047 FR-010)', () => {
  it('draws and names in the legend only the series that have a figure', () => {
    const option = reportChartOption(chart([EMPTY, ACTUAL, GOAL]), THEME);

    expect(option.series.map((s) => s.name)).toEqual(['Actual', 'Goal']);
  });

  it('marks today with a dashed line labelled Today, keeping the period its own label', () => {
    const option = reportChartOption(chart([ACTUAL, GOAL]), THEME);

    expect(option.xAxis.data).toEqual(['Oct', 'Nov', 'Dec']);
    expect(option.series[0]?.markLine).toMatchObject({
      lineStyle: { color: 'ink-2', width: 1, type: 'dashed' },
      label: { formatter: 'Today' },
      data: [{ xAxis: 1 }],
    });
    expect(option.series[1]?.markLine).toBeUndefined();
  });

  it('has no Today line when no period is in progress', () => {
    const option = reportChartOption(chart([ACTUAL], { today: -1 }), THEME);

    expect(option.series[0]?.markLine).toBeUndefined();
  });

  it('frames the actual with the goal as an outline in the same slot, in the tokens colours', () => {
    const option = reportChartOption(chart([ACTUAL, GOAL], { overlap: true }), THEME);
    const [actual, goal] = option.series;

    expect(actual).toMatchObject({ type: 'bar', color: ACTUAL_COLOUR, barGap: '-100%' });
    expect(goal).toMatchObject({
      type: 'bar',
      itemStyle: { color: 'transparent', borderColor: BUDGET },
    });
  });

  it.each([
    [0, { kind: 'money', currency: 'USD' }, '$0'],
    [250000, { kind: 'money', currency: 'USD' }, '$250K'],
    [1500000, { kind: 'money', currency: 'USD' }, '$1.5M'],
    [250000, { kind: 'money', currency: 'EUR' }, '€250K'],
    [5000, { kind: 'count' }, '5K'],
    [25, { kind: 'percent' }, '25%'],
  ] as const)('writes the axis tick %d short in its unit', (tick, unit, expected) => {
    expect(tickText(tick, unit)).toBe(expected);
  });

  it('lists every series exact value in the tooltip, each beside its series colour', () => {
    const option = reportChartOption(chart([ACTUAL, GOAL]), THEME);
    const params = [
      {
        seriesName: 'Actual',
        color: ACTUAL_COLOUR,
        axisValueLabel: 'Nov',
        data: { text: '$7.25' },
      },
      { seriesName: 'Goal', color: 'transparent', data: { text: '$6.00' } },
    ];

    const box = option.tooltip.formatter(params);

    expect(box.textContent).toBe('NovActual$7.25Goal$6.00');
    const markers = [...box.querySelectorAll<HTMLElement>('li > span:first-child')];
    expect(markers.map((m) => m.style.backgroundColor)).toEqual([ACTUAL_COLOUR, BUDGET]);
  });

  it('shortens a period key to its month or quarter', () => {
    expect(shortPeriod('2026-06')).toBe('Jun');
    expect(shortPeriod('2026-Q2')).toBe('Q2');
  });

  it('plots money at its amount and keeps its exact text for the tooltip', () => {
    expect(moneyPoint(usd('1234.50'), text)).toEqual({ value: 1234.5, text: '$1234.50' });
    expect(moneyPoint(null, text)).toBeNull();
  });
});
