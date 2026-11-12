import { readFile } from 'node:fs/promises';
import { expect, test } from './support/no-csp-violations';
import { expectNoAxeViolations, signInAs } from './fixtures';

// The 5,000-row workbook written by platform/apibench TestWorkbookFixture.

const PRIYA = 'priya.raman@shell.com';
const PLAN = 'P-1001';
const FILE = 'workbook-5000.xlsx';

// Importing it and Undo are workbook.spec.ts's on a small file; their speed is apibench's.
test('038 FR-008 (H-2): check a 5,000-row workbook', async ({ page }) => {
  test.setTimeout(120_000);
  await signInAs(page, PRIYA);
  await page.goto(`/plans/${PLAN}`);
  await page.getByRole('main').getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Import from Excel' }).click();
  await expect(page.getByRole('heading', { name: 'Import from Excel', level: 1 })).toBeVisible();

  await page.getByLabel('Choose a file').setInputFiles({
    name: FILE,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: await readFile(new URL(`./fixtures/${FILE}`, import.meta.url)),
  });
  await page.getByRole('button', { name: 'Check file' }).click();
  await expect(page.getByText('5000 rows · 5000 ready · 0 with problems')).toBeVisible({
    timeout: 20_000,
  });
  await expectNoAxeViolations(page);
});
