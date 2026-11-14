import type { UIMatch } from 'react-router';

/** What every route inside RequireSignIn says about its page, in its `handle` (router.tsx). */
export interface PageHandle {
  title: string;
  /** True for a page that uses the wide content column, such as a report. */
  wide?: boolean;
}

export function requestedPageTitle(matches: UIMatch[]): string {
  const handle = matches.at(-1)?.handle;
  return isPageHandle(handle) ? handle.title : '';
}

export function isWidePage(matches: UIMatch[]): boolean {
  return matches.some((match) => isPageHandle(match.handle) && match.handle.wide === true);
}

function isPageHandle(handle: unknown): handle is PageHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'title' in handle &&
    typeof handle.title === 'string'
  );
}
