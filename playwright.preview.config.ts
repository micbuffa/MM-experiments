import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/preview',
  timeout: 30_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/preview.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
