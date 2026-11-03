import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { asApiError } from '@/api/errors';
import { ChoiceField } from '@/ui/ChoiceField/ChoiceField';
import { FormDialog } from '@/ui/FormDialog/FormDialog';
import type { PerformanceSource } from '../api';
import { usePullFeed } from './api';
import type { PerformanceImport } from './api';
import { NO_SIMULATED_SOURCE } from './imports-text';
import styles from './imports.module.css';

const CHOOSE_SOURCE = 'Choose the data source to pull.';

export interface PullDialogProps {
  sources: PerformanceSource[];
  onClose: () => void;
  onLoaded: (load: PerformanceImport) => void;
}

/** Pull the simulated feed once, only when someone asks; its rows take the upload's path. */
export function PullDialog({ sources, onClose, onLoaded }: PullDialogProps) {
  const pull = usePullFeed();
  const offered = sources.filter((s) => s.status === 'active' && s.deliveryRoute === 'simulated');
  const [sourceId, setSourceId] = useState(offered.length === 1 ? (offered[0]?.id ?? '') : '');
  const [problem, setProblem] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const chosen = offered.find((s) => s.id === sourceId);

  async function send() {
    setFailure(null);
    if (!sourceId) {
      setProblem(CHOOSE_SOURCE);
      return;
    }
    setProblem(undefined);
    try {
      onLoaded(await pull.mutateAsync(sourceId));
    } catch (error) {
      setFailure(`Nothing was loaded. ${asApiError(error).message}`);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && !pull.isPending && onClose()}
      title="Pull simulated feed"
      description="Asks the simulated feed for its rows once. They are checked and matched exactly like an uploaded file."
      submitLabel="Pull feed"
      busy={pull.isPending}
      onSubmit={() => void send()}
    >
      {failure && (
        <p className={styles.failure} role="alert">
          <CircleAlert aria-hidden="true" />
          {failure}
        </p>
      )}
      <div className={styles.fields}>
        <ChoiceField
          name="sourceId"
          label="Data source"
          marking="Required"
          options={offered.map((s) => ({ id: s.id, label: s.name, active: true }))}
          value={sourceId}
          onChange={setSourceId}
          disabledReason={offered.length === 0 ? NO_SIMULATED_SOURCE : undefined}
          error={problem}
        />
        {pull.isPending && chosen && (
          <p className={styles.progress} role="status">
            <LoaderCircle aria-hidden="true" className={styles.spinner} />
            {`Pulling ${chosen.name}…`}
          </p>
        )}
      </div>
    </FormDialog>
  );
}
