import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  callApi,
  escapeRegExp,
  expectNoAxeViolations,
  expectToast,
  signInAs,
  uniqueName,
} from './fixtures';
import { MEASURE_PLAN } from './measure';
import { idOf, type ListOf, type Named } from './planning';

const ALEX = 'alex.morgan@shell.com';

test('047 US1: a model carries its velocity and allowed goal stages, and the worked example shows the lag', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);

  await page.goto('/settings');
  await page.getByRole('link', { name: 'Models', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Models', level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Lubricants 1.0', exact: true }).click();
  const panel = page.getByRole('dialog').first();
  await expect(panel).toBeVisible();

  await expect(panel.getByText(/250,000 INQ → .* MQL → .* → \$[\d,.]+ revenue/)).toBeVisible();

  await panel.getByRole('button', { name: 'Edit' }).click();
  const form = page.getByRole('dialog', { name: /Edit model/ });
  await form.getByRole('textbox', { name: /^INQ→MQL velocity/ }).fill('1');
  await form.getByRole('textbox', { name: /^MQL→deal velocity/ }).fill('2');

  await expect(form.getByText(/MQL 1 month later/)).toBeVisible();
  await expect(form.getByText(/2 months later/)).toBeVisible();

  await form.getByRole('checkbox', { name: 'Revenue' }).uncheck();
  await form.getByRole('button', { name: 'Save', exact: true }).click();

  const confirm = page.getByRole('alertdialog', { name: /Save changes to model/ });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('set their goal at a stage this model would no longer allow');
  await confirm.getByRole('button', { name: 'Save changes' }).click();
  // The warning is the whole effect: the stranded goal itself stands, which the service's own tests pin.
  await expectToast(page, "Model 'Lubricants 1.0' saved");
});

// Tellus webinar series: 1,500 INQ phased day-exactly over 1 April to 15 December (259 days), floor of the running total.
const TELLUS_WEBINARS = 'Tellus webinar series';
const TELLUS_INQ_BY_MONTH = [0, 0, 0, 173, 180, 174, 179, 180, 173, 180, 174, 87];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthInProgress(today: Date): number {
  const year = today.getUTCFullYear();
  return year < 2026 ? -1 : year > 2026 ? 12 : today.getUTCMonth();
}

test('047 US2: an approved activity shows its projected figures, split at today, and the model behind them', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  const planId = await idOf(page, '/api/v1/plans', MEASURE_PLAN);
  const activityId = await idOf(page, `/api/v1/plans/${planId}/activities`, TELLUS_WEBINARS);
  const at = monthInProgress(new Date());
  const planYearINQ = TELLUS_INQ_BY_MONTH.slice(Math.max(at, 0)).reduce((sum, n) => sum + n, 0);

  await page.goto(`/plans/${planId}/activities/${activityId}?tab=details`);
  const performance = page.getByRole('region', { name: 'Performance' });
  const inq = performance.getByRole('row', { name: /^INQ/ });
  const cells = inq.getByRole('cell');
  await expect(cells.nth(0)).toHaveText('1,500');
  await expect(cells.nth(1)).not.toHaveText(/\d/);
  await expect(cells.nth(2)).toHaveText(planYearINQ.toLocaleString('en-US'));
  await expect(
    performance.getByText(/^Projected from Lubricants 1\.0, last changed [^T:]+ \d{4}\.$/),
  ).toBeVisible();

  await performance.getByText('Months behind the projection').click();
  const months = performance.getByRole('table', { name: 'Months behind the projection' });
  for (const [i, inqOfMonth] of TELLUS_INQ_BY_MONTH.entries()) {
    const label = `${MONTHS[i] ?? ''} 2026`;
    const projected = i >= at ? inqOfMonth.toLocaleString('en-US') : '—';
    const name = i === at ? `${label} · this month — ${projected}` : `${label} — ${projected}`;
    await expect(
      months.getByRole('row', { name: new RegExp(`^${escapeRegExp(name)}`) }),
    ).toBeVisible();
  }
  await expect(months.getByText(/this month/)).toHaveCount(at >= 0 && at < 12 ? 1 : 0);
  await expectNoAxeViolations(page);
});

