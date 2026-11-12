import type { ChartTheme } from '@/features/custom-dashboards';
import { axisPointer, tooltipContent } from '@/features/custom-dashboards';
import type { Money } from './api';

export type Tone = 'budget' | 'planned' | 'committed' | 'actual';
export type Look = 'bar' | 'outline' | 'line' | 'dashed';
export type Unit = { kind: 'money'; currency: string } | { kind: 'count' } | { kind: 'percent' };

export interface ReportPoint {
  value: number;
  text: string;
}

export interface ReportSeries {
  name: string;
  tone: Tone;
  look: Look;
  points: (ReportPoint | null)[];
}

export interface ReportChartData {
  labels: string[];
  series: ReportSeries[];
  unit: Unit;
  /** The index of the period in progress, or -1. */
  today: number;
  /** Bars of one period share one slot, so a goal outline frames its actual. */
  overlap?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TONE_INDEX: Record<Tone, number> = { budget: 0, planned: 1, committed: 2, actual: 3 };
const TEXT = 12;

/** "2026-06" is "Jun", "2026-Q2" is "Q2": short enough to stay legible at any width. */
export function shortPeriod(key: string): string {
  const part = key.slice(5);
  return part.startsWith('Q') ? part : (MONTHS[Number(part) - 1] ?? key);
}

export function moneyPoint(value: Money | null, text: (m: Money) => string): ReportPoint | null {
  return value && { value: Number(value.amount), text: text(value) };
}

export function moneyUnit(values: (Money | null)[]): Unit {
  return { kind: 'money', currency: values.find((v) => v !== null)?.currency ?? 'USD' };
}

export function countPoint(value: number | null): ReportPoint | null {
  return value === null ? null : { value, text: value.toLocaleString('en-GB') };
}

/** Only series with at least one figure are drawn and named in the legend. */
export function shownSeries(series: ReportSeries[]): ReportSeries[] {
  return series.filter((s) => s.points.some((p) => p !== null));
}

export function tickText(tick: number, unit: Unit): string {
  if (unit.kind === 'percent') {
    return `${compact(tick, {})}%`;
  }
  const money: Intl.NumberFormatOptions =
    unit.kind === 'money' ? { style: 'currency', currency: unit.currency } : {};
  return compact(tick, money);
}

function compact(tick: number, extra: Intl.NumberFormatOptions): string {
  const options = { notation: 'compact', maximumFractionDigits: 1, ...extra } as const;
  return new Intl.NumberFormat('en-US', options).format(tick);
}

export function reportChartOption(chart: ReportChartData, theme: ChartTheme) {
  const colour = (tone: Tone) => theme.palettes.planning[TONE_INDEX[tone]] ?? theme.ink;
  const series = shownSeries(chart.series);
  const colours = new Map(series.map((s) => [s.name, colour(s.tone)]));
  return {
    textStyle: { color: theme.ink, fontSize: TEXT },
    grid: { top: 40, left: 4, right: 16, bottom: 4, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { color: theme.ink, fontSize: TEXT },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: axisPointer(theme),
      backgroundColor: theme.surface,
      borderColor: theme.hairline,
      formatter: (params: unknown) => tooltipContent(recoloured(params, colours)),
    },
    xAxis: {
      type: 'category',
      data: chart.labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: theme.ink2 } },
      axisLabel: { color: theme.ink, fontSize: TEXT, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: {
        color: theme.ink2,
        fontSize: TEXT,
        formatter: (tick: number) => tickText(tick, chart.unit),
      },
      splitLine: { lineStyle: { color: theme.hairline } },
    },
    series: series.map((s, index) => ({
      ...look(s, colour(s.tone), theme),
      name: s.name,
      data: s.points.map((p) => (p === null ? null : { value: p.value, text: p.text })),
      ...(index === 0 && { markLine: todayMark(chart.today, theme) }),
      ...(chart.overlap && { barGap: '-100%' }),
    })),
  };
}

function look(s: ReportSeries, colour: string, theme: ChartTheme) {
  switch (s.look) {
    case 'bar':
      return { type: 'bar', color: colour, barMaxWidth: 28 };
    case 'outline':
      return {
        type: 'bar',
        color: colour,
        barMaxWidth: 28,
        z: 3,
        itemStyle: {
          color: 'transparent',
          borderColor: colour,
          borderWidth: 2,
          decal: { symbol: 'none' },
        },
      };
    case 'line':
    case 'dashed':
      return {
        type: 'line',
        color: colour,
        symbolSize: 6,
        z: s.look === 'line' ? 3 : 2,
        lineStyle: { width: 2, type: s.look === 'dashed' ? 'dashed' : 'solid' },
        itemStyle: { borderColor: theme.surface },
      };
    default: {
      const unknown: never = s.look;
      return unknown;
    }
  }
}

function todayMark(today: number, theme: ChartTheme) {
  if (today < 0) {
    return undefined;
  }
  return {
    silent: true,
    symbol: 'none',
    z: 1,
    lineStyle: { color: theme.ink2, width: 1, type: 'dashed' },
    label: { formatter: 'Today', position: 'end', color: theme.ink2, fontSize: 11 },
    data: [{ xAxis: today }],
  };
}

// An outline bar's own fill is transparent, so its tooltip marker takes the series colour.
function recoloured(params: unknown, colours: Map<string, string>): unknown {
  const items: unknown[] = Array.isArray(params) ? params : [];
  return items.map((item) =>
    typeof item === 'object' && item !== null && 'seriesName' in item
      ? { ...item, color: colours.get(String(item.seriesName)) }
      : item,
  );
}
