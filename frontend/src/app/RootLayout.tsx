import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { SessionProvider } from '@/session/SessionProvider';
import { PageLoading } from './PageLoading';

/** Scroll is kept per page: a filter, sort or page change rewrites only the query, so the page stays put. */
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
