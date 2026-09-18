/**
 * What goes into the exported Word document, in what order, and how big.
 *
 * This is the Word export's pure half, and the split is D63's, made for the
 * PDF one task ago and kept for the same reason: `toDocx` needs a real browser
 * — it renders the drawing, resolves the preview's styles onto it and paints
 * it into a canvas — while this module needs nothing but arithmetic over
 * strings. So every decision the document makes lives here and is unit-tested
 * in `docxPlan.test.ts`: the page, the title, both tables, the size the
 * drawing is placed at, the sentence a design with nothing in it gets, and
 * what happens to a character a `.docx` cannot carry. What is left for
 * `toDocx` is building the file the plan describes.
 *
 * It takes the **layout**, not the design (D48), so the document and the
 * picture cannot come from two different computations.
 *
 * **Two units, and both are the format's rather than ours.** A `.docx` measures
 * its page in DXA — twentieths of a point, so 1440 to the inch — and its
 * images in pixels at 96 DPI. Neither is the PDF's point (D66), so nothing
 * here is inherited from `pdfPlan`; the page is chosen again below and the
 * reason is written down.
 *
 * **Wrapping is Word's job, not ours.** `pdfPlan` has to break every cell
 * itself because a PDF has no idea what a table is. Word does, so a cell here
 * carries the lines the *label itself* is written on and nothing more — the
 * reader's Word wraps the rest, and it re-wraps when they widen a column,
 * which is the point of an editable file.
 */

import { describeDrawing } from './describeDrawing';
import { UNDRAWABLE_MARK } from './drawableText';
import type { DrawingRegion, DrawingSheet } from './drawingSheets';
import { MAX_DRAWING_SHEETS, planDrawingSheets } from './drawingSheets';
import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';
import type { MarkedText } from './markLayout';
import { markLayout } from './markLayout';

/**
 * US Letter, portrait, in DXA — twentieths of a point, 1440 to the inch.
 *
 * Chosen rather than inherited (D66). `docx` defaults to A4, which is the
 * wrong paper for the owner; Letter portrait with an inch of margin is what a
 * Word document is expected to look like and what re-flows sensibly when a
 * non-developer widens a column or types into a cell, which is the whole
 * reason this export exists. Landscape was measured and rejected: the drawings
 * this app produces are usually taller than they are wide — `order-intake`
 * is 570 × 766 and `estate-sweep` 1060 × 6480 — so turning the page would
 * shrink the picture in three of the four fixtures to help it in one.
 */
export const PAGE_WIDTH_DXA = 12_240;
export const PAGE_HEIGHT_DXA = 15_840;

/** An inch on every side, which is Word's own default and a printer's. */
export const PAGE_MARGIN_DXA = 1440;

/** The text column, in DXA: what a table has to fill exactly. */
export const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - PAGE_MARGIN_DXA * 2;

/** How many DXA make one image pixel: 1440 to the inch over 96 to the inch. */
const DXA_PER_PIXEL = 15;

/** The text column again, in the pixels an image is measured in. */
export const CONTENT_WIDTH_PX = CONTENT_WIDTH_DXA / DXA_PER_PIXEL;

/** The content area's height, in DXA and then in image pixels. */
const CONTENT_HEIGHT_DXA = PAGE_HEIGHT_DXA - PAGE_MARGIN_DXA * 2;
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_DXA / DXA_PER_PIXEL;

/** How much of the first page the title above the drawing is allowed. */
const TITLE_HEIGHT_PX = 96;

/**
 * How tall the drawing may be where it sits under the title, in image pixels.
 *
 * The content area is 864 pixels tall and the title above the picture takes
 * the first inch of it. An image taller than the page is not pushed onto the
 * next one by Word, it is cropped, so this is a real limit rather than a
 * preference.
 */
export const DRAWING_MAX_HEIGHT_PX = CONTENT_HEIGHT_PX - TITLE_HEIGHT_PX;

/** The room a caption under a sheet of the drawing takes, in image pixels. */
const CAPTION_HEIGHT_PX = 32;

/**
 * How tall one sheet of a tiled drawing may be, in image pixels.
 *
 * A tiled drawing starts on a page of its own, so it has the whole content
 * area rather than the content area less the title. That page is worth what it
 * costs: a sheet sharing the first page with the title would be an inch
 * shorter on *every* sheet, and measured on `platform-overview.json` that
 * doubles the Word document from three sheets to six.
 */
const DRAWING_SHEET_HEIGHT_PX = CONTENT_HEIGHT_PX - CAPTION_HEIGHT_PX;

