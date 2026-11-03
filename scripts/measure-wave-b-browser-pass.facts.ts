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
  NO_FINANCE,
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
  roi: '36%',
};
const MODEL = 'Equally distributed';
/** 050's credits under Equally distributed (#149); without finance.view the cost and ROI give way to NO_FINANCE. */
const CREDITS = [
  { name: HELIX_FIRST, credited: '$54,000.00', cost: '$0.00', roi: 'No actual cost yet.' },
  { name: 'Tellus case studies', credited: '$13,405.80', cost: '$32,608.70', roi: '-59%' },
];
/** The ranked row's cells after its name: goal, actual, projected, performance, attributed revenue, cost, ROI. */
const CELL = { actual: 1, credited: 4, cost: 5, roi: 6 };
/** Summary's ROI "—" with the API's reason beside the model: Mobility China has no payment, Lubricants Europe no
 * credited revenue, Lea no financial access. */
const DASHED_ROI: Record<string, { query: string; reason: string }[]> = {
  alex: [
    { query: 'plan=P-1002', reason: 'No cost recorded' },
    { query: 'plan=P-1001', reason: 'No revenue is credited to these activities' },
  ],
  lea: [
    {
      query: '',
      reason: 'Financial data of these plans is not shown to you · Covers 0 of 3 plans',
    },
  ],
};

type FactCheck = (page: Page, role: Role) => Promise<void>;

const cards = (page: Page) => page.locator('[aria-label="Summary"]');
const monthRow = (page: Page, table: string | RegExp, month: string) =>
  page.getByRole('table', { name: table }).getByRole('row', { name: new RegExp(`^${month}`) });
const rankedRow = (page: Page, name: string) =>
  page
    .getByRole('region', { name: 'Ranked list' })
    .getByRole('row', { name: new RegExp(`^${escapeRegExp(name)}`) });
const roiLeague = (page: Page) => page.getByRole('region', { name: /^Top ROI by/ });
const leagueValue = (page: Page, row: string) =>
  roiLeague(page)
    .getByRole('table')
    .getByRole('row', { name: new RegExp(`^${row}`) })
    .locator('td')
    .last();

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
};

/** Revenue's ranked list at Show Activity: 050's credited revenue for all, cost and ROI only with finance.view. */
const revenueCredits: FactCheck = async (page, role) => {
  for (const want of CREDITS) {
    const query = `year=2026&show=activity&q=${encodeURIComponent(want.name)}`;
    await opened(page, `/reports/revenue?${query}`, h1(page, 'Revenue'), test.info());
    const cells = rankedRow(page, want.name).locator('td');
    const [cost, roi] = role.finance ? [want.cost, want.roi] : [NO_FINANCE, NO_FINANCE];
    await check(
      `ranked: ${want.name} attributed ${want.credited}, cost ${cost}, ROI ${roi} (050 FR-007)`,
      async () => {
        if (want.name === HELIX_FIRST) {
          await expect(cells.nth(CELL.actual)).toHaveText(FIGURES.helix);
        }
        await expect(cells.nth(CELL.credited)).toHaveText(want.credited);
        await expect(cells.nth(CELL.cost)).toHaveText(cost);
        await expect(cells.nth(CELL.roi)).toHaveText(roi);
      },
    );
  }
  await check(`the columns name ${MODEL} and the actual cost (050 FR-008, SC-003)`, async () => {
    const heads = page.getByRole('region', { name: 'Ranked list' }).getByRole('columnheader');
    await expect(heads.filter({ hasText: `Attributed revenue (${MODEL})` })).toHaveCount(1);
    await expect(heads.filter({ hasText: `ROI (${MODEL}, on actual cost)` })).toHaveCount(1);
  });
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
    `ROI league: External and Total ${FIGURES.roi}, ${MODEL} on actual cost, as Revenue (048 FR-015)`,
    async () => {
      const rows = await roiLeague(page).locator('tbody tr').allInnerTexts();
      const description = `Summary ROI league: ${rows.map((r) => r.replace(/\s+/g, ' ')).join('; ')}`;
      test.info().annotations.push({ type: 'observed', description });
      await expect(leagueValue(page, 'External')).toHaveText(FIGURES.roi);
      await expect(leagueValue(page, 'Total')).toHaveText(FIGURES.roi);
      await expect(roiLeague(page)).toContainText(`${MODEL}, on actual cost`);
    },
  );
};

const summaryRoiDash: FactCheck = async (page, role) => {
  for (const { query, reason } of DASHED_ROI[role.key] ?? []) {
    const address = `/reports/summary?${['year=2026', query, 'table=leagueRoi'].filter(Boolean).join('&')}`;
    await opened(page, address, h1(page, 'Summary'), test.info());
    const note = `${MODEL}, on actual cost · ${reason}`;
    await check(
      `ROI league ${query || 'of all'}: Total "—", "${note}" (048 FR-015, 050 US3-2)`,
      async () => {
        await expect(leagueValue(page, 'Total')).toHaveText('—');
        await expect(roiLeague(page)).toContainText(note);
      },
    );
  }
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
  { title: 'Reports › Revenue credited revenue and ROI', roles: [ALEX, LEA], run: revenueCredits },
  { title: 'Reports › Summary figures on PostgreSQL', roles: [ALEX], run: summaryFigures },
  { title: 'Reports › Summary ROI "—" says why', roles: [ALEX, LEA], run: summaryRoiDash },
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
