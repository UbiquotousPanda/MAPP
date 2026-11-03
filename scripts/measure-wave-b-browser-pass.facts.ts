import { expect, test, type Page } from '@playwright/test';
import { signInAs } from '../frontend/e2e/fixtures';
import { activityNamed } from '../frontend/e2e/performance';
import {
  ALEX,
  CARLOS,
  cardValue,
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

type FactCheck = (page: Page, role: Role) => Promise<void>;

const sourceListed: FactCheck = async (page) => {
  await page.goto('/settings/performance-data');
  const row = page.getByRole('row').filter({ hasText: SOURCE });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell').nth(3)).not.toHaveText('Never');
  await expect(row.getByText(/^(Current|Stale)$/)).toBeVisible();
};

const importListed: FactCheck = async (page) => {
  await page.goto('/settings/performance-data/imports');
  await expect(page.getByRole('row').filter({ hasText: 'Completed' }).first()).toBeVisible();
};

const panelActuals: FactCheck = async (page, role) => {
  const id = await activityNamed(page, HELIX_FIRST);
  const testInfo = test.info();
  await opened(page, `/activities/${id}?tab=details`, h1(page, HELIX_FIRST), testInfo);
  const panel = page.getByRole('region', { name: 'Performance' });
  const inq = panel.getByRole('row', { name: /^INQ/ });
  await expect(inq.getByRole('cell').nth(1)).toHaveText(/^\d[\d,]*$/);
  await expect(panel.getByText(SOURCE)).toBeVisible();
  await expect(panel.getByText(/through /)).toBeVisible();
  if (!role.finance) {
    const revenue = await panel
      .getByRole('row', { name: /^Revenue/ })
      .innerText({ timeout: 5_000 });
    const description = `Revenue row without finance.view, with facts: ${revenue.replace(/\s+/g, ' ')}`;
    testInfo.annotations.push({ type: 'observed', description });
  }
};

/** Facts reach only the Measure plan, so a person without it still sees the reason, never 0.00. */
const revenueActual: FactCheck = async (page, role) => {
  await opened(page, '/reports/revenue?year=2026', h1(page, 'Revenue'), test.info());
  const actual = cardValue(page.locator('[aria-label="Summary"]'), 'Actual revenue');
  await (seesMeasure(role)
    ? expect(actual).toHaveText(AMOUNT)
    : expect(actual).not.toHaveText(/\d/));
};

const summaryHasData: FactCheck = async (page) => {
  await opened(page, '/reports/summary?year=2026', h1(page, 'Summary'), test.info());
  await expect(page.locator('[aria-label="Revenue figures"]')).toBeVisible();
  await expect(page.getByText('No performance data has arrived yet.')).toHaveCount(0);
};

const funnelActual: FactCheck = async (page) => {
  await opened(page, '/reports/funnel?year=2026', h1(page, 'Funnel stages'), test.info());
  const actual = cardValue(page.locator('[aria-label="Summary"]'), 'INQ actual');
  await expect(actual).toHaveText(/^\d[\d,]*$/);
};

const FACT_CHECKS: { title: string; roles: Role[]; run: FactCheck }[] = [
  {
    title: `Settings › Performance data lists ${SOURCE} with its last load (046 FR-005, US3-5)`,
    roles: SETTINGS_ROLES,
    run: sourceListed,
  },
  {
    title: 'Imports list the seeded load, Completed (046 FR-017)',
    roles: [ALEX],
    run: importListed,
  },
  {
    title: `${HELIX_FIRST}: INQ actual and the data-through date (046 FR-029, US3-5)`,
    roles: [ALEX, CARLOS, LEA],
    run: panelActuals,
  },
  {
    title: 'Revenue: actual revenue where facts are, the reason elsewhere (049 FR-009)',
    roles: REPORT_ROLES,
    run: revenueActual,
  },
  {
    title: 'Summary: no "No performance data" state (048 FR-018)',
    roles: [ALEX, CARLOS, LEA],
    run: summaryHasData,
  },
  {
    title: 'Funnel stages: the INQ actual card is a figure (049 FR-017)',
    roles: [ALEX],
    run: funnelActual,
  },
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
