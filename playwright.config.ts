import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:3001', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'bun run dev', cwd: '../back-card-shop', url: 'http://localhost:3000/health/ready', reuseExistingServer: true, timeout: 30_000 },
    { command: 'bun run dev', cwd: '.', url: 'http://localhost:3001/admin/login', reuseExistingServer: true, timeout: 30_000 },
  ],
});

