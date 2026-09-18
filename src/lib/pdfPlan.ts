/**
 * Where every piece of the exported PDF goes, and on which page.
 *
 * This is the PDF export's pure half, and the split is the point. `toPdf` needs
 * a real browser — `renderDrawing` builds DOM elements and `svg2pdf` reads the
 * styles the page resolved for them — while this module needs nothing but
 * arithmetic and one function that can measure a string. So every decision the
 * document makes lives here and is unit-tested in `pdfPlan.test.ts`: the title,
 * the two tables, the order of the rows, where a label wraps, when the page
 * turns, and the sentence a design with nothing in it gets instead of a
 * drawing. What is left for `toPdf` is putting ink where this says. D55
 * recorded the same split for Task 06, where `htmlPage` is the half a unit test
 * can reach.
 *
 * It takes the **layout**, not the design, for D48's reason: the layout carries
 * the title, both lists in file order, and every label exactly as the file gave
 * it, so the document and the picture cannot come from two different
 * computations.
 *
 * **Why a measurement is passed in.** Wrapping a label needs to know how wide
 * it draws, and that is the embedded font's answer, which only jsPDF has. Taking
 * it as an argument is the same move `renderDrawing(layout, doc)` and
 * `downloadBlob(blob, name, doc)` make with the `Document` (D52): the one
 * impure thing this module needs arrives as a parameter, so the module stays
 * testable with a stand-in.
 *
 * **Everything is in points**, which is the unit a PDF is written in and the
 * unit `toPdf` opens jsPDF with. The drawing's own pixels are placed one to a
 * point — a laid-out drawing 516 pixels wide fills the text column exactly — and
 * scaled down from there when it is wider than the page, but never so far that
 * its own smallest text goes under the floor. How far that is, and how many
 * sheets the drawing gets once it will not fit at that size, is
 * `drawingSheets.ts`: the Word export reads the same answers, so the two
 * formats cannot drift apart on the one decision that was wrong in both (D78).
 */

import type { DrawingRegion, DrawingSheet } from './drawingSheets';
import { planDrawingSheets } from './drawingSheets';
import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';

/** US Letter, in points: the size the owner is most likely to print or attach. */
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

/** The margin on every side, in points — two thirds of an inch. */
export const PAGE_MARGIN = 48;

/** What stands in for the drawing when the design holds nothing to draw (D51). */
export const NOTHING_TO_DRAW = 'This design has no nodes, so there is nothing to draw.';

/** The design's name, at the top of the first page. */
const TITLE_SIZE = 20;

/** "Nodes" and "Edges": the name of each list. */
const SECTION_SIZE = 13;

/** Every row of every table, and the sentence an empty design gets. */
const BODY_SIZE = 10;

/** How far apart successive baselines sit, as a multiple of the font size. */
const LINE_RATIO = 1.35;

/** The gap under a rule, a table, or the drawing, in points. */
const SECTION_GAP = 18;

/** The gap under one row of a table, in points. */
const ROW_GAP = 5;

/** The gap between two columns of a table, in points. */
const COLUMN_GAP = 10;

/**
 * The least room the drawing is willing to start in, in points.
 *
 * Without it, a drawing that met the bottom of a page would be scaled to
 * whatever sliver was left and printed as a stamp. With it, the page turns
 * first and the picture gets a whole page to be as large as it can.
 */
const MIN_DRAWING_HEIGHT = 240;

/**
 * The room kept under each sheet of a tiled drawing for its caption.
 *
 * One line at body size and the gap that follows it. It is taken off the sheet
 * before the drawing is measured rather than after, so a caption can never push
 * the bottom of a picture off the page it belongs to.
 */
const CAPTION_BLOCK = BODY_SIZE * LINE_RATIO + ROW_GAP;

/** How wide one string draws at one size, in points. */
export type MeasureText = (text: string, size: number) => number;

