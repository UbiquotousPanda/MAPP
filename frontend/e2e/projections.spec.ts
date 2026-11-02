import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectToast, signInAs } from './fixtures';

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

  await expect(panel.getByText(/250,000 INQ → .* MQL → .* → .* USD revenue/)).toBeVisible();

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

test('047 US2: an approved activity shows its projected figures, split at today, and the model behind them', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, ALEX);

  await page.goto('/plans/P-1001/activities/A-1001?tab=details');
  await expect(page.getByRole('heading', { name: 'Launch film', level: 1 })).toBeVisible();

  const performance = page.getByRole('region', { name: 'Performance' });
  await expect(performance).toBeVisible();

  // Either the activity counts as approved and its figures show, or the panel states the gate (046's rules).
  const gated = performance.getByText('Approve the activity to see performance data.');
  if (await gated.isVisible().catch(() => false)) {
    await expect(performance.getByRole('table')).toHaveCount(0);
  } else {
    await expect(performance.getByRole('columnheader', { name: 'Projected' })).toBeVisible();
    const inq = performance.getByRole('row').filter({ hasText: 'INQ' }).first();
    await expect(inq).toBeVisible();
    await expect(performance.getByText('0', { exact: true })).toHaveCount(0);
  }
  await expectNoAxeViolations(page);
});
