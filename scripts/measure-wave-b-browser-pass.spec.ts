import { expect, test } from '@playwright/test';
import { signInAs } from '../frontend/e2e/fixtures';
import { tabTo } from '../frontend/e2e/keyboard';
import { activityNamed } from '../frontend/e2e/performance';
import {
  ALEX,
  axe,
  check,
  dialogOpensAndCloses,
  GATE,
  GONE,
  h1,
  keyboardOn,
  MEI,
  opened,
  PRIYA,
  REPORT_ROLES,
  SARA,
  seesMeasure,
  SETTINGS_ROLES,
  shoot,
  skipToMain,
  TELLUS_WEBINARS,
  themeOf,
  ZERO_FIGURE,
  type Role,
  type Screen,
} from './measure-wave-b-browser-pass.helpers';
import { reportScreen } from './measure-wave-b-browser-pass.reports';
import { factTests } from './measure-wave-b-browser-pass.facts';
import {
  attribution,
  categories,
  imports,
  models,
  performanceData,
  review,
} from './measure-wave-b-browser-pass.settings';

// Lane D's wave B browser pass (#47): every screen of docs/sdd/measure-wave-b-qa.md's checklist for each person of
// its Roles table, in the config's light and dark projects. One test per screen and person; its steps are the checks.

const activityPerformance: Screen = async (page, role, testInfo) => {
  const id = await activityNamed(page, role.activity);
  await opened(page, `/activities/${id}?tab=details`, h1(page, role.activity), testInfo);
  await shoot(page, testInfo, 'activity-performance', role);
  await axe(page);
  const panel = page.getByRole('region', { name: 'Performance' });
  if (role === MEI) {
    await check('Submitted: the gate, no figures (046 FR-027, FR-028)', async () => {
      await expect(panel.getByText(GATE)).toBeVisible();
      await expect(panel.getByRole('table')).toHaveCount(0);
    });
    return;
  }
  await check('the INQ goal beside its actual and projected (046 FR-029)', () =>
    expect(panel.getByRole('row', { name: /^INQ/ }).getByRole('cell').first()).toHaveText(
      /^\d[\d,]*$/,
    ),
  );
  if (seesMeasure(role)) {
    // signInAs sets the date format DD MMM YYYY, so the last change reads "03 Nov 2026".
    const stamp = /^Projected from .+, last changed \d{2} [A-Z][a-z]{2} \d{4}\.$/;
    await check('the projection names its model and the date of its last change (047 FR-012)', () =>
      expect(panel.getByText(stamp)).toBeVisible(),
    );
  }
  await check('a missing actual states its reason, never 0 (047 FR-013)', async () => {
    const actuals = await panel
      .getByRole('table')
      .first()
      .locator('tbody td:nth-of-type(2)')
      .allInnerTexts();
    expect(actuals.length).toBeGreaterThan(0);
    expect(actuals.filter((text) => ZERO_FIGURE.test(text.trim()))).toEqual([]);
  });
  const sources = page.getByRole('region', { name: 'Data sources' });
  const register = sources.getByRole('button', { name: 'Register integration ID' });
  await check(`integration IDs ${role.admin ? '' : 'not '}offered (046 FR-043)`, () =>
    expect(register).toHaveCount(role.admin ? 1 : 0),
  );
  if (!role.finance) {
    const revenue = await panel
      .getByRole('row', { name: /^Revenue/ })
      .innerText({ timeout: 5_000 });
    const description = `Revenue row without finance.view (open question 4): ${revenue.replace(/\s+/g, ' ')}`;
    testInfo.annotations.push({ type: 'observed', description });
  }
  if (keyboardOn(testInfo)) {
    await check(
      'keyboard: the months open with Enter; a key dialog opens and Escape closes it',
      async () => {
        await skipToMain(page);
        const months = panel.getByText('Months behind the projection', { exact: true });
        if ((await months.count()) > 0) {
          await tabTo(page, months);
          await page.keyboard.press('Enter');
          await expect(
            panel.getByRole('table', { name: 'Months behind the projection' }),
          ).toBeVisible();
        }
        if (role.admin) {
          const dialog = page.getByRole('dialog', { name: 'Register integration ID' });
          await dialogOpensAndCloses(page, register, dialog);
        }
      },
    );
  }
};

const outsideScope: Screen = async (page, role, testInfo) => {
  await signInAs(page, ALEX.email);
  const id = await activityNamed(page, TELLUS_WEBINARS);
  await signInAs(page, role.email);
  await opened(page, `/activities/${id}?tab=details`, page.getByText(GONE), testInfo);
  await shoot(page, testInfo, 'activity-outside-scope', role);
  await axe(page);
  await check(
    'another team’s activity by address: not found, not No access (046 FR-044)',
    async () => {
      await expect(h1(page, 'No access')).toHaveCount(0);
      await expect(page.getByText(TELLUS_WEBINARS)).toHaveCount(0);
    },
  );
  if (keyboardOn(testInfo)) {
    await check('keyboard: Tab reaches Go to Plans', async () => {
      await skipToMain(page);
      await tabTo(page, page.getByRole('link', { name: 'Go to Plans' }));
    });
  }
};

const SCREENS: { title: string; roles: Role[]; run: Screen }[] = [
  { title: 'Settings › Performance data', roles: SETTINGS_ROLES, run: performanceData },
  { title: 'Settings › Performance data › Imports', roles: SETTINGS_ROLES, run: imports },
  { title: 'Settings › Performance data › Rows to review', roles: SETTINGS_ROLES, run: review },
  { title: 'Activity › Performance', roles: REPORT_ROLES, run: activityPerformance },
  { title: 'Activity › Performance of another team', roles: [PRIYA, MEI, SARA], run: outsideScope },
  { title: 'Settings › Models', roles: SETTINGS_ROLES, run: models },
  { title: 'Settings › Activity categories', roles: SETTINGS_ROLES, run: categories },
  { title: 'Settings › Attribution', roles: SETTINGS_ROLES, run: attribution },
  { title: 'Reports › Summary', roles: REPORT_ROLES, run: reportScreen('summary') },
  { title: 'Reports › Revenue', roles: REPORT_ROLES, run: reportScreen('revenue') },
  { title: 'Reports › Funnel stages', roles: REPORT_ROLES, run: reportScreen('funnel') },
];

for (const screen of SCREENS) {
  for (const role of screen.roles) {
    test(`${screen.title} · ${role.key}`, async ({ page }, testInfo) => {
      test.info().annotations.push({ type: 'theme', description: themeOf(testInfo) });
      await signInAs(page, role.email);
      await screen.run(page, role, testInfo);
    });
  }
}

factTests();
