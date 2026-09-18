import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { SavedFile } from './pages/uploadPage';
import { UploadPage } from './pages/uploadPage';
import {
  pdfDrawnText,
  pdfFonts,
  pdfLanguage,
  pdfPageCount,
  pdfText,
  pdfTitle,
} from './pdfText';

/**
 * Exporting what is on screen as a PDF: click the button, get a file, and read
 * the file back out rather than looking at it.
 *
 * It sits beside `export.spec.ts` rather than inside it for two reasons. A
 * third format took that file past the 800-line ceiling `CLAUDE.md` sets, and a
 * PDF is the one export that cannot be checked by reading the bytes as text —
 * everything here goes through `e2e/pdfText.ts`, which says why that matters.
 *
 * What the Markdown and HTML blocks pin, this pins too: the name of the file,
 * what is in it, and when the button is offered at all. What is new is the pair
 * that only a PDF needs — that every glyph is drawn with the font the export
 * carries, and that the file arrives in the time criterion 11.1 asks for.
 */

/**
 * How long one PDF export is allowed to take, in milliseconds.
 *
 * Criterion 11.1 says "within a few seconds for a design the size of the
 * owner's use cases", and this is the guard rather than the measurement. The
 * measured times are in the handoff document; this number is deliberately many
 * times larger than any of them, because a wall-clock assertion tight enough to
 * be interesting is also tight enough to go red on a busy shared runner, and a
 * flaky test is worth less than none. What it still catches is the failure that
 * matters: an export that has stopped finishing at all.
 */
const PDF_BUDGET_MS = 15_000;

/**
 * What the export draws where its font has no glyph, written out here.
 *
 * Deliberately a literal rather than an import from `src/`: these tests say
 * what a reader would see in the file, the same way the empty design's sentence
 * is written out below, so the walk is a second opinion rather than an echo of
 * the module under test.
 */
const MARK = '■';

/**
 * A chain of `count` nodes, as the JSON a user would have uploaded.
 *
 * Built here rather than checked in as a fixture: what it is for is reaching
 * the sheet cap, which takes hundreds of nodes, and a fixture that size is a
 * hundred kilobytes of generated JSON in the repository for one assertion.
 */
function chainDesign(count: number): string {
  return JSON.stringify({
    title: `Chain of ${count}`,
    nodes: Array.from({ length: count }, (_, index) => ({
      id: `n${index}`,
      label: `Node ${index}`,
      type: 'service',
    })),
    edges: Array.from({ length: count - 1 }, (_, index) => ({
      from: `n${index}`,
      to: `n${index + 1}`,
      label: 'next',
    })),
  });
}

/** Every piece of text the PDF draws, in the order it draws it. */
async function pdfRuns(file: SavedFile): Promise<readonly string[]> {
  return pdfText(await readFile(file.path));
}

/** The bytes of a downloaded file. */
async function bytesOf(file: SavedFile): Promise<Buffer> {
  return readFile(file.path);
}

/** How many pages the PDF holds, from its own page objects. */
async function pagesIn(file: SavedFile): Promise<number> {
  return pdfPageCount(await bytesOf(file));
}