/** One line of text, with its baseline at `y`. */
export interface PdfTextItem {
  readonly kind: 'text';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** One horizontal rule, drawn along `y`. */
export interface PdfRuleItem {
  readonly kind: 'rule';
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

/** Where the drawing goes, with its top-left corner at `x`, `y`. */
export interface PdfDrawingItem {
  readonly kind: 'drawing';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * Which piece of the drawing goes here, in the drawing's own pixels.
   *
   * A drawing small enough to print at a readable size on one page carries the
   * whole canvas here and always has. A larger one is cut into sheets, and each
   * item names its own piece so `toPdf` can point the SVG's `viewBox` at it —
   * the picture stays vector either way (D62).
   */
  readonly region: DrawingRegion;
}

export type PdfItem = PdfTextItem | PdfRuleItem | PdfDrawingItem;

/** One page, and everything on it in the order it is drawn. */
export interface PdfPage {
  readonly items: readonly PdfItem[];
}

/** The whole document: the page size, and the pages. */
export interface PdfDocumentPlan {
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly pages: readonly PdfPage[];
}

/** One column of a table: what it is called and how much of the width it takes. */
interface Column {
  readonly heading: string;
  readonly share: number;
}

/** The table of nodes, with the same columns `toMarkdown` and `toHtml` print. */
const NODE_COLUMNS: readonly Column[] = [
  { heading: 'Id', share: 0.26 },
  { heading: 'Label', share: 0.46 },
  { heading: 'Type', share: 0.28 },
];

/** The table of edges, likewise. */
const EDGE_COLUMNS: readonly Column[] = [
  { heading: 'From', share: 0.26 },
  { heading: 'To', share: 0.26 },
  { heading: 'Label', share: 0.48 },
];

/**
 * Plans the whole document for a laid-out design.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param measure - how wide a string draws at a size, from the font the PDF
 *   will be written with
 * @returns every page, and every piece of ink on it, in drawing order
 *
 * @example
 * ```typescript
 * const plan = pdfPlan(layoutDesign(design), (text, size) => {
 *   doc.setFontSize(size);
 *   return doc.getTextWidth(text);
 * });
 * ```
 */
export function pdfPlan(layout: DesignLayout, measure: MeasureText): PdfDocumentPlan {
  const sheet = new Sheet();

  addTitle(sheet, layout.title, measure);
  addDrawing(sheet, layout, measure);
  addTable(sheet, 'Nodes', NODE_COLUMNS, layout.nodes.map(nodeRow), measure);
  addTable(sheet, 'Edges', EDGE_COLUMNS, layout.edges.map(edgeRow), measure);

  return {
    title: layout.title,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    pages: sheet.pages(),
  };
}

/** The design's name, and a rule under it. */
function addTitle(sheet: Sheet, title: string, measure: MeasureText): void {
  sheet.writeBlock(wrap(title, TITLE_SIZE, sheet.contentWidth, measure), {
    x: PAGE_MARGIN,
    size: TITLE_SIZE,
  });
  sheet.rule();
  sheet.skip(SECTION_GAP);
}

/**
 * The drawing, centred, at a size its own text can still be read at; or D51's
 * sentence.
 *
 * A design with no nodes is valid (D19) and gets a sentence rather than an empty
 * canvas, exactly as the `.md` (D51) and the `.html` (D60) do. An empty page in
 * a document someone was sent reads as a file that failed.
 *
 * **What changed, and why it is not here.** This used to be one `Math.min` that
 * shrank the drawing by whatever it took to fit the room left on the page, with
 * nothing under it: a fifteen-node design printed its type line at 3.7 pt. The
 * rule now lives in `drawingSheets.ts` and the Word export reads the same one
 * (D78), so this function is left with where the ink goes and nothing about how
 * small it may be.
 *
 * A drawing that already printed large enough is placed exactly where it always
 * was, under the title, with nothing said about it. One that did not takes a
 * page per sheet, because sharing the first page with the title costs a sheet
 * of height on *every* sheet and measured out at twice the total for
 * `platform-overview.json`.
 */
function addDrawing(sheet: Sheet, layout: DesignLayout, measure: MeasureText): void {
  if (layout.nodes.length === 0) {
    sheet.writeBlock(wrap(NOTHING_TO_DRAW, BODY_SIZE, sheet.contentWidth, measure), {
      x: PAGE_MARGIN,
      size: BODY_SIZE,
    });
    sheet.skip(SECTION_GAP);
    return;
  }

  sheet.reserve(Math.min(MIN_DRAWING_HEIGHT, sheet.pageHeight));

  const plan = planDrawingSheets(layout, {
    inline: { width: sheet.contentWidth, height: sheet.room },
    sheet: { width: sheet.contentWidth, height: sheet.pageHeight - CAPTION_BLOCK },
  });
  const [only] = plan.sheets;

  if (plan.inline && only !== undefined) {
    placeDrawing(sheet, only);
    sheet.skip(only.height + SECTION_GAP);
    return;
  }

  for (const note of [plan.spread, plan.tooSmall]) {
    if (note !== null) {
      sheet.writeBlock(wrap(note, BODY_SIZE, sheet.contentWidth, measure), {
        x: PAGE_MARGIN,
        size: BODY_SIZE,
      });
      sheet.skip(ROW_GAP);
    }
  }

  sheet.skip(SECTION_GAP);

  for (const piece of plan.sheets) {
    sheet.turn();
    placeDrawing(sheet, piece);
    sheet.skip(piece.height + ROW_GAP);
    addCaption(sheet, piece.caption, measure);
  }

  // The tables start on a page of their own: the last sheet of the drawing has
  // room under it for a heading and no rows, which is the one place a table can
  // begin and look like it ended.
  sheet.turn();
}

/** One sheet of the drawing, centred in the text column. */
function placeDrawing(sheet: Sheet, piece: DrawingSheet): void {
  sheet.place({
    kind: 'drawing',
    x: PAGE_MARGIN + (sheet.contentWidth - piece.width) / 2,
    y: sheet.top,
    width: piece.width,
    height: piece.height,
    region: piece.region,
  });
}

/**
 * What a sheet of a tiled drawing says about itself, centred under it.
 *
 * Centred rather than set to the left margin, because it belongs to the picture
 * above it rather than to the page: a caption aligned with the document's body
 * text reads as the next paragraph, and the reader has to work out that it is
 * not.
 */
function addCaption(sheet: Sheet, caption: string | null, measure: MeasureText): void {
  if (caption === null) {
    return;
  }

  sheet.place({
    kind: 'text',
    text: caption,
    x: PAGE_MARGIN + (sheet.contentWidth - measure(caption, BODY_SIZE)) / 2,
    y: sheet.top + BODY_SIZE,
    size: BODY_SIZE,
  });
  sheet.skip(lineHeight(BODY_SIZE));
}

/**
 * One table: its name, its column headings, and a row per entry.
 *
 * The column headings are repeated at the top of every page the table runs
 * onto, because a reader who turns to the third page still has to be able to
 * tell which column is which.
 */
function addTable(
  sheet: Sheet,
  name: string,
  columns: readonly Column[],
  rows: readonly (readonly string[])[],
  measure: MeasureText,
): void {
  const widths = columnWidths(columns, sheet.contentWidth);
  const headings = columns.map((column) => column.heading);
  const writeHeadings = (): void => {
    writeRow(sheet, headings, widths, measure);
    sheet.rule();
    sheet.skip(ROW_GAP);
  };

  sheet.reserve(lineHeight(SECTION_SIZE) + lineHeight(BODY_SIZE) * 2);
  sheet.writeBlock([name], { x: PAGE_MARGIN, size: SECTION_SIZE });
  sheet.skip(ROW_GAP);
  writeHeadings();
  sheet.onBreak(writeHeadings);

  for (const row of rows) {
    writeRow(sheet, row, widths, measure);
    sheet.skip(ROW_GAP);
  }

  sheet.onBreak(null);
  sheet.skip(SECTION_GAP - ROW_GAP);
}

/**
 * One row of a table, every cell wrapped inside its own column.
 *
 * The row is kept whole when it fits on a page and split line by line when it
 * cannot fit on any page at all — a label has no length limit (D19, D39), and a
 * label that ran off the bottom of the page would be a label dropped, which is
 * what intake 5.2 rules out.
 */
function writeRow(
  sheet: Sheet,
  cells: readonly string[],
  widths: readonly number[],
  measure: MeasureText,
): void {
  const columns = cells.map((cell, index) =>
    wrap(cell, BODY_SIZE, widths[index] ?? 0, measure),
  );
  const lines = Math.max(...columns.map((column) => column.length), 1);

  sheet.reserve(Math.min(blockHeight(lines, BODY_SIZE), sheet.pageHeight));

  for (let line = 0; line < lines; line += 1) {
    sheet.reserve(lineHeight(BODY_SIZE));

    columns.forEach((column, index) => {
      const text = column[line];

      if (text !== undefined) {
        sheet.place({
          kind: 'text',
          text,
          x: columnStart(widths, index),
          y: sheet.top + BODY_SIZE,
          size: BODY_SIZE,
        });
      }
    });

    sheet.skip(lineHeight(BODY_SIZE));
  }
}

/** The node table's cells, in the order `toMarkdown` and `toHtml` print them. */
function nodeRow(node: LayoutNode): readonly string[] {
  return [node.id, node.label, node.type];
}

/** The edge table's cells, likewise. */
function edgeRow(edge: LayoutEdge): readonly string[] {
  return [edge.from, edge.to, edge.label];
}

/** How wide each column is, once the gaps between them are taken out. */
function columnWidths(
  columns: readonly Column[],
  contentWidth: number,
): readonly number[] {
  const room = contentWidth - COLUMN_GAP * (columns.length - 1);

  return columns.map((column) => room * column.share);
}

/** Where one column starts, measured from the left edge of the page. */
function columnStart(widths: readonly number[], index: number): number {
  return widths
    .slice(0, index)
    .reduce((left, width) => left + width + COLUMN_GAP, PAGE_MARGIN);
}

/** How far apart two baselines sit at a font size. */
function lineHeight(size: number): number {
  return size * LINE_RATIO;
}

/** How much room a run of lines needs, from its top to the gap under it. */
function blockHeight(lines: number, size: number): number {
  return lineHeight(size) * lines + ROW_GAP;
}

/**
 * One piece of text, broken into the lines it is drawn on.
 *
 * Wrapped, never truncated: D26 and D35 settled that for the drawing and the
 * reason is the same here — the label is the user's own text and all of it
 * matters. A word too long for the column is broken across lines rather than
 * left to run off the page, and a label's own line breaks are kept, so a label
 * written on two lines stays on two lines. Its spaces are kept too (D39), which
 * is why nothing here trims.
 */
function wrap(
  text: string,
  size: number,
  width: number,
  measure: MeasureText,
): readonly string[] {
  return text
    .split('\n')
    .flatMap((paragraph) => wrapParagraph(paragraph, size, width, measure));
}

/** One paragraph of a label, broken at spaces where it can be. */
function wrapParagraph(
  text: string,
  size: number,
  width: number,
  measure: MeasureText,
): readonly string[] {
  const lines: string[] = [];
  let line = '';

  for (const word of splitWords(text)) {
    const candidate = line + word;

    if (line !== '' && measure(candidate, size) > width) {
      lines.push(line);
      line = word;
      continue;
    }

    line = candidate;
  }

  lines.push(line);

  return lines.flatMap((one) => breakLongLine(one, size, width, measure));
}

/**
 * A paragraph split into words, each carrying the spaces that followed it.
 *
 * Keeping the spaces on the word is what lets the wrapped lines be joined back
 * into the text the file gave, which is the promise D39 makes about labels.
 */
function splitWords(text: string): readonly string[] {
  return text.match(/[^ ]*[ ]*/gu)?.filter((word) => word !== '') ?? [];
}

/** A single word wider than its column, broken by characters as a last resort. */
function breakLongLine(
  text: string,
  size: number,
  width: number,
  measure: MeasureText,
): readonly string[] {
  if (measure(text, size) <= width) {
    return [text];
  }

  const lines: string[] = [];
  let line = '';

  for (const character of text) {
    if (line !== '' && measure(line + character, size) > width) {
      lines.push(line);
      line = '';
    }

    line += character;
  }

  return line === '' ? lines : [...lines, line];
}

/**
 * The document being laid out: which page is being filled, and how far down it.
 *
 * This is the one place in the module that changes anything, and it changes
 * only what it is building. Nothing it holds escapes except through `pages()`,
 * which hands back finished arrays, so the plan a caller receives is as
 * read-only as its type says.
 */
class Sheet {
  private readonly sheets: PdfItem[][] = [[]];

