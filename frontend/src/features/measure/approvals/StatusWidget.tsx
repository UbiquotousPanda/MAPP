import { useFormatters } from '@/format/useFormatters';
import { LinkButton } from '@/ui/Button/Button';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import { StatusMixWidget } from '../shared';
import type { StatusMix as ApprovalStatusMix } from './api';
import { OUTCOME_WORDS, RECORD_WORDS } from './words';
import { RECORD_TYPES } from './schemas';
import type { RecordType } from './schemas';
import styles from './ApprovalsReport.module.css';

const BAR_COLOURS: Record<string, string> = {
  waiting: 'var(--chart-planned)',
  approved: 'var(--chart-actual)',
  declined: 'var(--chart-budget)',
  recalled: 'var(--chart-committed)',
  replaced: 'var(--chart-committed)',
  autoApproved: 'var(--chart-actual)',
};

const TIP =
  'Each round of the selected record type counted once by how it ended. Waiting is open now. Replaced means ' +
  'a new submission took its place. Shares are whole numbers that add to 100.';

const NO_APPROVALS =
  'No approvals yet. They start when an activity or a purchase request is submitted for approval.';

export interface StatusWidgetProps {
  data?: ApprovalStatusMix;
  statusType: RecordType;
  onStatusType: (type: RecordType) => void;
  failed?: boolean;
  onRetry?: () => void;
}

function Intro({
  data,
  statusType,
  onStatusType,
}: StatusWidgetProps & { data: ApprovalStatusMix }) {
  const { dateTime } = useFormatters();
  return (
    <>
      {data.recordTypes.length > 1 && (
        <div className={styles.selector}>
          <SegmentedFilter
            label="Record type"
            options={RECORD_TYPES.filter((type) => data.recordTypes.includes(type)).map((type) => ({
              value: type,
              label: RECORD_WORDS[type],
            }))}
            value={statusType}
            onChange={onStatusType}
          />
        </div>
      )}
      <div className={styles.waitingRow}>
        <p className={styles.waiting}>
          {data.waiting.count} waiting
          {data.waiting.oldestSince && ` · oldest since ${dateTime(data.waiting.oldestSince)}`}
        </p>
        {data.waiting.count > 0 && (
          <LinkButton size="sm" to="/approvals">
            Go to Approvals to decide
          </LinkButton>
        )}
      </div>
    </>
  );
}

export function StatusWidget(props: StatusWidgetProps) {
  const { data, failed, onRetry } = props;
  return (
    <StatusMixWidget
      report="approvals"
      widget="status"
      title="Current approval status"
      tip={TIP}
      failed={failed}
      onRetry={onRetry}
      empty={data?.recordTypes.length === 0 ? NO_APPROVALS : undefined}
      intro={data && <Intro {...props} data={data} />}
      mix={
        data && {
          total: data.total,
          items: data.items.map((item) => ({
            key: item.outcome,
            label: OUTCOME_WORDS[item.outcome] ?? item.outcome,
            count: item.count,
            sharePercent: item.sharePercent,
            colour: BAR_COLOURS[item.outcome],
          })),
        }
      }
    />
  );
}
