import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO_PASSWORD = 'mapp';

/** Signs `email` in and resets their preferences, so every test starts from the same screen. */
export async function signInAs(page: Page, email: string): Promise<void> {
  const signIn = await page.request.post('/api/v1/auth/sign-in', {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(signIn.ok()).toBe(true);
  const reset = await page.request.patch('/api/v1/me/preferences', {
    data: {
      theme: 'system',
      sidebarCollapsed: false,
      displayCurrency: 'USD',
      dateFormat: 'DD MMM YYYY',
      homeScope: 'myTeams',
      historyIncludeInside: false,
    },
  });
  expect(reset.ok()).toBe(true);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  // The product name is a logotype, exempt from text contrast (WCAG 1.4.3, constitution X); axe cannot tell.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[role="img"][aria-label="SP&A One"] > span')
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

/** Checks the page in the light theme, then in the dark one, as the system setting switches. */
export async function axeInBothThemes(page: Page): Promise<void> {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    await expectNoAxeViolations(page);
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible();
}

export function action(scope: Page | Locator, name: string): Locator {
  return scope
    .getByRole('link', { name, exact: true })
    .or(scope.getByRole('button', { name, exact: true }))
    .first();
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Calls the API as the signed-in person: to prepare a test's records, never for what it proves. */
export async function callApi<T>(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
): Promise<T> {
  const response = await page.request.fetch(url, { method, data });
  if (!response.ok()) {
    throw new Error(`${method} ${url} answered ${response.status()}: ${await response.text()}`);
  }
  const body: T = await response.json();
  return body;
}

export function itemAt<T>(items: readonly T[], index: number): T {
  const item = items.at(index);
  if (item === undefined) {
    throw new Error(`Expected an item at ${index} of ${items.length}.`);
  }
  return item;
}

export async function choose(
  page: Page,
  combobox: Locator,
  option: string | RegExp,
): Promise<void> {
  await combobox.click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
}

/** Folds out the filter menus behind Filters (n) (ui/FilterBar), unless they are out already. */
export async function openFilters(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /^Filters/ });
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    await button.click();
  }
}

export async function chooseFilter(page: Page, filter: string, value: string): Promise<void> {
  await openFilters(page);
  await page.getByRole('button', { name: new RegExp(`^${filter}( ·|$)`) }).click();
  await page.getByRole('radio', { name: value, exact: true }).click();
  await page.keyboard.press('Escape');
}