/** How many points one image pixel is: 72 to the inch over 96 to the inch. */
const POINTS_PER_PIXEL = 0.75;

/**
 * How many raster pixels are painted per pixel the image is placed at.
 *
 * The drawing goes into a `.docx` as a picture rather than as vector, because
 * `docx` requires a raster fallback for an SVG whatever Word does with one, so
 * sharpness is bought here and nowhere else. Three gives 288 DPI at the placed
 * size, which is a print resolution (D74), and that has not changed.
 */
export const RASTER_SCALE = 3;

/**
 * The shortest side any painted sheet may have, in raster pixels.
 *
 * **This is what stops the placed size from driving the raster.** D74 measured
 * the canvas straight off the placed size and nothing else, and a thousand-node
 * chain — 188 pixels wide against 157,960 tall — was placed a hundredth of an
 * inch wide and came out of the file as a 3 × 2304 PNG: a three-pixel hairline
 * where a picture should be, reported as a successful export. Tiling does not
 * fix that by itself, because a drawing that thin is still thin on every sheet
 * of it. So the raster has a floor of its own, and when it binds the *whole*
 * canvas is painted larger in the same proportion rather than one side of it,
 * because a picture stretched back into its placed shape is worse than a small
 * one.
 */
export const MIN_RASTER_SIDE = 200;

/**
 * The most raster pixels one sheet may be painted into.
 *
 * A sheet is placed at no more than a whole content area, so three times that
 * each way is the largest canvas `RASTER_SCALE` alone can ever ask for, and
 * this is exactly that number. It is written down rather than left implied
 * because it is also what `MIN_RASTER_SIDE` is trimmed against: a very thin
 * sheet would otherwise be painted arbitrarily large to lift its short side to
 * the floor.
 */
export const MAX_SHEET_RASTER_PIXELS =
  CONTENT_WIDTH_PX * CONTENT_HEIGHT_PX * RASTER_SCALE ** 2;

/**
 * The most raster pixels one export may paint, over every sheet of it.
 *
 * **D74's bound does not survive this cycle, and this is what replaces it.** It
 * held that the canvas was bounded because the placed size was capped at one
 * page, and that cap is exactly what the floor removes; D74 itself named "a
 * pixel budget and a canvas-dimension cap" as what the other route would have
 * needed, so both are now here. The two halves are the per-sheet ceiling above
 * and `MAX_DRAWING_SHEETS`, and this is their product. `toDocx` paints, encodes
 * and releases one sheet at a time, so what is held at once is one canvas
 * rather than sixteen.
 */
export const MAX_RASTER_PIXELS = MAX_SHEET_RASTER_PIXELS * MAX_DRAWING_SHEETS;

/**
 * What stands in for the drawing when the design holds nothing to draw (D51).
 *
 * The same sentence is written out in `pdfPlan.ts` (exported), `toHtml.ts`
 * (private) and `toMarkdown.ts`, with nothing holding the four together the way
 * `exportStyles.test.ts` holds the palette. Unifying them is its own cycle;
 * this pointer is here so whoever does it can find all four.
 */
const NOTHING_TO_DRAW = 'This design has no nodes, so there is nothing to draw.';

/**
 * The language the file declares, for Word's spell-checker and a screen reader.
 *
 * The document's own furniture — its column names and the sentence an empty
 * design gets — is English whatever language the design is written in, exactly
 * as the PDF reasoned it (D71).
 */
const DOCUMENT_LANGUAGE = 'en';

/** One cell: the lines the label itself is written on. Word wraps the rest. */
export type DocxCell = readonly string[];

/** One table: its heading, its columns, their widths, and a row per entry. */
export interface DocxTablePlan {
  readonly heading: string;
  readonly columns: readonly string[];
  /** In DXA, summing to `CONTENT_WIDTH_DXA`, because Word needs both. */
  readonly columnWidths: readonly number[];
  readonly rows: readonly (readonly DocxCell[])[];
}

/** One sheet of the picture: which piece, how big, and what to paint it from. */
export interface DocxDrawingSheet {
  /** The piece of the drawing this sheet shows, in the drawing's own pixels. */
  readonly region: DrawingRegion;
  /** The size on the page, in image pixels at 96 DPI. */
  readonly width: number;
  readonly height: number;
  /** The canvas to paint into, at least `RASTER_SCALE` times the placed size. */
  readonly rasterWidth: number;
  readonly rasterHeight: number;
  /** What the picture says, for a reader who cannot see it (D28). */
  readonly altText: string;
  /** What the sheet says under itself, or `null` when the drawing is one sheet. */
  readonly caption: string | null;
  /** Whether a page break goes in front of it. */
  readonly onItsOwnPage: boolean;
}

