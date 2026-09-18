import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end walk: a real browser, a real file, a real drawing.
 *
 * Two settings here are decisions rather than defaults, and both would cost a
 * confusing hour if they were left alone.
 *
 * **`testDir` is set explicitly.** Playwright's default `testMatch` is
 * `**\/*.@(spec|test).?(c|m)[jt]s?(x)`, which matches every Vitest file in
 * `src/` — `loadDesign.test.ts`, `layout.test.ts` and the rest. Without this
 * line the first `bun run test:e2e` drives a browser through the unit suite.
 * The mirror of it holds too: `vitest.config.ts` includes only
 * `src/**\/*.test.ts`, so keeping the e2e specs out of `src/` is what keeps
 * Vitest clean by construction.
 *
 * **`webServer` builds, then serves `dist/` itself.** The site ships as static
 * files (D1, and `docs/ARCHITECTURE.md`: "Built to static files and served by
 * Netlify"), so the build output is what production is and what the walk should
 * be tested against. What it is *not* served by is `astro preview`: on Astro
 * 7.3.3 that command detaches even with no flags, returning exit 0 and leaving
 * a background process behind a lock file, which Playwright reads as "Process
 * from config.webServer exited early". `astro dev` does the same. So
 * `e2e/staticServer.ts` serves the same `dist/` from the foreground — no lock,
 * no detachment, and it dies with the run that started it. The cost is a build
 * before each e2e run, which on this site is under a second.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Desktop only, per docs/ARCHITECTURE.md: "Layout targets a desktop viewport;
  // nothing is designed for touch."
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run build && bun e2e/staticServer.ts',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
