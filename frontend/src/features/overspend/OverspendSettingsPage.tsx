import { useState } from 'react';
import { asApiError, conflictMessage, isSessionLost } from '@/api/errors';
import { Button } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { InlineError } from '@/ui/InlineError/InlineError';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { RadioGroup } from '@/ui/RadioGroup/RadioGroup';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { useToast } from '@/ui/Toast/useToast';
import { useEditedRecord } from '@/ui/useEditedRecord';
import { usePageTitle } from '@/ui/usePageTitle';
import { localDate } from '@/format/intl';
import { useFormatters } from '@/format/useFormatters';
import { useOverspendConfiguration, useSaveOverspendConfiguration } from './api';
import type { OverspendApprovalMode, OverspendConfiguration, OverspendMode } from './api';
import {
  APPROVAL_HINTS,
  APPROVAL_LABEL,
  APPROVAL_MODES,
  APPROVAL_WORDS,
  DEFAULT_LABEL,
  EXISTING_KEEP,
  MODE_HINTS,
  MODE_WORDS,
  MODES,
  NEVER_CHANGED,
  OVERSPEND_CONTROL,
  SAVE,
  SETTING_SAVED,
  lastChangedText,
} from './overspend-text';
import styles from './OverspendSettingsPage.module.css';

/**
 * Settings › Overspend control: the setting new budgets start
 * with, and whether approving while an activity's line items exceed its planned cost is warned or
 * refused.
 */
export function OverspendSettingsPage() {
  usePageTitle(OVERSPEND_CONTROL);
  const config = useOverspendConfiguration();
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Settings', to: '/settings' }, { label: OVERSPEND_CONTROL }]}
        title={OVERSPEND_CONTROL}
      />
      <Card>
        {config.data ? (
          <SettingForm config={config.data} />
        ) : config.isError ? (
          <ErrorState error={config.error} onRetry={() => void config.refetch()} />
        ) : (
          <Skeleton lines={3} />
        )}
      </Card>
    </>
  );
}

function SettingForm({ config: opened }: { config: OverspendConfiguration }) {
  const { record: config, version, keep, loadLatest } = useEditedRecord(opened);
  const latest = useOverspendConfiguration();
  const save = useSaveOverspendConfiguration();
  const { show } = useToast();
  const { date, dateFormat } = useFormatters();
  const [mode, setMode] = useState<OverspendMode>(config.defaultMode);
  const [approval, setApproval] = useState<OverspendApprovalMode>(config.approvalOverPlannedCost);
  const [problem, setProblem] = useState('');
  const locked = !config.canChange.available;

  async function send() {
    setProblem('');
    try {
      keep(
        await save.mutateAsync({ version, defaultMode: mode, approvalOverPlannedCost: approval }),
      );
      show({ message: SETTING_SAVED });
    } catch (error) {
      const failure = asApiError(error);
      if (failure.kind === 'conflict') {
        void loadLatest(() => latest.refetch().then((answer) => answer.data));
      }
      if (!isSessionLost(failure)) {
        setProblem(conflictMessage(failure, 'setting', dateFormat));
      }
    }
  }

  return (
    <form
      noValidate
      className={styles.stack}
      aria-busy={save.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      {problem && <InlineError>{problem}</InlineError>}
      <Choices
        name="defaultMode"
        legend={DEFAULT_LABEL}
        choices={MODES}
        words={MODE_WORDS}
        hints={MODE_HINTS}
        value={mode}
        disabledReason={locked ? config.canChange.reason : undefined}
        onChange={setMode}
        note={EXISTING_KEEP}
      />
      <Choices
        name="approvalOverPlannedCost"
        legend={APPROVAL_LABEL}
        choices={APPROVAL_MODES}
        words={APPROVAL_WORDS}
        hints={APPROVAL_HINTS}
        value={approval}
        disabledReason={locked ? config.canChange.reason : undefined}
        onChange={setApproval}
      />
      <p className={styles.note}>
        {config.updatedBy && config.updatedAt
          ? lastChangedText(config.updatedBy.name, date(localDate(config.updatedAt)))
          : NEVER_CHANGED}
      </p>
      {!locked && (
        <div className={styles.actions}>
          <Button type="submit" variant="primary" aria-busy={save.isPending || undefined}>
            {SAVE}
          </Button>
        </div>
      )}
    </form>
  );
}

interface ChoicesProps<T extends string> {
  name: string;
  legend: string;
  choices: readonly T[];
  words: Record<T, string>;
  hints: Record<T, string>;
  value: T;
  disabledReason?: string;
  onChange: (value: T) => void;
  note?: string;
}

function Choices<T extends string>(props: ChoicesProps<T>) {
  const { name, legend, choices, words, hints, value, disabledReason, onChange, note } = props;
  return (
    <RadioGroup
      label={legend}
      name={name}
      options={choices.map((choice) => ({
        value: choice,
        label: words[choice],
        hint: hints[choice],
      }))}
      value={value}
      onChange={onChange}
      disabledReason={disabledReason}
      note={note}
    />
  );
}
