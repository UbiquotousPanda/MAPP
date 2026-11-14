import { useMemo } from 'react';
import { EChart, useChartTheme } from '@/features/custom-dashboards';
import { reportChartOption } from './report-chart';
import type { ReportChartData } from './report-chart';

const HEIGHT = 260;

export function ReportChart({
  chart,
  description,
}: {
  chart: ReportChartData;
  description: string;
}) {
  const theme = useChartTheme();
  const drawn = JSON.stringify(chart);
  // Callers rebuild the data each render; redrawing only on a change keeps the bars from animating again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const option = useMemo(() => reportChartOption(chart, theme), [drawn, theme]);
  return <EChart option={option} description={description} height={HEIGHT} />;
}
