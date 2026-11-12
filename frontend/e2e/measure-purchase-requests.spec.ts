import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// The Purchase requests report (042): commitment and status (US1).
// The demo data has one purchase request, PR-1001 (Created) on the 2027 plan of the UK market.

const ALEX = 'alex.morgan@shell.com';
const YEAR = 2027;
const REPORT = `/reports/purchase-requests?year=${YEAR}`;

test('042 US1: the cards, the status mix and the commitment charts inside the report frame (FR-001 – FR-013)', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto(REPORT);

  await expect(page.getByRole('heading', { level: 1, name: 'Purchase requests' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Summary' });
  await expect(summary.getByText('Purchase requests', { exact: true })).toBeVisible();
  await expect(summary.getByText('Committed by approved purchase requests')).toBeVisible();

  const status = page.getByRole('region', { name: 'Purchase requests by status' });
  await expect(status.getByText(/\d+ purchase requests? · \d+ waiting for GSAP/)).toBeVisible();
  await expect(status.getByText('In review')).toBeVisible();

  await expect(
    page.getByRole('region', { name: /Committed by approved purchase requests, by vendor/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: /Committed by approved purchase requests, by owner/ }),
  ).toBeVisible();
  await expect(page.getByText(/Nothing is committed yet/).first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Period' })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await status.getByRole('button', { name: 'Table' }).click();
  await expect(status.getByRole('table')).toContainText('Total');
});
