import { expect, test, type Page } from '@playwright/test';
import { escapeRegExp, signInAs } from '../frontend/e2e/fixtures';
import { activityNamed } from '../frontend/e2e/performance';
import {
  ALEX,
  CARLOS,
  cardValue,
  check,
  FACTS,
  h1,
  HELIX_FIRST,
  LEA,
  opened,
  REPORT_ROLES,
  seesMeasure,
  SETTINGS_ROLES,
  type Role,
} from './measure-wave-b-browser-pass.helpers';

// What only shows once the seed loads performance facts (046 T110: the source "Measure demo feed" and 20 facts on
// three approved Measure activities). Skipped unless MEASURE_FACTS=1; light only, figures do not change with theme.

const SOURCE = 'Measure demo feed';
const AMOUNT = /\d[\d,]*\.\d{2}/;
/** T110's seed on PostgreSQL, Alex, 2026: 42,000.00 USD in February, 18,500.00 EUR and 24,000.00 USD in March. */
const FIGURES = {
  actual: '$86,108.70',
  february: '$42,000.00',
  march: '$44,108.70',
  helix: '$62,108.70',
  mqlConversion: '16.0%',
};

type FactCheck = (page: Page, role: Role) => Promise<void>;

const cards = (page: Page) => page.locator('[aria-label="Summary"]');
const monthRow = (page: Page, table: string | RegExp, month: string) =>
  page.getByRole('table', { name: table }).getByRole('row', { name: new RegExp(`^${month}`) });

const sourceListed: FactCheck = async (page) => {
  await opened(page, '/settings/performance-data', h1(page, 'Performance data'), test.info());
  const row = page.getByRole('row').filter({ hasText: SOURCE });
  await check(`${SOURCE} listed with its last load and freshness (046 FR-005, US3-5)`, async () => {
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell').nth(3)).not.toHaveText('Never');
    await expect(row.getByText(/^(Current|Stale)$/)).toBeVisible();
  });
};

const importListed: FactCheck = async (page) => {
  await opened(page, '/settings/performance-data/imports', h1(page, 'Imports'), test.info());
  await check('the seeded load listed, Completed (046 FR-017)', () =>
    expect(page.getByRole('row').filter({ hasText: 'Completed' }).first()).toBeVisible(),
  );
};

const panelActuals: FactCheck = async (page, role) => {
  const id = await activityNamed(page, HELIX_FIRST);
  const testInfo = test.info();
  await opened(page, `/activities/${id}?tab=details`, h1(page, HELIX_FIRST), testInfo);
  const panel = page.getByRole('region', { name: 'Performance' });
  const revenue = panel.getByRole('row', { name: /^Revenue/ });
  await check(
    'INQ actual a figure; the source and its data-through date (046 FR-029, US3-5)',
    async () => {
      await expect(panel.getByRole('row', { name: /^INQ/ }).getByRole('cell').nth(1)).toHaveText(
        /^\d[\d,]*$/,
      );
      await expect(panel.getByText(SOURCE)).toBeVisible();
      await expect(panel.getByText(/through /)).toBeVisible();
    },
  );
  if (role.finance) {
    await check(
      `revenue actual ${FIGURES.helix}, as the ranked list at Show Activity (049 FR-021)`,
      () => expect(revenue.getByRole('cell').nth(1)).toContainText(FIGURES.helix),
    );
    return;
  }
  const text = (await revenue.innerText({ timeout: 5_000 })).replace(/\s+/g, ' ');
  const description = `Revenue row without finance.view, with facts (open question 4): ${text}`;
  testInfo.annotations.push({ type: 'observed', description });
};

/** Facts reach only the Measure plan, so a person without it still sees the reason, never 0.00. */
const revenueActual: FactCheck = async (page, role) => {
  await opened(page, '/reports/revenue?year=2026', h1(page, 'Revenue'), test.info());
  const actual = cardValue(cards(page), 'Actual revenue');
  await check(
    `actual revenue ${seesMeasure(role) ? 'an amount' : 'its reason'} (049 FR-009)`,
    () =>
      seesMeasure(role) ? expect(actual).toHaveText(AMOUNT) : expect(actual).not.toHaveText(/\d/),
  );
};

const revenueFigures: FactCheck = async (page) => {
  await opened(page, '/reports/revenue?year=2026&table=periods', h1(page, 'Revenue'), test.info());
  await check(`Actual revenue ${FIGURES.actual} (049 FR-004)`, () =>
    expect(cardValue(cards(page), 'Actual revenue')).toHaveText(FIGURES.actual),
  );
  await check(
    `by month: February actual ${FIGURES.february}, March ${FIGURES.march} (049 FR-003)`,
    async () => {
      const actual = (month: string) =>
        monthRow(page, 'Revenue by month', month).getByRole('cell').nth(2);
      await expect(actual('Feb')).toHaveText(FIGURES.february);
      await expect(actual('Mar')).toHaveText(FIGURES.march);
    },
  );
  const query = `year=2026&show=activity&q=${encodeURIComponent(HELIX_FIRST)}`;
  await opened(page, `/reports/revenue?${query}`, h1(page, 'Revenue'), test.info());
  const helix = page
    .getByRole('region', { name: 'Ranked list' })
    .getByRole('row', { name: new RegExp(`^${escapeRegExp(HELIX_FIRST)}`) });
  await check(
    `ranked: ${HELIX_FIRST} actual ${FIGURES.helix}, ROI not configured (049 FR-012, FR-013)`,
    async () => {
      await expect(helix.locator('td').nth(1)).toHaveText(FIGURES.helix);
      await expect(helix.locator('td').nth(5)).toHaveText('Attribution is not configured yet.');
    },
  );
};

