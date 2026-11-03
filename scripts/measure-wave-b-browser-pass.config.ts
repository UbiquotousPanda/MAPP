import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Lane D's wave B browser pass (#47), run from frontend with --config and never in CI: frontend/playwright.config.ts's
// servers on ports and a database of its own; screenshots and reports go to BROWSER_PASS_RESULTS, outside the repo.
const databaseURL =
  process.env.BROWSER_PASS_DATABASE_URL ||
  'postgres://mapp@127.0.0.1:5432/mapp_browser_laned?sslmode=disable';
const apiPort = process.env.BROWSER_PASS_API_PORT || '18110';
const webPort = process.env.BROWSER_PASS_WEB_PORT || '14110';
const VITE = 'node_modules/vite/bin/vite.js';
const slow = Number(process.env.BROWSER_PASS_SLOW) || 1;
const results = path.resolve(
  process.env.BROWSER_PASS_RESULTS || path.join(os.tmpdir(), 'mapp-wave-b-browser-pass'),
);

export default defineConfig({
  testDir: '.',
  testMatch: 'measure-wave-b-browser-pass.spec.ts',
  outputDir: path.join(results, 'artifacts'),
  metadata: { results },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(results, 'results.json') }],
    ['html', { outputFolder: path.join(results, 'report'), open: 'never' }],
  ],
  timeout: 120_000 * slow,
  expect: { timeout: 10_000 * slow },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
  ],
  webServer: [
    {
      command: 'go run ./cmd/seed -reset -measure && go run ./cmd/api',
      cwd: '../backend',
      env: { ...process.env, DATABASE_URL: databaseURL, APP_PORT: apiPort, APP_ENV: 'local' },
      url: `http://127.0.0.1:${apiPort}/healthz`,
      timeout: 300_000 * slow,
      reuseExistingServer: false,
    },
    {
      // Vite itself, not pnpm run build: the pass needs the app, not tsc -b, and no pnpm install check.
      command: `node ${VITE} build && node ${VITE} preview --host 127.0.0.1 --port ${webPort} --strictPort`,
      cwd: '../frontend',
      env: { ...process.env, MAPP_API_URL: `http://127.0.0.1:${apiPort}` },
      url: `http://127.0.0.1:${webPort}`,
      timeout: 300_000 * slow,
      reuseExistingServer: false,
    },
  ],
});
