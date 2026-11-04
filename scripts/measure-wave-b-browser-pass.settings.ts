import { expect, type Page } from '@playwright/test';
import { tabTo } from '../frontend/e2e/keyboard';
import {
  axe,
  check,
  dialogOpensAndCloses,
  h1,
  keyboardOn,
  opened,
  pageHeader,
  shoot,
  skipToMain,
  viewOnlyNote,
  type Role,
  type Screen,
} from './measure-wave-b-browser-pass.helpers';

// The Settings screens of the wave B browser pass: Performance data with its imports and review queue, Models,
// Activity categories and Attribution. The spec declares their tests.

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

export const performanceData: Screen = async (page, role, testInfo) => {
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

export const imports = importer(
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

export const review = importer(
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

/** Models and Activity categories: the list for everyone, its changes with settings.manage. */
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

export const models = settingsList('/settings/models', 'Models', 'New model', [
  'Lubricants 1.0',
  'Mobility 1.0',
]);
export const categories = settingsList(
  '/settings/activity-categories',
  'Activity categories',
  'New category',
  ['Digital', 'Events and sponsorship', 'Content and creative'],
);

export const attribution: Screen = async (page, role, testInfo) => {
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