const summaryFigures: FactCheck = async (page) => {
  await opened(page, '/reports/revenue?year=2026', h1(page, 'Revenue'), test.info());
  const revenue = await cardValue(cards(page), 'Actual or projected').innerText();
  const tables = 'table=trend&table=leagueRoi';
  await opened(page, `/reports/summary?year=2026&${tables}`, h1(page, 'Summary'), test.info());
  await check('no report state: data, goals and access all there (048 FR-018)', () =>
    expect(page.locator('main p[role="status"]')).toHaveCount(0),
  );
  await check(`actual or projected = Revenue's ${revenue} (048 FR-008, SC-002)`, () =>
    expect(
      cardValue(page.locator('[aria-label="Revenue figures"]'), 'Actual or projected'),
    ).toHaveText(revenue),
  );
  await check(
    `MQL conversion ${FIGURES.mqlConversion}, Above plan (048 FR-010, 048-C7)`,
    async () => {
      const conversions = page.locator('[aria-label="Conversions"]');
      await expect(cardValue(conversions, 'MQL conversion')).toHaveText(FIGURES.mqlConversion);
      await expect(conversions).toContainText('Above plan');
    },
  );
  await check(
    `trend: February actual ${FIGURES.february}, March ${FIGURES.march} (048 FR-007)`,
    async () => {
      const actual = (month: string) =>
        monthRow(page, 'Revenue trend', month).getByRole('cell').nth(1);
      await expect(actual('Feb')).toHaveText(FIGURES.february);
      await expect(actual('Mar')).toHaveText(FIGURES.march);
    },
  );
  await check(
    'ROI league "—" while attribution is not configured, as Revenue says (048 FR-015)',
    async () => {
      const league = page.getByRole('table', { name: /^Top ROI by/ });
      const rows = await league.locator('tbody tr').allInnerTexts();
      const description = `Summary ROI league: ${rows.map((r) => r.replace(/\s+/g, ' ')).join('; ')}`;
      test.info().annotations.push({ type: 'observed', description });
      const values = await league.locator('tbody td:nth-of-type(2)').allInnerTexts();
      expect(values.filter((value) => value.trim() !== '—')).toEqual([]);
    },
  );
};

const summaryHasData: FactCheck = async (page) => {
  await opened(page, '/reports/summary?year=2026', h1(page, 'Summary'), test.info());
  await check('no "No performance data" state (048 FR-018)', () =>
    expect(page.getByText('No performance data has arrived yet.')).toHaveCount(0),
  );
};

const funnelActual: FactCheck = async (page) => {
  await opened(page, '/reports/funnel?year=2026', h1(page, 'Funnel stages'), test.info());
  await check('the INQ actual card is a figure (049 FR-017)', () =>
    expect(cardValue(cards(page), 'INQ actual')).toHaveText(/^\d[\d,]*$/),
  );
};

const FACT_CHECKS: { title: string; roles: Role[]; run: FactCheck }[] = [
  {
    title: `Settings › Performance data lists ${SOURCE}`,
    roles: SETTINGS_ROLES,
    run: sourceListed,
  },
  { title: 'Settings › Performance data › Imports', roles: [ALEX], run: importListed },
  {
    title: `Activity › Performance of ${HELIX_FIRST}`,
    roles: [ALEX, CARLOS, LEA],
    run: panelActuals,
  },
  { title: 'Reports › Revenue actual', roles: REPORT_ROLES, run: revenueActual },
  { title: 'Reports › Revenue figures on PostgreSQL', roles: [ALEX], run: revenueFigures },
  { title: 'Reports › Summary figures on PostgreSQL', roles: [ALEX], run: summaryFigures },
  { title: 'Reports › Summary with data', roles: [CARLOS, LEA], run: summaryHasData },
  { title: 'Reports › Funnel stages actual', roles: [ALEX], run: funnelActual },
];

export function factTests(): void {
  test.describe('with the seeded performance facts (046 T110)', () => {
    test.skip(!FACTS, 'needs the facts 046 T110 seeds with -measure: set MEASURE_FACTS=1');
    test.skip(({ colorScheme }) => colorScheme === 'dark', 'figures do not change with the theme');
    for (const factCheck of FACT_CHECKS) {
      for (const role of factCheck.roles) {
        test(`facts · ${factCheck.title} · ${role.key}`, async ({ page }) => {
          await signInAs(page, role.email);
          await factCheck.run(page, role);
        });
      }
    }
  });
}
