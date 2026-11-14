import { expect, test } from './support/no-csp-violations';
import { callApi, expectNoAxeViolations, signInAs } from './fixtures';

// An unusable market in the address falls back to the default and says so; a currency is ignored (D-413).

const CARLOS = 'carlos.mendes@shell.com';

test('D-413: a currency in an old dashboard link is ignored; the top bar chooses it', async ({
  page,
}) => {
  await signInAs(page, CARLOS);

  await page.goto('/dashboards/executive?currency=XXX');
  await expect(page.getByRole('heading', { level: 1, name: 'Executive dashboard' })).toBeVisible();
  await expect(page.getByLabel('Summary')).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again/ })).toHaveCount(0);
  await expect(page.getByLabel('Currency', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Display currency' })).toHaveText('USD');
  await expectNoAxeViolations(page);
});

test('038 FR-012 (H-1): an unknown market falls back to the default market', async ({ page }) => {
  await signInAs(page, CARLOS);

  await page.goto('/dashboards/regional?team=T-9999');
  await expect(page.getByRole('heading', { level: 1, name: 'Regional dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again/ })).toHaveCount(0); // the default market may have no plans
  await expect(page).toHaveURL(/team=T-(?!9999)\d+/);
  const used = new URL(page.url()).searchParams.get('team') ?? '';
  expect(used).not.toBe('T-9999');
  const names = await callApi<{ items: { id: string; name: string }[] }>(
    page,
    'GET',
    '/api/v1/teams',
  );
  const market = names.items.find((team) => team.id === used)?.name ?? used;
  await expect(page.getByRole('combobox', { name: 'Market', exact: true })).toHaveText(market);
  await expectNoAxeViolations(page);
});
