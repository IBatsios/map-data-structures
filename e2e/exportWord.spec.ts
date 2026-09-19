import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { DocxTable } from './docxText';
import type { DocxPicture } from './docxText';
import {
  docxDescription,
  docxImageAltText,
  docxImageAltTexts,
  docxImages,
  docxLanguage,
  docxPageBreaks,
  docxPageSize,
  docxParts,
  docxPictures,
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

/**
 * A chain of `count` nodes, as the JSON a user would have uploaded.
 *
 * Built here rather than checked in as a fixture: what it is for is the
 * thousand-node case that produced a three-pixel picture, and a fixture that
 * size is a quarter of a megabyte of generated JSON in the repository for one
 * assertion.
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
  test.describe('the size the drawing prints at', () => {
    /**
     * The smallest text the drawing draws, in its own pixels, and the floor
     * under it in points.
     *
     * Both written out here rather than imported from `src/`, the way `MARK`
     * is: this walk is a second opinion on the modules and not an echo of
     * them. Eleven is the `type` line under every node; the label is drawn at
     * 14 and an edge label at 12, so eleven is what a floor has to bind on.
     */
    const TYPE_SIZE_PX = 11;
    const FLOOR_PT = 6;

    /** How many points one image pixel is: a `.docx` places at 96 DPI. */
    const POINTS_PER_PIXEL = 0.75;

    /** The text column and a whole sheet under it, in image pixels. */
    const SHEET_WIDTH_PX = 624;
    const SHEET_HEIGHT_PX = 832;

    /** The most sheets the drawing may take, and the raster's own short side. */
    const SHEET_CAP = 16;
    const MIN_RASTER_SIDE = 200;

    /** One picture's placed size, in image pixels rather than inches. */
    function placedPixels(picture: DocxPicture): { width: number; height: number } {
      return {
        width: picture.placedInches.width * 96,
        height: picture.placedInches.height * 96,
      };
    }

    /**
     * How large the drawing's smallest text prints on this sheet, in points.
     *
     * **A raster carries no font size**, so unlike the PDF this cannot be read
     * straight out. What the file does carry is where the picture is placed
     * and how big the whole drawing is, and the ratio of the two is the scale
     * *if* the picture holds the whole drawing along that axis. It holds the
     * whole drawing along any axis it was not cut along, and a cut axis always
     * fills the sheet exactly — every sheet of a tiled drawing is pulled back
     * to a full sheet, including the last one — so an axis whose placed size
     * is short of the sheet is an axis that was not cut.
     *
     * Taking the larger of the two ratios is therefore the true scale whenever
     * either axis was left uncut, and a lower bound on it otherwise: a cut
     * axis can only understate it. Understating is the safe direction for a
     * floor, so the number below never passes a file that should have failed.
     */
    function smallestText(picture: DocxPicture, drawing: DrawingSize): number {
      const placed = placedPixels(picture);
      const scale = Math.max(
        placed.width / drawing.width,
        placed.height / drawing.height,
      );

      return TYPE_SIZE_PX * scale * POINTS_PER_PIXEL;
    }

    /** Whether that number is the size itself rather than a bound under it. */
    function isExact(picture: DocxPicture): boolean {
      const placed = placedPixels(picture);

      return placed.width < SHEET_WIDTH_PX - 1 || placed.height < SHEET_HEIGHT_PX - 1;
    }

    /** The size of one fixture's drawing, which is what the preview laid out. */
    interface DrawingSize {
      readonly width: number;
      readonly height: number;
    }

    for (const design of [
      { file: 'markup-labels.json', drawing: { width: 423, height: 660 } },
      { file: 'order-intake.json', drawing: { width: 570, height: 766 } },
      { file: 'platform-overview.json', drawing: { width: 1541, height: 1082 } },
      { file: 'estate-sweep.json', drawing: { width: 1060, height: 6480 } },
    ]) {
      test(`prints ${design.file} at a size the file itself can be asked`, async ({
        page,
      }, testInfo) => {
        const upload = new UploadPage(page);
        await upload.goto();
        await upload.choose(design.file);
        await expect(upload.svg).toBeVisible();

        const bytes = await bytesOf(await upload.downloadWord());
        const pictures = docxPictures(bytes);
        const sizes = pictures.map((one) => smallestText(one, design.drawing));
        const exact = pictures.every((one) => isExact(one));
        const smallest = Math.min(...sizes);

        testInfo.annotations.push({
          type: 'drawing-size-word',
          description: `${design.file}: smallest text ${exact ? '' : 'at least '}${smallest.toFixed(2)} pt over ${pictures.length} sheet(s); PNGs ${pictures
            .map((one) => `${one.pixelWidth}x${one.pixelHeight}`)
            .join(', ')}`,
        });

        expect(pictures.length).toBeGreaterThan(0);
        expect(pictures.length).toBeLessThanOrEqual(SHEET_CAP);

        // A drawing cut both ways fills its sheet both ways, and then the file
        // no longer says how much of the drawing each sheet holds. That case
        // is the PDF's to prove, which it does exactly, and the unit tests'.
        if (exact) {
          expect(smallest).toBeGreaterThanOrEqual(FLOOR_PT - 0.01);
        }

        // No hairline, on any sheet, at any node count. This one holds for
        // every design either way, because it is a property of the picture
        // rather than of the drawing inside it.
        for (const picture of pictures) {
          expect(
            Math.min(picture.pixelWidth, picture.pixelHeight),
          ).toBeGreaterThanOrEqual(MIN_RASTER_SIDE);
        }
      });
    }

    test('paints no hairline for the design that used to produce one', async ({
      page,
    }, testInfo) => {
      test.setTimeout(120_000);

      const upload = new UploadPage(page);
      await upload.goto();
      await upload.chooseMade('huge.json', chainDesign(1000));
      await expect(upload.svg).toBeVisible({ timeout: 60_000 });

      const bytes = await bytesOf(await upload.downloadWord());
      const pictures = docxPictures(bytes);

      testInfo.annotations.push({
        type: 'drawing-size-word',
        description: `1000-node chain: ${pictures.length} sheet(s); PNGs ${pictures
          .map((one) => `${one.pixelWidth}x${one.pixelHeight}`)
          .join(', ')}`,
      });

      // The defect, by name: a thousand-node chain produced a 3 x 2304 PNG
      // placed at 0.01 x 8.00 inches, because the canvas was measured off the
      // placed size and nothing else.
      expect(pictures.length).toBeLessThanOrEqual(SHEET_CAP);
      for (const picture of pictures) {
        expect(Math.min(picture.pixelWidth, picture.pixelHeight)).toBeGreaterThanOrEqual(
          MIN_RASTER_SIDE,
        );
      }
      expect(docxText(bytes).join(' ')).toContain('too large to print at 6 pt');
    });

    test('names each sheet, and starts each on a page of its own', async ({ page }) => {
      const upload = new UploadPage(page);
      await upload.goto();
      await upload.choose('platform-overview.json');
      await expect(upload.svg).toBeVisible();

      const bytes = await bytesOf(await upload.downloadWord());
      const written = docxText(bytes);
      const captions = written.filter((text) => text.startsWith('Drawing, sheet'));
      const pictures = docxPictures(bytes);

      expect(written.join(' ')).toContain('The drawing follows on');
      expect(captions).toHaveLength(pictures.length);
      expect(docxPageBreaks(bytes)).toBe(pictures.length);

      // The first sheet reads the whole design out; the rest name themselves
      // and stop, because hearing the same description on every sheet buries
      // the one thing that differs between them.
      const described = docxImageAltTexts(bytes).filter((text) => text !== '');

      expect(described[0]).toContain('Edge router');
      expect(described[0]).toContain('sheet 1 of');
      expect(described[1]).toBe(captions[1]);
      expect(described[1]).not.toContain('Edge router');
    });

    test('keeps every label in the tables whatever the drawing does', async ({
      page,
    }) => {
      const upload = new UploadPage(page);
      await upload.goto();
      await upload.choose('estate-sweep.json');
      await expect(upload.svg).toBeVisible();

      const written = docxText(await bytesOf(await upload.downloadWord())).join('\n');

      // This is what made the old behaviour survivable and has to stay true:
      // the picture is a print-fidelity question, not a data-loss one.
      for (const label of ['Ingest stage 0', 'Report stage 7']) {
        expect(written, `"${label}" is missing from the export`).toContain(label);
      }
    });
  });
});
