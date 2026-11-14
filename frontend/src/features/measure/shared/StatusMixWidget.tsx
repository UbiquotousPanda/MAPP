import type { ReactNode } from 'react';
import { BarList } from '@/ui/BarList/BarList';
import type { ReportKey } from '../reports';
import { NOTHING } from './report-text';
import { ReportWidget } from './ReportWidget';
import type { ReportTableData } from './ReportTable';

export interface StatusMixItem {
  key: string;
  label: string;
  count: number;
  sharePercent: number;
  /** The status's amount, already formatted, when the mix has amounts. */
  amount?: string;
  colour?: string;
}

export interface StatusMix {
  items: StatusMixItem[];
  total: number;
  totalAmount?: string;
}

export interface StatusMixWidgetProps {
  report: ReportKey;
  widget: string;
  title: string;
  tip: string;
  /** Absent while loading. */
  mix?: StatusMix;
  /** Lines and controls above the bars: a record-type choice, "3 waiting". */
  intro?: ReactNode;
  empty?: string;
  wide?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}

function tableOf(mix: StatusMix | undefined): ReportTableData {
  const amounts = mix?.totalAmount !== undefined;
  return {
    columns: [
      { label: 'Status' },
      { label: 'Count', numeric: true },
      ...(amounts ? [{ label: 'Amount', numeric: true }] : []),
      { label: 'Share', numeric: true },
    ],
    rows: (mix?.items ?? []).map((item) => ({
      key: item.key,
      cells: [
        item.label,
        String(item.count),
        ...(amounts ? [item.amount ?? NOTHING] : []),
        `${item.sharePercent} %`,
      ],
    })),
    total: mix && [
      String(mix.total),
      ...(amounts ? [mix.totalAmount ?? NOTHING] : []),
      mix.total > 0 ? '100 %' : NOTHING,
    ],
  };
}

/** How many records are in each status: bars of their shares, and the same figures as a table. */
export function StatusMixWidget({ mix, intro, empty, ...widget }: StatusMixWidgetProps) {
  const bars = mix && (
    <>
      {intro}
      <BarList
        label={widget.title}
        max={100}
        items={mix.items.map((item) => ({
          key: item.key,
          label: item.label,
          value: [String(item.count), `${item.sharePercent} %`, item.amount]
            .filter((part) => part !== undefined)
            .join(' · '),
          size: item.sharePercent,
          colour: item.colour,
        }))}
      />
    </>
  );
  return (
    <ReportWidget
      {...widget}
      loading={!mix && !widget.failed}
      empty={empty}
      table={tableOf(mix)}
      chart={bars}
    />
  );
}