test.describe('Exporting the design as PDF', () => {
  test('offers no export until there is something to export', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await expect(upload.exportPdf).toBeVisible();
    await expect(upload.exportPdf).toBeDisabled();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportPdf).toBeEnabled();
  });

  test('names the file after the design, with the same stem the other two use', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportPdf).toBeEnabled();

    const file = await upload.downloadPdf();

    expect(file.name).toBe('Order-intake.pdf');
    // A PDF says so in its first five bytes, and a viewer will not open one
    // that does not.
    expect((await readFile(file.path)).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('shows every node and every edge the drawing shows, read back out of the file', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();
    const file = await upload.downloadPdf();
    const written = (await pdfRuns(file)).join('\n');

    // The acceptance criterion, taken literally and checked the only way a PDF
    // can be checked: what the preview shows is what the file draws, label for
    // label, read back out of the bytes rather than trusted on the way in.
    for (const label of drawn) {
      expect(written, `"${label}" is missing from the export`).toContain(label);
    }

    expect(written).toContain('Order intake');
    expect(written).toContain('Nodes');
    expect(written).toContain('Edges');
  });

  test('lists both tables, with a row for every node and every edge', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    // Every id in the file, which only the tables carry — the drawing shows
    // labels and types, never ids.
    for (const id of ['customer', 'api', 'queue', 'worker', 'orders', 'payments']) {
      expect(written, `the row for "${id}" is missing`).toContain(id);
    }

    expect(written).toContain('Id');
    expect(written).toContain('From');
    expect(written).toContain('To');
  });

  test('keeps a label that is not plain ASCII, read straight out of the bytes', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = (await pdfRuns(file)).join('\n');

    // This is the trap the route carries: a PDF brings its own font, and the
    // built-in faces are Latin-1, so a Greek label would come back out of the
    // file as accented Latin while the export looked like it had worked.
    // Nothing but reading the text back out would have caught it.
    expect(written).toContain('Παραγγελίες — naïve café');
    expect(written).toContain('δίνει «σήμα»');
    expect(written).toContain('Tom & Jerry "quoted"');
    // Twice over, because the drawing carries it as well as the table — and
    // the drawing is the half that was wrong in the first build of this
    // export, while the table beside it was right.
    expect(
      (await pdfRuns(file)).filter((run) => run === 'Παραγγελίες — naïve café'),
    ).toHaveLength(2);
    // And a label that is markup is the text it says here too, exactly as in
    // the preview and in the `.html` (D56).
    expect(written).toContain("<script>alert('x')</script>");
  });

  test('draws every word with the font it carries, and never falls back', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();

    // The whole file, drawing and tables alike, is drawn with the one face the
    // export embeds. Anything else in this list is a standard Latin-1 face that
    // jsPDF fell back to, which is how a label stops being the text it says
    // without the export ever failing.
    expect(pdfFonts(await readFile(file.path))).toEqual(['Roboto']);
  });

  test('writes a visible mark where its font has no glyph, never nothing', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = (await pdfRuns(file)).join('\n');

    // The round-two defect, as the user meets it. Every one of these came out
    // of the file with the character simply gone: `Gateway → Queue` as
    // `Gateway  Queue`, and `API gateway (東京)` as `API gateway ()`, which
    // reads as a finished label and is the one outcome intake 5.2 rules out.
    expect(written).toContain(`Gateway ${MARK} Queue`);
    expect(written).toContain(`API gateway (${MARK}${MARK})`);
    expect(written).toContain(`check ${MARK} cross ${MARK}`);
    expect(written).toContain(`double arrow ${MARK} element ${MARK}`);
    expect(written).toContain(`left ${MARK} updown ${MARK}`);

    // And nothing anywhere in the file is a label emptied of the thing it
    // named, whatever the script it was named in.
    expect(written).not.toContain('API gateway ()');
    expect(written).not.toContain('Cache ()');
    expect(written).not.toContain('Gateway  Queue');
  });

  test('marks the drawing as well as the tables, so the two halves agree', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    // Twice: once in the picture and once in the table. A fix that marked only
    // the text `pdfPlan` writes would leave the drawing above it still losing
    // the arrow, which is exactly how the `550normal` defect hid in round one.
    expect(written.filter((run) => run === `Gateway ${MARK} Queue`)).toHaveLength(2);
  });

  test('keeps every character its font does carry, marking none of them', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = (await pdfRuns(file)).join('\n');

    // The mark is for what the font cannot draw and nothing else: signs and
    // punctuation that Roboto does carry are still themselves.
    expect(written).toContain('keeps ≥ ± € … •');
    expect(written).toContain('keeps ≥ and —');
  });

  test('keeps what a control character used to cut the line off at', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    // The round-two defect, as the user meets it. jsPDF does not skip a
    // control character, it ends the string at one, so `Alpha\tBravo` was
    // written into the Nodes table as `Alpha` — unmarked, uncounted, and with
    // the export still reporting success.
    expect(written.join('\n')).toContain(`Alpha${MARK}Bravo`);
    expect(written.join('\n')).toContain(`Soh${MARK}Charlie`);
    expect(written.join('\n')).toContain(`Del${MARK}Delta`);
    expect(written.join('\n')).toContain(`edge${MARK}with${MARK}tabs`);

    // A cut-off cell is exactly this run and nothing else, which is what the
    // table held before: `Alpha`, with `Bravo` nowhere in the file at all.
    expect(written).not.toContain('Alpha');
    expect(written).not.toContain('Soh');
    expect(written).not.toContain('edge');

    // And the mark stands in both halves of the file, the picture and the
    // table, the same way an uncovered glyph's does.
    expect(written.filter((run) => run === `Alpha${MARK}Bravo`)).toHaveLength(2);
  });

  test('leaves a label’s own line break as a line break, not as a mark', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    // The one control character that is the document's own layout: the table
    // breaks the cell on it before anything is drawn, so both halves of the
    // label are there and neither carries a square.
    expect(written).toContain('Newline');
    expect(written).toContain('Echo');
    expect(written.join('\n')).not.toContain(`Newline${MARK}`);
  });

  test('counts the characters it marked in a design full of control characters', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    await upload.downloadPdf();

    // One tab, one SOH, one DEL, two more tabs in an edge label and the
    // carriage return of a `\r\n`: six, counted once per piece of the design's
    // own text, and the line break counted as nothing because nothing was lost
    // to it.
    await expect(upload.status).toContainText('cannot draw 6 characters');
  });

  test('says how many characters it could not draw, in the app’s own words', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    await upload.downloadPdf();

    // The second half of the fix: the person who exported it is told, in the
    // status region the page already speaks in (D43), and is pointed at the
    // two exports that do carry every character.
    await expect(upload.status).toContainText('cannot draw');
    await expect(upload.status).toContainText(MARK);
    await expect(upload.status).toContainText('Markdown');
    await expect(upload.status).toContainText('HTML');
  });

  test('says nothing about the font when it drew the whole design', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.downloadPdf();

    // A clean export leaves the line describing the upload where it was.
    // Announcing a finished download is a live-region question parked for all
    // four exports at once (D41), and this is not the place to answer it.
    await expect(upload.status).toContainText('order-intake.json is drawn below');
    await expect(upload.status).not.toContainText('cannot draw');
  });

  test('carries its title and its language as metadata, not only as ink', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const bytes = await readFile(file.path);

    // Without these a viewer shows the file name in its window bar and a
    // screen reader has no document title or language to announce. The title
    // is metadata rather than ink, so no font is involved and it carries the
    // characters the page itself had to mark.
    expect(pdfTitle(bytes)).toBe('Regions → 東京');
    expect(pdfLanguage(bytes)).toBe('en');
  });

  test('carries the drawing as text and lines, not as a picture of a drawing', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const raw = (await readFile(file.path)).toString('latin1');
    const written = await pdfRuns(file);

    // Vector, which is what keeps a label selectable and sharp at any zoom: a
    // rasterised drawing would carry an image and no text at all.
    expect(raw).not.toContain('/Subtype /Image');
    expect(raw).toContain('/Subtype /Type0');
    // "Customer" is drawn in the picture as well as listed in the table, so it
    // is written twice, and it is written as text both times.
    expect(written.filter((run) => run === 'Customer').length).toBeGreaterThan(1);
  });

  test('exports a design with nothing in it without leaving an empty page', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('empty-design.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    expect(file.name).toBe('Nothing-yet.pdf');
    expect(written).toContain('Nothing yet');
    expect(written).toContain('This design has no nodes, so there is nothing to draw.');
    expect(written).toContain('Nodes');
    expect(written).toContain('Edges');
    expect(await pagesIn(file)).toBe(1);
  });

  test('runs a design too long for one page onto the pages it needs', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('estate-sweep.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadPdf();
    const written = await pdfRuns(file);

    expect(await pagesIn(file)).toBeGreaterThan(1);
    // Nothing falls off the end: the last stage of the last region is in the
    // file just as the first one is.
    expect(written).toContain('Ingest stage 0');
    expect(written).toContain('Report stage 7');
  });

  test('exports the design now on screen, not the one before it', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportPdf).toBeEnabled();

    await upload.choose('billing-run.json');
    await expect.poll(() => upload.drawingTitle()).toBe('Billing run');

    const file = await upload.downloadPdf();
    const written = (await pdfRuns(file)).join('\n');

    expect(file.name).toBe('Billing-run.pdf');
    expect(written).toContain('Billing run');
    expect(written).not.toContain('Order intake');
  });

  test('stops offering the export when the next file fails', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportPdf).toBeEnabled();

    await upload.choose('not-a-design.json');
    await expect(upload.problems).toContainText('was not drawn');

    await expect(upload.svg).toHaveCount(0);
    await expect(upload.exportPdf).toBeDisabled();
  });

  test('sits in the named group of exports, reachable from the keyboard alone', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportPdf).toBeEnabled();

    // Four buttons that do one job in four formats, named as the set they are.
    await expect(upload.exports).toBeVisible();
    await expect(upload.exports.getByRole('button')).toHaveCount(4);

    await upload.exportHtml.focus();
    await page.keyboard.press('Tab');
    await expect(upload.exportPdf).toBeFocused();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);

    expect(download.suggestedFilename()).toBe('Order-intake.pdf');
  });

  test('finishes within a few seconds for a design the size of the owner’s use cases', async ({
    page,
  }, testInfo) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('platform-overview.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportPdf).toBeEnabled();

    // The clock starts at the click and stops when the browser has the file,
    // which is what the user waits through. The first click also fetches the
    // library and the font, so this is the slow one rather than the fast one.
    const started = Date.now();
    const file = await upload.downloadPdf();
    const took = Date.now() - started;

    testInfo.annotations.push({
      type: 'export-pdf',
      description: `platform-overview.json (15 nodes, 16 edges): ${took} ms`,
    });

    expect(await pdfRuns(file)).toContain('Platform overview');
    expect(took).toBeLessThan(PDF_BUDGET_MS);
  });

  test('still finishes in time for a design several times that size', async ({
    page,
  }, testInfo) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('estate-sweep.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportPdf).toBeEnabled();

    const started = Date.now();
    const file = await upload.downloadPdf();
    const took = Date.now() - started;

    testInfo.annotations.push({
      type: 'export-pdf',
      description: `estate-sweep.json (40 nodes, 46 edges): ${took} ms`,
    });

    expect(await pdfRuns(file)).toContain('Estate sweep');
    expect(took).toBeLessThan(PDF_BUDGET_MS);
  });
  test.describe('the size the drawing prints at', () => {
    /**
     * The size of the smallest text the drawing draws, in its own pixels.
     *
     * Spelled out here rather than imported from `src/`, the way `MARK` is:
     * the point of reading the bytes back is to be a second opinion on the
     * modules, and a constant imported from the module under test would make
     * this an echo of it. Eleven is the `type` line under every node, which is
     * smaller than the 14 a label is drawn at and the 12 an edge label is, and
     * is therefore the one a floor has to be judged against.
     */
    const TYPE_SIZE_PX = 11;

    /** The floor this cycle put under that text, in points. */
    const FLOOR_PT = 6;

    /** The most sheets the drawing may take, whatever the design. */
    const SHEET_CAP = 16;

    /** Every run of the drawing's smallest text, with the size it prints at. */
    function typeText(bytes: Buffer): readonly { page: number; points: number }[] {
      const drawn = pdfDrawnText(bytes).filter((run) => run.nominal === TYPE_SIZE_PX);

      expect(drawn.length, 'the drawing drew no type line at all').toBeGreaterThan(0);

      return drawn;
    }

    for (const design of [
      { file: 'markup-labels.json', labels: ['Tom & Jerry "quoted"'] },
      { file: 'order-intake.json', labels: ['Public API', 'Order queue'] },
      { file: 'platform-overview.json', labels: ['Edge router', 'Billing service'] },
      { file: 'estate-sweep.json', labels: ['Ingest stage 0'] },
    ]) {
      test(`keeps ${design.file} above the floor, measured off the file`, async ({
        page,
      }, testInfo) => {
        const upload = new UploadPage(page);
        await upload.goto();
        await upload.choose(design.file);
        await expect(upload.svg).toBeVisible();

        const file = await upload.downloadPdf();
        const bytes = await bytesOf(file);
        const drawn = typeText(bytes);
        const smallest = Math.min(...drawn.map((run) => run.points));
        const sheets = new Set(drawn.map((run) => run.page)).size;

        testInfo.annotations.push({
          type: 'drawing-size-pdf',
          description: `${design.file}: smallest text ${smallest.toFixed(2)} pt on ${sheets} sheet(s) of ${pdfPageCount(bytes)} pages`,
        });

        expect(smallest).toBeGreaterThanOrEqual(FLOOR_PT - 0.01);
        expect(sheets).toBeLessThanOrEqual(SHEET_CAP);

        // And nothing was traded for it: the tables still carry every label at
        // full size, which is what made the old behaviour survivable at all.
        const written = pdfText(bytes).join('\n');

        for (const label of design.labels) {
          expect(written, `"${label}" is missing from the export`).toContain(label);
        }
      });
    }

    test('says so in the document when a design is too large to honour the floor', async ({
      page,
    }, testInfo) => {
      const upload = new UploadPage(page);
      await upload.goto();
      await upload.chooseMade('huge.json', chainDesign(400));
      await expect(upload.svg).toBeVisible();

      const bytes = await bytesOf(await upload.downloadPdf());
      const written = pdfText(bytes).join(' ');
      const smallest = Math.min(...typeText(bytes).map((run) => run.points));

      testInfo.annotations.push({
        type: 'drawing-size-pdf',
        description: `400-node chain: smallest text ${smallest.toFixed(2)} pt over ${pdfPageCount(bytes)} pages`,
      });

      // Below the floor, and the document is what says so, rather than leaving
      // a reader to work it out from a picture they cannot read — D69's habit,
      // applied to size instead of to characters.
      expect(smallest).toBeLessThan(FLOOR_PT);
      expect(written).toContain('too large to print at 6 pt');
      expect(written).toContain('tables below carry every label at full size');
      expect(written).toContain('Node 399');
    });

    test('names every sheet of a tiled drawing so a reader can place it', async ({
      page,
    }) => {
      const upload = new UploadPage(page);
      await upload.goto();
      await upload.choose('platform-overview.json');
      await expect(upload.svg).toBeVisible();

      const written = pdfText(await bytesOf(await upload.downloadPdf()));
      const captions = written.filter((text) => text.startsWith('Drawing, sheet'));

      expect(written.join(' ')).toContain('The drawing follows on');
      expect(captions.length).toBeGreaterThan(1);
      expect(captions[0]).toContain('sheet 1 of');
      expect(captions.at(-1)).toContain(`sheet ${captions.length} of ${captions.length}`);
    });
  });
});
