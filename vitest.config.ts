/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig gives Vitest the same resolution rules as the Astro build, so a
// test imports a module by the same path the pages do.
//
// Two roots, and the second one is deliberate. `src/` is the app. `scripts/` is
// the developer tooling beside it, and the pure half of the LibreOffice `.docx`
// check lives there — what a conversion's exit code means, where the binary is,
// and what text has to survive a round trip. None of it needs LibreOffice, a
// browser or a DOM, which is the whole reason it was split out, so it belongs
// in the suite that runs everywhere rather than in the one that needs an office
// suite installed. The specs stay invisible to Vitest either way: Playwright's
// files are `*.spec.ts` and this matches only `*.test.ts`.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
