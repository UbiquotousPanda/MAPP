import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// Plan details (043 US1): the Activity level of the demo year inside the report frame, its widgets with their tables,
// and a value that opens All work filtered by it.

const PRIYA = 'priya.raman@shell.com';

test('043 US1: activities spread over each Shell attribute, and what is not filled in (FR-001 – FR-017)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/reports');
  await page.getByRole('link', { name: 'Plan details' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Plan details' })).toBeVisible();
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
