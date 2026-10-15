import { defineConfig } from '@playwright/test';

/**
 * Browser checks on a phone-sized screen (`npm run e2e`): the installed Chrome, no browser download.
 * Port 5055, so a `npm run dev` on 5050 can keep running. The ranking service is `http://api.test`,
 * which the tests answer themselves (`e2e/game.spec.ts`): no Server needed.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5055',
    channel: 'chrome',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite --port 5055 --strictPort',
    url: 'http://localhost:5055',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_API_URL: 'http://api.test' },
  },
});
