import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

const PRIYA = 'priya.raman@shell.com';

test('052 US1: the plan tree search finds a line item, opens its path and leads to it', async ({
  page,
}) => {
  await signInAs(page, PRIYA);
  await page.goto('/plans/P-1001');
  const tree = page.getByRole('treegrid', { name: 'Plan tree' });
  await expect(tree.getByRole('link', { name: 'Venue hire' })).toHaveCount(0);

  await page.getByRole('searchbox', { name: 'Search name or ID in this plan' }).fill('venue');

  const lineItem = tree.getByRole('link', { name: 'Venue hire' });
  await expect(lineItem).toBeVisible();
  await expect(tree.getByRole('row').filter({ hasText: 'Venue hire' })).toContainText('LINE ITEM');
  await expect(tree.getByRole('link', { name: 'Social always-on' })).toBeVisible();
  await expectNoAxeViolations(page);

  await lineItem.click();
  await expect(page.getByRole('heading', { name: 'Venue hire', level: 1 })).toBeVisible();
});
