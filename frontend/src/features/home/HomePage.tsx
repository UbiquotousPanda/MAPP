import { useCurrentUser, useSession } from '@/session/useSession';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { SegmentedFilter } from '@/ui/SegmentedFilter/SegmentedFilter';
import type { SegmentedFilterOption } from '@/ui/SegmentedFilter/SegmentedFilter';
import { usePageTitle } from '@/ui/usePageTitle';
import { AttentionCard } from './AttentionCard';
import { CurrencyPicker } from './CurrencyPicker';
import { FinancialsCard } from './FinancialsCard';
import { GettingStartedCard } from './GettingStartedCard';
import { useHomeSummary } from './api';
import type { HomeScope } from './api';
import { SCOPE_HINT, greetingText } from './home-text';
import styles from './HomePage.module.css';
import { MyActivitiesCard } from './MyActivitiesCard';
import { NoRoleCard } from './NoRoleCard';
import { PlansAtAGlanceCard } from './PlansAtAGlanceCard';
import { RecentChangesCard } from './RecentChangesCard';
import { RevenueCard } from './RevenueCard';
import { SummaryCards } from './SummaryCards';
import { WaitingCard } from './WaitingCard';

const SCOPES: SegmentedFilterOption<HomeScope>[] = [
  { value: 'myTeams', label: 'My teams' },
  { value: 'everything', label: 'Everything' },
];

/** Every card asks its own data, so one that fails never hides the others (design system §2.4 E). */
export function HomePage() {
  usePageTitle('Home');
  const person = useCurrentUser();
  const { updatePreferences } = useSession();
  const scope: HomeScope = person.preferences.homeScope ?? 'myTeams';
  const changeScope = (homeScope: HomeScope) => updatePreferences({ homeScope });
  const summary = useHomeSummary(scope);
  const gettingStarted = summary.data?.gettingStarted ?? null;
  // Before 014 is served the person has no access object: Home shows its cards as before.
  const noRole = person.access !== undefined && person.access.roles.length === 0;

  return (
    <>
      <div className={styles.head}>
        <PageHeader
          title={greetingText(person.firstName)}
          description={noRole ? undefined : SCOPE_HINT}
        />
        {!noRole && (
          <div className={styles.actions}>
            <SegmentedFilter label="Scope" options={SCOPES} value={scope} onChange={changeScope} />
            <CurrencyPicker />
          </div>
        )}
      </div>
      {noRole ? (
        <div className={styles.page}>
          <NoRoleCard
            administrators={person.access?.administrators.map((admin) => admin.name) ?? []}
          />
        </div>
      ) : (
        <div className={styles.page}>
          {gettingStarted && <GettingStartedCard reason={gettingStarted} />}
          <SummaryCards scope={scope} />
          <FinancialsCard scope={scope} />
          <RevenueCard />
          <div className={styles.pair}>
            <AttentionCard />
            <WaitingCard />
          </div>
          <PlansAtAGlanceCard scope={scope} onShowEverything={() => changeScope('everything')} />
          <MyActivitiesCard />
          <RecentChangesCard scope={scope} />
        </div>
      )}
    </>
  );
}
