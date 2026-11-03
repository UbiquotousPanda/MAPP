/** Performance data (feature 046) as the API answers it: sources, loads and rows to review. */
import type { components } from '@/api/generated/schema';
import type { CurrentUser } from '@/session/useSession';
import { VIEWER } from './viewer';

type Schemas = components['schemas'];

const META = {
  version: 1,
  createdAt: '2026-10-28T09:00:00Z',
  createdBy: { id: 'U-1001', name: 'Alex Morgan' },
  updatedAt: '2026-10-28T09:00:00Z',
  updatedBy: { id: 'U-1001', name: 'Alex Morgan' },
};

export function performanceSource(
  overrides: Partial<Schemas['PerformanceSource']> = {},
): Schemas['PerformanceSource'] {
  return {
    id: 'PS-1001',
    name: 'Eloqua',
    description: '',
    ownerId: 'U-1001',
    category: 'marketingAutomation',
    status: 'active',
    deliveryRoute: 'upload',
    cadence: 'monthly',
    integrationId: '',
    freshness: 'current',
    lastLoadedAt: '2026-10-28T09:00:00Z',
    dataThrough: '2026-10-27',
    factCount: 12,
    ...META,
    ...overrides,
  };
}

export const SIMULATED_SOURCE = performanceSource({
  id: 'PS-1002',
  name: 'Adobe Analytics feed',
  category: 'webAnalytics',
  deliveryRoute: 'simulated',
});

export function performanceLoad(
  overrides: Partial<Schemas['PerformanceImport']> = {},
): Schemas['PerformanceImport'] {
  return {
    id: 'PIM-1001',
    sourceId: 'PS-1001',
    fileName: 'eloqua-october.csv',
    origin: 'upload',
    status: 'completed',
    dataThrough: '2026-10-27',
    counts: { read: 20, matched: 12, held: 3, unattributed: 1, rejected: 2, unmatched: 2 },
    breakdown: [
      {
        stage: 'inq',
        webMetric: '',
        counts: { read: 18, matched: 11, held: 3, unattributed: 1, rejected: 1, unmatched: 2 },
      },
    ],
    ...META,
    ...overrides,
  };
}

export function reviewRow(overrides: Partial<Schemas['ReviewRow']> = {}): Schemas['ReviewRow'] {
  return {
    id: 'PRR-1001',
    importId: 'PIM-1001',
    sourceId: 'PS-1001',
    sourceName: 'Eloqua',
    raw: { Ref: 'r7', Date: '2026-10-02', Activity: 'A-1O42', INQ: '40' },
    reason: 'unmatched:unknown',
    faults: [],
    candidates: [],
    status: 'open',
    comment: '',
    ...META,
    ...overrides,
  };
}

export function mapping(
  columnName: string,
  meaning: Schemas['ColumnMeaning'],
  keyType: Schemas['MatchKeyType'] = '',
): Schemas['ColumnMapping'] {
  return {
    id: `PM-${columnName}`,
    sourceId: 'PS-1001',
    columnName,
    meaning,
    keyType,
    stage: meaning === 'stage' ? 'inq' : '',
    webMetric: '',
    modelId: meaning === 'stage' ? 'MOD-1001' : '',
    ...META,
  };
}

export const ELOQUA_MAPPINGS = [
  mapping('Ref', 'reference'),
  mapping('Date', 'factDate'),
  mapping('Activity', 'key', 'activityId'),
  mapping('INQ', 'stage'),
];

/** Someone who may load data but is no administrator: no settings.manage, so no undo. */
export const LOADER: CurrentUser = {
  ...VIEWER,
  access: VIEWER.access && {
    ...VIEWER.access,
    permissions: [
      ...VIEWER.access.permissions,
      { key: 'performance.import', all: true, teams: [] },
    ],
  },
};
