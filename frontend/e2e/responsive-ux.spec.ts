import type { Page } from '@playwright/test';
import { expect, test } from './support/no-csp-violations';
import { signInAs } from './fixtures';

const ALEX = 'alex.morgan@shell.com';

/** Tabs through the form and names every focused control that the sticky Save bar covers. */
async function controlsUnderTheSaveBar(page: Page, presses: number): Promise<string[]> {
  const covered: string[] = [];
  await page.locator('main input').first().focus();
  for (let press = 0; press < presses; press++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const focused = document.activeElement;
      const bar = Array.from(document.querySelectorAll('main *')).find((element) => {
        const style = getComputedStyle(element);
        return style.position === 'sticky' && style.bottom === '0px';
      });
      if (!focused || !bar || bar.contains(focused)) {
        return null;
      }
      const control = focused.getBoundingClientRect();
      const top = bar.getBoundingClientRect().top;
      return control.bottom > top + 1 ? focused.id || focused.getAttribute('aria-label') : null;
    });
    if (label !== null) {
      covered.push(label);
    }
  }
  return covered;
}

for (const viewport of [
  { width: 390, height: 700 },
  { width: 1280, height: 700 },
]) {
  test(`WCAG 2.4.11: a control reached with Tab is never under the sticky Save bar (${viewport.width} px)`, async ({
    page,
  }) => {
    await signInAs(page, ALEX);
    await page.setViewportSize(viewport);
    await page.goto('/plans/new');
    await expect(page.getByRole('heading', { level: 1, name: 'New plan' })).toBeVisible();

    expect(await controlsUnderTheSaveBar(page, 40)).toEqual([]);
  });
}
