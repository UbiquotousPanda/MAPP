import type { UseQueryResult } from '@tanstack/react-query';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@/api/errors';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InlineError } from '@/ui/InlineError/InlineError';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useFormatters } from '@/format/useFormatters';
import type { ActivityDestination } from './api';
import { datesText, THIS_INITIATIVE } from './activity-text';
import styles from './DestinationList.module.css';

type DestinationPage = { items: ActivityDestination[]; total: number };

export interface DestinationsStateProps {
  query: UseQueryResult<DestinationPage>;
  children: (items: ActivityDestination[]) => ReactNode;
}

// When the activity is gone, the API's message alone: Cancel closes the dialog.
export function DestinationsState({ query, children }: DestinationsStateProps) {
  if (query.data) {
    return children(query.data.items);
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

export interface DestinationListProps {
  legend: string;
  legendHidden?: boolean;
  destinations: ActivityDestination[];
  /** Which reason makes an initiative unavailable: the move's or the copy's. */
  purpose: 'move' | 'copy';
  value: string;
  onChange: (initiativeId: string) => void;
  error?: string;
}

export function DestinationList({
  legend,
  legendHidden = false,
  destinations,
  purpose,
  value,
  onChange,
  error,
}: DestinationListProps) {
  const name = useId();
  const format = useFormatters();
  return (
    <RadioGroup
      label={legend}
      labelHidden={legendHidden}
      name={name}
      layout="list"
      options={destinations.map((item) => ({
        value: item.initiative.id,
        group: item.campaign.name,
        label: (
          <span>
            {item.initiative.name}
            {item.current && (
              <>
                {' '}
                <span className={styles.current}>{THIS_INITIATIVE}</span>
              </>
            )}
          </span>
        ),
        hint: datesText(item.startDate, item.endDate, false, format),
        disabledReason: (purpose === 'move' ? item.moveProblem : item.copyProblem) ?? undefined,
      }))}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}
