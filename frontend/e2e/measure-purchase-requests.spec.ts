import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// The Purchase requests report (042): commitment and status (US1), then the vendor grid and its export (US2, US3).
// The demo data has one purchase request, PR-1001 (Created) on the 2027 plan of the UK market.

const ALEX = 'alex.morgan@shell.com';
const YEAR = 2027;
const REPORT = `/reports/purchase-requests?year=${YEAR}`;

const search = (page: { url(): string }) => new URL(page.url()).searchParams;

test('042 US1: the cards, the status mix and the commitment charts inside the report frame (FR-001 – FR-013)', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto(REPORT);

  await expect(page.getByRole('heading', { level: 1, name: 'Purchase requests' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Summary' });
  await expect(summary.getByText('Purchase requests')).toBeVisible();
  await expect(summary.getByText('Committed')).toBeVisible();

  const status = page.getByRole('region', { name: 'Purchase requests by status' });
  await expect(status.getByText(/\d+ purchase requests · \d+ waiting for GSAP/)).toBeVisible();
  await expect(status.getByText('In review')).toBeVisible();

  await expect(page.getByRole('region', { name: /Commitment by vendor/ })).toBeVisible();
  await expect(page.getByRole('region', { name: /Commitment by owner/ })).toBeVisible();
  await expect(page.getByText(/Nothing is committed yet/).first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Period' })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await status.getByRole('button', { name: 'Table' }).click();
  await expect(status.getByRole('table')).toContainText('Total');
});

test('042 US2 and US3: the grid opens from vendor to line, keeps its columns, searches and exports (FR-014 – FR-027)', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto(REPORT);

  const grid = page
    .locator('section', {
      has: page.getByRole('heading', { level: 2, name: 'Purchase requests', exact: true }),
    })
    .last();
  await expect(grid.getByRole('table')).toBeVisible();
  await grid
    .getByRole('button', { name: /^Open / })
    .first()
    .click();
  await expect(grid.getByRole('link').first()).toBeVisible();
  await grid
    .getByRole('button', { name: /^Open / })
    .first()
    .click();
  await expect(grid.getByRole('row').nth(3)).toBeVisible();
  await expectNoAxeViolations(page);

  await grid.getByText('Columns', { exact: true }).click();
  await grid.getByRole('checkbox', { name: 'Owner' }).uncheck();
  await expect.poll(() => search(page).get('columns')).not.toBeNull();
  await page.reload();
  await expect(grid.getByRole('columnheader', { name: 'Owner' })).toHaveCount(0);

  await grid
    .getByRole('searchbox', { name: 'Search purchase requests' })
    .fill('zzzz-no-such-record');
  await expect(grid.getByText('Your filters exclude everything.')).toBeVisible();
  await grid.getByRole('button', { name: 'Reset filters' }).click();
  await expect(grid.getByRole('table')).toBeVisible();

  await grid.getByRole('button', { name: 'Export' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /CSV/ }).click();
  const download = await downloading;
  const file = (await readFile(await download.path())).toString('utf8');
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  expect(file).toContain('Line item');
});
