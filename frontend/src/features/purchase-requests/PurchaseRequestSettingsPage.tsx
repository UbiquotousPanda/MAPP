import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, asApiError, conflictMessage, isSessionLost } from '@/api/errors';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { CheckboxField } from '@/ui/CheckboxField/CheckboxField';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { FormField } from '@/ui/FormField/FormField';
import { InlineError } from '@/ui/InlineError/InlineError';
import { LockedNote } from '@/ui/LockedNote/LockedNote';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useToast } from '@/ui/Toast/useToast';
import { CHECK_ON_SAVE } from '@/ui/useFormProblems';
import { usePageTitle } from '@/ui/usePageTitle';
import { localDate } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { usePurchaseRequestConfiguration, useSavePurchaseRequestConfiguration } from './api';
import type { LinesOnApproved, PurchaseRequestConfiguration } from './api';
import { LINES_ON_APPROVED_WORDS, PURCHASE_REQUESTS } from './purchase-request-text';
import {
  CONFIG_NOUN,
  CONFIG_SAVED,
  LINES_ON_APPROVED,
  NEVER_CHANGED,
  OFF,
  ON,
  PURCHASE_SUPPORT,
  PURCHASE_SUPPORT_HINT,
  SAVE,
  lastChangedText,
} from './settings-text';
import styles from './PurchaseRequestSettingsPage.module.css';

const LINE_CHOICES = [
  'notAllowed',
  'withModificationApproval',
  'withoutApproval',
] as const satisfies readonly LinesOnApproved[];

const settingsSchema = z.object({
  purchaseSupport: z.boolean(),
  linesOnApprovedPurchaseRequests: z.enum(LINE_CHOICES),
});
type SettingsValues = z.infer<typeof settingsSchema>;

/** Settings › Purchase requests (032 US7, FR-004): Purchase Support and lines on approved PRs. */
export function PurchaseRequestSettingsPage() {
  usePageTitle(PURCHASE_REQUESTS);
  const config = usePurchaseRequestConfiguration();
  const refused =
    config.error instanceof ApiError &&
    (config.error.kind === 'forbidden' || config.error.kind === 'notFound');

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Settings', to: '/settings' }, { label: PURCHASE_REQUESTS }]}
        title={PURCHASE_REQUESTS}
      />
      <Card>
        {config.data ? (
          config.data.canChange.available ? (
            <SettingsForm config={config.data} />
          ) : (
            <ReadOnly config={config.data} />
          )
        ) : refused ? (
          <p className={styles.note}>{asApiError(config.error).message}</p>
        ) : config.isError ? (
          <ErrorState error={config.error} onRetry={() => void config.refetch()} />
        ) : (
          <Skeleton lines={4} />
        )}
      </Card>
    </>
  );
}

function LastChanged({ config }: { config: PurchaseRequestConfiguration }) {
  const { date } = useFormatters();
  return (
    <p className={styles.meta}>
      {config.updatedBy && config.updatedAt
        ? lastChangedText(config.updatedBy.name, date(localDate(config.updatedAt)))
        : NEVER_CHANGED}
    </p>
  );
}

function ReadOnly({ config }: { config: PurchaseRequestConfiguration }) {
  return (
    <div className={styles.stack}>
      <LockedNote>{config.canChange.reason}</LockedNote>
      <dl className={styles.values}>
        <dt>{PURCHASE_SUPPORT}</dt>
        <dd>{config.purchaseSupport ? ON : OFF}</dd>
        <dt>{LINES_ON_APPROVED}</dt>
        <dd>{LINES_ON_APPROVED_WORDS[config.linesOnApprovedPurchaseRequests]}</dd>
      </dl>
      <LastChanged config={config} />
    </div>
  );
}

function SettingsForm({ config }: { config: PurchaseRequestConfiguration }) {
  const save = useSavePurchaseRequestConfiguration();
  const { show } = useToast();
  const { dateFormat } = useFormatters();
  const [problem, setProblem] = useState('');
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      purchaseSupport: config.purchaseSupport,
      linesOnApprovedPurchaseRequests: config.linesOnApprovedPurchaseRequests,
    },
    ...CHECK_ON_SAVE,
  });

  async function send(values: SettingsValues) {
    setProblem('');
    try {
      await save.mutateAsync({ version: config.version, ...values });
      show({ message: CONFIG_SAVED });
    } catch (error) {
      const failure = asApiError(error);
      if (!isSessionLost(failure)) {
        setProblem(conflictMessage(failure, CONFIG_NOUN, dateFormat));
      }
    }
  }

  return (
    <form
      noValidate
      className={styles.stack}
      aria-busy={save.isPending}
      onSubmit={(event) => void form.handleSubmit(send)(event)}
    >
      {problem && <InlineError>{problem}</InlineError>}
      <FormField
        control={form.control}
        name="purchaseSupport"
        render={(field) => (
          <CheckboxField
            label={PURCHASE_SUPPORT}
            name={field.name}
            checked={field.value}
            onChange={field.onChange}
            hint={PURCHASE_SUPPORT_HINT}
          />
        )}
      />
      <FormField
        control={form.control}
        name="linesOnApprovedPurchaseRequests"
        render={(field) => (
          <RadioGroup
            label={LINES_ON_APPROVED}
            name={field.name}
            options={LINE_CHOICES.map((choice) => ({
              value: choice,
              label: LINES_ON_APPROVED_WORDS[choice],
            }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <LastChanged config={config} />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" aria-busy={save.isPending || undefined}>
          {SAVE}
        </Button>
      </div>
    </form>
  );
}
