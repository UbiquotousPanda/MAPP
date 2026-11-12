import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, signInAs } from './fixtures';

// Feature 015 US3 against the real API: the Financials page on the demo GSAP data (backend/seed).

const ALEX = 'alex.morgan@shell.com';
const SOURCE_LINE = /^GSAP data as of \d{2} \w{3} \d{4}, \d{2}:\d{2} · (Demo data|.+'.+\.csv')/;

test('015 US3 (T030): from the sidebar, a person finds a PO, opens it and follows its link to the line item', async ({
  page,
}) => {
  await signInAs(page, ALEX);
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Financials' })
    .click();
  await expect(page.getByRole('heading', { name: 'Financials', level: 1 })).toBeVisible();
  await expect(page.getByText(SOURCE_LINE)).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Search transactions' });
  await search.fill('keynote');
  const table = page.getByRole('table', { name: 'Transactions' });
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  await expect(table.getByRole('row')).toHaveCount(5);
  for (const row of await table.getByRole('row').all()) {
    await expect(row).toContainText(/Vendor|Keynote Speakers Ltd/);
  }

  await search.fill('4500001003');
  await table.getByRole('link', { name: 'PO 4500001003 / 10' }).click();
  await expect(page).toHaveURL(/\/financials\/transactions\/FT-1003\?/);
  const panel = page.getByRole('dialog', { name: 'PO 4500001003 / 10' });
  await expect(panel.getByText('Purchase order · FT-1003')).toBeVisible();
  for (const [term, value] of [
    ['Document number', '4500001003'],
    ['Amount', '€9,800.00'],
    ['Amount in USD', '$10,888.89'],
    ['Vendor', 'V-100103 · Outdoor Frames Ltd'],
    ['Matched by', 'HX key HX1006'],
  ] as const) {
    await expect(
      panel.getByRole('term').filter({ hasText: new RegExp(`^${term}$`) }),
    ).toBeVisible();
    await expect(panel.getByRole('definition').filter({ hasText: value }).first()).toBeVisible();
  }
  const path = panel.getByRole('navigation', { name: 'Linked to' });
  for (const name of [
    'FY2026 Lubricants Europe',
    'Helix launch',
    'Print & outdoor',
    'Billboard winter wave',
    'Stand build (L-1006)',
  ]) {
    await expect(path.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expectNoAxeViolations(page);
  await path.getByRole('link', { name: 'Stand build (L-1006)' }).click();
  await expect(page).toHaveURL(/\/line-items\/L-1006$/);
  await expect(page.getByRole('heading', { name: 'Stand build', level: 1 })).toBeVisible();

  // Scenario 4: the Not linked tab, with the reason in the row.
  await page.goto('/financials');
  await page.getByRole('tab', { name: /^Not linked \(\d+\)$/ }).click();
  const notLinked = page
    .getByRole('table', { name: 'Transactions' })
    .getByRole('row', { name: /^PO 4500001004 \/ 10 / });
  await expect(notLinked).toContainText('Not linked');
  await expect(notLinked).toContainText(
    'No line item for HX key HX1099 — check the tracking key in GSAP.',
  );
  await expectNoAxeViolations(page);

  await page.goto('/financials?recordId=A-1002');
  const chip = page.getByRole('button', { name: /Activity: Social always-on \(A-1002\)/ });
  await expect(chip).toBeVisible();
  await expect(page.getByText('7 of 7 transactions')).toBeVisible();
  await chip.click();
  await expect(page).not.toHaveURL(/recordId=/);
  await expect(page.getByText(/^\d+ of \d+ transactions$/)).not.toHaveText('7 of 7 transactions');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('list', { name: 'Transactions' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Transactions' })).toHaveCount(0);
});
