/**
 * The design as one Word document: the title, the drawing, and the same tables
 * of nodes and edges the other three exports write — as real Word tables, so a
 * non-developer can open the file and edit a cell.
 *
 * **Two modules, and the split is the point.** `docxPlan.ts` decides everything
 * about the document — the page, the order, both tables and their widths, what
 * an empty design says, what happens to a character a `.docx` cannot carry —
 * with nothing but arithmetic, and is unit-tested in `docxPlan.test.ts`. This
 * module builds the file that plan describes, and every line of it needs a
 * real browser: `openDrawing` resolves the preview's styles onto the SVG and
 * `rasteriseDrawing` paints it through a canvas. This project's Vitest run has
 * no DOM at all, so this half is asserted in `e2e/exportWord.spec.ts` against
 * a real browser, exactly as D55 and D63 settled for Tasks 06 and 07.
 *
 * It takes the **layout**, not the design (D48), and it takes its `Document` as
 * an argument the way `renderDrawing(layout, doc)` and
 * `downloadBlob(blob, name, doc)` do (D52), rather than reaching for a global.
 *
 * **Why the drawing is a picture rather than vector.** Task 07 bought vector
 * for the PDF and that is what keeps its labels sharp. No equivalent is on
 * offer here: `docx` types an image as `jpg`, `png`, `gif` or `bmp`, and its
 * SVG option requires a raster fallback of one of those regardless, because
 * Word's own SVG support varies by version. So the picture is painted at three
 * times the size it is placed at, which is a print resolution, and the text in
 * the two tables underneath carries every label at full size whatever the
 * drawing does.
 *
 * **Why no font is embedded and nothing is marked for a font's sake.** A
 * `.docx` names a font rather than carrying one, so what a glyph looks like is
 * the reader's machine's question. Marking a character `■` because *our* font
 * lacked it, as the PDF must (D69, D70), would lose fidelity here rather than
 * protect it. What *is* marked is what would stop the file opening at all, and
 * `docxPlan.safeDocxText` says exactly what that is and how it was measured.
 *
 * The library is imported dynamically, the way jsPDF is, so a visitor who
 * never exports a Word file never downloads it.
 */

import type {
  DocxCell,
  DocxDocumentPlan,
  DocxDrawingPlan,
  DocxTablePlan,
} from './docxPlan';
import { CONTENT_WIDTH_DXA, docxPlan } from './docxPlan';
import type { DesignLayout } from './layout';
import { openDrawing } from './openDrawing';
import { rasteriseDrawing } from './rasteriseDrawing';

/** What a `.docx` is, for the browser that is about to save one. */
export const DOCX_MEDIA_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** One exported file, and what had to be marked while writing it. */
export interface DocxExport {
  readonly blob: Blob;
  /**
   * How many characters were replaced with a visible mark, for the page to say
   * so afterwards. Zero means the design went in as it was written.
   */
  readonly marked: number;
}

/** Who the file says made it, which is what a reader's Word shows as Author. */
const CREATOR = 'MapDataStructures';

/** The tint behind a table's column headings. */
const HEADING_FILL = 'EFF1F5';

/** Just enough of the library's own types to name what this module builds. */
type Docx = typeof import('docx');
type DocxParagraph = InstanceType<Docx['Paragraph']>;
type DocxTable = InstanceType<Docx['Table']>;
type DocxRun = InstanceType<Docx['TextRun']>;

/**
 * Renders a laid-out design as a Word document.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param doc - the document to render and rasterise the drawing in; nothing of
 *   it is left behind
 * @returns the whole file, ready for `downloadBlob`, and how many characters
 *   had to be marked, for the page to say so afterwards
 * @throws if the document has no window, if the drawing cannot be painted, or
 *   if the library fails; the page catches it and says so in its own words
 *   (D43)
 *
 * @example
 * ```typescript
 * const file = await toDocx(layoutDesign(design), document);
 * downloadBlob(file.blob, fileNameFor(layout.title, 'docx'), document);
 * ```
 */
export async function toDocx(layout: DesignLayout, doc: Document): Promise<DocxExport> {
  const docx = await import('docx');
  const plan = docxPlan(layout);
  const picture = plan.drawing === null ? null : await paintDrawing(plan.drawing, doc);

  const file = new docx.Document({
    title: plan.metadata.title,
    description: plan.metadata.description,
    creator: CREATOR,
    // The language belongs on the document's default run rather than on each
    // one: it is what a screen reader announces and what Word spell-checks
    // against, and a file that declares none is guessed at (D71).
    styles: {
      default: { document: { run: { language: { value: plan.metadata.language } } } },
    },
    sections: [
      {
        properties: {
          page: {
            // `docx` defaults to A4; `docxPlan` says why this is Letter.
            size: {
              width: plan.page.width,
              height: plan.page.height,
              orientation: docx.PageOrientation.PORTRAIT,
            },
            margin: {
              top: plan.page.margin,
              right: plan.page.margin,
              bottom: plan.page.margin,
              left: plan.page.margin,
            },
          },
        },
        children: bodyOf(docx, plan, picture),
      },
    ],
  });

  return { blob: await docx.Packer.toBlob(file), marked: plan.marked };
}

