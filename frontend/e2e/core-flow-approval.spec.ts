import { expect, test, type Locator, type Page } from '@playwright/test';
import { callApi, choose, escapeRegExp, expectToast, signInAs } from './fixtures';
import { CHINA_WORKFLOW, createPlanningRecords } from './planning';

// The core flow of the Plan module (features 002–008), against the real API with the demo data.
// Tests create their own records (names from uniqueName) and never assert global counts.

const ALEX = 'alex.morgan@shell.com';
const MEI = 'mei.lin@shell.com';
const CARLOS = 'carlos.mendes@shell.com';

async function openApprovalPreview(
  page: Page,
  email: string,
  activityName: string,
): Promise<Locator> {
  await signInAs(page, email);
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: 'Approvals', level: 1 })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search activity name or ID' }).fill(activityName);
  await page.getByRole('button', { name: activityName, exact: true }).click();
  return page.getByRole('dialog', { name: activityName });
}

test('B: the planner completes and submits an activity; Carlos Mendes and Alex Morgan approve it level by level', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, MEI);
  const records = await createPlanningRecords(page, 'Approve', {
    withWorkflow: false,
    leaveEmpty: ['Channel / audience', 'Country / OU', 'Cost centre'],
  });
  const name = records.activityName;

  await page.goto(records.activityPath);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('Created', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('4 fields needed').first()).toBeVisible();
  for (const label of ['Approval workflow', 'Channel / audience', 'Country / OU', 'Cost centre']) {
    await expect(page.getByRole('link', { name: `${label} — needed to submit` })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Submit for approval' }).first().click();
  await expect(page.getByText('Submitting needs 4 things — view list')).toBeVisible();

  await page.getByRole('link', { name: 'Approval workflow — needed to submit' }).click();
  await expect(page).toHaveURL(
    new RegExp(`/activities/${records.activityId}/edit\\?field=approvalWorkflowId$`),
  );
  await expect(page.getByRole('heading', { name: 'Edit activity', level: 1 })).toBeVisible();
  // Multiple-choice attributes of up to 10 options are check-box groups; these names are unique.
  await choose(
    page,
    page.getByLabel(/^Approval workflow/),
    new RegExp(`^${escapeRegExp(CHINA_WORKFLOW)}`),
  );
  await page.getByRole('checkbox', { name: 'External', exact: true }).check();
  await page.getByRole('checkbox', { name: 'China', exact: true }).check();
  // One country takes the whole split (002 SplitEditor: adding a value splits evenly again).
  await expect(page.getByText('100.00 % — complete')).toBeVisible();
  await choose(page, page.getByLabel(/^Cost centre/), /^CN04000220/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Activity '${name}' saved`);
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(records.activityPath)}$`));
  await expect(page.getByText('All filled in').first()).toBeVisible();

  await page.getByRole('button', { name: 'Submit for approval' }).first().click();
  const submit = page.getByRole('alertdialog', { name: `Submit '${name}' for approval?` });
  await expect(submit.getByText(`Approval workflow: ${CHINA_WORKFLOW}`)).toBeVisible();
  await expect(submit.getByText('Carlos Mendes')).toBeVisible();
  await expect(submit.getByText('Alex Morgan')).toBeVisible();
  // No line items: the whole planned cost is unassigned, which is advice only (Q-008).
  await expect(
    submit.getByText(/of the planned cost is not yet assigned to a line item\.$/),
  ).toBeVisible();
  await submit.getByRole('button', { name: 'Submit for approval' }).click();
  await expectToast(page, `Activity '${name}' submitted for approval`);
  await expect(
    page.getByText(
      'Submitted for approval — changing planned cost or dates will restart approval.',
    ),
  ).toBeVisible();

  let preview = await openApprovalPreview(page, CARLOS, name);
  await expect(preview.getByText(`${records.activityId} · Waiting at level 1 of 2`)).toBeVisible();
  await preview.getByRole('button', { name: 'Approve', exact: true }).click();
  let approve = page.getByRole('alertdialog', { name: `Approve '${name}'?` });
  await expect(approve.getByText('Level 1 of 2')).toBeVisible();
  await expect(approve.getByText('Next: level 2 · Alex Morgan.')).toBeVisible();
  await approve.getByRole('button', { name: 'Approve', exact: true }).click();
  await expectToast(page, `Level 1 approved — '${name}' now waits for Alex Morgan (level 2).`);

  preview = await openApprovalPreview(page, ALEX, name);
  await expect(preview.getByText(`${records.activityId} · Waiting at level 2 of 2`)).toBeVisible();
  await preview.getByRole('button', { name: 'Approve', exact: true }).click();
  approve = page.getByRole('alertdialog', { name: `Approve '${name}'?` });
  await expect(approve.getByText('Level 2 of 2')).toBeVisible();
  await expect(
    approve.getByText('This is the last level — the activity becomes Approved.'),
  ).toBeVisible();
  await approve.getByRole('button', { name: 'Approve', exact: true }).click();
  await expectToast(page, `Activity '${name}' approved`);

  await signInAs(page, MEI);
  await page.goto(records.activityPath);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Approved — changing planned cost or dates will restart approval.'),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Approval' }).click();
  const approval = page.locator('#approval');
  await expect(approval.getByText(/^Approved by Carlos Mendes on /).first()).toBeVisible();
  await expect(approval.getByText(/^Approved by Alex Morgan on /).first()).toBeVisible();
});

test('B: a declined activity shows the approver and the reason to the planner', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, MEI);
  const records = await createPlanningRecords(page, 'Decline', {
    withWorkflow: true,
    leaveEmpty: [],
  });
  const name = records.activityName;
  // Mei submits it (prepared through the API; the screen journey of submitting is test B above).
  await callApi(page, 'POST', `/api/v1/activities/${records.activityId}/approval/submit`, {
    version: records.activityVersion,
    comment: '',
  });

  const reason = 'Please move half of the cost to the second half of the year.';
  const preview = await openApprovalPreview(page, CARLOS, name);
  await preview.getByRole('button', { name: 'Decline', exact: true }).click();
  const decline = page.getByRole('alertdialog', { name: `Decline '${name}'?` });
  await expect(
    decline.getByText('The activity goes back to Mei Lin, who can fix it and re-submit.'),
  ).toBeVisible();
  await decline.getByRole('button', { name: 'Decline activity' }).click();
  await expect(
    decline.getByText('Add a comment explaining why the activity is declined.'),
  ).toBeVisible();
  await decline.getByRole('textbox', { name: /^Why are you declining it\?/ }).fill(reason);
  await decline.getByRole('button', { name: 'Decline activity' }).click();
  await expectToast(page, `Activity '${name}' declined`);

  await signInAs(page, MEI);
  await page.goto(records.activityPath);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('Declined', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/^Declined by Carlos Mendes on /).first()).toBeVisible();
  await expect(page.getByText(reason).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-submit for approval' }).first()).toBeVisible();
  // The bell's notice of the decline (008 US6, FR-035) is proven in approval-restart-and-profile.spec.ts.
});
