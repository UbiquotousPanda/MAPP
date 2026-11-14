import type { UseQueryResult } from '@tanstack/react-query';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { InlineError } from '@/ui/InlineError/InlineError';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { StatusChip } from '@/ui/StatusChip/StatusChip';
import { useFormatters } from '@/format/useFormatters';
import { STATUS } from '../plan-text';
import type { Destination, DestinationList, MoveConsequences } from './api';
import styles from './Destinations.module.css';
import {
  CURRENT,
  goalsRecalculated,
  hiddenThere,
  otherModelOrUnit,
  overAllocateWarning,
  shownThere,
  typesNotAllowedText,
} from './texts';

export interface DestinationsLoadProps {
  query: UseQueryResult<DestinationList>;
  children: (list: DestinationList) => ReactNode;
}

// When the record is gone, the API's message alone: Cancel closes the dialog.
export function DestinationsLoad({ query, children }: DestinationsLoadProps) {
  if (query.data) {
    return children(query.data);
  }
  if (query.isError) {
    return query.error instanceof ApiError && query.error.kind === 'notFound' ? (
      <InlineError>{query.error.message}</InlineError>
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  return <Skeleton lines={3} />;
}

export interface DestinationChoiceProps {
  legend: string;
  legendHidden?: boolean;
  items: Destination[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

export function DestinationChoice({
  legend,
  legendHidden = false,
  items,
  value,
  onChange,
  error,
}: DestinationChoiceProps) {
  const name = useId();
  const { dateRange } = useFormatters();
  return (
    <RadioGroup
      label={legend}
      labelHidden={legendHidden}
      name={name}
      layout="list"
      options={items.map((item) => {
        const status = item.planStatus ? STATUS[item.planStatus] : null;
        return {
          value: item.id,
          label: item.name,
          hint: (
            <>
              {item.current && (
                <>
                  <StatusChip tone="neutral">{CURRENT}</StatusChip>
                  {/* Screen readers hear "Current Published", not "CurrentPublished". */}{' '}
                </>
              )}
              {status ? (
                <StatusChip tone={status.tone}>{status.word}</StatusChip>
              ) : (
                <span>{dateRange(item.startDate, item.endDate)}</span>
              )}
            </>
          ),
          disabledReason: item.available ? undefined : (item.unavailableReason ?? undefined),
        };
      })}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

/** What choosing a destination means, announced when the choice changes. */
export function DestinationNotes({ destination }: { destination: Destination | undefined }) {
  const { money } = useFormatters();
  return (
    <div aria-live="polite" className={styles.notes}>
      {destination?.overAllocatedBy && (
        <InlineAlert tone="warning">
          {overAllocateWarning(destination.name, money(destination.overAllocatedBy))}
        </InlineAlert>
      )}
      {destination?.consequences && (
        <Consequences plan={destination.name} consequences={destination.consequences} />
      )}
    </div>
  );
}

function Consequences({ plan, consequences }: { plan: string; consequences: MoveConsequences }) {
  const { modelName, modelChanges, typesNotAllowed, groupsHidden, groupsShown } = consequences;
  return (
    <div className={styles.consequences}>
      <p className={styles.consequencesTitle}>{otherModelOrUnit(plan)}</p>
      <ul className={styles.consequenceList}>
        {typesNotAllowed.length > 0 && (
          <li>
            {typesNotAllowedText(
              modelName,
              typesNotAllowed.map((activity) => `${activity.name} (${activity.id})`).join(', '),
            )}
          </li>
        )}
        {modelChanges && <li>{goalsRecalculated(modelName)}</li>}
        {groupsHidden.length > 0 && <li>{hiddenThere(groupsHidden.join(', '))}</li>}
        {groupsShown.length > 0 && <li>{shownThere(groupsShown.join(', '))}</li>}
      </ul>
    </div>
  );
}
