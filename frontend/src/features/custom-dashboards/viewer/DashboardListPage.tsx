import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { useAccess } from '@/session/access';
import { LinkButton } from '@/ui/Button/Button';
import { Card } from '@/ui/Card/Card';
import { ErrorState } from '@/ui/ErrorState/ErrorState';
import { NoAccess } from '@/ui/NoAccess/NoAccess';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Skeleton } from '@/ui/Skeleton/Skeleton';
import { usePageTitle } from '@/ui/usePageTitle';
import { SectionHeading } from '@/ui/SectionHeading/SectionHeading';
import { AddTile, TileList } from '@/ui/Tile/Tile';
import type { CustomDashboardSummary } from '../model';
import { useCustomDashboards } from './api';
import { BuiltInCards, DashboardCard } from './DashboardCard';
import { DeleteDashboardDialog } from './DeleteDashboardDialog';
import { useCopyDashboard } from './useCopyDashboard';
import styles from './DashboardListPage.module.css';

export function DashboardListPage() {
  usePageTitle('Dashboards');
  const { has } = useAccess();
  const canSeePlans = has('plans.view');
  const canView = has('dashboards.view');
  const canBuild = has('dashboards.build');

  if (!canSeePlans && !canView) {
    return <NoAccess />;
  }

  return (
    <>
      <PageHeader
        title="Dashboards"
        actions={
          canBuild && (
            <>
              <LinkButton to="/datasets">Datasets</LinkButton>
              <LinkButton to="/builder" variant="primary" icon={<Plus />}>
                New dashboard
              </LinkButton>
            </>
          )
        }
      />
      <div className={styles.sections}>
        {canSeePlans && (
          <Section title="Built-in">
            <BuiltInCards />
          </Section>
        )}
        {canView && <CustomSections canBuild={canBuild} />}
      </div>
    </>
  );
}

function CustomSections({ canBuild }: { canBuild: boolean }) {
  const list = useCustomDashboards();
  const { copyAndOpen } = useCopyDashboard();
  const [deleting, setDeleting] = useState<CustomDashboardSummary | null>(null);

  if (!list.data) {
    return (
      <Section title="My dashboards">
        {list.isError ? (
          <Card>
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </Card>
        ) : (
          <div aria-label="Loading dashboards" className={styles.loading}>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>
        )}
      </Section>
    );
  }

  const cards = (items: CustomDashboardSummary[], isMine: boolean) =>
    items.map((dashboard) => (
      <DashboardCard
        key={dashboard.id}
        dashboard={dashboard}
        isMine={isMine}
        canBuild={canBuild}
        onCopy={(id) => void copyAndOpen(id)}
        onDelete={setDeleting}
      />
    ));
  const { mine, sharedWithMe } = list.data;

  return (
    <>
      <Section title="My dashboards">
        {mine.length > 0 || canBuild ? (
          <TileList>
            {cards(mine, true)}
            {mine.length === 0 && (
              <AddTile
                to="/builder"
                title="New dashboard"
                text="Pick charts, choose your data and arrange them the way you like — no code needed."
              />
            )}
          </TileList>
        ) : (
          <p className={styles.quiet}>
            You have no dashboards of your own. Dashboards your teams share with you appear below.
          </p>
        )}
      </Section>
      <Section title="Shared with me">
        {sharedWithMe.length > 0 ? (
          <TileList>{cards(sharedWithMe, false)}</TileList>
        ) : (
          <p className={styles.quiet}>Nothing shared with you yet.</p>
        )}
      </Section>
      {deleting && <DeleteDashboardDialog dashboard={deleting} onClose={() => setDeleting(null)} />}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <SectionHeading level={2} rank="section" id={titleId}>
        {title}
      </SectionHeading>
      {children}
    </section>
  );
}
