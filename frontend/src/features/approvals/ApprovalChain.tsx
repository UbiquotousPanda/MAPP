import { CircleAlert } from 'lucide-react';
import { useCurrentUser } from '@/session/useSession';
import type { components } from '@/api/generated/schema';
import { PersonLabel } from '@/ui/PersonLabel/PersonLabel';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { Tag } from '@/ui/Tag/Tag';
import type { DateFormat } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import type { ApprovalPerson, ApprovalRound } from './api';
import {
  chainState,
  escalatedText,
  levelRuleLines,
  progressText,
  reminderSentText,
  sourceText,
  wasLeftOutText,
} from './chain-messages';
import type { ChainState } from './chain-messages';
import { names } from './messages';
import styles from './ApprovalChain.module.css';

type WorkflowLevel = components['schemas']['ApprovalWorkflowLevel'];
type ChainLevel = components['schemas']['ApprovalChainLevel'];

export type ApprovalChainProps =
  | { round: ApprovalRound }
  /** The levels of the chosen workflow while the activity was never submitted (no states). */
  | { upcomingLevels: WorkflowLevel[] };

interface ChainRow {
  number: number;
  label: string;
  approvers: ApprovalPerson[];
  state?: ChainState;
  lines: string[];
  /** Each approver's own state on a level where all must approve ("Approved", "Waiting"). */
  approverState?: (person: ApprovalPerson) => string | undefined;
  /** "No approver" and its advice (017 data-model §4). */
  noApprover?: string;
}

export function ApprovalChain(props: ApprovalChainProps) {
  const user = useCurrentUser();
  const { dateFormat } = useFormatters();
  const rows: ChainRow[] =
    'round' in props
      ? props.round.levels.map((level) => roundRow(level, props.round, dateFormat))
      : props.upcomingLevels.map((level) => ({
          number: level.number,
          label: level.label,
          approvers: level.approvers,
          lines: levelRuleLines(level),
        }));

  return (
    <ol role="list" className={styles.chain}>
      {rows.map((row) => (
        <li key={row.number} className={styles.level}>
          <span aria-hidden="true">
            <Tag>{`L${row.number}`}</Tag>
          </span>
          <div className={styles.main}>
            <p className={styles.label}>
              {row.label}
              {/* The badge is decoration: screen readers hear the level's number here. */}
              {row.label !== `Level ${row.number}` && (
                <span className="visually-hidden">{` (level ${row.number})`}</span>
              )}
            </p>
            {row.approvers.length > 0 && (
              <ul role="list" className={styles.approvers}>
                {row.approvers.map((person) => (
                  <li key={person.id}>
                    <PersonLabel
                      person={person}
                      you={person.id === user.id}
                      detail={approverDetail(row, person)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {row.lines.length > 0 && (
              <ul role="list" className={styles.lines}>
                {row.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {row.noApprover && (
              <p className={styles.warning}>
                <CircleAlert aria-hidden="true" />
                <span>
                  <strong>No approver.</strong> {row.noApprover}
                </span>
              </p>
            )}
          </div>
          {row.state && (
            <p className={styles.state}>
              <StatusChip tone={row.state.tone}>{row.state.word}</StatusChip>
              {row.state.detail && <span className={styles.detail}> {row.state.detail}</span>}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function approverDetail(row: ChainRow, person: ApprovalPerson): string | undefined {
  const parts = [
    row.approverState?.(person),
    person.canApprove === false ? "(can't approve — no approving role)" : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function roundRow(level: ChainLevel, round: ApprovalRound, dateFormat: DateFormat): ChainRow {
  const all = level.mode === 'all' && (level.requiredCount ?? 0) > 1;
  const approvedIds = new Set(
    (level.decisions ?? [])
      .filter((decision) => decision.action === 'approved')
      .map((decision) =>
        decision.capacity === 'delegate' && decision.asDelegateOf
          ? decision.asDelegateOf.id
          : decision.actor.id,
      ),
  );
  const waiting = level.approvers.filter((person) => !approvedIds.has(person.id));
  const open = level.state === 'waiting' || level.state === 'notReached';

  const lines = [
    sourceText(level.source),
    all
      ? [
          progressText(level.approvedCount ?? approvedIds.size, level.requiredCount ?? 0),
          level.state === 'waiting' && waiting.length > 0 ? `waiting for ${names(waiting)}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : '',
    level.remindedAt ? reminderSentText(level.remindedAt, dateFormat) : '',
    level.escalatedAt && level.escalatedTo
      ? escalatedText(level.escalatedTo.name, level.escalatedAt, dateFormat)
      : '',
    ...(level.excluded ?? []).map(wasLeftOutText),
  ].filter(Boolean);

  return {
    number: level.number,
    label: level.label,
    approvers: level.approvers,
    state: chainState(level, round.outcome, dateFormat),
    lines,
    approverState:
      all && level.state !== 'notReached'
        ? (person) => (approvedIds.has(person.id) ? 'Approved' : open ? 'Waiting' : undefined)
        : undefined,
    noApprover: level.noApprover && open ? level.advice || 'Nobody can approve this level.' : '',
  };
}
