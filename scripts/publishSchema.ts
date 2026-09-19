/**
 * Writes `public/design.schema.json` from the live Zod schema.
 *
 * The published schema has to be a file at a URL — that is what "published"
 * means for something a validator points at — and a file is a second copy of
 * something `src/lib/design.schema.ts` already says. This script is how that
 * copy is made, so it is never made by hand, and `publishedSchema.test.ts` is
 * what fails the day someone changes the schema and forgets to run it.
 *
 * Run it with `bun run schema`.
 */

import { writeFileSync } from 'node:fs';

import { publishedDesignSchema } from '../src/lib/publishedSchema';

/** Where the site serves it from: `/design.schema.json`. */
const ARTIFACT = new URL('../public/design.schema.json', import.meta.url);

writeFileSync(ARTIFACT, `${JSON.stringify(publishedDesignSchema(), null, 2)}\n`, 'utf8');

process.stdout.write(`Wrote ${ARTIFACT.pathname}\n`);
