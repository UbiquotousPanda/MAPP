import { ChartColumn, Table2 } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/ui/Button/Button';
import { cx } from '@/ui/cx';
import { InfoTip } from '@/ui/InfoTip/InfoTip';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
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
  const [params] = useSearchParams();
  const asTable = address.tables.includes(widget);
  const show = (tableView: boolean) =>
    setAddress({
      ...address,
      tables: tableView
        ? [...address.tables, widget]
        : address.tables.filter((key) => key !== widget),
    });
  const actions = (
    <div className={styles.actions}>
      {controls}
      <div className={styles.switch} role="group" aria-label={`Show ${title} as`}>
        {[false, true].map((tableView) => (
          <button
            key={String(tableView)}
            type="button"
            className={cx(styles.toggle, asTable === tableView && styles.on)}
            aria-pressed={asTable === tableView}
            aria-label={tableView ? 'Table' : 'Chart'}
            title={tableView ? 'Show as a table' : 'Show as a chart'}
            onClick={() => show(tableView)}
          >
            {tableView ? <Table2 aria-hidden="true" /> : <ChartColumn aria-hidden="true" />}
          </button>
        ))}
      </div>
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
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
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
            <p className={styles.empty}>{empty}</p>
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