/** The whole body, in the order a reader meets it. */
function bodyOf(
  docx: Docx,
  plan: DocxDocumentPlan,
  picture: Uint8Array | null,
): readonly (DocxParagraph | DocxTable)[] {
  return [
    new docx.Paragraph({
      heading: docx.HeadingLevel.TITLE,
      children: runsOf(docx, plan.title),
    }),
    ...drawingBlock(docx, plan, picture),
    ...plan.tables.flatMap((table) => tableBlock(docx, table)),
  ];
}

/**
 * The picture, or the sentence that stands in for it.
 *
 * A design with no nodes is valid (D19) and gets a sentence rather than an
 * empty frame, exactly as the `.md` (D51), the `.html` (D60) and the `.pdf`
 * (D66) do. An empty space in a document someone was sent reads as a file that
 * failed.
 */
function drawingBlock(
  docx: Docx,
  plan: DocxDocumentPlan,
  picture: Uint8Array | null,
): readonly DocxParagraph[] {
  if (plan.drawing === null || picture === null) {
    return runsOfEach(docx, plan.nothingToDraw ?? []);
  }

  return [
    new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      children: [
        new docx.ImageRun({
          type: 'png',
          data: picture,
          transformation: { width: plan.drawing.width, height: plan.drawing.height },
          // What the drawing says, for a reader who cannot see it — the same
          // text the preview's own `<desc>` carries (D28).
          altText: {
            name: plan.metadata.title,
            title: plan.metadata.title,
            description: plan.drawing.altText,
          },
        }),
      ],
    }),
  ];
}

/** One table: its heading, then the table itself. */
function tableBlock(
  docx: Docx,
  table: DocxTablePlan,
): readonly (DocxParagraph | DocxTable)[] {
  return [
    new docx.Paragraph({
      heading: docx.HeadingLevel.HEADING_1,
      children: [new docx.TextRun(table.heading)],
    }),
    new docx.Table({
      // Both widths, and in DXA: `docx` needs the table's own width and every
      // cell's, and a column set as a percentage lays out differently in
      // Google Docs from the way it does in Word.
      width: { size: CONTENT_WIDTH_DXA, type: docx.WidthType.DXA },
      columnWidths: [...table.columnWidths],
      rows: [
        headingRow(docx, table),
        ...table.rows.map((row) => bodyRow(docx, table, row)),
      ],
    }),
  ];
}

/**
 * The column headings, repeated at the top of every page the table runs onto.
 *
 * A reader who turns to the third page still has to be able to tell which
 * column is which, which is the same reason `pdfPlan` redraws its headings.
 */
function headingRow(docx: Docx, table: DocxTablePlan): InstanceType<Docx['TableRow']> {
  return new docx.TableRow({
    tableHeader: true,
    children: table.columns.map(
      (heading, index) =>
        new docx.TableCell({
          width: { size: widthAt(table, index), type: docx.WidthType.DXA },
          // `CLEAR` rather than `SOLID`: a solid shading renders black.
          shading: { type: docx.ShadingType.CLEAR, fill: HEADING_FILL },
          children: [
            new docx.Paragraph({
              children: [new docx.TextRun({ text: heading, bold: true })],
            }),
          ],
        }),
    ),
  });
}

/** One row of a table, one cell per column, each holding its label's lines. */
function bodyRow(
  docx: Docx,
  table: DocxTablePlan,
  row: readonly DocxCell[],
): InstanceType<Docx['TableRow']> {
  return new docx.TableRow({
    children: row.map(
      (cell, index) =>
        new docx.TableCell({
          width: { size: widthAt(table, index), type: docx.WidthType.DXA },
          children: [new docx.Paragraph({ children: runsOf(docx, cell) })],
        }),
    ),
  });
}

/**
 * One piece of text as runs: a line each, with a real break between them.
 *
 * Never a `\n`. A line feed inside a run is legal XML and renders as a *space*
 * — measured — so a label written on two lines would quietly become one.
 */
function runsOf(docx: Docx, lines: readonly string[]): readonly DocxRun[] {
  return lines.map(
    (text, index) => new docx.TextRun(index === 0 ? { text } : { text, break: 1 }),
  );
}

/** A run of plain paragraphs, one per line, for the sentence D51 asks for. */
function runsOfEach(docx: Docx, lines: readonly string[]): readonly DocxParagraph[] {
  return lines.map((text) => new docx.Paragraph({ children: [new docx.TextRun(text)] }));
}

/** How wide the column at this index is, in DXA. */
function widthAt(table: DocxTablePlan, index: number): number {
  return table.columnWidths[index] ?? 0;
}

/**
 * The drawing, rendered with the preview's own styles and painted to a PNG.
 *
 * The holder `openDrawing` puts in the page is always taken out again, whether
 * the painting worked or not — an export that failed halfway must not leave
 * anything behind on the page it borrowed.
 */
async function paintDrawing(
  drawing: DocxDrawingPlan,
  doc: Document,
): Promise<Uint8Array> {
  const opened = openDrawing(drawing.layout, doc);

  try {
    return await rasteriseDrawing(opened.svg, doc, {
      width: drawing.rasterWidth,
      height: drawing.rasterHeight,
    });
  } finally {
    opened.close();
  }
}
