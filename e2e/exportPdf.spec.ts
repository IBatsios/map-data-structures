import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { SavedFile } from './pages/uploadPage';
import { UploadPage } from './pages/uploadPage';
import { pdfFonts, pdfText } from './pdfText';

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

/** Every piece of text the PDF draws, in the order it draws it. */
async function pdfRuns(file: SavedFile): Promise<readonly string[]> {
  return pdfText(await readFile(file.path));
}

/** How many pages the PDF holds. */
async function pdfPageCount(file: SavedFile): Promise<number> {
  const raw = (await readFile(file.path)).toString('latin1');

  return (raw.match(/\/Type\s*\/Page[^s]/gu) ?? []).length;
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
    expect(await pdfPageCount(file)).toBe(1);
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

    expect(await pdfPageCount(file)).toBeGreaterThan(1);
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

    // Three buttons that do one job in three formats, named as the set they are.
    await expect(upload.exports).toBeVisible();
    await expect(upload.exports.getByRole('button')).toHaveCount(3);

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
});
