import { expect, test, type Page } from '@playwright/test';
import { action, callApi, expectNoAxeViolations, expectToast, itemAt, signInAs } from './fixtures';
import { idOf, type ListOf, type Named } from './planning';

// The access journeys of feature 014 (plan "Tests" › End-to-end, SC-002, SC-003, SC-007) against the real API
// and the demo data: who sees which plans, view versus edit and roles given in Settings. Records a journey
// needs are prepared through the API.

const ALEX = 'alex.morgan@shell.com';
const PRIYA = 'priya.raman@shell.com';
const MEI = 'mei.lin@shell.com';
const CARLOS = 'carlos.mendes@shell.com';
const SARA = 'sara.novak@shell.com';

const LUBRICANTS = 'FY2026 Lubricants Europe';
const MOBILITY = 'FY2026 Mobility China';
const GLOBAL_BRAND = 'FY2027 Global Brand';

function planCard(page: Page, name: string) {
  return page.getByRole('article', { name, exact: true });
}

async function openPlans(page: Page) {
  await page.goto('/plans?scope=all');
  await expect(page.getByRole('heading', { name: 'Plans', level: 1 })).toBeVisible();
}

test('US1: each person sees the plans of their markets, and another market’s address looks missing', async ({
  page,
}) => {
  const visible: [string, string[], string[]][] = [
    [PRIYA, [LUBRICANTS], [MOBILITY, GLOBAL_BRAND]],
    [MEI, [MOBILITY], [LUBRICANTS, GLOBAL_BRAND]],
    [SARA, [LUBRICANTS, MOBILITY], [GLOBAL_BRAND]],
    [CARLOS, [LUBRICANTS, MOBILITY, GLOBAL_BRAND], []],
  ];
  for (const [email, shown, hidden] of visible) {
    await signInAs(page, email);
    await openPlans(page);
    for (const name of shown) {
      await expect(planCard(page, name)).toBeVisible();
    }
    for (const name of hidden) {
      await expect(planCard(page, name)).toHaveCount(0);
    }
  }
  await expectNoAxeViolations(page);

  await signInAs(page, PRIYA);
  const lubricantsId = await idOf(page, '/api/v1/plans', LUBRICANTS);
  await signInAs(page, MEI);
  await page.goto(`/plans/${lubricantsId}`);
  await expect(page.getByText('Plan not found')).toBeVisible();
  await expect(page.getByText(LUBRICANTS)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('US2: a Viewer reads a plan and an activity without change actions; a planner sees why Delete is locked', async ({
  page,
}) => {
  await signInAs(page, SARA);
  const planId = await idOf(page, '/api/v1/plans', LUBRICANTS);
  const activities = await callApi<ListOf<Named>>(
    page,
    'GET',
    `/api/v1/plans/${planId}/activities`,
  );
  const activity = itemAt(activities.items, 0);

  await page.goto(`/plans/${planId}/activities/${activity.id}`);
  await expect(page.getByRole('heading', { name: activity.name, level: 1 })).toBeVisible();
  await expect(page.getByRole('note').filter({ hasText: /^View only/ })).toContainText(
    'your role (Viewer) lets you see this record but not change it.',
  );
  await expect(action(page, 'Edit')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Submit for approval/ })).toHaveCount(0);
  await page.getByRole('button', { name: `Actions for ${activity.name}` }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['View history']);
  await page.keyboard.press('Escape');
  await expectNoAxeViolations(page);

  await signInAs(page, PRIYA);
  await openPlans(page);
  await planCard(page, LUBRICANTS)
    .getByRole('button', { name: `Actions for ${LUBRICANTS}` })
    .click();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveAccessibleDescription(
    "Deleting plans isn't part of your role (Planner). Ask an administrator if you need it.",
  );
  await page.keyboard.press('Escape');

  // Priya plans for Lubricants Europe only: the Teams field offers no other market.
  await page.goto('/plans/new');
  await page.getByRole('combobox', { name: /^Teams/ }).click();
  await expect(page.getByRole('listbox').getByRole('option')).toHaveText(['Lubricants Europe']);
  await page.keyboard.press('Escape');
  await expectNoAxeViolations(page);
});

test.describe('US3: roles given in Settings', () => {
  // The journey changes Sara's roles; they go back to Viewer for her own teams whatever happens.
  test.afterEach(async ({ page }) => {
    await signInAs(page, ALEX);
    const sara = await idOf(page, '/api/v1/people', 'Sara Novak');
    const roles = await callApi<{ version: number }>(page, 'GET', `/api/v1/people/${sara}/roles`);
    const response = await page.request.put(`/api/v1/people/${sara}/roles`, {
      data: {
        version: roles.version,
        roles: [{ roleId: 'RL-1005', scope: { type: 'myTeams' } }],
      },
    });
    expect(response.ok()).toBe(true);
  });

  test('Alex makes Sara a Planner of Mobility China, and she may edit its activities at once', async ({
    page,
    browser,
  }) => {
    // Sara is already signed in elsewhere when her roles change.
    const saraContext = await browser.newContext();
    const saraPage = await saraContext.newPage();
    await signInAs(saraPage, SARA);
    const mobilityId = await idOf(saraPage, '/api/v1/plans', MOBILITY);
    const activities = await callApi<ListOf<Named>>(
      saraPage,
      'GET',
      `/api/v1/plans/${mobilityId}/activities`,
    );
    const activity = itemAt(activities.items, 0);

    await signInAs(page, ALEX);
    await page.goto('/settings/access');
    await page.getByRole('button', { name: 'Edit roles of Sara Novak' }).click();
    const panel = page.getByRole('dialog', { name: 'Roles of Sara Novak' });
    await panel.getByRole('checkbox', { name: 'Planner', exact: true }).check();
    const where = panel.getByRole('group', { name: 'Where Planner applies' });
    await where.getByLabel('Chosen teams').check();
    await where.getByRole('combobox', { name: /^Teams/ }).click();
    await page.getByRole('option', { name: 'Mobility China' }).click();
    await expectNoAxeViolations(page);
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Roles of Sara Novak saved');

    await saraPage.goto(`/plans/${mobilityId}/activities/${activity.id}`);
    await expect(saraPage.getByRole('heading', { name: activity.name, level: 1 })).toBeVisible();
    await expect(action(saraPage, 'Edit')).toBeVisible();
    await expect(saraPage.getByRole('note').filter({ hasText: /^View only/ })).toHaveCount(0);
    await saraContext.close();
  });

  test('the only administrator cannot take the Administrator role away from himself', async ({
    page,
  }) => {
    await signInAs(page, ALEX);
    await page.goto('/settings/access');
    await page.getByRole('button', { name: 'Edit roles of Alex Morgan' }).click();
    const panel = page.getByRole('dialog', { name: 'Roles of Alex Morgan' });
    await panel.getByRole('checkbox', { name: 'Administrator', exact: true }).uncheck();
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page
        .getByText(
          'Alex Morgan is the only administrator. Give someone else the Administrator role first.',
        )
        .first(),
    ).toBeVisible();
  });
});
