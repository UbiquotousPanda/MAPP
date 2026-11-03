import { expect, test } from '@playwright/test';
import { escapeRegExp, expectNoAxeViolations, expectToast, signInAs } from './fixtures';
import { MEASURE_PLAN } from './measure';
import { idOf } from './planning';

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

// Helix search and social, second half: 4,000 INQ phased over its 184 days from July, no source, no facts.
const HELIX_SECOND_HALF = 'Helix search and social, second half';
const HELIX_INQ_BY_MONTH = [0, 0, 0, 0, 0, 0, 673, 674, 653, 673, 653, 674];
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
  const activityId = await idOf(page, `/api/v1/plans/${planId}/activities`, HELIX_SECOND_HALF);
  const at = monthInProgress(new Date());
  const planYearINQ = HELIX_INQ_BY_MONTH.slice(Math.max(at, 0)).reduce((sum, n) => sum + n, 0);

  await page.goto(`/plans/${planId}/activities/${activityId}?tab=details`);
  const performance = page.getByRole('region', { name: 'Performance' });
  const inq = performance.getByRole('row', { name: /^INQ/ });
  await expect(inq).toContainText('4,000');
  await expect(inq).toContainText('No active data source supplies this figure.');
  await expect(inq).toContainText(planYearINQ.toLocaleString('en-US'));
  await expect(
    performance.getByText(/^Projected from Lubricants 1\.0, last changed /),
  ).toBeVisible();

  await performance.getByText('Months behind the projection').click();
  const months = performance.getByRole('table', { name: 'Months behind the projection' });
  for (const [i, inqOfMonth] of HELIX_INQ_BY_MONTH.entries()) {
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
