import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// 059 US3 on the demo data: old report addresses land on their new home, and a saved view keeps its stage.

const ALEX = 'alex.morgan@shell.com';
const PRIYA = 'priya.raman@shell.com';

test('059 US3-1: an old Revenue link opens Performance on Revenue with its year and Group by', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/reports/revenue?year=2026&group=owner');

  await expect(page).toHaveURL(/\/reports\/performance\?/);
  const url = new URL(page.url());
  expect([
    url.searchParams.get('stage'),
    url.searchParams.get('year'),
    url.searchParams.get('group'),
  ]).toEqual(['revenue', '2026', 'owner']);
  await expect(page.getByRole('heading', { name: 'Performance', level: 1 })).toBeVisible();
  await expect(
    page.getByLabel('Revenue figures').locator('p:has-text("Revenue goal") + p').first(),
  ).toHaveText(/^\$[\d,]+\.\d{2}$/);
  await expect(page.getByRole('combobox', { name: 'Group by' })).toHaveText(/Owner/);
  await expectNoAxeViolations(page);
});

test('059 US3-2: an old GSAP link address opens Purchasing on Purchase orders', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto('/reports/gsap-link?tab=orders&year=2026');

  await expect(page).toHaveURL(/\/reports\/purchasing\?.*tab=orders/);
  await expect(page.getByRole('tab', { name: 'Purchase orders', selected: true })).toBeVisible();
});

test('059 US3-3: a default view saved on Performance with MQL reopens on MQL', async ({ page }) => {
  await signInAs(page, PRIYA);
  const created = await page.request.post('/api/v1/reports/performance/views', {
    data: { name: 'MQL 2026', query: 'year=2026&stage=mql', isDefault: true },
  });
  expect(created.status()).toBe(201);
  const view: { id: string } = await created.json();
  try {
    await page.goto('/reports/performance');

    await expect(page).toHaveURL(/stage=mql/);
    await expect(
      page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'MQL' }),
    ).toHaveAttribute('aria-pressed', 'true');
  } finally {
    await page.request.delete(`/api/v1/reports/performance/views/${view.id}`);
  }
});
