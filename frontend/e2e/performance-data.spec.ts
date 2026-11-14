import { expect, test } from '@playwright/test';
import {
  callApi,
  choose,
  escapeRegExp,
  expectNoAxeViolations,
  expectToast,
  signInAs,
  uniqueName,
} from './fixtures';
import {
  activityNamed,
  ALEX,
  countsOf,
  DANIEL,
  ensureFeed,
  FEED,
  uploadThroughScreen,
} from './performance';

const HELIX_FIRST = 'Helix search and social, first half';
const HELIX_SECOND = 'Helix search and social, second half';
const FLEET_EXPO = 'Fleet expo Rotterdam';
const DEALER_SUMMIT = 'Dealer summit';
const GATE = 'Approve the activity to see performance data.';

test('046 US1: a new data source is listed as Stale, and its template carries exactly its mapped columns', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await page.goto('/settings');
  await page.getByRole('link', { name: /^Performance data/ }).click();
  await expect(page.getByRole('heading', { name: 'Performance data', level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  const name = uniqueName('Web analytics');
  await page.getByRole('button', { name: 'New data source' }).click();
  const form = page.getByRole('dialog', { name: 'New data source' });
  await form.getByRole('textbox', { name: /^Name/ }).fill(name);
  const owner = form.getByRole('combobox', { name: /^Owner/ });
  await owner.click();
  await owner.fill('Alex');
  await page
    .getByRole('option', { name: /^Alex Morgan/ })
    .first()
    .click();
  await choose(page, form.getByRole('combobox', { name: /^Category/ }), /^Web analytics/);
  await expectNoAxeViolations(page);
  await form.getByRole('button', { name: 'Save', exact: true }).click();

  await expectToast(page, `Data source '${name}' created`);
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row.getByText('Stale')).toBeVisible();
  await expect(row.getByRole('cell', { name: 'Never' })).toBeVisible();

  const sources = await callApi<{ items: { id: string; name: string }[] }>(
    page,
    'GET',
    '/api/v1/performance/sources',
  );
  const id = sources.items.find((s) => s.name === name)?.id ?? '';
  for (const mapping of [
    { columnName: 'Ref', meaning: 'reference' },
    { columnName: 'Day', meaning: 'factDate' },
    { columnName: 'Sessions', meaning: 'webMetric', webMetric: 'sessions' },
  ]) {
    await callApi(page, 'POST', `/api/v1/performance/sources/${id}/mappings`, mapping);
  }
  const template = await page.request.get(`/api/v1/performance/sources/${id}/template`);
  expect(template.ok()).toBe(true);
  const header = (await template.text()).split(/\r?\n/)[0]?.replace(/^\uFEFF/, '') ?? '';
  expect(header.split(',').sort()).toEqual(['Day', 'Ref', 'Sessions']);
});

test('046 US2: an upload reconciles its five counts, sends its faults to review, and undo states them first', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await ensureFeed(page);
  const helix = await activityNamed(page, HELIX_FIRST);
  const created = await activityNamed(page, DEALER_SUMMIT);

  await uploadThroughScreen(page, 'us2-five-outcomes.csv', [
    { ref: 'us2-matched', activity: helix, inq: 40 },
    { ref: 'us2-held', activity: created, inq: 10 },
    { ref: 'us2-unattributed', inq: 7 },
    { ref: 'us2-rejected', date: '2099-01-01', activity: helix, inq: 5 },
    { ref: 'us2-unmatched', activity: 'A-99999', inq: 3 },
  ]);
  expect(await countsOf(page, 'All rows')).toEqual(['5', '1', '1', '1', '1', '1']);
  await expect(page.getByText('Completed').first()).toBeVisible();
  await expectNoAxeViolations(page);

  const summary = page.url();
  await page.getByRole('link', { name: 'Rows to review from this import' }).click();
  await expect(page.getByRole('heading', { name: 'Rows to review', level: 1 })).toBeVisible();
  await expect(page.getByText(/^2 rows from import/)).toBeVisible();
  await page.getByRole('button', { name: 'No activity has this key' }).click();
  const row = page.getByRole('dialog', { name: 'No activity has this key' });
  await expect(row.getByRole('cell', { name: 'A-99999' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press('Escape');
  await expect(row).toBeHidden();
  await page.goto(summary);

  await page.getByRole('button', { name: 'Undo import' }).click();
  const confirm = page.getByRole('alertdialog', { name: "Undo import 'us2-five-outcomes.csv'?" });
  await expect(confirm).toContainText(
    'It read 5 rows: 1 matched, 1 held, 1 unattributed, 1 rejected and 1 unmatched.',
  );
  await expectNoAxeViolations(page);
  await confirm.getByRole('button', { name: 'Undo import' }).click();
  await expectToast(page, "Import 'us2-five-outcomes.csv' undone");
  await expect(page.getByText(/^Undone by Alex Morgan/)).toBeVisible();

  await page.getByRole('link', { name: 'Imports', exact: true }).click();
  const listed = page.getByRole('row').filter({ hasText: 'us2-five-outcomes.csv' });
  await expect(listed.getByText('Undone')).toBeVisible();
});

test('046 US3: a Submitted activity shows the gate, and approval releases its held facts', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await ensureFeed(page);
  const fleet = await activityNamed(page, FLEET_EXPO);
  await uploadThroughScreen(page, 'us3-fleet-expo.csv', [
    { ref: 'us3-fleet', activity: fleet, inq: 100 },
  ]);
  expect(await countsOf(page, 'All rows')).toEqual(['1', '0', '1', '0', '0', '0']);

  await page.goto(`/activities/${fleet}?tab=details`);
  const performance = page.getByRole('region', { name: 'Performance' });
  await expect(performance.getByText(GATE)).toBeVisible();
  await expect(performance.getByRole('table')).toHaveCount(0);
  await expectNoAxeViolations(page);

  await signInAs(page, DANIEL);
  await page.goto(`/activities/${fleet}`);
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await page
    .getByRole('alertdialog', { name: `Approve '${FLEET_EXPO}'?` })
    .getByRole('button', { name: 'Approve', exact: true })
    .click();
  await expectToast(page, `Activity '${FLEET_EXPO}' approved`);

  await signInAs(page, ALEX);
  await page.goto(`/activities/${fleet}?tab=details`);
  await expect(performance.getByText(GATE)).toHaveCount(0);
  const inq = performance
    .getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: 'INQ' }) });
  await expect(inq.getByRole('cell').nth(1)).toHaveText('100');
  await expectNoAxeViolations(page);
});

