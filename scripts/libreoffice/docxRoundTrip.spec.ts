import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { docxText } from '../../e2e/docxText';
import { UploadPage } from '../../e2e/pages/uploadPage';
import { convertToDocx } from './convert';
import { describeMissingSoffice, findSoffice } from './soffice';
import { missingFrom, textThatMustSurvive } from './survivingText';

/**
 * The Word export, opened by an independent OOXML reader and read back.
 *
 * Run with `bun run docx:libreoffice`, never by `bun run test` or `bun run
 * test:e2e` — see `scripts/libreoffice/check.ts` for what this buys, what it
 * does not buy, and why it is opt-in.
 *
 * Each fixture goes through the browser's own export button, so the bytes
 * under test are the bytes a user would get; then through the LibreOffice
 * installed on the machine; then back through `e2e/docxText.ts`, which is the
 * same reader the Word export's own walk uses. A conversion that returns exit
 * 0 and loses the document is a failure here, which is the reason the file is
 * read at all.
 *
 * Nothing is written inside the repository. Every file this makes — the
 * export, the conversion, and the LibreOffice profile that stops it hanging —
 * lives under the system temporary directory in a room per fixture, and the
 * room is removed when its fixture passes and kept when it does not, because
 * the file is the first thing anyone will want when this goes red.
 */

/**
 * The five fixtures, and why each one earns its place.
 *
 * `control-labels` is the one that gives this check teeth: its *unfixed* form
 * is the file LibreOffice refused with "source file could not be loaded",
 * which is what D76 exists to prevent. A set of well-behaved designs would
 * pass whatever the export did to them.
 */
const FIXTURES = [
  'order-intake.json',
  'control-labels.json',
  'empty-design.json',
  'markup-labels.json',
  'estate-sweep.json',
];

/** How long one conversion is given before it is killed and reported. */
const CONVERSION_TIMEOUT_MS = 120_000;

/** The binary, found once: an override first, then this platform's installs. */
const FOUND = findSoffice({
  env: process.env,
  platform: process.platform,
  exists: existsSync,
});

for (const fixture of FIXTURES) {
  test(`${fixture} survives a LibreOffice round trip`, async ({ page }) => {
    test.skip(FOUND.path === null, describeMissingSoffice(FOUND));

    const room = await mkdtemp(join(tmpdir(), 'mapds-libreoffice-'));
    const inDir = join(room, 'exported');
    const outDir = join(room, 'converted');
    const profileDir = join(room, 'profile');
    let passed = false;

    try {
      await Promise.all([mkdir(inDir), mkdir(outDir), mkdir(profileDir)]);

      const upload = new UploadPage(page);
      await upload.goto();
      await upload.choose(fixture);
      await expect(upload.svg).toBeVisible();

      const exported = await upload.downloadWord(
        join(inDir, `${basename(fixture, '.json')}.docx`),
      );
      const { verdict, output, stdout } = await convertToDocx({
        soffice: FOUND.path ?? '',
        source: exported.path,
        outDir,
        profileDir,
        timeoutMs: CONVERSION_TIMEOUT_MS,
      });

      expect(verdict.kind, failureOf(fixture, room, verdict.reason, stdout)).toBe(
        'converted',
      );

      // Read back rather than trusted: `docxText` throws on a zip it does not
      // understand rather than returning nothing, and that property is kept
      // on purpose — a reader that quietly found no text would turn a lost
      // document into a passing check (D79).
      const converted = docxText(await readFile(output)).join('\n');
      const wanted = textThatMustSurvive(await readFile(fixturePath(fixture), 'utf8'));
      const lost = missingFrom(converted, wanted);

      expect(
        lost,
        failureOf(
          fixture,
          room,
          `LibreOffice converted the file and ${lost.length} of the design's ${wanted.length} pieces of text did not come back`,
          stdout,
        ),
      ).toEqual([]);

      passed = true;
    } finally {
      if (passed) {
        await rm(room, { recursive: true, force: true });
      }
    }
  });
}

/** One failure message: what went wrong, and where the files still are. */
function failureOf(
  fixture: string,
  room: string,
  reason: string,
  stdout: string,
): string {
  const said = stdout.trim();

  return [
    `${fixture}: ${reason}`,
    `The exported and converted files are still in ${room}.`,
    said === '' ? 'LibreOffice printed nothing on stdout.' : `LibreOffice said: ${said}`,
  ].join('\n');
}

/** One fixture, in the one place the fixtures live. */
function fixturePath(fixture: string): string {
  return fileURLToPath(new URL(`../../e2e/fixtures/${fixture}`, import.meta.url));
}
