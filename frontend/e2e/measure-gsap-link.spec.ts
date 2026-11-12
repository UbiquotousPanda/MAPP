import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';
import {
  MEASURE_ORDERED_LINE_ITEMS,
  MEASURE_PURCHASE_REQUESTS,
  SEES_MEASURE_PLAN,
} from './measure';

// GSAP link (044 US1): the demo year's line items Ready to send to GSAP inside the report frame, waiting since their
// activity was approved, sorted in the address, and one opened.

const PRIYA = 'priya.raman@shell.com';

test('044 US1: line items waiting for an SWBS code, sorted in the address, and one opened (FR-001 – FR-007, FR-016)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports');
  await page.getByRole('link', { name: 'GSAP link' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'GSAP link' })).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Waiting for SWBS code', selected: true }),
  ).toBeVisible();
  const table = page.getByRole('table', { name: 'Waiting for SWBS code' });
  await expect(table.getByRole('link', { name: 'Stand build' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Line items by waiting time' })).toBeVisible();
  await expectNoAxeViolations(page);

  await table.getByRole('button', { name: 'Line item' }).click();
  await expect(page).toHaveURL(/sort=lineItem/);
  await expect(table.getByRole('columnheader', { name: 'Line item' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );

  await table.getByRole('link', { name: 'Stand build' }).click();
  await expect(page).toHaveURL(/\/line-items\/L-\d+$/);
});

test('044 US2: the Waiting for GSAP tab in the address, with its cards (FR-001, FR-008 – FR-010)', async ({
  page,
}) => {
  // The Measure demo routes a request GSAP has not answered; with none waiting the tab shows only an empty state.
  await signInAs(page, SEES_MEASURE_PLAN);
  await page.goto('/reports/gsap-link');

  await page.getByRole('tab', { name: 'Waiting for GSAP' }).click();
  await expect(page).toHaveURL(/tab=waiting/);
  const summary = page.getByLabel('Summary');
  await expect(summary.getByText('Amount waiting')).toBeVisible();
  await expect(summary.getByText('Over 2 working days')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for GSAP' })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goBack();
  await expect(
    page.getByRole('tab', { name: 'Waiting for SWBS code', selected: true }),
  ).toBeVisible();
});

test('044 with the Measure demo (#48): the routed request waits for GSAP and the ordered ones are on Purchase orders', async ({
  page,
}) => {
  await signInAs(page, SEES_MEASURE_PLAN);
  await page.goto('/reports/gsap-link?tab=waiting&pageSize=500');
  const waiting = page.getByRole('region', { name: 'Waiting for GSAP' });
  await expect(
    waiting.getByRole('link', { name: MEASURE_PURCHASE_REQUESTS.waitingForGsap, exact: true }),
  ).toBeVisible();
  await expect(
    waiting.getByRole('link', { name: MEASURE_PURCHASE_REQUESTS.ordered, exact: true }),
  ).toHaveCount(0);

  await page.goto('/reports/gsap-link?tab=orders&pageSize=500');
  const orders = page.getByRole('region', { name: 'Purchase orders' });
  for (const lineItem of MEASURE_ORDERED_LINE_ITEMS) {
    await expect(orders.getByRole('link', { name: lineItem, exact: true }).first()).toBeVisible();
  }
  await expectNoAxeViolations(page);
});

test('044 US4: a tab exports as CSV and Excel with its sort, and the report as one workbook (FR-019)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports/gsap-link?sort=lineItem');
  const table = page.getByRole('region', { name: 'Waiting for SWBS code' });
  await expect(table.getByRole('link', { name: 'Stand build' })).toBeVisible();

  for (const [format, extension] of [
    ['CSV (.csv)', '.csv'],
    ['Excel (.xlsx)', '.xlsx'],
  ] as const) {
    await table.getByRole('button', { name: 'Export Waiting for SWBS code' }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: format }).click();
    expect((await downloading).suggestedFilename()).toMatch(
      new RegExp(`^SP&A One – GSAP link – SWBS not received – \\d{4} – .+\\${extension}$`),
    );
  }

  // The page header's Export downloads the workbook at once.
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).first().click();
  expect((await downloading).suggestedFilename()).toMatch(
    /^SP&A One – GSAP link – \d{4} – .+\.xlsx$/,
  );
});