test('046 US4: an integration ID and the external name both match, a second ID is refused, removal says its effect', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);
  await ensureFeed(page);
  const helix = await activityNamed(page, HELIX_SECOND);
  const externalName = uniqueName('Helix H2 Benelux');

  await page.goto(`/activities/${helix}`);
  await page
    .getByRole('link', { name: 'Edit', exact: true })
    .or(page.getByRole('button', { name: 'Edit', exact: true }))
    .first()
    .click();
  await page.getByRole('textbox', { name: /^External name/ }).fill(externalName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: HELIX_SECOND, level: 1 })).toBeVisible();

  await page.goto(`/activities/${helix}?tab=details`);
  const area = page.getByRole('region', { name: 'Data sources' });
  await expect(area.getByText(externalName)).toBeVisible();
  for (const attempt of ['e2e-helix-h2', 'e2e-helix-h2-again']) {
    await area.getByRole('button', { name: 'Register integration ID' }).click();
    const dialog = page.getByRole('dialog', { name: 'Register integration ID' });
    await choose(
      page,
      dialog.getByRole('combobox', { name: /^Data source/ }),
      new RegExp(`^${escapeRegExp(FEED)}`),
    );
    await dialog.getByRole('textbox', { name: /^Integration ID/ }).fill(attempt);
    await dialog.getByRole('button', { name: 'Register' }).click();
    if (attempt === 'e2e-helix-h2') {
      await expectToast(page, 'Integration ID registered');
    } else {
      await expect(dialog.getByText(/already/i)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  }

  await uploadThroughScreen(page, 'us4-keys.csv', [
    { ref: 'us4-by-id', feedId: 'e2e-helix-h2', inq: 20 },
    { ref: 'us4-by-name', externalName, inq: 30 },
  ]);
  expect(await countsOf(page, 'All rows')).toEqual(['2', '2', '0', '0', '0', '0']);

  await page.goto(`/activities/${helix}?tab=details`);
  const feedRow = area.getByRole('row').filter({ hasText: FEED });
  await expect(feedRow.getByRole('cell').nth(2)).toHaveText('2');
  await expectNoAxeViolations(page);
  await feedRow.getByRole('button', { name: 'Remove ID' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Remove this integration ID?' });
  await expect(confirm).toContainText('will stop matching this activity');
  await confirm.getByRole('button', { name: 'Remove ID' }).click();
  await expectToast(page, /Integration ID removed/);
});