/** Where the picture goes, how big, and what to paint it from. */
export interface DocxDrawingPlan {
  /** The layout to render, with every unwritable character already marked. */
  readonly layout: DesignLayout;
  /** Every sheet of the picture, in the order a reader meets them. */
  readonly sheets: readonly DocxDrawingSheet[];
  /** What the document says before the sheets start, or `null` for just one. */
  readonly spread: string | null;
  /**
   * What the document says when the sheet cap forced the drawing under the
   * floor, or `null` when it did not. The drawing never prints smaller than
   * the floor without the file saying so in its own words.
   */
  readonly tooSmall: string | null;
}

/** What the file says about itself, rather than what it draws. */
export interface DocxMetadata {
  readonly title: string;
  readonly description: string;
  readonly language: string;
}

/** The page the document is written on, in DXA. */
export interface DocxPagePlan {
  readonly width: number;
  readonly height: number;
  readonly margin: number;
}

/** The whole document. */
export interface DocxDocumentPlan {
  readonly page: DocxPagePlan;
  readonly metadata: DocxMetadata;
  /** The design's name at the top, as the lines it is written on. */
  readonly title: readonly string[];
  readonly drawing: DocxDrawingPlan | null;
  /** D51's sentence, when there is no drawing; `null` when there is one. */
  readonly nothingToDraw: readonly string[] | null;
  readonly tables: readonly DocxTablePlan[];
  /** How many characters had to be marked, for the page to say so (D69). */
  readonly marked: number;
}

/** One piece of text a `.docx` can carry: its lines, and what was replaced. */
export interface SafeDocxText {
  readonly lines: readonly string[];
  readonly marked: number;
}

/** One column of a table: what it is called and how much of the width it takes. */
interface Column {
  readonly heading: string;
  readonly share: number;
}

/** The table of nodes, with the columns the other three exports print. */
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

/** Every way a line may end in a file someone typed. */
const LINE_BREAKS = /\r\n|\r|\n/u;

/**
 * Plans the whole Word document for a laid-out design.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @returns the page, the metadata, the title, the drawing or the sentence that
 *   stands in for it, both tables, and how many characters had to be marked
 *
 * @example
 * ```typescript
 * const plan = docxPlan(layoutDesign(design));
 * plan.tables[0]?.heading; // 'Nodes'
 * ```
 */
export function docxPlan(layout: DesignLayout): DocxDocumentPlan {
  // Marked once, up front, and everything below reads the safe layout: the
  // tables, the metadata, the description and the picture all come from it, so
  // no two halves of the file can disagree about a label (intake 5.2).
  const safe = markLayout(layout, safeLayoutText);
  const description = describeDrawing(safe.layout);

  return {
    page: {
      width: PAGE_WIDTH_DXA,
      height: PAGE_HEIGHT_DXA,
      margin: PAGE_MARGIN_DXA,
    },
    metadata: {
      title: safe.layout.title,
      description,
      language: DOCUMENT_LANGUAGE,
    },
    title: linesOf(safe.layout.title),
    drawing: planDrawing(safe.layout, description),
    nothingToDraw: safe.layout.nodes.length === 0 ? [NOTHING_TO_DRAW] : null,
    tables: [
      planTable('Nodes', NODE_COLUMNS, safe.layout.nodes.map(nodeRow)),
      planTable('Edges', EDGE_COLUMNS, safe.layout.edges.map(edgeRow)),
    ],
    marked: safe.marked,
  };
}

