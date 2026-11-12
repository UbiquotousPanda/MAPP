import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { choose, signInAs } from './fixtures';

// 059 US1 on the demo data as Alex sees 2026. Other tests add activities to the same database and the projections
// move with today's date, so plan-wide totals are not fixed here; the Fleet cards row and the top five are.

const ALEX = 'alex.morgan@shell.com';
const PRIYA = 'priya.raman@shell.com';

async function cardValue(cards: Locator, label: string): Promise<string> {
  const value = cards.locator(`p:has-text("${label}") + p`).first();
  await expect(value).toBeVisible();
  return (await value.innerText()).trim();
}

// Excludes the shared RankedList's open-link target size and the logo's, logged as cross-lane asks.
async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[role="img"][aria-label="SP&A One"] > span')
    .exclude('a[aria-label^="Open "]')
    .analyze();
  const found = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(found).toEqual([]);
}

async function topFive(ranked: Locator): Promise<string[]> {
  const groups = ranked.locator('th[scope="rowgroup"]');
  await expect(groups.first()).toBeVisible();
  return (await groups.allInnerTexts()).slice(0, 5).map((text) => text.trim());
}

test('059 US1: the overview is the year at a glance, and Revenue is the stage it opens on (scenario 1)', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);

  await page.goto('/reports/performance?year=2026');
  await expect(page.getByRole('heading', { name: 'Performance', level: 1 })).toBeVisible();
  const figures = page.getByLabel('Revenue figures');
  expect(await cardValue(figures, 'Revenue goal')).toMatch(/^\$[\d,]+\.\d{2}$/);
  expect(await cardValue(figures, 'Actual or projected')).toMatch(/^\$[\d,]+\.\d{2}$/);
  await expect(page.getByLabel('Stage figures').getByText('MQL conversion')).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'Revenue' }),
  ).toHaveAttribute('aria-pressed', 'true');

  const ranked = page.getByRole('region', { name: 'Ranked list' });
  const fleetCards = ranked.getByRole('row', { name: /Fleet cards/ });
  await expect(fleetCards).toContainText('$400,000.00');
  await ranked.getByRole('button', { name: 'Fleet cards' }).click();
  await expect(ranked.getByRole('navigation', { name: 'Drill trail' })).toContainText(
    'Fleet cards',
  );

  await expectNoAxeViolations(page);
});

test('059 US1: MQL changes the widgets, the ranked list and the address (scenario 2)', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/reports/performance?year=2026');

  await page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'MQL' }).click();

  await expect(page).toHaveURL(/stage=mql/);
  const ranked = page.getByRole('region', { name: 'Ranked list' });
  await expect(ranked.getByText('Stage: Marketing-qualified leads (MQL)')).toBeVisible();
  await expect(ranked.getByRole('row', { name: /Fleet cards/ })).toContainText('2,000');
  await expect(page.getByRole('img', { name: /^Conversion rate/ })).toBeVisible();

  await page.getByRole('group', { name: 'Stage' }).getByRole('button', { name: 'INQ' }).click();
  await expect(ranked.getByRole('row', { name: /Fleet cards/ })).toContainText('60,000');
  await choose(page, page.getByRole('combobox', { name: 'Group by' }), 'Plan');
  await expect(page.getByText('FY2026 Mobility China')).toBeVisible();

  await expectNoAxeViolations(page);
});

test('059 US1: grouped by Country / OU, the ranked list gives the league tables’ top fives (scenario 3)', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/reports/performance?year=2026&show=activity&size=50');
  const ranked = page.getByRole('region', { name: 'Ranked list' });

  await choose(page, page.getByRole('combobox', { name: 'Group by' }), 'Country / OU');
  await ranked.getByRole('columnheader', { name: 'Projected' }).getByRole('button').click();

  await expect(page).toHaveURL(/sort=projectedRevenue/);
  expect((await topFive(ranked)).toSorted()).toEqual([
    'China',
    'Germany',
    'India',
    'Netherlands',
    'United Kingdom',
  ]);

  await ranked.getByRole('columnheader', { name: 'ROI' }).getByRole('button').click();
  await expect(page).toHaveURL(/sort=roi/);
  expect(await topFive(ranked)).toHaveLength(5);
});

test('059 US1: an activity’s attributed revenue opens its deals (scenario 4)', async ({ page }) => {
  await signInAs(page, ALEX);
  const activity = 'Tellus webinar series';
  await page.goto(`/reports/performance?year=2026&show=activity&q=${encodeURIComponent(activity)}`);

  const ranked = page.getByRole('region', { name: 'Ranked list' });
  await ranked
    .getByRole('button', { name: /^Attributed revenue of Tellus webinar series/ })
    .click();

  const panel = page.getByRole('dialog', { name: activity });
  await expect(panel.getByText('Credited to this activity')).toBeVisible();
  await expect(panel.getByText('$18,851.86')).toBeVisible();
});

test('059 US3: a default view saved on Performance with MQL reopens on MQL', async ({ page }) => {
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
