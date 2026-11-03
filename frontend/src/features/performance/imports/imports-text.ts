import { formatWhole } from '@/format/decimal';
import type { StatusTone } from '@/ui/StatusChip/StatusChip';
import type { ImportStatus, PerformanceCounts, PerformanceImport } from './api';

export const IMPORTS = 'Imports';
export const IMPORTS_DESCRIPTION =
  'Every file uploaded and every simulated pull, with what each did to the figures.';
export const IMPORTS_PATH = '/settings/performance-data/imports';

export function importPath(importId: string): string {
  return `${IMPORTS_PATH}/${importId}`;
}

export const STATUS_WORDS: Record<ImportStatus, string> = {
  completed: 'Completed',
  failed: 'Failed',
  undone: 'Undone',
};

export const STATUS_TONES: Record<ImportStatus, StatusTone> = {
  completed: 'positive',
  failed: 'problem',
  undone: 'neutral',
};

export const ORIGIN_WORDS: Record<PerformanceImport['origin'], string> = {
  upload: 'File upload',
  simulated: 'Simulated feed',
};

export type Outcome = Exclude<keyof PerformanceCounts, 'read'>;

export const OUTCOMES: { key: Outcome; label: string; tip: string }[] = [
  {
    key: 'matched',
    label: 'Matched',
    tip: 'Matched to one approved activity; counted everywhere.',
  },
  {
    key: 'held',
    label: 'Held',
    tip: 'Matched to an activity not yet approved; counted once it is approved.',
  },
  { key: 'unattributed', label: 'Unattributed', tip: 'Valid rows that name no activity.' },
  { key: 'rejected', label: 'Rejected', tip: 'Rows with a problem; listed in Rows to review.' },
  {
    key: 'unmatched',
    label: 'Unmatched',
    tip: 'Rows no activity could be found for; listed in Rows to review.',
  },
];

export const STAGE_WORDS: Record<string, string> = {
  inq: 'INQ',
  mql: 'MQL',
  sal: 'SAL',
  sql: 'SQL',
  deal: 'Deals',
  deals: 'Deals',
  revenue: 'Revenue',
  sessions: 'Sessions',
  visits: 'Visits',
  engagementTouches: 'Engagement touches',
};

export function measureWord(stage: string, webMetric: string): string {
  const key = stage || webMetric;
  return STAGE_WORDS[key] ?? key;
}

export const EMPTY_TITLE = 'No imports yet';
export const EMPTY_TEXT =
  'Upload a CSV file or pull a simulated feed, and its summary is listed here.';
export const NO_MATCH = 'Nothing matches these filters';
export const NOT_EDITABLE =
  "An import can't be edited. To take it back, undo it; to change a figure, upload a corrected file.";
export const UNDO_NEEDS_ADMIN = 'Only an administrator can undo an import.';
export const NEED_CSV = 'Choose a UTF-8 CSV file (.csv).';
export const UNREADABLE = "The file couldn't be read. Choose it again.";
export const NO_UPLOAD_SOURCE =
  'No active data source takes file uploads. Add one, or reactivate one, in Performance data.';
export const NO_SIMULATED_SOURCE =
  'No active data source delivers through the simulated feed. Add one in Performance data.';

/** "It read 20 rows: 12 matched, 3 held, 1 unattributed, 2 rejected and 2 unmatched." */
export function countsSentence(counts: PerformanceCounts): string {
  const parts = OUTCOMES.map(
    ({ key, label }) => `${formatWhole(counts[key])} ${label.toLowerCase()}`,
  );
  const last = parts.pop() ?? '';
  const rows = counts.read === 1 ? 'row' : 'rows';
  return `It read ${formatWhole(counts.read)} ${rows}: ${parts.join(', ')} and ${last}.`;
}
