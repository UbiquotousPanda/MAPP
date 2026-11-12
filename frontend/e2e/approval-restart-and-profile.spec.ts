import { expect, test, type Page } from '@playwright/test';
import { action, escapeRegExp, expectNoAxeViolations, expectToast, signInAs } from './fixtures';
import { approveThroughApi, decideAs } from './planning-changes';
import { createPlanningRecords } from './planning';

const MEI = 'mei.lin@shell.com';
const CARLOS = 'carlos.mendes@shell.com';

function bell(page: Page) {
  return page.getByRole('button', { name: /^Notifications(, \d+ unread)?$/ });
}

test('Approval restart and the bell: changing an approved activity restarts its approval, and a decline reaches the owner (008 US5, US6)', async ({
  page,
}) => {
  test.slow();
  await signInAs(page, MEI);
  const records = await createPlanningRecords(page, 'Restart', {
    withWorkflow: true,
    leaveEmpty: [],
  });
  const name = records.activityName;
  const id = records.activityId;
  await approveThroughApi(page, records);

  // Mei changes the planned cost of the Approved activity: the form says what will happen.
  await signInAs(page, MEI);
  await page.goto(records.activityPath);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Approved — changing planned cost or dates will restart approval.'),
  ).toBeVisible();
  await action(page, 'Edit').click();
  await expect(page.getByRole('heading', { name: 'Edit activity', level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: /^Planned cost/ }).fill('25000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const restart = page.getByRole('alertdialog', { name: 'This activity will need approval again' });
  await expect(
    restart.getByText(
      `Saving returns '${name}' to Created; it must be submitted for approval again.`,
    ),
  ).toBeVisible();
  await expect(restart.getByText('Planned cost: $20,000.00 → $25,000.00')).toBeVisible();
  await restart.getByRole('button', { name: 'Save and restart approval' }).click();
  await expectToast(page, `Activity '${name}' saved`);

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(records.activityPath)}$`));
  await expect(page.getByText('Created', { exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Approval' }).click();
  const approval = page.locator('#approval');
  await expect(approval.getByText(/^Approval restarted/).first()).toBeVisible();
  await expect(
    approval.getByText('Planned cost changed from 20,000.00 USD to 25,000.00 USD'),
  ).toBeVisible();

  // The people who approved it are told: Carlos Mendes's bell.
  await signInAs(page, CARLOS);
  await page.goto('/');
  await bell(page).click();
  const carlosPanel = page.getByRole('dialog', { name: 'Notifications' });
  await expect(
    carlosPanel.getByRole('button', {
      name: new RegExp(
        `^Approval restarted Mei Lin changed '${escapeRegExp(name)}' \\(${id}\\) — it needs approval again`,
      ),
    }),
  ).toBeVisible();

  await signInAs(page, MEI);
  await page.goto(records.activityPath);
  await page.getByRole('button', { name: 'Submit for approval' }).first().click();
  const submit = page.getByRole('alertdialog', { name: `Submit '${name}' for approval?` });
  await submit.getByRole('button', { name: 'Submit for approval' }).click();
  await expectToast(page, `Activity '${name}' submitted for approval`);
  const reason = 'Please keep the planned cost at 20,000.00 USD.';
  await decideAs(page, CARLOS, id, 'decline', reason);

  await signInAs(page, MEI);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back, Mei.' })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName(/^Notifications, \d+ unread$/);
  await bell(page).click();
  const panel = page.getByRole('dialog', { name: 'Notifications' });
  const declined = new RegExp(
    `^Activity declined Carlos Mendes declined '${escapeRegExp(name)}' \\(${id}\\): "${escapeRegExp(reason)}"`,
  );
  const notice = panel.getByRole('button', { name: declined });
  await expect(notice).toHaveAccessibleName(/ Unread$/);
  await expectNoAxeViolations(page);

  await notice.click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(records.activityPath)}#approval$`));
  await expect(page.getByText('Declined', { exact: true }).first()).toBeVisible();
  // The #approval link opens the Approval tab; who declined and why are in the notice above it.
  await expect(page.getByRole('tab', { name: 'Approval' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/^Declined by Carlos Mendes on /).first()).toBeVisible();
  await expect(page.getByText(reason).first()).toBeVisible();
  await bell(page).click();
  await expect(panel.getByRole('button', { name: declined })).not.toHaveAccessibleName(/Unread$/);

  await panel.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(bell(page)).toHaveAccessibleName('Notifications');
  await expect(panel.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);
});
