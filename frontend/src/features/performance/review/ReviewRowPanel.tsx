import { Link } from 'react-router';
import { asApiError } from '@/api/errors';
import { useFormatters } from '@/format/useFormatters';
import { Button } from '@/ui/Button/Button';
import { SidePanel } from '@/ui/SidePanel/SidePanel';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { useToast } from '@/ui/Toast/useToast';
import tableStyles from '@/ui/settings-table.module.css';
import dataTable from '@/ui/Table/Table.module.css';
import { importPath } from '../imports/imports-text';
import { useReopenRow } from './api';
import type { ReviewRow } from './api';
import { reasonWord, STATUS_TONES, STATUS_WORDS } from './review-text';

export type RowAction = 'correct' | 'dismiss';

export interface ReviewRowPanelProps {
  row: ReviewRow;
  onAction: (action: RowAction) => void;
  onClose: () => void;
}

/** One row with its cells, every problem, the candidates and what was done with it. */
export function ReviewRowPanel({ row, onAction, onClose }: ReviewRowPanelProps) {
  const { dateTime } = useFormatters();
  const reopen = useReopenRow(row.id);
  const { show } = useToast();

  async function reopenRow() {
    try {
      await reopen.mutateAsync();
      show({ message: 'Row reopened' });
    } catch (error) {
      show({ message: `Nothing was changed. ${asApiError(error).message}` });
    }
  }

  return (
    <SidePanel
      open
      onOpenChange={(open) => !open && onClose()}
      title={reasonWord(row.reason)}
      description={`Row ${row.id} from ${row.sourceName}`}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {row.status === 'open' && (
            <>
              <Button onClick={() => onAction('dismiss')}>Dismiss</Button>
              <Button variant="primary" onClick={() => onAction('correct')}>
                Correct
              </Button>
            </>
          )}
          {row.status === 'dismissed' && (
            <Button variant="primary" disabled={reopen.isPending} onClick={() => void reopenRow()}>
              Reopen
            </Button>
          )}
        </>
      }
    >
      <div className={tableStyles.details}>
        <div className={tableStyles.statusRow}>
          <StatusChip tone={STATUS_TONES[row.status]}>{STATUS_WORDS[row.status]}</StatusChip>
          <span>{`Received ${dateTime(row.createdAt)}`}</span>
        </div>
        <dl className={tableStyles.facts}>
          <div>
            <dt>Import</dt>
            <dd>
              <Link to={importPath(row.importId)}>{row.importId}</Link>
            </dd>
          </div>
          <div>
            <dt>Problems</dt>
            <dd>
              {row.faults.length === 0 ? (
                '—'
              ) : (
                <ul className={tableStyles.warnings}>
                  {row.faults.map((fault) => (
                    <li key={`${fault.column}-${fault.code}`}>
                      {fault.column ? `${fault.column}: ${fault.message}` : fault.message}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          {row.candidates.length > 0 && (
            <div>
              <dt>Candidate activities</dt>
              <dd>
                <ul className={tableStyles.warnings}>
                  {row.candidates.map((id) => (
                    <li key={id}>
                      <Link to={`/activities/${id}`}>{id}</Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {row.comment && (
            <div>
              <dt>Why it was dismissed</dt>
              <dd>{row.comment}</dd>
            </div>
          )}
          <div>
            <dt>Last change</dt>
            <dd>{`${row.updatedBy.name}, ${dateTime(row.updatedAt)}`}</dd>
          </div>
        </dl>
        <RawCells raw={row.raw} />
      </div>
    </SidePanel>
  );
}

function RawCells({ raw }: { raw: Record<string, string> }) {
  return (
    <div className={dataTable.scroll}>
      <table className={dataTable.table}>
        <caption className="visually-hidden">The row as the file carried it</caption>
        <thead>
          <tr>
            <th scope="col">Column</th>
            <th scope="col">Value in the file</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(raw).map(([column, value]) => (
            <tr key={column}>
              <th scope="row">{column}</th>
              <td>{value || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
