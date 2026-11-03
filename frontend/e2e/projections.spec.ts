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
    performance.getByText(/^Projected from Lubricants 1\.0, last changed /),
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
