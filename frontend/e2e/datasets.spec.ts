import { fileURLToPath } from 'node:url';
import type { Locator, Page } from '@playwright/test';
import { choose, expectNoAxeViolations, expectToast, signInAs, uniqueName } from './fixtures';
import { expect, test } from './support/no-csp-violations';

// Uploaded datasets against the real API: Priya uploads the agency's event leads, corrects a column, charts
// the dataset beside SP&A One data and deletes it with Undo.

const PRIYA = 'priya.raman@shell.com';
const XLSX = fileURLToPath(new URL('./fixtures/event-leads.xlsx', import.meta.url));
// The fixture's Leads column adds up to 1,355 (backend/seed/datasets.go, EventLeads).
const LEADS_TOTAL = '1,355';

function panel(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Upload data' });
}

async function checkFile(page: Page, file: string) {
  await panel(page).getByLabel('Choose a file').setInputFiles(file);
  await panel(page).getByRole('button', { name: 'Check the file' }).click();
}

function column(page: Page, position: number): Locator {
  return panel(page).getByRole('group', { name: `Column ${position}` });
}

test('051 US3: Priya uploads event leads, corrects a column and charts them (FR-040 – FR-045)', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/dashboards');
  await page.getByRole('link', { name: 'Datasets', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Datasets' })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Upload data' }).first().click();
  await checkFile(page, XLSX);
  await expect(panel(page)).toContainText('Step 2 of 2: Check the columns');
  await expect(panel(page).getByText(/^event-leads\.xlsx · Sheet '.+' · 12 rows$/)).toBeVisible();
  await expect(column(page, 1).getByLabel(/^Name/)).toHaveValue('Event');
  await expect(column(page, 3).getByLabel(/^Type/)).toHaveText('Number');
  await expect(panel(page).getByRole('region', { name: 'First rows' })).toContainText(
    'Lubricants Expo Hamburg',
  );

  const name = uniqueName('Event leads');
  await panel(page)
    .getByLabel(/^Dataset name/)
    .fill(name);
  await column(page, 4).getByLabel(/^Name/).fill('Agency cost');
  await choose(page, column(page, 4).getByLabel(/^Type/), 'Money');
  await choose(page, column(page, 4).getByLabel(/^Currency/), /^EUR/);
  await expectNoAxeViolations(page);
  await panel(page).getByRole('button', { name: 'Save dataset' }).click();

  await expectToast(page, `Dataset '${name}' saved`);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page).toHaveURL(/\/datasets\/DS-\d+$/);
  const datasetPath = new URL(page.url()).pathname;
  const columns = page.getByRole('region', { name: 'Columns' });
  await expect(columns.getByRole('row', { name: /Agency cost Money EUR/ })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/builder');
  await page.getByRole('button', { name: 'Add key figure' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await choose(page, inspector.getByLabel(/^Source/), name);
  await inspector.getByRole('button', { name: 'Add measure' }).click();
  await choose(page, inspector.getByLabel('What to measure'), 'Leads');
  await choose(page, inspector.getByLabel('Aggregation'), 'Sum');
  const keyFigure = page.getByRole('group', { name: /^Widget: Key figure,/ });
  await expect(keyFigure.getByText(LEADS_TOTAL, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard details' }).click();
  const dashboard = uniqueName('Leads check');
  await inspector.getByLabel(/^Name/).fill(dashboard);
  await page.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Dashboard saved');

  await page.goto(datasetPath);
  await expect(page.getByRole('link', { name: dashboard })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: `Delete dataset '${name}'?` });
  await expect(confirm).toContainText(
    "1 of your dashboards uses it; their widgets will show 'This data is no longer available'.",
  );
  await confirm.getByRole('button', { name: 'Delete dataset' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Datasets' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expectToast(page, new RegExp(`${name}.* restored`));
  await expect(page.getByRole('link', { name })).toBeVisible();
});