  /** How far down the current page the next block starts, in points. */
  private cursor = PAGE_MARGIN;

  /** What to redraw at the top of a new page, while a table is running. */
  private heading: (() => void) | null = null;

  /** How wide the text column is. */
  readonly contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

  /** How tall a whole page's content area is. */
  readonly pageHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;

  /** Where the next block starts, measured from the top of the page. */
  get top(): number {
    return this.cursor;
  }

  /** How much room is left on this page. */
  get room(): number {
    return PAGE_HEIGHT - PAGE_MARGIN - this.cursor;
  }

  /** Puts one piece of ink on the current page. */
  place(item: PdfItem): void {
    this.current().push(item);
  }

  /** Moves down the page without drawing anything. */
  skip(height: number): void {
    this.cursor += height;
  }

  /** Turns the page unless what comes next fits on this one. */
  reserve(height: number): void {
    if (height <= this.room) {
      return;
    }

    this.turn();
  }

  /**
   * Starts the next page, unless this one has nothing on it yet.
   *
   * The repeated heading is unset while it draws itself, so that a heading too
   * tall for a page cannot turn the page from inside the code that fills it.
   * A page with nothing on it is never turned away from, so nothing this
   * module does can put a blank sheet in the middle of the document.
   */
  turn(): void {
    if (this.current().length === 0) {
      return;
    }

    const heading = this.heading;

    this.sheets.push([]);
    this.cursor = PAGE_MARGIN;
    this.heading = null;
    heading?.();
    this.heading = heading;
  }

  /** What to repeat at the top of each new page until this is cleared. */
  onBreak(heading: (() => void) | null): void {
    this.heading = heading;
  }

  /** Writes a run of lines at one size, and moves down past them. */
  writeBlock(lines: readonly string[], at: { x: number; size: number }): void {
    for (const text of lines) {
      this.reserve(lineHeight(at.size));
      this.place({
        kind: 'text',
        text,
        x: at.x,
        y: this.cursor + at.size,
        size: at.size,
      });
      this.skip(lineHeight(at.size));
    }
  }

  /** A rule across the text column, just under whatever was last written. */
  rule(): void {
    this.place({
      kind: 'rule',
      x: PAGE_MARGIN,
      y: this.cursor,
      width: this.contentWidth,
    });
  }

  /** Every page, in order. */
  pages(): readonly PdfPage[] {
    return this.sheets.map((items) => ({ items: [...items] }));
  }

  private current(): PdfItem[] {
    return this.sheets[this.sheets.length - 1] as PdfItem[];
  }
}
