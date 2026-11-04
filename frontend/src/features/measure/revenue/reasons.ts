/** Why a figure is empty (049-C20): the API's stated reason, never inferred and never a sample value. */
const REASON_WORDS: Record<string, string> = {
  noGoal: 'No goal set.',
  notApproved: 'Not approved yet.',
  noSource: 'No active data source.',
  noData: 'No data has arrived yet.',
  noFinancialAccess: 'Financial data not shown to you.',
  noActualCost: 'No actual cost yet.',
  noPreviousStage: '—',
};

export function reasonText(reason: string): string {
  return REASON_WORDS[reason] ?? '—';
}