// The Measure demo seeds three categories (047 T062): Digital is the default, Sponsorship sits in Events and sponsorship.
const SEEDED_DEFAULT = 'Digital';
const SEEDED_HOLDER = 'Events and sponsorship';
const MOVED_TYPE = 'Sponsorship';

interface Category extends Named {
  isDefault: boolean;
  version: number;
  activityTypes: Named[];
}

function rowOf(page: Page, name: string): Locator {
  return page.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) });
}

test('047 US3: categories group activity types — a moved type, one default, delete and Undo', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  const name = uniqueName('Promotion');

  await page.goto('/settings');
  await page.getByRole('link', { name: 'Activity categories', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Activity categories', level: 1 })).toBeVisible();
  await expect(rowOf(page, SEEDED_HOLDER)).toContainText('2 activity types');
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'New category' }).first().click();
  const form = page.getByRole('dialog', { name: 'New activity category' });
  await form.getByRole('textbox', { name: /^Name/ }).fill(name);
  await form.getByRole('checkbox', { name: 'Default category' }).check();
  const types = form.getByRole('group', { name: /^Activity types/ });
  await types.getByRole('checkbox', { name: MOVED_TYPE, exact: true }).check();
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Activity category '${name}' created`);

  await expect(rowOf(page, name)).toContainText('1 activity type');
  await expect(rowOf(page, name)).toContainText('Default');
  await expect(rowOf(page, SEEDED_HOLDER)).toContainText('1 activity type');
  await expect(rowOf(page, SEEDED_DEFAULT)).not.toContainText('Default');

  await page.getByRole('button', { name: 'New category' }).first().click();
  const again = page.getByRole('dialog', { name: 'New activity category' });
  await again.getByRole('textbox', { name: /^Name/ }).fill(name.toLowerCase());
  await again.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    again.getByText(`An activity category called '${name}' already exists.`).first(),
  ).toBeVisible();
  await again.getByRole('button', { name: 'Cancel' }).click();
  await page
    .getByRole('alertdialog', { name: 'Discard changes?' })
    .getByRole('button', { name: 'Discard changes' })
    .click();

  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: `Delete activity category '${name}'?` });
  await expect(confirm).toContainText('Its activity types become Uncategorised.');
  await confirm.getByRole('button', { name: 'Delete activity category' }).click();
  await expectToast(page, `Activity category '${name}' deleted`);
  await expect(rowOf(page, name)).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expectToast(page, `Activity category '${name}' restored`);
  await expect(rowOf(page, name)).toContainText('1 activity type');
  await expect(rowOf(page, name)).toContainText('Default');
  await expectNoAxeViolations(page);

  await page.goto('/settings/activity-types');
  await expect(rowOf(page, MOVED_TYPE)).toContainText(name);

  await restoreSeededCategories(page, name);
});

/** Puts the demo's categories back as seeded, so the reports' journeys that follow see them unchanged. */
async function restoreSeededCategories(page: Page, created: string): Promise<void> {
  const url = '/api/v1/settings/activity-categories';
  const { items } = await callApi<ListOf<Category>>(page, 'GET', url);
  const find = (name: string) => items.find((c) => c.name === name);
  const holder = find(SEEDED_HOLDER);
  const mine = find(created);
  const digital = find(SEEDED_DEFAULT);
  const moved = mine?.activityTypes.find((t) => t.name === MOVED_TYPE);
  if (!holder || !mine || !digital || !moved) {
    throw new Error(
      `The categories to put back are missing: ${items.map((c) => c.name).join(', ')}`,
    );
  }
  await callApi(page, 'PATCH', `${url}/${holder.id}`, {
    activityTypeIds: [...holder.activityTypes.map((t) => t.id), moved.id],
    version: holder.version,
  });
  await callApi(page, 'DELETE', `${url}/${mine.id}`);
  await callApi(page, 'PATCH', `${url}/${digital.id}`, {
    isDefault: true,
    version: digital.version,
  });
}
