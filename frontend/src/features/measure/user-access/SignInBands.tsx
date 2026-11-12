import { formatWhole } from '@/format/decimal';
import { useFormatters } from '@/format/useFormatters';
import { BarList } from '@/ui/BarList/BarList';
import { ReportWidget } from '../shared';
import type { UserAccessBand } from './api';

interface SignInBandsProps {
  bands: UserAccessBand[];
  people: number;
  recordedSince: string;
}

/** The Last sign-in widget: the bands as bars with their counts in words, and its table view. */
export function SignInBands({ bands, people, recordedSince }: SignInBandsProps) {
  const { date } = useFormatters();
  const fromToday = recordedSince.slice(0, 10) === new Date().toISOString().slice(0, 10);
  return (
    <ReportWidget
      report="userAccess"
      widget="signInBands"
      title="Last sign-in"
      tip="The people of the table by how long ago they last signed in. Never: not since sign-ins were first recorded."
      note={
        fromToday
          ? 'Sign-ins are recorded from today; no earlier ones are known.'
          : `Sign-ins recorded since ${date(recordedSince)}`
      }
      chart={
        <BarList
          label="People by last sign-in"
          items={bands.map((b) => ({
            key: b.key,
            label: b.label,
            value: formatWhole(b.count),
            size: b.count,
            colour: b.key === 'never' ? 'var(--chart-budget)' : undefined,
          }))}
        />
      }
      table={{
        columns: [{ label: 'Last sign-in' }, { label: 'People', numeric: true }],
        rows: bands.map((b) => ({ key: b.key, cells: [b.label, formatWhole(b.count)] })),
        total: [formatWhole(people)],
      }}
    />
  );
}
