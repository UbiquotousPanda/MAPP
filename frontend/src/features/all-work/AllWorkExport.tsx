import { ExportMenu } from '@/ui/ExportMenu/ExportMenu';
import type { AllWorkResult, ViewState } from './all-work-types';
import { exportAllWork } from './api';

const NOTHING_TO_EXPORT = 'Nothing to export — clear a filter first.';

export interface AllWorkExportProps {
  state: ViewState;
  result: AllWorkResult | undefined;
  refusal?: string;
}

/** The view on screen as a file the API writes, with every row, the totals and the filters. */
export function AllWorkExport({ state, result, refusal }: AllWorkExportProps) {
  return (
    <ExportMenu
      formats={['xlsx', 'csv']}
      download={(format) => exportAllWork(state, format)}
      refusal={refusal}
      emptyText={result?.rows.length === 0 ? NOTHING_TO_EXPORT : undefined}
    />
  );
}
