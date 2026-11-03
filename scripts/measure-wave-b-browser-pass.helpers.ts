import path from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { tabTo } from '../frontend/e2e/keyboard';
import { MEASURE_PLAN } from '../frontend/e2e/measure';

// The people, rights and shared steps of the wave B browser pass (docs/sdd/measure-wave-b-qa.md, "Roles and what
// they must see"). MEASURE_FACTS=1 says the seed loads 046 T110's performance facts.

export const FACTS = process.env.MEASURE_FACTS === '1';
export const LUBRICANTS = 'FY2026 Lubricants Europe';
export const MOBILITY = 'FY2026 Mobility China';
export const ALL_PLANS = [LUBRICANTS, MOBILITY, MEASURE_PLAN];
export const TELLUS_WEBINARS = 'Tellus webinar series';
export const HELIX_FIRST = 'Helix search and social, first half';
export const FLEET_CARD_LAUNCH = 'Fleet card launch';
export const GATE = 'Approve the activity to see performance data.';
export const GONE = 'This activity no longer exists — someone may have deleted it.';
/** A cell that is a bare zero ("0", "$0.00", "0.00 USD"), where a missing figure must state its reason. */
export const ZERO_FIGURE = /^[^\d\s]{0,3}0(\.0+)?( [A-Z]{3})?$/;

export interface Role {
  key: string;
  email: string;
  /** The 2026 plans the Roles table gives the person with the Measure demo plan. */
  plans: string[];
  finance: boolean;
  exports: boolean;
  /** settings.manage, performance.import and performance.link: the Administrator alone. */
  admin: boolean;
  /** An activity in the person's scope, for its Performance section. */
  activity: string;
}

type Rights = Partial<Pick<Role, 'finance' | 'exports' | 'admin'>>;

function person(email: string, plans: string[], activity: string, rights: Rights = {}): Role {
  const key = email.split('.')[0] ?? email;
  return { key, email, plans, activity, finance: true, exports: true, admin: false, ...rights };
}

export const ALEX = person('alex.morgan@shell.com', ALL_PLANS, TELLUS_WEBINARS, { admin: true });
export const CARLOS = person('carlos.mendes@shell.com', ALL_PLANS, TELLUS_WEBINARS);
export const PRIYA = person('priya.raman@shell.com', [LUBRICANTS], 'Social always-on');
export const MEI = person('mei.lin@shell.com', [MOBILITY], FLEET_CARD_LAUNCH);
export const SARA = person('sara.novak@shell.com', [LUBRICANTS, MOBILITY], 'Social always-on');
export const LEA = person('lea.santos@shell.com', ALL_PLANS, TELLUS_WEBINARS, {
  finance: false,
  exports: false,
});

/** Settings read the same for both one-team planners, so Mei joins only where scope matters. */
export const SETTINGS_ROLES = [ALEX, CARLOS, PRIYA, SARA, LEA];
export const REPORT_ROLES = [ALEX, CARLOS, PRIYA, MEI, SARA, LEA];

export function seesMeasure(role: Role): boolean {
  return role.plans.includes(MEASURE_PLAN);
}

export function themeOf(testInfo: TestInfo): string {
  return testInfo.project.use.colorScheme ?? 'light';
}

/** Keyboard reachability does not change with the theme, so it runs in the light project only. */
export function keyboardOn(testInfo: TestInfo): boolean {
  return themeOf(testInfo) === 'light';
}

/** One row of the results table: a failure is recorded and the next check still runs. */
export async function check(name: string, body: () => Promise<void>): Promise<void> {
  await test.step(name, async () => {
    try {
      await body();
    } catch (error) {
      expect.soft(error instanceof Error ? error.message : String(error), name).toBe('');
    }
  });
}

export function h1(page: Page, name: string | RegExp): Locator {
  return page.getByRole('heading', { level: 1, name });
}

export function pageHeader(page: Page): Locator {
  return page.locator('header').filter({ has: h1(page, /./) });
}

export function viewOnlyNote(page: Page): Locator {
  return page
    .locator('main')
    .getByRole('note')
    .filter({ hasText: /^View only/ });
}

/** Every skeleton gone: the page and its widgets have their data. */
export async function settle(page: Page): Promise<void> {
  await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toHaveCount(0);
}

/** Opens the address and waits for `ready` and the data, in the project's theme. */
export async function opened(page: Page, url: string, ready: Locator, testInfo: TestInfo) {
  await page.goto(url);
  await expect(ready).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await settle(page);
}

/** The screen as the person sees it, at <results>/screens/<screen>--<person>--<theme>.png. */
export async function shoot(page: Page, testInfo: TestInfo, screen: string, role: Role) {
  const results: unknown = testInfo.config.metadata.results;
  if (typeof results !== 'string') {
    throw new Error('The config names no results folder (metadata.results).');
  }
  const file = path.join(results, 'screens', `${screen}--${role.key}--${themeOf(testInfo)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(path.basename(file), { path: file, contentType: 'image/png' });
}

/** From a fresh page: Tab to the skip link and Enter, so the next Tab is inside the page. */
export async function skipToMain(page: Page): Promise<void> {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
}

export async function menuOpensAndCloses(page: Page, trigger: Locator): Promise<void> {
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

export async function dialogOpensAndCloses(page: Page, trigger: Locator, dialog: Locator) {
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

/** The value under a summary card's label, as the reports' e2e reads it. */
export function cardValue(cards: Locator, label: string): Locator {
  return cards.locator(`p:has-text("${label}") + p`).first();
}
