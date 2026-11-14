import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// Budget and spend (040): the cards and pacing chart (US1) and the ranked list with drill (US2), on the seed's 2026 plans.

const PRIYA = 'priya.raman@shell.com';
const REPORT = '/reports/budget?year=2026';

test('040 US1: Budget and spend shows the cards and spend by month with today marked (FR-002, FR-004)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports');
  await page.getByRole('link', { name: 'Budget and spend' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Budget and spend' })).toBeVisible();

  const cards = page.getByLabel('Summary');
  for (const label of ['Budget', 'Planned cost', 'Committed', 'Actual', 'Left to plan']) {
    await expect(cards.getByText(label, { exact: true })).toBeVisible();
  }
  await page.goto(REPORT);
  // The seed's budgets are not phased by month, so the chart leaves Budget out and names it in a note.
  await expect(page.getByText(/^Budget not phased by month: /)).toBeVisible();
  await expect(
    page.getByRole('img', { name: /^Planned cost and actual by period; today is in / }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quarters' }).click();
  await expect(page).toHaveURL(/period=quarter/);
  await expect(page.getByText('Spend by quarter')).toBeVisible();
  await expectNoAxeViolations(page);
});

test('040 US2: the ranked list opens on campaigns and drills to line items with Back (FR-008 – FR-011)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto(REPORT);
  const list = page.getByRole('table').last();
  await expect(list.getByRole('columnheader', { name: 'Planned cost' })).toHaveAttribute(
    'aria-sort',
    'descending',
  );

  const firstChild = list.locator('tbody tr').nth(1).getByRole('button');
  const initiative = (await firstChild.innerText()).trim();
  await firstChild.click();
  await expect(page).toHaveURL(/drill=/);
  const trail = page.getByRole('navigation', { name: 'Drill trail' });
  await expect(trail.getByText(initiative)).toHaveAttribute('aria-current', 'location');

  await page.getByRole('table').last().locator('tbody tr').nth(1).getByRole('button').click();
  await expect(
    page
      .getByRole('table')
      .last()
      .getByRole('link', { name: /^Open .* in Plan$/ })
      .nth(1),
  ).toHaveAttribute('href', /\/line-items\//);

  await trail.getByRole('button', { name: 'Back' }).click();
  await expect(trail.getByText(initiative)).toHaveAttribute('aria-current', 'location');
});
