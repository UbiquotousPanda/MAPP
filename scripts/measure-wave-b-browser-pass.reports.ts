import { expect, type Page, type TestInfo } from '@playwright/test';
import { expectNoAxeViolations } from '../frontend/e2e/fixtures';
import { tabTo } from '../frontend/e2e/keyboard';
import {
  ALL_PLANS,
  check,
  h1,
  keyboardOn,
  menuOpensAndCloses,
  NO_FINANCE,
  opened,
  pageHeader,
  settle,
  shoot,
  skipToMain,
  type Role,
} from './measure-wave-b-browser-pass.helpers';

// The three wave B reports in 039's frame: the frame's checks, each report's own, and the role's view of both.

type ReportKey = 'summary' | 'revenue' | 'funnel';

const REPORTS: Record<ReportKey, { title: string; widget: string; ranked: boolean }> = {
  summary: { title: 'Summary', widget: 'Revenue trend', ranked: false },
  revenue: { title: 'Revenue', widget: 'Revenue by month', ranked: true },
  funnel: { title: 'Funnel stages', widget: 'Volume by month', ranked: true },
};

/** The Measure demo's own records (its plan, team and, with facts, source) are data, not product wording. */
const DEMO_NAMES = /Measure demo/g;

const ranked = (page: Page) => page.getByRole('region', { name: 'Ranked list' });

async function scope(page: Page, role: Role) {
  await check(`plans in scope: ${role.plans.join(', ')} (039 FR-003)`, async () => {
    const plans = page.getByRole('group', { name: /^Plans/ });
    await expect(plans.getByRole('checkbox')).toHaveCount(role.plans.length);
    for (const plan of ALL_PLANS) {
      const shown = plans.getByRole('checkbox', { name: plan, exact: true });
      await expect(shown).toHaveCount(role.plans.includes(plan) ? 1 : 0);
    }
    await expect(page.getByText(/^In view: /)).toContainText(`In view: ${role.plans.length} plan`);
  });
}

