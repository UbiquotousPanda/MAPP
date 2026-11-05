import { editHref, problemText, recordTarget } from '@/ui/refusal-links';
import type { ProblemLink } from '@/ui/refusal-links';
import type { PurchaseRequestProblem } from './api';

/** The submission check's problems (FR-021, D-404): a field opens the edit form, another record its page. */
export function problemLinks(
  purchaseRequestId: string,
  problems: PurchaseRequestProblem[],
): ProblemLink[] {
  return problems.map((problem, index) => ({
    key: `${index}-${problem.recordId}-${problem.field}`,
    text: problemText(problem.field, problem.message),
    href: problem.field
      ? editHref(purchaseRequestId, problem.field)
      : recordTarget(problem.group, problem.recordId, '', purchaseRequestId),
  }));
}
