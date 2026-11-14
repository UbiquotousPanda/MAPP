import { expect, test } from '@playwright/test';
import { action, expectNoAxeViolations, signInAs, uniqueName } from './fixtures';
import {
  ALEX,
  approvedActivity,
  approvedPurchaseRequest,
  LEA,
  openFromWaitingForGsap,
  openLineItem,
  PRIYA,
  swbsLineItem,
} from './purchase-request-flow';

// The journey: an approved PR (prepared through the API) → simulated GSAP PR and PO → Committed.

const SIM_NUMBER = /SIM-\d{10}/;

test('033 US1: from an approved activity to the purchase order and Committed figures', async ({
  page,
}) => {
  test.slow();
  const activity = await approvedActivity(page, 'PR to PO');
  await signInAs(page, PRIYA);
  const lineItem = await swbsLineItem(page, activity.id, uniqueName('Gift boxes'), '10000.00');
  const prName = `PR for ${lineItem.name}`;
  const nextYear = new Date().getUTCFullYear() + 1;
  const prId = await approvedPurchaseRequest(page, lineItem, '10000.00', `${nextYear}-04-30`);

  // Lea, the requisitioner, works from Waiting for GSAP: the PR form, then the simulated GSAP.
  await openFromWaitingForGsap(page, prId, prName);
  const download = page.waitForEvent('download');
  await action(page, 'Download PR form').click();
  expect((await download).suggestedFilename()).toContain(prId);

  await page.getByRole('button', { name: 'Create GSAP PR and PO (simulated)' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Create GSAP PR and PO (simulated)?' });
  await expect(confirm).toContainText(
    `The simulated GSAP will create a GSAP PR and a purchase order with 1 line ($10,000.00) for ${prId}.`,
  );
  await expectNoAxeViolations(page);
  await confirm.getByRole('button', { name: 'Create', exact: true }).click();

  // GSAP's answer on the PR, read-only and labelled Simulated GSAP (033 FR-002 – FR-004, FR-011).
  const gsap = page.getByRole('region', { name: 'GSAP data' });
  await expect(gsap.getByText(SIM_NUMBER).first()).toBeVisible();
  await expect(gsap.getByText('Simulated GSAP').first()).toBeVisible();
  const lines = page.getByRole('region', { name: 'Lines' });
  await expect(lines.getByText('Released')).toBeVisible();
  const poNumber =
    (
      await lines
        .getByText(/SIM-45\d{8}/)
        .first()
        .textContent()
    )?.match(/SIM-\d{10}/)?.[0] ?? '';
  expect(poNumber).toMatch(SIM_NUMBER);
  await expect(page.getByRole('button', { name: 'Create GSAP PR and PO (simulated)' })).toHaveCount(
    0,
  );
  await expectNoAxeViolations(page);

  await page.goto('/purchase-requests?waiting=true');
  await page.getByRole('searchbox', { name: 'Search purchase requests' }).fill(prId);
  await expect(page.getByText('Nothing matches these filters')).toBeVisible();
  await page.goto(`/purchase-requests?q=${poNumber}`);
  await expect(
    page.getByRole('table', { name: 'Purchase requests by vendor' }).getByRole('link', {
      name: prName,
      exact: true,
    }),
  ).toBeVisible();

  // The PO line is a GSAP purchase-order transaction: Committed follows (033 FR-005, SC-001).
  await signInAs(page, ALEX);
  await openLineItem(page, lineItem);
  const figures = page.getByRole('region', { name: 'Financial figures' });
  await expect(figures.getByText('$10,000.00').first()).toBeVisible();
  await page.goto(`/financials?year=${new Date().getUTCFullYear() + 1}`);
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill(poNumber);
  await expect(page.getByRole('link', { name: new RegExp(poNumber) }).first()).toBeVisible();

  await signInAs(page, LEA);
  await page.goto(`/purchase-requests/${prId}`);
  await expect(page.getByRole('region', { name: 'Lines' }).getByText(poNumber)).toBeVisible();
});
