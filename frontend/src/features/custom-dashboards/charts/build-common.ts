import type { ChartPalette, WidgetDisplay } from '../model';
import type { Cell, ChartContext } from './chart-data';
import type { ChartTheme } from './theme';
import { labelText, tooltipContent } from './tooltip';
import type { ItemText } from './tooltip';

type Position = NonNullable<WidgetDisplay['legend']>['position'];

const DEFAULT_LEGEND = { show: true, position: 'bottom' } as const;
const EDGE = 12;
const LEGEND_ROOM = 32;
const SIDE_LEGEND_ROOM = 140;
const ZOOM_ROOM = 40;
const ZOOM_GAP = 8;
const ZOOM_SIZE = 24;
const TITLE_ROOM = 24;
const SIDE_LEGEND_TEXT = 100;
const LEGEND_TEXT = 160;

export const LABEL_WIDTH = 120;
export type Edges = Partial<Record<Position, string>>;

export function shortened(width: number) {
  return { width, overflow: 'truncate', ellipsis: '…' } as const;
}

export interface DataItem extends ItemText {
  value: number | (number | null)[];
  name?: string;
}

/** What every chart shares: its palette, text colours, patterns, tooltip and legend. */
export function baseOption(ctx: ChartContext, trigger: 'axis' | 'item', fallback: ChartPalette) {
  const { theme } = ctx;
  return {
    color: theme.palettes[ctx.display.palette ?? fallback],
    textStyle: { color: theme.ink },
    aria: { enabled: true, decal: { show: true } },
    tooltip: {
      trigger,
      confine: true,
      formatter: tooltipContent,
      axisPointer: axisPointer(theme),
      backgroundColor: theme.surface,
      borderColor: theme.hairline,
      textStyle: { color: theme.ink },
    },
    legend: legendOption(ctx),
  };
}

/** A thin guide line at the hovered period; a shaded band hides the lines under it. */
export function axisPointer(theme: ChartTheme) {
  return { type: 'line', lineStyle: { color: theme.ink2, width: 1 } } as const;
}

export function legendOption(ctx: ChartContext) {
  const { show, position } = ctx.display.legend ?? DEFAULT_LEGEND;
  const isSide = position === 'left' || position === 'right';
  return {
    show,
    type: 'scroll',
    orient: isSide ? 'vertical' : 'horizontal',
    [position]: 0,
    ...(isSide ? { top: 'middle' } : { left: 'center' }),
    textStyle: { color: ctx.theme.ink, ...shortened(isSide ? SIDE_LEGEND_TEXT : LEGEND_TEXT) },
    tooltip: { show: true },
    pageTextStyle: { color: ctx.theme.ink2 },
    pageIconColor: ctx.theme.ink2,
    pageIconInactiveColor: ctx.theme.hairline,
  };
}

/** Room around the plot, from the edge in: the legend, the zoom slider, the axis titles. */
export function gridOption(ctx: ChartContext, zoomEdge: Position | null, titles: Edges = {}) {
  const room = (edge: Position) =>
    EDGE +
    legendRoom(ctx, edge) +
    (zoomEdge === edge ? ZOOM_ROOM : 0) +
    (titles[edge] ? TITLE_ROOM : 0);
  return {
    top: room('top'),
    bottom: room('bottom'),
    left: room('left'),
    right: room('right'),
    containLabel: true,
  };
}

/** The zoom slider's place: just inside the legend on its edge, never over it. */
export function zoomPlace(ctx: ChartContext, edge: 'bottom' | 'right') {
  const size = edge === 'bottom' ? 'height' : 'width';
  return { [edge]: legendRoom(ctx, edge) + ZOOM_GAP, [size]: ZOOM_SIZE };
}

export function zoomLook(ctx: ChartContext) {
  const { ink, ink2, hairline, surface } = ctx.theme;
  const background = { lineStyle: { color: ink2 }, areaStyle: { color: hairline } };
  return {
    textStyle: { color: ink2 },
    borderColor: hairline,
    fillerColor: hairline,
    handleStyle: { color: surface, borderColor: ink2 },
    moveHandleStyle: { color: hairline },
    brushStyle: { color: hairline },
    dataBackground: background,
    selectedDataBackground: background,
    emphasis: { handleStyle: { borderColor: ink }, moveHandleStyle: { color: ink2 } },
  };
}

function legendRoom(ctx: ChartContext, edge: Position): number {
  const legend = ctx.display.legend ?? DEFAULT_LEGEND;
  if (!legend.show || legend.position !== edge) {
    return 0;
  }
  return edge === 'left' || edge === 'right' ? SIDE_LEGEND_ROOM : LEGEND_ROOM;
}

export function labelOption(ctx: ChartContext, shownByDefault: boolean) {
  return {
    show: ctx.display.dataLabels ?? shownByDefault,
    formatter: labelText,
    color: ctx.theme.ink,
  };
}

export function itemOf(cell: Cell | null, extra: Partial<DataItem> = {}): DataItem | null {
  return cell === null ? null : { value: cell.value, text: cell.text, ...extra };
}

export function axisLook(ctx: ChartContext, title: string) {
  const { theme } = ctx;
  return {
    name: title,
    nameLocation: 'middle',
    nameGap: title ? 32 : 0,
    nameTextStyle: { color: theme.ink2 },
    axisLabel: { color: theme.ink2, hideOverlap: true },
    axisLine: { lineStyle: { color: theme.hairline } },
    axisTick: { lineStyle: { color: theme.hairline } },
    splitLine: { show: ctx.display.gridlines ?? true, lineStyle: { color: theme.hairline } },
  };
}

export function axisTitles(ctx: ChartContext) {
  return { x: '', y: '', y2: '', ...ctx.display.axisTitles };
}
