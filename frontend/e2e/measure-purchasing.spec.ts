import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';
import {
  MEASURE_ORDERED_LINE_ITEMS,
  MEASURE_PURCHASE_REQUESTS,
  SEES_MEASURE_PLAN,
} from './measure';

// Purchasing (059 US2): the purchase-request overview, then the trail to the purchase order as tabs. The demo data
// has one purchase request in 2027 (PR-1001, Created); the Measure demo (#48) has the rest in 2026.

const ALEX = 'alex.morgan@shell.com';
const PRIYA = 'priya.raman@shell.com';

test('059 US2-1: the overview by status and by vendor above the Purchase requests grid (042 FR-001 – FR-013)', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto('/reports/purchasing?year=2027');

  await expect(page.getByRole('heading', { level: 1, name: 'Purchasing' })).toBeVisible();
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
  await expect(page.getByRole('tab', { name: 'Purchase requests', selected: true })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search purchase requests' })).toBeVisible();
  await expectNoAxeViolations(page);

  await status.getByRole('button', { name: 'Table' }).click();
  await expect(status.getByRole('table')).toContainText('Total');
});

test('059 US2: line items waiting for an SWBS code, sorted in the address, and one opened (044 FR-001 – FR-007)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports/purchasing');
  await page.getByRole('tab', { name: 'Waiting for SWBS code' }).click();

  await expect(page).toHaveURL(/tab=swbs/);
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

test('059 US2-2: Waiting for GSAP and Purchase orders, invoiced per line equal to the grid (044 #48, measure-metrics "Invoiced per PR line")', async ({
  page,
}) => {
  await signInAs(page, SEES_MEASURE_PLAN);
  await page.goto('/reports/purchasing?tab=waiting&pageSize=200');
  await expect(page.getByRole('tab', { name: 'Waiting for GSAP', selected: true })).toBeVisible();
  const waiting = page.getByRole('region', { name: 'Waiting for GSAP' });
  await expect(
    waiting.getByRole('link', { name: MEASURE_PURCHASE_REQUESTS.waitingForGsap, exact: true }),
  ).toBeVisible();
  await expect(
    waiting.getByRole('link', { name: MEASURE_PURCHASE_REQUESTS.ordered, exact: true }),
  ).toHaveCount(0);

  const [lineItem] = MEASURE_ORDERED_LINE_ITEMS;
  await page.goto(
    `/reports/purchasing?tab=requests&columns=name,invoiced&q=${encodeURIComponent(lineItem)}`,
  );
  const grid = page.getByRole('table', { name: 'Purchase requests by vendor' });
  await expect(grid.getByRole('button', { name: /^Open / }).first()).toBeVisible();
  for (const vendor of await grid.getByRole('button', { name: /^Open / }).all()) {
    await vendor.click();
  }
  await grid
    .getByRole('button', { name: `Open ${MEASURE_PURCHASE_REQUESTS.ordered}`, exact: true })
    .click();
  const line = grid.getByRole('row', { name: new RegExp(`^${lineItem} ·`) });
  const invoiced = (await line.getByRole('cell').last().textContent())?.trim() ?? '';
  expect(invoiced).toMatch(/\d/);

  await page.getByRole('tab', { name: 'Purchase orders' }).click();
  await expect(page).toHaveURL(/tab=orders/);
  const orders = page.getByRole('region', { name: 'Purchase orders' });
  for (const each of MEASURE_ORDERED_LINE_ITEMS) {
    await expect(orders.getByRole('link', { name: each, exact: true }).first()).toBeVisible();
  }
  const order = orders
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: lineItem, exact: true }) });
  await expect(order.first()).toContainText(invoiced);
  await expectNoAxeViolations(page);
});
