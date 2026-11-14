import { scrollBehavior } from '@/ui/motion';

export const HISTORY_ID = 'history';

export function panelHistoryId(recordId: string): string {
  return `${HISTORY_ID}-${recordId}`;
}

// Runs a tick later: a closing menu returns focus to its "⋯" button, which must not win over the heading.
export function showHistory(id: string = HISTORY_ID): void {
  window.setTimeout(() => {
    const section = document.getElementById(id);
    if (!section) {
      return;
    }
    section.scrollIntoView?.({ behavior: scrollBehavior(), block: 'start' });
    const heading = section.querySelector<HTMLElement>('h2, h3') ?? section;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, 0);
}

export function historyHref(recordId: string, includeInside = false): string {
  const params: Record<string, string> = includeInside
    ? { record: recordId, inside: '1' }
    : { record: recordId };
  return `/activity-log?${new URLSearchParams(params)}`;
}
