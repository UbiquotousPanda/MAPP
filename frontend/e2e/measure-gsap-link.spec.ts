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
