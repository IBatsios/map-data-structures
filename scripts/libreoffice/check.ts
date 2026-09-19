/**
 * Opens the app's own Word exports in LibreOffice and reads them back.
 *
 * Run it with `bun run docx:libreoffice`. It is opt-in and local: it is not in
 * CI, `bun run test` does not start it, and `bun run test:e2e` does not run its
 * spec. On a machine with no LibreOffice it says so in one line and exits 0,
 * because not having an office suite installed is not a failing test.
 *
 * ## What this buys
 *
 * A `.docx` is a zip of XML and the ways it can go wrong are all on the way
 * out. Until now the only independent reader anyone had pointed at these files
 * was LibreOffice driven by hand, twice, by two people who each worked the
 * invocation out from scratch — and the one piece of hard-won knowledge that
 * came of it, that `--convert-to` hangs forever without a profile directory of
 * its own, lived in a paragraph of a handoff document. This is that check,
 * repeatable: one command, the app's own exported bytes, and a pass or fail per
 * fixture that reads the converted file rather than trusting an exit code.
 *
 * ## What this does not buy
 *
 * **It does not verify the Word export against Microsoft Word.** LibreOffice is
 * an independent implementation of OOXML, not Word's renderer. A file it opens
 * cleanly can still behave differently in Word, and a file it refuses might
 * have opened. What a green run here means is narrower and worth saying
 * exactly: the document is a well-formed OOXML package that a second, unrelated
 * implementation can parse, and every piece of the design's text is still in it
 * afterwards.
 *
 * Opening a produced `.docx` in real Microsoft Word, once, remains open, and it
 * belongs to the owner — no machine that has touched this project has Word on
 * it. Nothing here should be read, or written, as having closed that.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SOFFICE_OVERRIDE, describeMissingSoffice, findSoffice } from './soffice';

/** The config that holds this check's own Playwright run, away from the default one. */
const CONFIG = fromHere('../../playwright.libreoffice.config.ts');

/** Playwright's own entry point, by path, so nothing depends on a shell or a PATH. */
const PLAYWRIGHT = fromHere('../../node_modules/@playwright/test/cli.js');

const found = findSoffice({
  env: process.env,
  platform: process.platform,
  exists: existsSync,
});

if (found.path === null) {
  // One line, and exit 0. This is the whole absent case: no browser is
  // started, no spec runs, and nothing anywhere turns red.
  process.stdout.write(`${describeMissingSoffice(found)}\n`);
  process.exit(0);
}

process.stdout.write(`Converting the Word exports with ${found.path}\n`);

const run = spawn(process.execPath, [PLAYWRIGHT, 'test', '--config', CONFIG], {
  stdio: 'inherit',
  // The binary is passed down rather than searched for a second time, so the
  // run cannot end up using a different LibreOffice from the one just named.
  env: { ...process.env, [SOFFICE_OVERRIDE]: found.path },
});

run.on('error', (error: Error) => {
  process.stderr.write(`Could not start Playwright at ${PLAYWRIGHT}: ${error.message}\n`);
  process.exit(1);
});

run.on('exit', (code) => {
  process.exit(code ?? 1);
});

/** A path beside this file, resolved from this file rather than from a cwd. */
function fromHere(relative: string): string {
  return fileURLToPath(new URL(relative, import.meta.url));
}
