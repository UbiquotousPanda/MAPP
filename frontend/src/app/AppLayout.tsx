import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useMatches } from 'react-router';
import { DemoBanner } from '@/ui/DemoBanner/DemoBanner';
import { cx } from '@/ui/cx';
import { isWidePage } from '@/session/page-handle';
import styles from './AppLayout.module.css';
import { PageLoading } from './PageLoading';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSidebarCollapsed } from './useSidebarCollapsed';

export function AppLayout({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebarCollapsed();
  const wide = isWidePage(useMatches());

  return (
    <div className={cx(styles.layout, collapsed && styles.collapsed)}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <TopBar />
      <div className={styles.sidebar}>
        <Sidebar />
      </div>
      <div className={styles.column}>
        <DemoBanner />
        {/* tabIndex -1 lets the skip link move the keyboard focus here. */}
        <main id="main" tabIndex={-1} className={styles.main}>
          <div className={cx(styles.content, wide && styles.contentWide)}>
            <Suspense fallback={<PageLoading />}>{children}</Suspense>
          </div>
        </main>
        <footer className={styles.footer}>
          <p className={styles.footerText}>© SP&A One — demo data</p>
        </footer>
      </div>
    </div>
  );
}
