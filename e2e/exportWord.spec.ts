import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { DocxTable } from './docxText';
import {
  docxDescription,
  docxImageAltText,
  docxImages,
  docxLanguage,
  docxPageSize,
  docxParts,
  docxTables,
  docxText,
  docxTitle,
} from './docxText';
import type { SavedFile } from './pages/uploadPage';
import { UploadPage } from './pages/uploadPage';

/**
 * Exporting what is on screen as a Word document: click the button, get a
 * file, and read the file back out rather than looking at it.
 *
 * It sits beside `export.spec.ts` rather than inside it for the reason D68
 * gave when the PDF moved out: that file is 511 lines and the ceiling
 * `CLAUDE.md` sets is 800, so a fourth format belongs in a file of its own.
 * What is here is everything only a `.docx` can be asked — its tables are real
 * tables, its picture is a picture, its page is the page it chose, and a
 * character XML has no room for never reaches the file that carries it.
 *
 * Everything goes through `e2e/docxText.ts`, which says why reading the bytes
 * back is the only honest check: a `.docx` that looks like it exported can
 * still be one Word refuses to open.
 */

/**
 * How long one Word export is allowed to take, in milliseconds.
 *
 * Criterion 3 says "within a few seconds for a design the size of the owner's
 * use cases", and this is the guard rather than the measurement. D67 settled
 * the shape for the PDF: the measured times are in the handoff, and this
 * number is deliberately many times larger than any of them, because a
 * wall-clock assertion tight enough to be interesting is also tight enough to
 * go red on a busy shared runner. What it still catches is the failure that
 * matters: an export that has stopped finishing at all.
 */
const WORD_BUDGET_MS = 15_000;

/**
 * What the export writes where a `.docx` cannot carry the character, spelled
 * out here rather than imported from `src/`, so the walk is a second opinion
 * rather than an echo of the module under test.
 */
const MARK = '■';

/** The bytes of a downloaded file. */
async function bytesOf(file: SavedFile): Promise<Buffer> {
  return readFile(file.path);
}

/** Every table in the file, with its heading row taken off the front. */
function bodyOf(table: DocxTable | undefined): readonly (readonly string[])[] {
  return (table ?? []).slice(1);
}

