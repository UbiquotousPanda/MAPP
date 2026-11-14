import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// The Approvals report (041): the status mix and average days (US1).

const ALEX = 'alex.morgan@shell.com';
const PRIYA = 'priya.raman@shell.com';
const YEAR = 2026;

const search = (page: { url(): string }) => new URL(page.url()).searchParams;

test('041 US1: the status mix and the average days, per record type, inside the report frame (FR-001 – FR-011)', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto(`/reports/approvals?year=${YEAR}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Approval performance' })).toBeVisible();
  const status = page.getByRole('region', { name: 'Current approval status' });
  await expect(status).toBeVisible();
  await expect(status.getByText(/\d+ waiting/)).toBeVisible();
  await expect(status.getByText('Approved automatically')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Average days to a decision' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Period' })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await status.getByRole('button', { name: 'Table' }).click();
  await expect(status.getByRole('table')).toContainText('Total');
  await status.getByRole('button', { name: 'Chart' }).click();

  const types = status.getByRole('group', { name: 'Record type' });
  if (await types.isVisible()) {
    await types.getByRole('button', { name: 'Purchase requests' }).click();
    await expect.poll(() => search(page).get('statusType')).toBe('purchaseRequest');
    await expect(status.getByText(/\d+ waiting/)).toBeVisible();
  }

  await signInAs(page, PRIYA);
  await page.goto(`/reports/approvals?year=${YEAR}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Approval performance' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current approval status' })).toBeVisible();
});
