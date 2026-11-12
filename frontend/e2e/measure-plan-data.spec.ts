import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// Plan data and access (059 US4): Data completeness, the Activity level of the demo year inside the report frame
// (043), and People, everyone's last sign-in without the plan filters (045).

const PRIYA = 'priya.raman@shell.com';
const ALEX = 'alex.morgan@shell.com';

test('043 US1: activities spread over each Shell attribute, and what is not filled in (FR-001 – FR-017)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports');
  await page.getByRole('link', { name: 'Plan data and access' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Plan data and access' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Data completeness', selected: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'People' })).toHaveCount(0);
  await expect(page.getByText(/^In view: /)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Activity', exact: true, pressed: true }),
  ).toBeVisible();
  await expect(page.getByText('All filled in', { exact: true })).toBeVisible();
  const statuses = page.getByRole('list', { name: 'Activities by status' });
  await expect(statuses).toBeVisible();
  await expectNoAxeViolations(page);

  const status = page.getByRole('region', { name: 'Built-in fields' });
  await status.getByRole('button', { name: 'Table' }).first().click();
  await expect(page).toHaveURL(/table=activityTypeCount/);
  await expect(page.getByRole('table', { name: 'By activity type', exact: true })).toBeVisible();

  await statuses.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/all-work\?.*activityStatus=/);
});

test('045 US1: a sign-in shows on the People tab the administrator opens (FR-001 – FR-009, SC-002)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await signInAs(page, ALEX);
  await page.goto('/reports/plan-data');
  await page.getByRole('tab', { name: 'People' }).click();

  await expect(page).toHaveURL(/tab=people/);
  const table = page.getByRole('table', { name: 'People' });
  const priya = table.getByRole('row', { name: /Priya Raman/ });
  await expect(priya).toBeVisible();
  await expect(priya).not.toContainText('Never');
  await expect(page.getByRole('main').getByRole('combobox', { name: /Currency/ })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await page.getByRole('searchbox', { name: 'Search people' }).fill('priya');
  await expect(page).toHaveURL(/q=priya/);
  await expect(table.getByRole('row')).toHaveCount(2);

  await table.getByRole('link', { name: 'Priya Raman' }).click();
  await expect(page).toHaveURL(/\/settings\/people\/U-\d+$/);
});