test.describe('Exporting the design as Word', () => {
  test('offers no export until there is something to export', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await expect(upload.exportWord).toBeVisible();
    await expect(upload.exportWord).toBeDisabled();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportWord).toBeEnabled();
  });

  test('names the file after the design, with the same stem the other three use', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportWord).toBeEnabled();

    const file = await upload.downloadWord();
    const bytes = await bytesOf(file);

    expect(file.name).toBe('Order-intake.docx');
    // A `.docx` is a zip, and one whose first two bytes are not `PK` is one no
    // reader will even try to open.
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    // The parts Word looks for first. A package missing any of them opens as
    // "unreadable content" however good the text inside it is.
    const parts = [...docxParts(bytes).keys()];
    expect(parts).toContain('[Content_Types].xml');
    expect(parts).toContain('word/document.xml');
    expect(parts).toContain('docProps/core.xml');
  });

  test('shows every node and every edge the drawing shows, read back out of the file', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();
    const written = docxText(await bytesOf(await upload.downloadWord())).join('\n');

    // The acceptance criterion, taken literally: what the preview shows is
    // what the file holds, label for label, read back out of the bytes rather
    // than trusted on the way in.
    for (const label of drawn) {
      expect(written, `"${label}" is missing from the export`).toContain(label);
    }

    expect(written).toContain('Order intake');
    expect(written).toContain('Nodes');
    expect(written).toContain('Edges');
  });

  test('writes both tables as real Word tables a reader can type into', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const tables = docxTables(await bytesOf(await upload.downloadWord()));

    // Criterion 2's "editable text": a picture of a table would come back from
    // here as nothing at all, and a row of text with tabs in it would come
    // back as one cell rather than three.
    expect(tables).toHaveLength(2);
    expect(tables[0]?.[0]).toEqual(['Id', 'Label', 'Type']);
    expect(tables[1]?.[0]).toEqual(['From', 'To', 'Label']);

    // A row per node and a row per edge, in the order the file listed them.
    expect(bodyOf(tables[0])).toHaveLength(7);
    expect(bodyOf(tables[1])).toHaveLength(6);
    expect(tables[0]?.[1]).toEqual(['customer', 'Customer', 'user']);
    expect(tables[1]?.[1]).toEqual(['customer', 'api', 'places order']);
  });

  test('gives every column a width in twips, so every reader lays it out alike', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const bytes = await bytesOf(await upload.downloadWord());
    const document = docxParts(bytes).get('word/document.xml')?.toString('utf8') ?? '';
    const widths = [...document.matchAll(/<w:tcW\s[^>]*w:type="(\w+)"/gu)].map(
      ([, type]) => type,
    );

    // `pct` is the trap: a column set as a percentage lays out differently in
    // Google Docs from the way it does in Word, and the table stops matching
    // the document around it.
    expect(widths.length).toBeGreaterThan(0);
    expect([...new Set(widths)]).toEqual(['dxa']);
  });

  test('carries the drawing as a picture, and says what it shows', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const bytes = await bytesOf(await upload.downloadWord());
    const images = docxImages(bytes);

    // One picture, a PNG, and not an empty one: a drawing whose styles never
    // resolved would still paint, so the size is what says something is on it.
    expect(images).toHaveLength(1);
    expect(images[0]).toMatch(/\.png$/u);
    expect(docxParts(bytes).get(images[0] ?? '')?.length ?? 0).toBeGreaterThan(2000);

    // And it is described, so the picture is not a hole in the document for a
    // reader who cannot see it (D28).
    expect(docxImageAltText(bytes)).toContain('Customer');
    expect(docxImageAltText(bytes)).toContain('places order');
  });

  test('is written on the page it chose, in the units a `.docx` measures in', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    // US Letter portrait, in DXA. The library's own default is A4, so a file
    // that says 11,906 × 16,838 is one nobody chose the page for.
    expect(docxPageSize(await bytesOf(await upload.downloadWord()))).toEqual({
      width: 12_240,
      height: 15_840,
      orientation: 'portrait',
    });
  });

  test('carries its title, its description and its language as metadata', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const bytes = await bytesOf(await upload.downloadWord());

    // Without these a reader's window bar shows the file name and a screen
    // reader has no document title or language to announce (D71).
    expect(docxTitle(bytes)).toBe('Labels that look like markup');
    expect(docxDescription(bytes)).toContain('Παραγγελίες');
    expect(docxLanguage(bytes)).toBe('en');
  });

  test('keeps a label that is not plain ASCII, read straight out of the bytes', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const written = docxText(await bytesOf(await upload.downloadWord())).join('\n');

    // The PDF had to embed a font to keep these; a `.docx` names one and the
    // reader's machine supplies it, so what has to be checked is that the
    // characters are in the file at all and were not escaped into something
    // else on the way.
    expect(written).toContain('Παραγγελίες — naïve café');
    expect(written).toContain('δίνει «σήμα»');
    expect(written).toContain('Tom & Jerry "quoted"');
    // A label that is markup is the text it says, exactly as in the preview
    // and in the `.html` (D56) — and this is the format where getting it wrong
    // means the file does not open rather than that a script runs.
    expect(written).toContain("<script>alert('x')</script>");
  });

  test('marks nothing for a font’s sake, because a `.docx` carries no font', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('undrawable-labels.json');
    await expect(upload.svg).toBeVisible();

    const written = docxText(await bytesOf(await upload.downloadWord())).join('\n');

    // Every one of these is a square in the PDF, because the face it embeds
    // has no glyph for them (D69). Here they are the reader's machine's
    // question, so marking them would lose a character rather than save one.
    expect(written).toContain('Gateway → Queue');
    expect(written).toContain('API gateway (東京)');
    expect(written).toContain('check ✓ cross ✗');
    expect(written).not.toContain(MARK);

    await expect(upload.status).not.toContainText('cannot carry');
  });

  test('marks a control character rather than writing a file Word refuses to open', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    const bytes = await bytesOf(await upload.downloadWord());
    const document = docxParts(bytes).get('word/document.xml')?.toString('utf8') ?? '';
    const written = docxText(bytes).join('\n');

    // The failure this closes, measured against `docx` 9.7.1: it writes a
    // control character straight through into `word/document.xml`, XML 1.0
    // forbids it outright, and LibreOffice answers the file with "source file
    // could not be loaded". Not one may survive anywhere in the part.
    const illegal = [...document].filter((character) => {
      const point = character.codePointAt(0) ?? 0;

      return (
        point <= 0x08 ||
        point === 0x0b ||
        point === 0x0c ||
        (point >= 0x0e && point <= 0x1f)
      );
    });

    expect(illegal).toEqual([]);
    // One mark for one character, and the rest of the label still there: the
    // whole row reads as it was written, with a square where the SOH was.
    expect(written).toContain(`Soh${MARK}Charlie`);
    expect(docxTables(bytes)[0]?.[2]).toEqual(['soh', `Soh${MARK}Charlie`, 'queue']);
  });

  test('keeps a tab and a line break as themselves, marking neither', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    const written = docxText(await bytesOf(await upload.downloadWord()));

    // Measured in LibreOffice: a literal tab inside `w:t` renders as a tab, so
    // marking it would throw away a character the format carries. A line feed
    // does *not* — it renders as a space — so it has to be a real break, which
    // is what comes back here as a newline.
    expect(written).toContain('Alpha\tBravo');
    expect(written).toContain('Newline\nEcho');
    expect(written).toContain('carriage\nreturn');
    expect(written).toContain(`Del${''}Delta`);
  });

  test('says how many characters it had to mark, in the app’s own words', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('control-labels.json');
    await expect(upload.svg).toBeVisible();

    await upload.downloadWord();

    // One, and only one: the SOH in a node label. The tabs in `Alpha	Bravo`
    // and in the edge label are carried, the DEL is carried, and both line
    // breaks become real breaks — none of which is a loss to count.
    await expect(upload.status).toContainText('1 control character');
    await expect(upload.status).toContainText(MARK);
    await expect(upload.status).toContainText('Markdown');
    await expect(upload.status).toContainText('HTML');
  });

  test('says nothing at all when the design went in as it was written', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.downloadWord();

    // A clean export leaves the line describing the upload where it was.
    await expect(upload.status).toContainText('order-intake.json is drawn below');
    await expect(upload.status).not.toContainText('cannot carry');
  });

  test('exports a design with nothing in it without leaving an empty frame', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('empty-design.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadWord();
    const bytes = await bytesOf(file);
    const written = docxText(bytes);

    expect(file.name).toBe('Nothing-yet.docx');
    expect(written).toContain('Nothing yet');
    expect(written).toContain('This design has no nodes, so there is nothing to draw.');
    // Both headings still print, and both tables are still tables — with their
    // column names and no rows under them.
    expect(written).toContain('Nodes');
    expect(written).toContain('Edges');
    expect(docxTables(bytes).map((table) => table.length)).toEqual([1, 1]);
    expect(docxImages(bytes)).toEqual([]);
  });

  test('exports the design now on screen, not the one before it', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportWord).toBeEnabled();

    await upload.choose('billing-run.json');
    await expect.poll(() => upload.drawingTitle()).toBe('Billing run');

    const file = await upload.downloadWord();
    const written = docxText(await bytesOf(file)).join('\n');

    expect(file.name).toBe('Billing-run.docx');
    expect(written).toContain('Billing run');
    expect(written).not.toContain('Order intake');
  });

  test('stops offering the export when the next file fails', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportWord).toBeEnabled();

    await upload.choose('not-a-design.json');
    await expect(upload.problems).toContainText('was not drawn');

    await expect(upload.svg).toHaveCount(0);
    await expect(upload.exportWord).toBeDisabled();
  });

  test('sits in the named group of exports, reachable from the keyboard alone', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportWord).toBeEnabled();

    // Four buttons that do one job in four formats, named as the set they are
    // — and named on the page now rather than only in an attribute, so the
    // group's name is one a sighted reader sees too.
    await expect(upload.exports).toBeVisible();
    await expect(upload.exports.getByRole('button')).toHaveCount(4);
    await expect(upload.exports).toContainText('Export the design');

    await upload.exportPdf.focus();
    await page.keyboard.press('Tab');
    await expect(upload.exportWord).toBeFocused();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);

    expect(download.suggestedFilename()).toBe('Order-intake.docx');
  });

  test('finishes within a few seconds for a design the size of the owner’s use cases', async ({
    page,
  }, testInfo) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('platform-overview.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportWord).toBeEnabled();

    // The clock starts at the click and stops when the browser has the file,
    // which is what the user waits through. The first click also fetches the
    // library and paints the drawing, so this is the slow one.
    const started = Date.now();
    const file = await upload.downloadWord();
    const took = Date.now() - started;

    testInfo.annotations.push({
      type: 'export-word',
      description: `platform-overview.json (15 nodes, 16 edges): ${took} ms`,
    });

    expect(docxText(await bytesOf(file))).toContain('Platform overview');
    expect(took).toBeLessThan(WORD_BUDGET_MS);
  });

  test('still finishes in time for a design several times that size', async ({
    page,
  }, testInfo) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('estate-sweep.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportWord).toBeEnabled();

    const started = Date.now();
    const file = await upload.downloadWord();
    const took = Date.now() - started;

    testInfo.annotations.push({
      type: 'export-word',
      description: `estate-sweep.json (40 nodes, 46 edges): ${took} ms`,
    });

    const written = docxText(await bytesOf(file));

    expect(written).toContain('Estate sweep');
    // Nothing falls off the end: a `.docx` runs onto as many pages as it needs
    // without being told, so the last stage of the last region is in it.
    expect(written).toContain('Ingest stage 0');
    expect(written).toContain('Report stage 7');
    expect(took).toBeLessThan(WORD_BUDGET_MS);
  });
});
