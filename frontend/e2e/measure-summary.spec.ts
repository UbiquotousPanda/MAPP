import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { signInAs } from './fixtures';

const ALEX = 'alex.morgan@shell.com';

async function cardValue(cards: Locator, label: string): Promise<string> {
  const value = cards.locator(`p:has-text("${label}") + p`).first();
  await expect(value).toBeVisible();
  return (await value.innerText()).trim();
}

// Excludes the same shared-frame target-size defect 049's e2e logs as a cross-lane ask.
async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[role="img"][aria-label="SP&A One"] > span')
    .analyze();
  const found = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(found).toEqual([]);
}

test('048 US1: the Summary report shows revenue against goal, equal to the Revenue report', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);

  await page.goto('/reports/revenue?year=2026');
  const revenue = await cardValue(page.getByLabel('Summary'), 'Actual or projected');

  await page.goto('/reports/summary?year=2026');
  await expect(page.getByRole('heading', { name: 'Summary', level: 1 })).toBeVisible();
  const figures = page.getByLabel('Revenue figures');
  expect(await cardValue(figures, 'Actual or projected')).toBe(revenue);
  await expect(page.getByText('Goals planned in activities')).toBeVisible();
  await expect(page.getByLabel('Stage figures').getByText('MQL conversion')).toBeVisible();

  await expectNoAxeViolations(page);
});

test('048 US2: the one Segment choice reloads the league tables and keeps it in the address', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/reports/summary?year=2026');

  const segment = page.getByRole('combobox', { name: 'Segment' });
  await expect(segment).toBeVisible();
  const options = await segment.locator('option').allInnerTexts();
  test.skip(options.length < 2, 'the demo data offers one segment only');

  const reloaded = page.waitForRequest((r) => r.url().includes('/reports/summary/league/revenue'));
  await segment.click();
  await page.getByRole('option').nth(1).click();
  await reloaded;
  await expect(page).toHaveURL(/revenueBy=/);
});
