/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig gives Vitest the same resolution rules as the Astro build, so a
// test imports a module by the same path the pages do.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
