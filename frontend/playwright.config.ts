import { defineConfig, devices } from '@playwright/test';

// One API, web app and seeded database (mapp_e2e_0, mapp_e2e_1 …) per worker, never a development one (R19).
// Set the count with E2E_WORKERS, not --workers, which would leave a worker without servers.
const databaseURL =
  process.env.E2E_DATABASE_URL || 'postgres://mapp@127.0.0.1:5432/mapp_e2e?sslmode=disable';
const firstApiPort = Number(process.env.E2E_API_PORT || '18080');
const firstWebPort = Number(process.env.E2E_WEB_PORT || '14173');
const workers = Number(process.env.E2E_WORKERS || '2');
// The config is loaded again in every worker process, which Playwright numbers from 0.
const slot = Number(process.env.TEST_PARALLEL_INDEX || '0');

function databaseOf(index: number): string {
  const url = new URL(databaseURL);
  url.pathname = `${url.pathname}_${index}`;
  return url.toString();
}

function serversOf(index: number) {
  const apiPort = firstApiPort + index;
  const webPort = firstWebPort + index;
  const build = index === 0 ? 'pnpm exec vite build && ' : '';
  return [
    {
      command: 'go run ./cmd/seed -reset -measure && go run ./cmd/api',
      cwd: '../backend',
      env: {
        ...process.env,
        DATABASE_URL: databaseOf(index),
        APP_PORT: String(apiPort),
        APP_ENV: 'local',
      },
      url: `http://127.0.0.1:${apiPort}/healthz`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `${build}pnpm exec vite preview --host 127.0.0.1 --port ${webPort} --strictPort`,
      env: { ...process.env, MAPP_API_URL: `http://127.0.0.1:${apiPort}` },
      url: `http://127.0.0.1:${webPort}`,
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ];
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  workers,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${firstWebPort + slot}`,
    trace: 'retain-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: Array.from({ length: workers }, (_, index) => serversOf(index)).flat(),
});
