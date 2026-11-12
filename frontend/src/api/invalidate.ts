import type { QueryClient } from '@tanstack/react-query';

/** Every query but the session's and a deleted record's (`goneId`): a change can show on any screen. */
export function invalidateAllButSession(queryClient: QueryClient, goneId?: string): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] !== 'session' && (goneId === undefined || !queryKey.includes(goneId)),
  });
}
