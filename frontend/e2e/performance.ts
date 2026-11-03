// Feature 046's end-to-end preparation: the Measure demo seeds no performance data, so a feed and its
// mappings are set up through the API, and every load goes through the screens.
import { expect, type Page } from '@playwright/test';
import { callApi, chooseOption } from './fixtures';

export const ALEX = 'alex.morgan@shell.com';
export const DANIEL = 'daniel.okoro@shell.com';
export const FEED = 'E2E Eloqua feed';
const LUBRICANTS_MODEL = 'MOD-1001';
const HEADER = 'Ref,Date,Activity,Feed id,External name,INQ';

interface Named {
  id: string;
  name: string;
}

export async function activityNamed(page: Page, name: string): Promise<string> {
  const plans = await callApi<{ items: Named[] }>(page, 'GET', '/api/v1/plans');
  for (const plan of plans.items) {
    const activities = await callApi<{ items: Named[] }>(
      page,
      'GET',
      `/api/v1/plans/${plan.id}/activities`,
    );
    const found = activities.items.find((a) => a.name === name);
    if (found) {
      return found.id;
    }
  }
  throw new Error(`No activity named ${name} in the demo`);
}

/** The feed every load of these tests uses: one source supplies INQ for the model (FR-003). */
export async function ensureFeed(page: Page): Promise<string> {
  const sources = await callApi<{ items: Named[] }>(page, 'GET', '/api/v1/performance/sources');
  const existing = sources.items.find((s) => s.name === FEED);
  if (existing) {
    return existing.id;
  }
  const created = await callApi<Named>(page, 'POST', '/api/v1/performance/sources', {
    name: FEED,
    ownerId: 'U-1001',
    category: 'marketingAutomation',
    deliveryRoute: 'upload',
    cadence: 'monthly',
  });
  const mappings = [
    { columnName: 'Ref', meaning: 'reference' },
    { columnName: 'Date', meaning: 'factDate' },
    { columnName: 'Activity', meaning: 'key', keyType: 'activityId' },
    { columnName: 'Feed id', meaning: 'key', keyType: 'integrationId' },
    { columnName: 'External name', meaning: 'key', keyType: 'externalName' },
    { columnName: 'INQ', meaning: 'stage', stage: 'inq', modelId: LUBRICANTS_MODEL },
  ];
  for (const mapping of mappings) {
    await callApi(page, 'POST', `/api/v1/performance/sources/${created.id}/mappings`, mapping);
  }
  return created.id;
}

export interface FeedRow {
  ref: string;
  date?: string;
  activity?: string;
  feedId?: string;
  externalName?: string;
  inq: number;
}

function csvOf(rows: FeedRow[]): string {
  const lines = rows.map((r) =>
    [
      r.ref,
      r.date ?? '2026-03-01',
      r.activity ?? '',
      r.feedId ?? '',
      r.externalName ?? '',
      r.inq,
    ].join(','),
  );
  return `${HEADER}\n${lines.join('\n')}\n`;
}

/** Uploads through Settings › Performance data › Imports and waits for the load's summary. */
export async function uploadThroughScreen(page: Page, fileName: string, rows: FeedRow[]) {
  await page.goto('/settings/performance-data/imports');
  await page.getByRole('button', { name: 'Upload a file' }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload a file' });
  await chooseOption(dialog.getByRole('combobox', { name: /^Data source/ }), FEED);
  await dialog.getByLabel(/^File/).setInputFiles({
    name: fileName,
    mimeType: 'text/csv',
    buffer: Buffer.from(csvOf(rows)),
  });
  await dialog.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByRole('heading', { name: fileName, level: 1 })).toBeVisible();
}

/** The cells of one row of the summary's counts table: rows read, then the five outcomes. */
export async function countsOf(page: Page, measure: string): Promise<string[]> {
  const table = page.getByRole('table', { name: 'Rows read and what became of them' });
  const row = table
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: measure }) });
  return row.getByRole('cell').allTextContents();
}
