import { useAddressParams } from '@/ui/useAddressParams';
import { InlineAlert } from '@/ui/InlineAlert/InlineAlert';
import { Tabs } from '@/ui/Tabs/Tabs';
import { GsapLinkBody } from '../gsap-link/GsapLinkReport';
import { TAB_LABELS } from '../gsap-link/gsap-text';
import { RequestsOverview, RequestsTab } from '../purchase-requests/PurchaseRequestsReport';
import { ReportFrame } from '../shared';
import type { ReportAddress } from '../shared';
import { purchasingTabOf, PURCHASING_TABS, withTab } from './purchasing-tab';
import type { PurchasingTab } from './purchasing-tab';

const LABELS: Record<PurchasingTab, string> = { requests: 'Purchase requests', ...TAB_LABELS };

/** Purchasing: the purchase-request overview, then the trail from request to purchase order as tabs. */
export function PurchasingReport() {
  return (
    <ReportFrame report="purchasing">
      {(frame, address) => <Purchasing address={address} year={frame.filter.year} />}
    </ReportFrame>
  );
}

function Purchasing({ address, year }: { address: ReportAddress; year: number }) {
  const [search, setSearch] = useAddressParams();
  const { tab, unknown } = purchasingTabOf(search);
  return (
    <>
      {unknown && (
        <InlineAlert tone="info" title="This view changed">
          The tab it opened is no longer offered, so Purchase requests shows.
        </InlineAlert>
      )}
      <RequestsOverview address={address} onGrid={tab === 'requests'} />
      <Tabs
        label="Purchasing"
        tabs={PURCHASING_TABS.map((value) => ({ value, label: LABELS[value] }))}
        value={tab}
        onChange={(next) => setSearch(withTab(search, next))}
      >
        {tab === 'requests' ? (
          <RequestsTab
            address={address}
            year={year}
            ordersHref={`?${withTab(search, 'orders').toString()}`}
          />
        ) : (
          <GsapLinkBody key={tab} address={address} tab={tab} />
        )}
      </Tabs>
    </>
  );
}
