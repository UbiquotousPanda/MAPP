import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { SessionProvider } from '@/session/SessionProvider';
import { PageLoading } from './PageLoading';

/**
 * The root of every page: the session, the scroll position per page (a filter, sort or page change
 * rewrites only the query, so the page stays where it was), and the page of the current address.
 */
export function RootLayout() {
  return (
    <SessionProvider>
      <ScrollRestoration getKey={(location) => location.pathname} />
      <Suspense fallback={<PageLoading />}>
        <Outlet />
      </Suspense>
    </SessionProvider>
  );
}
