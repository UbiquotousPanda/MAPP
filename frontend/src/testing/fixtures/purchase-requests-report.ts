import type { components } from '@/api/generated/schema';

type Report = components['schemas']['PurchaseRequestsReport'];
type Money = { amount: string; currency: string };

const usd = (amount: string): Money => ({ amount, currency: 'USD' });
const STATUSES = ['created', 'submitted', 'inReview', 'declined', 'approved', 'closed'] as const;

function series(
  key: string,
  name: string,
  values: string[],
  total: string,
): Report['byVendor']['allSeries'][number] {
  return { key, name, values: values.map(usd), total: usd(total) };
}

/** Two vendors, March to May: 3,800.00 committed, 700.00 invoiced, one request waiting for GSAP. */
export function purchaseRequestsReport(overrides: Partial<Report> = {}): Report {
  const acme = series('Acme', 'Acme', ['1300.00', '0.00', '500.00'], '1800.00');
  const globex = series('Globex', 'Globex', ['0.00', '2000.00', '0.00'], '2000.00');
  const chart: Report['byVendor'] = {
    months: ['2026-03', '2026-04', '2026-05'],
    chartSeries: [globex, acme],
    allSeries: [globex, acme],
    totals: ['1300.00', '2000.00', '500.00'].map(usd),
    committed: usd('3800.00'),
  };
  const counts = [1, 1, 1, 1, 4, 1];
  return {
    purchaseSupport: true,
    cards: {
      purchaseRequests: 9,
      lines: 10,
      vendors: 4,
      committed: usd('3800.00'),
      invoiced: usd('700.00'),
    },
    statusMix: {
      total: 9,
      totalAmount: usd('4780.00'),
      waitingForGsap: 1,
      items: STATUSES.map((status, i) => ({
        status,
        count: counts[i] ?? 0,
        amount: usd(`${(counts[i] ?? 0) * 100}.00`),
        sharePercent: [11, 11, 11, 11, 45, 11][i] ?? 0,
      })),
    },
    byVendor: chart,
    byOwner: {
      ...chart,
      chartSeries: [series('p-alice', 'Alice Ng', ['1300.00', '2000.00', '500.00'], '3800.00')],
      allSeries: [series('p-alice', 'Alice Ng', ['1300.00', '2000.00', '500.00'], '3800.00')],
    },
    grid: purchaseRequestsGrid(),
    financeCovers: { plans: 1, of: 2 },
    ...overrides,
  };
}

export function purchaseRequestsGrid(): Report['grid'] {
  return {
    vendors: [
      {
        vendor: 'Acme',
        label: 'Acme',
        purchaseRequests: 1,
        lines: 2,
        committed: usd('1500.00'),
        invoiced: usd('400.00'),
        requests: [
          {
            id: 'PR-1001',
            name: 'Event stand',
            status: 'approved',
            amount: usd('1500.00'),
            invoiced: usd('400.00'),
            owner: { id: 'p-alice', name: 'Alice Ng' },
            createdOn: '2026-02-01',
            sentOn: '2026-02-05',
            deliveryDate: '2026-03-10',
            poNumber: '4500001',
            workflow: 'Standard PR',
            gsapNumber: 'GSAP-1',
            waitingForGsap: false,
            lines: [
              {
                id: 'L1',
                lineItem: { id: 'LI-1', name: 'Stand build' },
                activity: 'Spring launch',
                amount: usd('1000.00'),
                deliveryDate: '2026-03-10',
                sentOn: '2026-02-05',
                poNumber: '4500001',
                poLine: '10',
                poLineStatus: 'Open',
                invoiced: usd('400.00'),
              },
              {
                id: 'L2',
                lineItem: { id: 'LI-2', name: 'Stand transport' },
                activity: null,
                amount: usd('500.00'),
                deliveryDate: null,
                sentOn: null,
                poNumber: null,
                poLine: null,
                poLineStatus: null,
                invoiced: null,
              },
            ],
          },
        ],
      },
    ],
    total: 1,
    totals: { purchaseRequests: 1, lines: 2, committed: usd('1500.00'), invoiced: usd('400.00') },
    page: 1,
    pageSize: 25,
    columns: [
      'name',
      'id',
      'status',
      'amount',
      'owner',
      'created',
      'delivery',
      'sent',
      'poNumber',
      'poLine',
      'poLineStatus',
      'invoiced',
      'workflow',
    ],
    choices: {
      vendors: ['Acme', 'Globex', 'none'],
      owners: [{ id: 'p-alice', name: 'Alice Ng' }],
      statuses: [...STATUSES],
    },
  };
}

export function noPurchaseRequestsReport(): Report {
  const base = purchaseRequestsReport();
  const empty = { ...base.byVendor, months: [], chartSeries: [], allSeries: [], totals: [] };
  return purchaseRequestsReport({
    cards: {
      purchaseRequests: 0,
      lines: 0,
      vendors: 0,
      committed: usd('0.00'),
      invoiced: usd('0.00'),
    },
    statusMix: {
      ...base.statusMix,
      total: 0,
      waitingForGsap: 0,
      items: base.statusMix.items.map((i) => ({ ...i, count: 0, sharePercent: 0 })),
    },
    byVendor: empty,
    byOwner: empty,
    grid: {
      ...base.grid,
      vendors: [],
      total: 0,
      totals: { purchaseRequests: 0, lines: 0, committed: usd('0.00'), invoiced: usd('0.00') },
    },
    financeCovers: { plans: 0, of: 0 },
  });
}
