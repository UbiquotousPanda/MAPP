import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError, conflictMessage } from '@/api/errors';
import { ConfirmDialog } from '@/ui/ConfirmDialog/ConfirmDialog';
import { DateField } from '@/ui/DateField/DateField';
import { DecimalField } from '@/ui/DecimalField/DecimalField';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import { FormField } from '@/ui/FormField/FormField';
import { FailureMessage } from '@/ui/FormPanel/FormPanel';
import { problemOf } from '@/ui/FormPanel/problem-of';
import { ReadOnlyField } from '@/ui/ReadOnlyField/ReadOnlyField';
import { useToast } from '@/ui/Toast/useToast';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { localDate } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import settingsStyles from '@/ui/settings-table.module.css';
import { ImpactWarnings } from '../ImpactWarnings';
import { CONFLICT_NEXT_STEP } from '../save-failure';
import { liveRate, rateText } from './rate-input';
import { futureRateNote } from './rate-words';
import {
  checkAddRateImpact,
  checkUpdateRateImpact,
  fetchRate,
  useAddRate,
  useUpdateRate,
} from './rates-api';
import type { ChangeImpact, ExchangeRateRecord } from './rates-api';
import { rateSchema } from './schemas';
import type { RateValues } from './schemas';

/** Why a rate keeps its date (data-model §2.1). */
const DATE_FIXED = "A rate's date can't change: add a rate on the new date and delete this one.";

const FIELDS = ['date', 'rate'] as const;

export interface RateDialogProps {
  code: string;
  /** The rate to change; without one, the dialog adds a rate. */
  rate?: ExchangeRateRecord;
  onClose: () => void;
}

/** A save that waits for "Save rate" in the impact question. */
interface PendingSave {
  warnings: ChangeImpact['warnings'];
}

/** A rate that changes the current rate first says what it recalculates, before it is saved. */
export function RateDialog({ code, rate, onClose }: RateDialogProps) {
  const { show } = useToast();
  const { date: formatDate, dateFormat } = useFormatters();
  const addRate = useAddRate();
  const updateRate = useUpdateRate();
  const today = localDate(new Date());
  const form = useForm<RateValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: { date: rate?.date ?? today, rate: rate?.rate ?? '' },
    ...CHECK_ON_SAVE,
  });
  const [version, setVersion] = useState(rate?.version ?? 0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ message: string; nextStep?: string } | null>(null);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [day, typed] = useWatch({ control: form.control, name: ['date', 'rate'] });
  const editing = rate !== undefined;
  const rateDay = rate?.date ?? day;

  async function check(values: RateValues) {
    setSaving(true);
    setFailure(null);
    try {
      const value = rateText(values.rate);
      const impact = editing
        ? await checkUpdateRateImpact(rate.id, { rate: value, version })
        : await checkAddRateImpact(code, { date: values.date, rate: value });
      if (impact.warnings.length > 0) {
        setPending({ warnings: impact.warnings });
        return;
      }
      await save(values);
    } catch (error) {
      await showFailure(error);
    } finally {
      setSaving(false);
    }
  }

  async function save(values: RateValues) {
    const value = rateText(values.rate);
    const saved = editing
      ? await updateRate.mutateAsync({ rateId: rate.id, body: { rate: value, version } })
      : await addRate.mutateAsync({ code, body: { date: values.date, rate: value } });
    show({ message: `Rate of ${code} on ${formatDate(saved.date)} saved` });
    onClose();
  }

  async function confirm() {
    setSaving(true);
    try {
      await save(form.getValues());
    } catch (error) {
      await showFailure(error);
    } finally {
      setSaving(false);
      setPending(null);
    }
  }

  async function showFailure(error: unknown) {
    const apiError = error instanceof ApiError ? error : new ApiError('other');
    if (apiError.kind === 'signInRequired' || apiError.kind === 'sessionExpired') {
      return;
    }
    if (apiError.kind === 'validation') {
      for (const field of FIELDS) {
        const message = problemOf(apiError.fields, field);
        if (message) {
          form.setError(field, { message });
        }
      }
      // A problem with no field of this dialog is shown above the fields.
      const [other] = apiError.fields.filter(
        (field) => field.field !== 'date' && field.field !== 'rate',
      );
      setFailure(other ? { message: other.message } : null);
      return;
    }
    if (apiError.kind === 'conflict' && rate) {
      setFailure({
        message: conflictMessage(apiError, 'rate', dateFormat),
        nextStep: CONFLICT_NEXT_STEP,
      });
      // The typed rate stays; the next Save replaces the other person's change on purpose.
      const latest = await fetchRate(code, rate.id).catch(() => undefined);
      if (latest) {
        setVersion(latest.version);
      }
      return;
    }
    setFailure({ message: apiError.message });
  }

  const submit = form.handleSubmit(check);
  const future = rateDay > today;

  return (
    <>
      <FormDialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={editing ? `Edit rate of ${code}` : `Add rate of ${code}`}
        submitLabel="Save rate"
        busy={saving}
        onSubmit={() => void submit()}
      >
        {failure && <FailureMessage failure={failure} />}
        {editing ? (
          <ReadOnlyField label="Date" value={formatDate(rate.date)} lock={DATE_FIXED} />
        ) : (
          <FormField
            control={form.control}
            name="date"
            render={(field) => (
              <DateField
                label="Date"
                marking="Required"
                note={future ? futureRateNote(day, formatDate) : undefined}
                {...field}
              />
            )}
          />
        )}
        <FormField
          control={form.control}
          name="rate"
          render={(field) => (
            <DecimalField
              label="Rate (units per 1 USD)"
              marking="Required"
              decimals={6}
              suffix="per USD"
              note={liveRate(code, typed)}
              {...field}
            />
          )}
        />
        {editing && future && (
          <p className={settingsStyles.meta}>{futureRateNote(rate.date, formatDate)}</p>
        )}
      </FormDialog>
      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={`Save the rate of ${code} on ${formatDate(rateDay)}?`}
          confirmLabel="Save rate"
          cancelLabel="Keep editing"
          busy={saving}
          onConfirm={() => void confirm()}
        >
          <ImpactWarnings warnings={pending.warnings} />
        </ConfirmDialog>
      )}
    </>
  );
}
