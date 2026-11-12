import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { escapeRegExp, expectNoAxeViolations, signInAs } from './fixtures';

// 050 on the Measure demo's seeded facts (#136): $24,000.00 through journey JRN-2C71, €18,500.00
// ($20,108.70) through JRN-8E05, and $42,000.00 on Helix with no journey. Equally distributed shares a
// journey between its touches; Last touch gives both journeys to Tellus webinar series, their last touch.

const ALEX = 'alex.morgan@shell.com';
const HELIX = 'Helix search and social, first half';
const CASE_STUDIES = 'Tellus case studies';
const WEBINARS = 'Tellus webinar series';

const EQUALLY: Record<string, string> = {
  [HELIX]: '$54,000.00',
  [CASE_STUDIES]: '$13,405.80',
  [WEBINARS]: '$18,702.90',
};
const LAST_TOUCH: Record<string, string> = {
  [HELIX]: '$42,000.00',
  [CASE_STUDIES]: '$0.00',
  [WEBINARS]: '$44,108.70',
};

async function openRevenue(page: Page, activity: string): Promise<Locator> {
  await page.goto(`/reports/revenue?year=2026&show=activity&q=${encodeURIComponent(activity)}`);
  const ranked = page.getByRole('region', { name: 'Ranked list' });
  await expect(
    ranked.getByRole('rowheader', { name: new RegExp(`^${escapeRegExp(activity)}`) }),
  ).toBeVisible();
  return ranked;
}

async function figure(ranked: Locator, activity: string, heading: RegExp): Promise<Locator> {
  const headings = await ranked.getByRole('columnheader').allInnerTexts();
  const column = headings.findIndex((h) => heading.test(h.trim())) - 1;
  expect(column, `a column headed ${heading}`).toBeGreaterThanOrEqual(0);
  return ranked
    .getByRole('row', { name: new RegExp(`^${escapeRegExp(activity)}`) })
    .getByRole('cell')
    .nth(column);
}

async function expectCredits(page: Page, credits: Record<string, string>): Promise<void> {
  for (const [activity, credited] of Object.entries(credits)) {
    const ranked = await openRevenue(page, activity);
    await expect(await figure(ranked, activity, /^Attributed revenue/)).toHaveText(credited);
  }
}

async function designate(page: Page, model: string): Promise<void> {
  await page.goto('/settings/attribution');
  await page.getByRole('radio', { name: new RegExp(`^${escapeRegExp(model)}`) }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Change the model' }).click();
  await expect(
    page.getByRole('radio', { name: new RegExp(`^${escapeRegExp(model)}`) }),
  ).toBeChecked();
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
}

test('050 US1–US3: Revenue credits the seeded journeys and names the model and cost basis', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);

  await expectCredits(page, EQUALLY);

  const ranked = await openRevenue(page, CASE_STUDIES);
  await expect(
    ranked.getByText('Revenue credit: split equally across the steps · ROI on actual cost'),
  ).toBeVisible();
  await expect(await figure(ranked, CASE_STUDIES, /^Actual cost/)).toHaveText('$32,608.70');
  await expect(await figure(ranked, CASE_STUDIES, /^ROI/)).toHaveText('-59%');
});

test('050 US1, US4: a model chosen in Settings restates Revenue, its export and Summary (SC-002)', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/settings/attribution');
  await expect(page.getByRole('heading', { name: 'Attribution', level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  try {
    await designate(page, 'Last touch');

    await expectCredits(page, LAST_TOUCH);
    const ranked = await openRevenue(page, CASE_STUDIES);
    await expect(
      ranked.getByText('Revenue credit: all to the last step · ROI on actual cost'),
    ).toBeVisible();
    await expect(await figure(ranked, CASE_STUDIES, /^ROI/)).toHaveText('-100%');

    const webinars = await openRevenue(page, WEBINARS);
    await webinars.getByRole('button', { name: 'Export' }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'CSV (.csv)' }).click();
    const csv = await readFile(await (await downloading).path(), 'utf8');
    expect(csv).toContain('Attributed revenue (Last touch)');
    expect(csv).toContain('"ROI (%, Last touch, on actual cost)"');
    const row = csv.split('\n').find((line) => line.split(',')[2] === WEBINARS);
    expect(row).toContain('44108.70');

    await page.goto('/reports/summary?year=2026');
    await page.getByRole('button', { name: 'About Top ROI' }).click();
    await expect(page.getByRole('dialog', { name: 'About Top ROI' })).toContainText(
      'Attribution: Last touch, on actual cost.',
    );
    await expect(page.getByText(/Equally distributed/)).toHaveCount(0);
  } finally {
    await designate(page, 'Equally distributed');
  }
});
