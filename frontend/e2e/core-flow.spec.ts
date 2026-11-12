import { expect, test } from '@playwright/test';
import {
  action,
  choose,
  escapeRegExp,
  expectNoAxeViolations,
  expectToast,
  signInAs,
  uniqueName,
} from './fixtures';
import { idIn, treeRow } from './planning';

// The core flow of the Plan module (features 002–008), against the real API with the demo data.
// Tests create their own records (names from uniqueName) and never assert global counts.

const PRIYA = 'priya.raman@shell.com';
const DANIEL = 'daniel.okoro@shell.com';
const MEI = 'mei.lin@shell.com';

test('A: a planner builds a plan down to a line item in euros and sees the cost roll up', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, MEI);
  const planName = uniqueName('Core plan');
  const campaignName = uniqueName('Core campaign');
  const initiativeName = uniqueName('Core initiative');
  const activityName = uniqueName('Core activity');
  const lineItemName = uniqueName('Core line item');

  await page.goto('/plans');
  await action(page, 'New plan').click();
  await expect(page).toHaveURL(/\/plans\/new$/);
  await expect(page.getByRole('heading', { name: 'New plan', level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /^Plan name/ }).fill(planName);
  await choose(page, page.getByLabel(/^Model/), /^Mobility 1\.0/);
  await page.getByRole('checkbox', { name: 'Mobility', exact: true }).check();
  await page.getByRole('textbox', { name: /^Plan budget/ }).fill('100000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Plan '${planName}' created — add campaigns next.`);
  await expect(page).toHaveURL(/\/plans\/P-\d+$/);
  const planId = idIn(page.url(), /\/plans\/(P-\d+)$/);

  await page.goto('/plans');
  await page.getByRole('searchbox', { name: 'Search plans' }).fill(planName);
  await page.getByRole('link', { name: planName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/plans/${planId}$`));
  await expect(page.getByRole('heading', { name: planName, level: 1 })).toBeVisible();
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('All filled in').first()).toBeVisible();
  await expect(
    page.getByText('No campaigns yet — a campaign is a theme that runs for most of the year.'),
  ).toBeVisible();

  await action(page, 'Add campaign').click();
  const campaignPanel = page.getByRole('dialog', { name: 'New campaign' });
  await expect(campaignPanel.getByText(`Inside plan '${planName}'`)).toBeVisible();
  await expect(campaignPanel.getByText('From the plan')).toBeVisible();
  await expect(campaignPanel.getByText("The plan's year")).toBeVisible();
  await campaignPanel.getByRole('textbox', { name: /^Campaign name/ }).fill(campaignName);
  await campaignPanel.getByRole('textbox', { name: /^Campaign budget/ }).fill('50000');
  // Cluster (5 options) is a check-box group; Region is filled in because it has one option here,
  // and 002's auto-fill message says so with the labels in lower case.
  await campaignPanel.getByRole('checkbox', { name: 'Retail – China', exact: true }).check();
  await expect(
    campaignPanel.getByText("Region set to 'RETAIL – CHINA', the only region for this cluster."),
  ).toBeVisible();
  await campaignPanel.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Campaign '${campaignName}' created`);
  await expect(treeRow(page, campaignName)).toBeVisible();

  await page.getByRole('button', { name: `Actions for ${campaignName}` }).click();
  await page.getByRole('menuitem', { name: 'Add initiative' }).click();
  const initiativePanel = page.getByRole('dialog', { name: 'New initiative' });
  await expect(initiativePanel.getByText(`Inside campaign '${campaignName}'`)).toBeVisible();
  await expect(initiativePanel.getByText('From the campaign')).toBeVisible();
  await initiativePanel.getByRole('textbox', { name: /^Initiative name/ }).fill(initiativeName);
  await initiativePanel.getByRole('textbox', { name: /^Initiative budget/ }).fill('40000');
  await initiativePanel.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Initiative '${initiativeName}' created`);
  await expect(treeRow(page, initiativeName)).toBeVisible();

  await page.getByRole('button', { name: `Actions for ${initiativeName}` }).click();
  await page.getByRole('menuitem', { name: 'Add activity' }).click();
  await expect(page.getByRole('heading', { name: 'New activity', level: 1 })).toBeVisible();
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs.getByRole('link', { name: planName, exact: true })).toBeVisible();
  await expect(crumbs.getByRole('link', { name: campaignName, exact: true })).toBeVisible();
  await expect(crumbs.getByRole('link', { name: initiativeName, exact: true })).toBeVisible();
  await expect(page.getByText('From the initiative').first()).toBeVisible();
  await page.getByRole('textbox', { name: /^Activity name/ }).fill(activityName);
  await choose(page, page.getByLabel(/^Activity type/), /^Content production/);
  await page.getByRole('textbox', { name: /^Planned cost/ }).fill('20000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Activity '${activityName}' created`);
  await expect(page).toHaveURL(new RegExp(`/plans/${planId}/activities/A-\\d+$`));
  const activityId = idIn(page.url(), /\/activities\/(A-\d+)$/);
  await expect(page.getByRole('heading', { name: activityName, level: 1 })).toBeVisible();
  await expect(page.getByText('Created', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(
      "No line items yet — split this activity's planned cost into the costs you will pay",
    ),
  ).toBeVisible();

  // A line item in euros (007 US2): the planned cost starts as the unassigned $20,000.00 and follows
  // the currency; €9,200.00 is $10,222.22 at the demo rate 0.90.
  await action(page, 'Add line item').click();
  await expect(page).toHaveURL(new RegExp(`/activities/${activityId}/line-items/new$`));
  await expect(page.getByRole('heading', { name: 'New line item', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: activityName }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: /^Line item name/ }).fill(lineItemName);
  await choose(page, page.getByLabel(/^Currency/), /^EUR/);
  await expect(page.getByText('Changed to €18,000.00 = $20,000.00')).toBeVisible();
  await page.getByRole('textbox', { name: /^Planned cost/ }).fill('9200');
  await expect(page.getByText('= $10,222.22 at 0.90 EUR per USD')).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Line item '${lineItemName}' created`);
  await expect(page).toHaveURL(new RegExp(`/activities/${activityId}#line-items$`));

  // The Line items section's table comes before its spread grid, which repeats the name (the
  // Financials card of 015 lists the line item too, so the row is looked for in the section).
  const lineItemRow = page
    .locator('#line-items')
    .getByRole('row')
    .filter({ hasText: lineItemName })
    .first();
  await expect(lineItemRow).toContainText('€9,200.00');
  await expect(lineItemRow).toContainText('$10,222.22');
  await expect(page.getByText('$10,222.22 of $20,000.00 assigned')).toBeVisible();
  await expect(page.getByText('$9,777.78 not yet assigned to a line item').first()).toBeVisible();

  await expect(page.getByText('Created', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '10 fields needed' })).toBeVisible();
  await expect(page.getByRole('button', { name: '1 line item needs attention' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Approval workflow — needed to submit' }),
  ).toBeVisible();
  await expect(lineItemRow).toContainText('3 fields needed');
  for (const label of ['Spend type', 'GL code', 'Finance budget item']) {
    await expect(
      page.getByRole('link', {
        name: new RegExp(
          `^Line item '${escapeRegExp(lineItemName)}' \\(L-\\d+\\): ${label} — needed to submit$`,
        ),
      }),
    ).toBeVisible();
  }

  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: planName })
    .click();
  await expect(page).toHaveURL(new RegExp(`/plans/${planId}$`));
  await page.getByRole('button', { name: 'Expand all' }).click();
  // Tree amounts use the full money format ("$20,000.00"), not the compact one ("$20K").
  await expect(treeRow(page, activityName)).toContainText('$20,000.00');
  await expect(treeRow(page, activityName)).toContainText('Created');
  await expect(treeRow(page, activityName)).toContainText('10 fields needed');
  await expect(treeRow(page, activityName)).toContainText('1 line item needs attention');
  await expect(treeRow(page, initiativeName)).toContainText('$20,000.00');
  await expect(treeRow(page, initiativeName).getByText('50% used', { exact: true })).toBeVisible();
  await expect(treeRow(page, campaignName)).toContainText('$20,000.00');
  await expect(treeRow(page, campaignName).getByText('40% used', { exact: true })).toBeVisible();
  await expect(treeRow(page, campaignName)).toContainText('2 items below need attention');
  await expect(treeRow(page, campaignName)).not.toContainText('fields needed');
  await expect(treeRow(page, planName)).toContainText('$20,000.00');
  await expect(treeRow(page, planName).getByText('20% used', { exact: true })).toBeVisible();
  await expect(treeRow(page, planName)).toContainText('Draft');
  await expect(
    page.getByRole('button', { name: '2 items below need attention' }).first(),
  ).toBeVisible();
});

test('Accessibility: the Plans list, a plan page, an activity page and Approvals pass axe', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, PRIYA);

  await page.goto('/plans');
  await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'FY2026 Lubricants Europe', exact: true }),
  ).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/plans/P-1001');
  await expect(
    page.getByRole('heading', { name: 'FY2026 Lubricants Europe', level: 1 }),
  ).toBeVisible();
  await expect(treeRow(page, 'Helix launch')).toBeVisible();
  await expectNoAxeViolations(page);

  await page.goto('/plans/P-1001/activities/A-1001');
  await expect(page.getByRole('heading', { name: 'Launch film', level: 1 })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Agency fee' }).first()).toBeVisible();
  await expectNoAxeViolations(page);

  // Daniel Okoro approves Lubricants Europe's activities; the rows depend on earlier test files.
  await signInAs(page, DANIEL);
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: 'Approvals', level: 1 })).toBeVisible();
  await expect(
    page
      .getByRole('table')
      .or(page.getByText("Nothing is waiting for you. You're all caught up."))
      .first(),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});
