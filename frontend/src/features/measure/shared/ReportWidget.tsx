import { useId } from 'react';
import type { ReactNode } from 'react';
import { useAddressParams } from '@/ui/useAddressParams';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import { EmptyState } from '@/ui/EmptyState/EmptyState';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { ViewSwitch } from '@/ui/ViewSwitch/ViewSwitch';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import type { ReportKey } from '../reports';
import { downloadReport } from './api';
import { ExportMenu } from './ExportMenu';
import { ReportTable } from './ReportTable';
import type { ReportTableData } from './ReportTable';
import { useReportAddress } from './useReportAddress';
import frame from './ReportFrame.module.css';
import styles from './ReportWidget.module.css';

export interface ReportWidgetProps {
  report: ReportKey;
  /** The widget's key: in the address's table choice and the export's widget (039 contracts). */
  widget: string;
  title: string;
  /** The ⓘ tip naming each figure and its definition. */
  tip: string;
  chart: ReactNode;
  table: ReportTableData;
  /** A line under the title: "Covers 1 of 2 plans", "8 activities where it does not apply are not counted". */
  note?: string;
  /** "No data yet: …" naming what would fill it, shown instead of a chart of zeros. */
  empty?: string;
  loading?: boolean;
  failed?: boolean;
  onRetry?: () => void;
  wide?: boolean;
  /** Controls that change only this widget, such as Months · Quarters, before Chart · Table. */
  controls?: ReactNode;
}

/** A widget with its tip, Chart · Table switch in the address, export, and its own loading and failure. */
export function ReportWidget(props: ReportWidgetProps) {
  const { report, widget, title, tip, chart, table, note, empty, loading, failed, onRetry, wide } =
    props;
  const { controls } = props;
  const [address, setAddress] = useReportAddress();
  const titleId = useId();
  const [params] = useAddressParams();
  const asTable = address.tables.includes(widget);
  const show = (tableView: boolean) =>
    setAddress((latest) => ({
      ...latest,
      tables: tableView
        ? [...latest.tables, widget]
        : latest.tables.filter((key) => key !== widget),
    }));
  const actions = (
    <div className={styles.actions}>
      {controls}
      <ViewSwitch
        label={`Show ${title} as`}
        value={asTable ? 'table' : 'chart'}
        onChange={(view) => show(view === 'table')}
      />
      <ExportMenu
        label={`Export ${title}`}
        iconOnly
        formats={['csv', 'xlsx']}
        download={(format) => downloadReport(report, address, format, { widget, own: params })}
      />
    </div>
  );
  return (
    <div className={cx(frame.cell, wide && frame.wide)}>
      <section className={styles.widget} aria-labelledby={titleId}>
        <div className={styles.head}>
          <div className={styles.titleRow}>
            <SectionHeading level={2} rank="card" id={titleId}>
              {title}
            </SectionHeading>
            <InfoTip label={title} text={tip} />
          </div>
          {actions}
        </div>
        <div className={styles.body}>
          {note && <p className={styles.note}>{note}</p>}
          {failed ? (
            <div className={styles.failed} role="alert">
              <p>This part of the report couldn&apos;t be loaded</p>
              <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : loading ? (
            <Skeleton lines={5} height="20px" />
          ) : empty ? (
            <EmptyState compact title={empty} />
          ) : table && asTable ? (
            <ReportTable title={title} data={table} />
          ) : (
            chart
          )}
        </div>
      </section>
    </div>
  );
}
