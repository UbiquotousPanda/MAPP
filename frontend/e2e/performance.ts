// 046's end-to-end preparation: every load goes through the seeded Measure demo feed and the screens.
import { expect, type Page } from '@playwright/test';
import { callApi, choose, escapeRegExp } from './fixtures';

export const ALEX = 'alex.morgan@shell.com';
export const DANIEL = 'daniel.okoro@shell.com';
export const FEED = 'Measure demo feed';
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

/** The feed every load of these tests uses: the Measure demo's, the one source a model's INQ may have. */
export async function ensureFeed(page: Page): Promise<string> {
  const sources = await callApi<{ items: Named[] }>(page, 'GET', '/api/v1/performance/sources');
  const seeded = sources.items.find((s) => s.name === FEED);
  if (!seeded) {
    throw new Error(`No data source named ${FEED} in the Measure demo`);
  }
  return seeded.id;
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
  await choose(
    page,
    dialog.getByRole('combobox', { name: /^Data source/ }),
    new RegExp(`^${escapeRegExp(FEED)}`),
  );
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