/**
 * One piece of the design's text, made safe to write into a `.docx`.
 *
 * **Measured against `docx` 9.7.1 rather than assumed**, because Task 07 lost
 * two rounds to guessing at exactly this. What the library does with a control
 * character is nothing at all: it escapes `&`, `<`, `>` and `"` and writes
 * everything else through verbatim, so a U+0001 in a label lands raw in
 * `word/document.xml`. XML 1.0 forbids that character outright — it cannot
 * even be written as a numeric reference — and LibreOffice answers the
 * resulting file with "source file could not be loaded". Word does the same.
 * So the fate is loud, but it is loud when the reader opens the file rather
 * than when the export runs, which is the worst moment to find out.
 *
 * What is marked is therefore exactly what would break the file, and nothing
 * else:
 *
 * - **Marked:** every character XML 1.0 has no room for — U+0000–U+0008,
 *   U+000B, U+000C, U+000E–U+001F, an unpaired surrogate, and U+FFFE/U+FFFF.
 * - **Kept as itself:** a tab. Measured in LibreOffice, a literal tab inside
 *   `w:t` renders exactly as a `w:tab` does, so marking it would throw away a
 *   character the format carries perfectly well.
 * - **Kept as itself:** everything a font might not have a glyph for — an
 *   arrow, a CJK ideograph, U+007F. A `.docx` *names* a font rather than
 *   embedding one, so coverage is the reader's machine's question and not the
 *   file's. This is where the PDF's rule (D69, D72) deliberately does not
 *   follow: marking a character the reader's Word would draw perfectly well
 *   would lose fidelity rather than protect it.
 * - **Turned into a line rather than a mark:** every line ending. A line feed
 *   inside `w:t` is legal XML and renders as a *space*, and a carriage return
 *   is normalised to a line feed by the XML parser before Word ever sees it —
 *   both measured — so a break left alone is a break silently lost. Splitting
 *   here lets the writer put a real break in, and makes `\r\n` one break
 *   rather than two.
 *
 * @param text - one piece of the design's text, exactly as the file gave it
 * @returns the lines to write, and how many characters were marked in them
 *
 * @example
 * ```typescript
 * safeDocxText('SohCharlie'); // { lines: ['Soh■Charlie'], marked: 1 }
 * safeDocxText('Newline\nEcho');    // { lines: ['Newline', 'Echo'], marked: 0 }
 * ```
 */
export function safeDocxText(text: string): SafeDocxText {
  const lines: string[] = [];
  let marked = 0;

  for (const line of text.split(LINE_BREAKS)) {
    let safe = '';

    // Character by character rather than code unit by code unit, so an
    // astral character stays one character and a lone surrogate — which JSON
    // can carry and XML cannot — is seen for what it is.
    for (const character of line) {
      if (isWritable(character.codePointAt(0) ?? 0)) {
        safe += character;
        continue;
      }

      safe += UNDRAWABLE_MARK;
      marked += 1;
    }

    lines.push(safe);
  }

  return { lines, marked };
}

/**
 * The sentence the page says when a design carried text a `.docx` cannot.
 *
 * It names the count, shows the mark, and points at the two exports that do
 * carry every character, for `describeUndrawable`'s reason: "some of this is
 * missing" without "here is where it is not" leaves the user nowhere. A clean
 * export says nothing at all, because announcing a finished download is a
 * live-region question parked for all four exports at once (D41).
 *
 * @param marked - how many characters were marked, from `docxPlan`
 * @returns one sentence for the status region, or `null` when nothing was
 *   marked
 */
export function describeMarkedControls(marked: number): string | null {
  if (marked <= 0) {
    return null;
  }

  // Phrased so the count reads as a count rather than agreeing with a verb:
  // "1 character ... are" is the sentence a plural-only wording produces, and
  // one control character in a design is the ordinary case rather than a rare
  // one.
  const characters =
    marked === 1 ? '1 control character' : `${marked} control characters`;

  return `Exported, but this design holds ${characters} a Word file cannot carry — a .docx is XML, and Word refuses to open one holding them — so this file writes ${UNDRAWABLE_MARK} in their place. The Markdown and HTML exports keep every character.`;
}

/** The same rule, shaped for `markLayout`: lines rejoined, marks counted. */
function safeLayoutText(text: string): MarkedText {
  const safe = safeDocxText(text);

  return { text: safe.lines.join('\n'), marked: safe.marked };
}

/**
 * Whether XML 1.0 has room for this code point.
 *
 * The Char production is `#x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] |
 * [#x10000-#x10FFFF]`, so everything outside it has to go. The line endings
 * are treated as writable here because `safeDocxText` has already split on
 * them; nothing reaches this holding one.
 */
function isWritable(point: number): boolean {
  if (point === 0x09 || point === 0x0a || point === 0x0d) {
    return true;
  }

  if (point < 0x20) {
    return false;
  }

  // A surrogate reaching here is an unpaired one, which no XML file may hold.
  return !(point >= 0xd800 && point <= 0xdfff) && point !== 0xfffe && point !== 0xffff;
}

/**
 * The picture: how big it sits on the page, and what to paint it from.
 *
 * Never scaled up, the way the PDF's is not (D66), so a small design is not
 * blown up into a blurry picture of itself — and, since this cycle, never
 * scaled down so far that its own smallest text stops being writing. How far
 * that is and how many sheets it costs is `drawingSheets.ts`, which the PDF
 * reads too (D78); what is left here is the conversion into the two units a
 * `.docx` measures in and the decision about what to paint each sheet into.
 *
 * A design with no nodes gets no picture at all — the sentence stands in for it
 * (D51, D60).
 */
