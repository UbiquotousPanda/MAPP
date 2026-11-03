import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from '../frontend/e2e/fixtures';
import { tabTo } from '../frontend/e2e/keyboard';
import { activityNamed } from '../frontend/e2e/performance';
import {
  ALEX,
  check,
  dialogOpensAndCloses,
  GATE,
  GONE,
  h1,
  keyboardOn,
  MEI,
  opened,
  pageHeader,
  PRIYA,
  REPORT_ROLES,
  SARA,
  seesMeasure,
  SETTINGS_ROLES,
  shoot,
  skipToMain,
  TELLUS_WEBINARS,
  themeOf,
  viewOnlyNote,
  ZERO_FIGURE,
  type Role,
} from './measure-wave-b-browser-pass.helpers';
import { reportScreen } from './measure-wave-b-browser-pass.reports';
import { factTests } from './measure-wave-b-browser-pass.facts';

// Lane D's wave B browser pass (#47): every screen of docs/sdd/measure-wave-b-qa.md's checklist for each person of
// its Roles table, in the config's light and dark projects. One test per screen and person; its steps are the checks.

type Screen = (page: Page, role: Role, testInfo: TestInfo) => Promise<void>;

const axe = (page: Page) =>
  check('axe: no violations (constitution X)', () => expectNoAxeViolations(page));

/** A Settings page's change action only with the right, else the one View only note. */
async function changeOffered(page: Page, role: Role, name: string, rule: string) {
  const action = pageHeader(page).getByRole('button', { name, exact: true });
  const title = role.admin ? `${name} offered (${rule})` : `View only, no ${name} (${rule})`;
  await check(title, async () => {
    await expect(action).toHaveCount(role.admin ? 1 : 0);
    await expect(viewOnlyNote(page)).toHaveCount(role.admin ? 0 : 1);
  });
  return action;
}

const performanceData: Screen = async (page, role, testInfo) => {
  await opened(page, '/settings/performance-data', h1(page, 'Performance data'), testInfo);
  await shoot(page, testInfo, 'performance-data', role);
  await axe(page);
  const header = pageHeader(page);
  await check(
    `Imports and Rows to review ${role.admin ? '' : 'not '}offered (046 FR-043)`,
    async () => {
      for (const name of ['Imports', 'Rows to review']) {
        await expect(header.getByRole('link', { name, exact: true })).toHaveCount(
          role.admin ? 1 : 0,
        );
      }
    },
  );
  const create = await changeOffered(page, role, 'New data source', '046 FR-043');
  await check('the sources, or that there are none yet (046 FR-001)', () =>
    expect(page.getByRole('table').or(page.getByText('No data sources yet'))).toBeVisible(),
  );
  if (role.admin && keyboardOn(testInfo)) {
    await check(
      'keyboard: New data source opens with Enter, Escape closes it (039 FR-033)',
      async () => {
        await skipToMain(page);
        await dialogOpensAndCloses(
          page,
          create,
          page.getByRole('dialog', { name: 'New data source' }),
        );
      },
    );
  }
};

/** Imports and Rows to review need performance.import: the others get No access at the address. */
function importer(url: string, screen: string, title: string, body: Screen): Screen {
  return async (page, role, testInfo) => {
    if (role.admin) {
      return body(page, role, testInfo);
    }
    await opened(page, url, h1(page, 'No access'), testInfo);
    await shoot(page, testInfo, screen, role);
    await axe(page);
    await check(`${title} needs performance.import: No access, Go to Home (046 FR-043)`, () =>
      expect(page.getByRole('link', { name: 'Go to Home' })).toBeVisible(),
    );
  };
}

const IMPORTS = '/settings/performance-data/imports';
const REVIEW = '/settings/performance-data/review';

