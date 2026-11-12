import { expect, test, type Locator, type Page } from '@playwright/test';
import { escapeRegExp, expectNoAxeViolations, signInAs } from './fixtures';

// 058 on the Measure demo's seeded journeys (D-400): the webinar series booked nothing and is credited $18,851.86
// from two deals; Helix booked $62,555.56 and is credited $54,000.00, because the euro deal it booked went to the
// steps before it.

const ALEX = 'alex.morgan@shell.com';
const HELIX = 'Helix search and social, first half';
const WEBINARS = 'Tellus webinar series';

async function openDeals(
  page: Page,
  activity: string,
): Promise<{ button: Locator; panel: Locator }> {
  await signInAs(page, ALEX);
  await page.goto(`/reports/revenue?year=2026&show=activity&q=${encodeURIComponent(activity)}`);
  const ranked = page.getByRole('region', { name: 'Ranked list' });
  // The panel is modal, so the page behind it, the figure's button too, is hidden from assistive technology.
  const button = ranked.getByRole('button', {
    name: new RegExp(`^Attributed revenue of ${escapeRegExp(activity)}`),
    includeHidden: true,
  });
  await button.click();
  return { button, panel: page.getByRole('dialog', { name: activity }) };
}

test.describe('058 the deals behind attributed revenue', () => {
  test('explains the webinar series’ credit deal by deal, and Escape returns to the figure (US1 scenarios 1, 8)', async ({
    page,
  }) => {
    const { button, panel } = await openDeals(page, WEBINARS);

    await expect(button).toHaveText('$18,851.86');
    await expect(panel.getByText('Credited to this activity')).toBeVisible();
    await expect(panel.getByText('$18,851.86')).toBeVisible();
    const dealB = panel.getByRole('article', { name: 'Measure demo feed · MD-009' });
    await expect(dealB.getByText('$24,000.00')).toBeVisible();
    await expect(dealB.getByRole('list', { name: 'Journey' }).getByRole('listitem')).toHaveCount(3);
    const dealC = panel.getByRole('article', { name: 'Measure demo feed · MD-013' });
    await expect(dealC.getByText(/= \$20,555\.56 at 0\.90/)).toBeVisible();
    await expect(dealC.getByRole('list', { name: 'Journey' }).getByRole('listitem')).toHaveCount(4);
    await expect(dealC.getByText('This activity', { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page).not.toHaveURL(/deals=/);
  });

  test('Helix: the deal it booked earned it nothing, so credited is below booked (US1 scenario 2)', async ({
    page,
  }) => {
    const { panel } = await openDeals(page, HELIX);

    await expect(
      panel.getByText('Credited to this activity', { exact: true }).locator('..'),
    ).toContainText('$54,000.00');
    await expect(
      panel.getByText('Booked on this activity', { exact: true }).locator('..'),
    ).toContainText('$62,555.56');
    const noJourney = panel.getByRole('article', { name: 'Measure demo feed · MD-014' });
    await expect(noJourney.getByText(/No journey recorded/)).toBeVisible();
    const euro = panel.getByRole('article', { name: 'Measure demo feed · MD-013' });
    await expect(euro.getByText(/booking it earns this activity nothing/)).toBeVisible();
    await expect(euro.getByText("This activity's share").locator('..')).toContainText('$0.00');
  });
});