function planDrawing(layout: DesignLayout, description: string): DocxDrawingPlan | null {
  if (layout.nodes.length === 0) {
    return null;
  }

  const plan = planDrawingSheets(layout, {
    inline: {
      width: CONTENT_WIDTH_PX * POINTS_PER_PIXEL,
      height: DRAWING_MAX_HEIGHT_PX * POINTS_PER_PIXEL,
    },
    sheet: {
      width: CONTENT_WIDTH_PX * POINTS_PER_PIXEL,
      height: DRAWING_SHEET_HEIGHT_PX * POINTS_PER_PIXEL,
    },
    // One drawing pixel is one image pixel at natural size, and an image pixel
    // is three quarters of a point — a `.docx` places pictures at 96 DPI.
    naturalScale: POINTS_PER_PIXEL,
  });

  return {
    layout,
    sheets: plan.sheets.map((sheet) => paintedSheet(sheet, description, plan.inline)),
    spread: plan.spread,
    tooSmall: plan.tooSmall,
  };
}

/**
 * One sheet, in the pixels a `.docx` places an image in and paints one at.
 *
 * **What a sheet is called to a screen reader.** The first one carries the
 * whole description, because a reader who cannot see the picture still needs
 * what it says; every sheet after it carries its own caption and nothing more.
 * Reading the same description out sixteen times would bury the one difference
 * between the sixteen pictures, which is which piece of the drawing each is.
 */
function paintedSheet(
  sheet: DrawingSheet,
  description: string,
  inline: boolean,
): DocxDrawingSheet {
  const width = sheet.width / POINTS_PER_PIXEL;
  const height = sheet.height / POINTS_PER_PIXEL;
  const raster = rasterScaleFor(width, height);
  const altText =
    sheet.caption === null ? description : `${sheet.caption} ${description}`;

  return {
    region: sheet.region,
    width,
    height,
    rasterWidth: Math.round(width * raster),
    rasterHeight: Math.round(height * raster),
    altText: sheet.number === 1 ? altText : (sheet.caption ?? description),
    caption: sheet.caption,
    onItsOwnPage: !inline,
  };
}

/**
 * How many raster pixels to paint per placed pixel, for one sheet.
 *
 * Three rules, in this order, and the order is what makes it a rule rather
 * than a preference:
 *
 * 1. Never below `RASTER_SCALE`, which is the print resolution D74 bought and
 *    this cycle does not give back.
 * 2. Never so few that the short side of the picture falls under
 *    `MIN_RASTER_SIDE` — the hairline that constant exists to stop.
 * 3. Never so many that one sheet passes `MAX_SHEET_RASTER_PIXELS`.
 *
 * The second and third can pull against each other on a sheet thin enough, and
 * the budget wins: a canvas larger than the budget is memory this export has
 * said it will not take. They cannot pull against the first, because a sheet is
 * placed at no more than one content area and three times that each way is
 * exactly the budget.
 */
function rasterScaleFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) {
    return RASTER_SCALE;
  }

  const wanted = Math.max(RASTER_SCALE, MIN_RASTER_SIDE / Math.min(width, height));
  const affordable = Math.sqrt(MAX_SHEET_RASTER_PIXELS / (width * height));

  return Math.max(RASTER_SCALE, Math.min(wanted, affordable));
}

/** One table: its heading, its columns, their widths in DXA, and its rows. */
function planTable(
  heading: string,
  columns: readonly Column[],
  rows: readonly (readonly string[])[],
): DocxTablePlan {
  return {
    heading,
    columns: columns.map((column) => column.heading),
    columnWidths: columnWidths(columns),
    rows: rows.map((row) => row.map(linesOf)),
  };
}

/**
 * How wide each column is, in whole DXA that add up to the text column.
 *
 * Whole numbers because Word writes them as integers, and the last column
 * takes whatever rounding left over: a table whose columns do not sum to its
 * own width is the one Word lays out differently from every other reader.
 */
function columnWidths(columns: readonly Column[]): readonly number[] {
  const widths = columns
    .slice(0, -1)
    .map((column) => Math.round(CONTENT_WIDTH_DXA * column.share));
  const used = widths.reduce((total, width) => total + width, 0);

  return [...widths, CONTENT_WIDTH_DXA - used];
}

/** The node table's cells, in the order the other three exports print them. */
function nodeRow(node: LayoutNode): readonly string[] {
  return [node.id, node.label, node.type];
}

/** The edge table's cells, likewise. */
function edgeRow(edge: LayoutEdge): readonly string[] {
  return [edge.from, edge.to, edge.label];
}

/** One already-safe piece of text, split back into the lines it is written on. */
function linesOf(text: string): readonly string[] {
  return text.split('\n');
}