const imports = importer(
  IMPORTS,
  'performance-imports',
  'Imports',
  async (page, role, testInfo) => {
    await opened(page, IMPORTS, h1(page, 'Imports'), testInfo);
    await shoot(page, testInfo, 'performance-imports', role);
    await axe(page);
    const upload = pageHeader(page).getByRole('button', { name: 'Upload a file' });
    await check('Upload a file and Pull simulated feed offered (046 FR-010)', async () => {
      await expect(upload).toBeVisible();
      await expect(
        pageHeader(page).getByRole('button', { name: 'Pull simulated feed' }),
      ).toBeVisible();
    });
    await check('the imports, or that there are none yet', () =>
      expect(page.getByRole('table').or(page.getByText('No imports yet'))).toBeVisible(),
    );
    if (keyboardOn(testInfo)) {
      await check(
        'keyboard: Upload a file opens with Enter, Escape closes it; Tab reaches the search',
        async () => {
          await skipToMain(page);
          await dialogOpensAndCloses(
            page,
            upload,
            page.getByRole('dialog', { name: 'Upload a file' }),
          );
          await tabTo(page, page.getByRole('search', { name: 'Filters' }).getByRole('searchbox'));
        },
      );
    }
  },
);

const review = importer(
  REVIEW,
  'performance-review',
  'Rows to review',
  async (page, role, testInfo) => {
    await opened(page, REVIEW, h1(page, 'Rows to review'), testInfo);
    await shoot(page, testInfo, 'performance-review', role);
    await axe(page);
    await check('the rows to review, or Nothing to review (046 FR-023)', () =>
      expect(page.getByRole('table').or(page.getByText('Nothing to review'))).toBeVisible(),
    );
    if (keyboardOn(testInfo)) {
      await check('keyboard: Tab reaches the search of the queue (046 FR-023)', async () => {
        await skipToMain(page);
        await tabTo(page, page.getByRole('search', { name: 'Filters' }).getByRole('searchbox'));
      });
    }
  },
);

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

/** Models and Activity categories: the list for everyone, its changes with settings.manage (047 FR-023). */
function settingsList(url: string, title: string, create: string, rows: string[]): Screen {
  return async (page, role, testInfo) => {
    await opened(page, url, h1(page, title), testInfo);
    await shoot(page, testInfo, url.split('/').at(-1) ?? title, role);
    await axe(page);
    await changeOffered(page, role, create, '047 FR-023');
    const named = (name: string) => page.getByRole('button', { name, exact: true });
    await check(`listed: ${rows.join(', ')}`, async () => {
      for (const name of rows) {
        await expect(named(name)).toBeVisible();
      }
    });
    if (keyboardOn(testInfo)) {
      await check(
        'keyboard: a row’s details open with Enter, Escape closes them and returns the focus',
        async () => {
          await skipToMain(page);
          await dialogOpensAndCloses(page, named(rows[0] ?? ''), page.getByRole('dialog'));
        },
      );
    }
  };
}

const models = settingsList('/settings/models', 'Models', 'New model', [
  'Lubricants 1.0',
  'Mobility 1.0',
]);
const categories = settingsList(
  '/settings/activity-categories',
  'Activity categories',
  'New category',
  ['Digital', 'Events and sponsorship', 'Content and creative'],
);

const attribution: Screen = async (page, role, testInfo) => {
  await opened(page, '/settings/attribution', h1(page, 'Attribution'), testInfo);
  await shoot(page, testInfo, 'attribution', role);
  await axe(page);
  const radios = page.getByRole('group', { name: 'Designated model' }).getByRole('radio');
  const equal = page.getByRole('radio', { name: /^Equally distributed/ });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  const lock = page.locator('main').getByRole('note');
  await check('five models, Equally distributed designated (050 FR-001)', async () => {
    await expect(radios).toHaveCount(5);
    await expect(equal).toBeChecked();
  });
  await check(
    role.admin
      ? 'Save offered, nothing locked (050 FR-002)'
      : 'no Save, every model locked, the reason stated (050 FR-002)',
    async () => {
      await expect(save).toHaveCount(role.admin ? 1 : 0);
      await expect(lock).toHaveCount(role.admin ? 0 : 1);
      for (const radio of await radios.all()) {
        await (role.admin ? expect(radio).toBeEnabled() : expect(radio).toBeDisabled());
      }
      if (!role.admin) {
        await expect(lock).toHaveText(/isn't part of your role|needs Manage settings/);
      }
    },
  );
  if (role.admin && keyboardOn(testInfo)) {
    await check(
      'keyboard: Tab reaches the designated model, an arrow chooses another, Tab reaches Save',
      async () => {
        await skipToMain(page);
        await tabTo(page, equal);
        await page.keyboard.press('ArrowDown');
        await expect(equal).not.toBeChecked();
        await tabTo(page, save);
        await expect(save).toBeEnabled();
      },
    );
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
