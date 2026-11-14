import { useAddressParams } from '@/ui/useAddressParams';
import { PageHeader } from '@/ui/PageHeader/PageHeader';
import { Tabs } from '@/ui/Tabs/Tabs';
import { usePageTitle } from '@/ui/usePageTitle';
import { PeopleAccessTab } from './PeopleAccessTab';
import { RecentAccessChanges } from './RecentAccessChanges';
import { RolesTab } from './RolesTab';
import { RulesTab } from './RulesTab';
import { accessTabOf, withAccessTab } from './schemas';
import type { AccessTab } from './schemas';
import styles from './access.module.css';

const TABS: { value: AccessTab; label: string }[] = [
  { value: 'people', label: 'People' },
  { value: 'roles', label: 'Roles' },
  { value: 'rules', label: 'Rules' },
];

/** Roles and access: the People, Roles and Rules tabs in the address, the latest changes under them. */
export function AccessPage() {
  usePageTitle('Roles and access');
  const [params, setParams] = useAddressParams();
  const tab = accessTabOf(params);

  function chooseTab(next: AccessTab) {
    setParams((previous) => withAccessTab(previous, next), { replace: true });
  }

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Settings', to: '/settings' }, { label: 'Roles and access' }]}
        title="Roles and access"
        description="Changes apply on each person's next action."
      />
      <div className={styles.page}>
        <Tabs label="Roles and access" tabs={TABS} value={tab} onChange={chooseTab}>
          {tab === 'people' && <PeopleAccessTab />}
          {tab === 'roles' && <RolesTab />}
          {tab === 'rules' && <RulesTab />}
        </Tabs>
        <RecentAccessChanges />
      </div>
    </>
  );
}
