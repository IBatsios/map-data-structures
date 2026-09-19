import { defineConfig } from '@playwright/test';

import base from './playwright.config';

/**
 * The opt-in LibreOffice check's own Playwright run, kept out of the default
 * one by construction rather than by a skip.
 *
 * It is a second config rather than a second project or a tagged spec because
 * of how the default run is invoked: CI runs `bun run test:e2e`, which is
 * `playwright test`, which runs every project in `playwright.config.ts` over
 * everything under `e2e/`. A project added there would run in CI, and a tag or
 * a skip would only *usually* stop it — one that has to fire correctly on a
 * machine with no LibreOffice is exactly the thing this cycle is trying not to
 * ship. A separate config with its own `testDir` cannot be reached by
 * `playwright test` at all. D31 is the precedent: heavy things get their own
 * entry point.
 *
 * What it takes from the default config is the part that must not drift — the
 * same built `dist/` served by `e2e/staticServer.ts` on the same port, so the
 * bytes under test come from the same site the rest of the walk tests. What it
 * overrides is everything that suits a long, serial, local run.
 */
export default defineConfig({
  ...base,
  testDir: './scripts/libreoffice',
  // Explicit, because Playwright's default also matches `*.test.ts`, and the
  // pure modules' Vitest files live in this directory beside the spec.
  testMatch: '**/*.spec.ts',
  // One at a time: five conversions sharing a machine is not faster, and each
  // LibreOffice wants a profile and a few seconds of its own.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  // Longer than the 120s a conversion is given, so a hung conversion is
  // reported as the timeout it is, naming the command, rather than being cut
  // off first by Playwright and reported as a test that ran out of time.
  timeout: 180_000,
});