async function finance(page: Page, role: Role, key: ReportKey) {
  const notice = page.getByText("You can't see the financial data of these plans");
  const exporter = pageHeader(page).getByRole('button', { name: 'Export', exact: true });
  await check(`financial notice ${role.finance ? 'absent' : 'shown'} (039 FR-004)`, () =>
    expect(notice).toHaveCount(role.finance ? 0 : 1),
  );
  await check(
    `Export ${role.exports ? 'offered' : 'not offered, the reason named'} (039 FR-022)`,
    async () => {
      if (role.exports) {
        await expect(exporter).toBeEnabled();
        return;
      }
      await expect(exporter).toBeDisabled();
      await expect(exporter).toHaveAttribute('aria-description', /^Exporting isn't part of/);
    },
  );
  // Funnel stages shows counts only; revenue itself is served in full (open question 4), so only cost and ROI hide.
  if (role.finance || key === 'funnel') {
    return;
  }
  await check('cost and ROI hidden, never 0.00 (039 FR-004, 048 FR-003)', async () => {
    if (key === 'revenue') {
      const cells = ranked(page)
        .locator('tbody tr')
        .locator('td:nth-of-type(6), td:nth-of-type(7)');
      const costAndRoi = await cells.allInnerTexts();
      expect(costAndRoi.length).toBeGreaterThan(0);
      expect(costAndRoi.filter((text) => text.trim() !== NO_FINANCE)).toEqual([]);
    }
    if (key === 'summary') {
      await expect(
        page.getByText('Cost and ROI leave out the plans whose financial data'),
      ).toBeVisible();
      for (const league of [/^Top Actual cost by/, /^Top ROI by/]) {
        const table = page.getByRole('region', { name: league });
        await expect(table).toContainText(/Covers 0 of \d+ plans/);
        const values = await table.locator('ol > li > span:last-child').allInnerTexts();
        expect(values.length).toBeGreaterThan(0);
        expect(values.filter((value) => value.trim() !== '—')).toEqual([]);
      }
    }
  });
}

async function content(page: Page, key: ReportKey) {
  if (key === 'summary') {
    await check(
      'Revenue figures, Conversions, four league tables, Details links (048 FR-005, FR-012, FR-016)',
      async () => {
        const figures = page.locator('[aria-label="Revenue figures"]');
        for (const label of [
          'Actual or projected',
          'Revenue goal',
          'Performance',
          'Goal coverage',
        ]) {
          await expect(figures.getByText(label).first()).toBeVisible();
        }
        await expect(page.locator('[aria-label="Conversions"]')).toBeVisible();
        await expect(page.getByRole('region', { name: /^Top / })).toHaveCount(4);
        for (const name of ['Revenue details', 'Funnel details']) {
          await expect(page.getByRole('link', { name })).toBeVisible();
        }
      },
    );
    return;
  }
  const cards = page.locator('[aria-label="Summary"]');
  if (key === 'revenue') {
    await check(
      'cards: goal, actual, actual or projected, performance; the ranked list (049-C9)',
      async () => {
        for (const label of [
          'Revenue goal',
          'Actual revenue',
          'Actual or projected',
          'Performance',
        ]) {
          await expect(cards.getByText(label).first()).toBeVisible();
        }
        await expect(ranked(page).getByRole('table')).toBeVisible();
      },
    );
  } else {
    await check('Funnel stage: INQ, MQL, opens on INQ; the ranked list (049 FR-015)', async () => {
      const stage = page.getByRole('combobox', { name: 'Funnel stage' });
      await expect(stage).toHaveValue('inq');
      await expect(stage.locator('option')).toHaveText(['INQ', 'MQL']);
      await expect(cards.getByText('INQ goal').first()).toBeVisible();
      await expect(ranked(page).getByRole('table')).toBeVisible();
    });
  }
  await check('the model and its last change beside projected figures (049 FR-022, SC-006)', () =>
    expect(page.getByText(/Projected from .+, last changed/)).toBeVisible({ timeout: 1_000 }),
  );
}

async function keyboard(page: Page, role: Role, key: ReportKey) {
  const header = pageHeader(page);
  await check(
    'keyboard: Saved views and Export open with Enter, Escape closes them and returns the focus (039 FR-033)',
    async () => {
      await skipToMain(page);
      await menuOpensAndCloses(page, header.getByRole('button', { name: /^(Saved views|View: )/ }));
      if (role.exports) {
        await menuOpensAndCloses(page, header.getByRole('button', { name: 'Export', exact: true }));
      }
    },
  );
  await check('keyboard: Tab reaches the filters’ Apply (039 FR-013, FR-033)', () =>
    tabTo(
      page,
      page.getByRole('complementary', { name: 'Filters' }).getByRole('button', { name: 'Apply' }),
    ),
  );
  const widget = REPORTS[key].widget;
  await check(
    `keyboard: Tab reaches Period, the selectors and ${widget}’s Table, which Enter shows (039 FR-020)`,
    async () => {
      await tabTo(
        page,
        page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Quarters' }),
      );
      if (key === 'funnel') {
        await tabTo(page, page.getByRole('combobox', { name: 'Funnel stage' }));
      }
      await tabTo(page, page.getByRole('combobox', { name: 'Activity category' }));
      const table = page
        .getByRole('group', { name: `Show ${widget} as` })
        .getByRole('button', { name: 'Table' });
      await tabTo(page, table);
      await page.keyboard.press('Enter');
      await expect(table).toHaveAttribute('aria-pressed', 'true');
    },
  );
  if (REPORTS[key].ranked) {
    await check('keyboard: Tab reaches the ranked list’s Group by (040 FR-013)', () =>
      tabTo(page, ranked(page).getByRole('combobox', { name: 'Group by' })),
    );
  }
}

/** Show Plan ranks the plans themselves, so the list must name exactly the plans in scope. */
async function rankedScope(page: Page, role: Role, key: ReportKey) {
  await check('Show Plan: the ranked list names only the plans in scope (049 FR-002)', async () => {
    await page.goto(`/reports/${key}?year=2026&show=plan`);
    await expect(ranked(page).getByRole('table')).toBeVisible();
    await settle(page);
    for (const plan of ALL_PLANS) {
      await (role.plans.includes(plan)
        ? expect(ranked(page)).toContainText(plan)
        : expect(ranked(page)).not.toContainText(plan));
    }
  });
}

export function reportScreen(key: ReportKey) {
  return async (page: Page, role: Role, testInfo: TestInfo) => {
    const report = REPORTS[key];
    await opened(page, `/reports/${key}?year=2026`, h1(page, report.title), testInfo);
    await shoot(page, testInfo, key, role);
    const header = pageHeader(page);
    await check('breadcrumb, title and the "Figures as of" line (039 FR-006)', async () => {
      await expect(header.getByRole('link', { name: 'Reports', exact: true })).toBeVisible();
      await expect(header.getByText(/^2026 · Figures as of .+/)).toBeVisible();
    });
    await check(
      'axe: no violations, the ranked list’s Open links included (039 SC-007, open question 13)',
      () => expectNoAxeViolations(page),
    );
    await scope(page, role);
    await finance(page, role, key);
    await check(
      'no "Measure", "Tactic" or "HUD" on screen beyond the demo’s names (039 FR-032)',
      async () => {
        const text = (await page.locator('main').innerText()).replaceAll(DEMO_NAMES, ' ');
        expect(text).not.toMatch(/\b(Measure|Tactics?|HUD)\b/);
      },
    );
    await content(page, key);
    if (keyboardOn(testInfo)) {
      await keyboard(page, role, key);
    }
    if (report.ranked) {
      await rankedScope(page, role, key);
    }
  };
}
