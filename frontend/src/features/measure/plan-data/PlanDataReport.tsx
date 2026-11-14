import type { ReactNode } from 'react';
import { useAccess } from '@/session/access';
import { useAddressParams } from '@/ui/useAddressParams';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { Tabs } from '@/ui/Tabs/Tabs';
import { PlanDetailsBody } from '../plan-details/PlanDetailsReport';
import { withTab } from '../purchasing/purchasing-tab';
import { ReportFrame } from '../shared';
import { UserAccessBody } from '../user-access/UserAccessReport';

type PlanDataTab = 'completeness' | 'people';

const LABELS: Record<PlanDataTab, string> = {
  completeness: 'Data completeness',
  people: 'People',
};

/** Plan data and access: data completeness for everyone with reports, People only with access.manage. */
export function PlanDataReport() {
  const access = useAccess();
  const [search, setSearch] = useAddressParams();
  const offered: PlanDataTab[] = access.has('access.manage')
    ? ['completeness', 'people']
    : ['completeness'];
  const raw = search.get('tab');
  const tab = offered.find((t) => t === raw) ?? 'completeness';
  const tabbed = (body: ReactNode) => (
    <>
      {raw !== null && raw !== tab && (
        <InlineAlert tone="info" title="This view changed">
          The tab it opened is not offered to you, so Data completeness shows.
        </InlineAlert>
      )}
      <Tabs
        label="Plan data and access"
        tabs={offered.map((value) => ({ value, label: LABELS[value] }))}
        value={tab}
        onChange={(next) => setSearch(withTab(search, next))}
      >
        {body}
      </Tabs>
    </>
  );
  return tab === 'people' ? (
    <ReportFrame report="planData" filters={false}>
      {() => tabbed(<UserAccessBody />)}
    </ReportFrame>
  ) : (
    <ReportFrame report="planData">
      {(_, address) => tabbed(<PlanDetailsBody address={address} />)}
    </ReportFrame>
  );
}
