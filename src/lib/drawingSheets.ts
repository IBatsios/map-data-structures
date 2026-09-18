/**
 * How small the drawing's text may print, and how many sheets it gets at that
 * size.
 *
 * **This is the seam both paginated exports read**, on D78's precedent. Before
 * it, the PDF and the Word document each carried their own copy of the same
 * three lines — a `Math.min` that shrank the drawing by whatever it took to fit
 * one page, with no lower bound under it — and the two copies agreed only
 * because nobody had changed one of them yet. A fifteen-node design came out of
 * both with its smallest text at about 3.7 pt, which is ink rather than
 * writing. The rule now lives once, and each format passes in its own page
 * (D66 and D75 chose two different ones deliberately) and gets back the same
 * answer expressed in points.
 *
 * **Everything is in points**, because that is the only unit both formats share
 * and the only one a floor can honestly be stated in. A PDF is written in
 * points already; a `.docx` measures its images in pixels at 96 DPI, which is
 * three quarters of a point each, so `docxPlan` converts on the way in and on
 * the way out. `scale` throughout this module means *points on the page per
 * pixel of the drawing*.
 *
 * **The floor is judged against the smallest text the drawing draws**, which is
 * the 11-pixel type line under every node (`TYPE_FONT_SIZE`), not the 14-pixel
 * label. That distinction is the whole reason the number is right: measured
 * against the label, a floor of 6 pt would let the type line print at 4.7 pt,
 * and the type line is the first thing a reader loses.
 *
 * **Nothing here touches the DOM**, so all of it is pinned in
 * `drawingSheets.test.ts` rather than in a browser. That is deliberate and it
 * is the point of the split: the decision that was wrong was arithmetic, and it
 * was untestable only because it was buried in two modules that need a browser
 * for everything else they do.
 */

import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';
import { TYPE_FONT_SIZE } from './layout';

/**
 * The size of the smallest text the drawing ever draws, in drawing pixels.
 *
 * Taken from `layout.ts` rather than written down again, so that a change to
 * the drawing's typography moves the floor with it instead of leaving this
 * module quietly measuring the wrong thing. The drawing draws at three sizes —
 * 14 for a node's label, 12 for an edge's, 11 for the type line — and a floor
 * is only a floor if it is set against the smallest of them.
 */
export const SMALLEST_TEXT_PX = TYPE_FONT_SIZE;

/**
 * The least the drawing's smallest text may print at, in points.
 *
 * Six, and the number was measured rather than felt. The cost of a floor is
 * sheets, and it rises fast: on `platform-overview.json` — the fixture built to
 * stand for the owner's own scale — 6 pt costs three sheets in both formats,
 * 6.5 pt costs three in the PDF and six in the Word file, and 7 pt costs six in
 * both. Doubling the Word document for half a point of type is a bad trade, and
 * 6 pt is a real printed size: it is what a footnote or a legal line is set in,
 * and at it the node label prints at 7.6 pt and the edge label at 6.5 pt,
 * because those are drawn larger in the same proportion.
 */
export const MIN_TEXT_POINTS = 6;

/**
 * The most sheets one drawing may take, however large the design.
 *
 * D74 argued the raster was bounded because the placed size was capped at one
 * page. This cycle removes that cap, so the bound has to be built rather than
 * inherited, and this is half of it — `docxPlan` derives its pixel budget from
 * this number and the size of one page. Sixteen because `estate-sweep.json`, at
 * forty nodes and 6,480 pixels tall, needs twelve, and a cap that the largest
 * design anyone has asked for already sits against is a cap that will be hit by
 * accident. Past it the drawing is printed smaller than the floor and says so,
 * because a five-hundred-sheet PDF is not a document.
 */
export const MAX_DRAWING_SHEETS = 16;

/**
 * How far a sheet's edge may be pulled back to keep a shape whole, as a
 * fraction of the sheet.
 *
 * A cut that lands through a node box is moved left, or up, to the near edge of
 * whatever it was about to cut, so the shape is whole on the next sheet
 * (criterion 5.2: nothing dropped, nothing cut in half). Without a limit, a
 * drawing whose shapes are nearly as wide as a sheet would advance a sliver at
 * a time and never finish. Half a sheet is the limit, which bounds the sheets
 * along one axis at twice what a clean cut would need.
 */
const MIN_SHEET_ADVANCE = 0.5;

/**
 * How far the ink of a shape reaches past the rectangle it is measured by, in
 * drawing pixels.
 *
 * A node's stroke is drawn 1.5 wide and straddles its box, an edge's arrowhead
 * is seven marker units at that width, and a plate has a stroke of its own. So
 * every element is grown by a little before the sheets are cut around it, and
 * the number is comfortably above all three rather than exactly any of them.
 */
const ELEMENT_INK_MARGIN = 12;

/**
 * How many times the scale is halved when the sheet cap has to be honoured.
 *
 * The number of sheets only ever grows as the drawing is printed larger, so the
 * largest scale that stays inside the cap can be found by bisection. Thirty
 * steps takes the answer well past the precision a page size is stated to, and
 * a fixed count keeps the function total: it cannot fail to converge, and the
 * same design always produces the same plan.
 */
const SCALE_STEPS = 30;

/** How much room the drawing has to draw in, in points. */
export interface SheetRoom {
  readonly width: number;
  readonly height: number;
}

/** The two rooms a drawing may be given, both in points. */
export interface DrawingRoom {
  /**
   * Where the drawing sits in the flow of the document, under the title. This
   * is what it has always had, and a design small enough to print at the floor
   * here still gets exactly it.
   */
  readonly inline: SheetRoom;
  /** A whole sheet of its own, which is what it gets once it has to be tiled. */
  readonly sheet: SheetRoom;
}

/** One rectangle of the drawing, in the drawing's own pixels. */
export interface DrawingRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One sheet of the drawing: which piece of it, where, and what it is called. */
export interface DrawingSheet {
  /** The piece of the drawing this sheet shows, in drawing pixels. */
  readonly region: DrawingRegion;
  /** Its place in the whole, counted from one, left to right then top to bottom. */
  readonly number: number;
  readonly column: number;
  readonly row: number;
  /** How large that piece prints, in points. */
  readonly width: number;
  readonly height: number;
  /** What the sheet says about itself, or `null` when the drawing is one sheet. */
  readonly caption: string | null;
}

/** The whole drawing, sheet by sheet, and what the document says about it. */
export interface DrawingSheetPlan {
  /** Points on the page per pixel of the drawing. Never above one (D66). */
  readonly scale: number;
  readonly sheets: readonly DrawingSheet[];
  readonly columns: number;
  readonly rows: number;
  /**
   * True when the drawing still sits in the flow under the title, exactly as it
   * did before this cycle. False when it has taken sheets of its own.
   */
  readonly inline: boolean;
  /** True when the drawing runs to more than one sheet. */
  readonly tiled: boolean;
  /** What the drawing's smallest text prints at, in points. */
  readonly smallestTextPoints: number;
  /** What the document says before the sheets start, or `null` when inline. */
  readonly spread: string | null;
  /**
   * What the document says when the floor could not be kept inside the sheet
   * cap, or `null` when it was kept. A drawing never prints below the floor
   * without the document saying so.
   */
  readonly tooSmall: string | null;
}

/** One span of one axis, in drawing pixels: where a shape starts and ends. */
interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * Plans the drawing's sheets for one format's page.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param room - where the drawing may go, in points: in the flow under the
 *   title, and on a sheet of its own
 * @returns the scale, every sheet and the piece of the drawing on it, and the
 *   sentences the document says about them
 *
 * @example
 * ```typescript
 * const plan = planDrawingSheets(layout, {
 *   inline: { width: 516, height: 651 },
 *   sheet: { width: 516, height: 677 },
 * });
 * plan.smallestTextPoints; // 6 or more, unless `plan.tooSmall` says why not
 * ```
 */
export function planDrawingSheets(
  layout: DesignLayout,
  room: DrawingRoom,
): DrawingSheetPlan {
  const size = { width: layout.width, height: layout.height };
  const inlineScale = fitScale(size, room.inline);

  // The drawing that already printed large enough keeps exactly what it had:
  // the same place in the document, the same size, no caption and nothing said
  // about it. Every design under about a dozen nodes lands here, which is why
  // this cycle changes nothing a reader of a small design would notice.
  if (textPoints(inlineScale) >= MIN_TEXT_POINTS) {
    return onePiece(size, inlineScale, true);
  }

  const spans = elementSpans(layout);
  const floorScale = Math.min(1, MIN_TEXT_POINTS / SMALLEST_TEXT_PX);
  const sheetFit = fitScale(size, room.sheet);

  // Never below what would have fitted a whole sheet anyway: a drawing that is
  // small enough for one sheet is printed on one, not blown up and cut in four.
  const wanted = Math.max(floorScale, sheetFit);
  const scale = withinCap(size, spans, room.sheet, wanted, sheetFit);

  return laidOut(size, spans, room.sheet, scale);
}

/**
 * Every shape a sheet boundary must not be the only cut through.
 *
 * These are the things criterion 5.2 names: a node's box, which carries its
 * label and its type line inside it; an edge's route; and the plate an edge
 * label is written on. Each is grown by the reach of its own ink, because a
 * stroke straddles the rectangle it is measured by and an arrowhead sits past
 * the end of its line.
 *
 * It is exported because the sheets are cut around exactly this list, and a
 * test that checked a list of its own would be checking the wrong thing.
 *
 * @param layout - the design as the preview drew it
 * @returns one rectangle per shape, in drawing pixels
 */
export function drawingElements(layout: DesignLayout): readonly DrawingRegion[] {
  return [...layout.nodes.map(nodeElement), ...layout.edges.flatMap(edgeElements)].map(
    (element) => grown(element, layout),
  );
}

/** What the drawing's smallest text prints at, at a scale, in points. */
export function textPoints(scale: number): number {
  return SMALLEST_TEXT_PX * scale;
}

/** A node's box, which already holds both lines of its text. */
function nodeElement(node: LayoutNode): DrawingRegion {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

/** An edge's route, and the plate its label sits on when it has one. */
function edgeElements(edge: LayoutEdge): readonly DrawingRegion[] {
  const xs = edge.points.map((point) => point.x);
  const ys = edge.points.map((point) => point.y);
  const route: DrawingRegion = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };

  return edge.labelBox.width > 0 ? [route, edge.labelBox] : [route];
}

/** One element with the reach of its ink added, kept inside the canvas. */
function grown(element: DrawingRegion, layout: DesignLayout): DrawingRegion {
  const x = Math.max(0, element.x - ELEMENT_INK_MARGIN);
  const y = Math.max(0, element.y - ELEMENT_INK_MARGIN);

  return {
    x,
    y,
    width: Math.min(layout.width, element.x + element.width + ELEMENT_INK_MARGIN) - x,
    height: Math.min(layout.height, element.y + element.height + ELEMENT_INK_MARGIN) - y,
  };
}

/** Every element's reach along each axis, which is all the cutting needs. */
function elementSpans(layout: DesignLayout): { x: readonly Span[]; y: readonly Span[] } {
  const elements = drawingElements(layout);

  return {
    x: elements.map((element) => ({
      start: element.x,
      end: element.x + element.width,
    })),
    y: elements.map((element) => ({
      start: element.y,
      end: element.y + element.height,
    })),
  };
}

/** The largest scale that fits the whole drawing in a room, never above one. */
function fitScale(size: SheetRoom, room: SheetRoom): number {
  if (size.width <= 0 || size.height <= 0) {
    return 1;
  }

  return Math.min(1, room.width / size.width, room.height / size.height);
}

/** The whole drawing on one sheet, with nothing to say about it. */
function onePiece(size: SheetRoom, scale: number, inline: boolean): DrawingSheetPlan {
  return {
    scale,
    sheets: [
      {
        region: { x: 0, y: 0, width: size.width, height: size.height },
        number: 1,
        column: 1,
        row: 1,
        width: size.width * scale,
        height: size.height * scale,
        caption: null,
      },
    ],
    columns: 1,
    rows: 1,
    inline,
    tiled: false,
    smallestTextPoints: textPoints(scale),
    spread: inline ? null : ONE_SHEET_OF_ITS_OWN,
    tooSmall: null,
  };
}

/**
 * The largest scale at or below `wanted` whose sheets stay inside the cap.
 *
 * The number of sheets only ever grows as the drawing is printed larger, so
 * bisection finds the answer, and `fit` is a scale that always works because
 * the whole drawing fits one sheet at it. The cap binds only for designs far
 * past anything the owner has: `estate-sweep.json` at forty nodes needs twelve
 * sheets and never reaches here.
 */
function withinCap(
  size: SheetRoom,
  spans: { x: readonly Span[]; y: readonly Span[] },
  room: SheetRoom,
  wanted: number,
  fit: number,
): number {
  if (sheetCount(size, spans, room, wanted) <= MAX_DRAWING_SHEETS) {
    return wanted;
  }

  let works = fit;
  let tooMany = wanted;

  for (let step = 0; step < SCALE_STEPS; step += 1) {
    const middle = (works + tooMany) / 2;

    if (sheetCount(size, spans, room, middle) <= MAX_DRAWING_SHEETS) {
      works = middle;
      continue;
    }

    tooMany = middle;
  }

  return works;
}

/**
 * How many cuts one axis is counted to before the answer stops mattering.
 *
 * One more than the cap, so that a scale needing too many sheets is still
 * reported as needing too many rather than as exactly the cap — counting the
 * two hundred sheets a thousand-node design would want is work for an answer
 * that is only ever compared against sixteen. Every scale the plan is finally
 * built at is inside the cap, so no list of cuts a sheet is made from is ever
 * one that stopped early.
 */
const CUT_LIMIT = MAX_DRAWING_SHEETS + 1;

/** How many sheets a scale costs, counted no further than it has to be. */
function sheetCount(
  size: SheetRoom,
  spans: { x: readonly Span[]; y: readonly Span[] },
  room: SheetRoom,
  scale: number,
): number {
  const columns = cutsAlong(size.width, room.width / scale, spans.x).length;
  const rows = cutsAlong(size.height, room.height / scale, spans.y).length;

  return columns * rows;
}

/**
 * Where the sheets start along one axis.
 *
 * Each sheet begins where the last one ended, except that a sheet whose edge
 * would fall through a shape starts back at that shape's own near edge instead,
 * so the shape is whole on it. Two rules keep that from running away: a shape
 * too large for a sheet cannot pull an edge back at all, because no sheet could
 * ever hold it whole and the ink still appears on every sheet it crosses; and
 * no sheet advances by less than half a sheet, whatever it was about to cut.
 * The last sheet is pulled back to end exactly at the far edge of the drawing,
 * so the drawing never ends in a strip of blank paper.
 */
function cutsAlong(length: number, sheet: number, spans: readonly Span[]): number[] {
  if (length <= sheet || sheet <= 0) {
    return [0];
  }

  const last = length - sheet;
  const starts = [0];
  let current = 0;

  while (current < last && starts.length < CUT_LIMIT) {
    const edge = current + sheet;
    const pulled = spans.reduce(
      (nearest, span) =>
        span.end - span.start <= sheet && span.start < edge && span.end > edge
          ? Math.min(nearest, span.start)
          : nearest,
      edge,
    );
    const next = Math.min(Math.max(pulled, current + sheet * MIN_SHEET_ADVANCE), last);

    starts.push(next);
    current = next;
  }

  return starts;
}

/** The drawing cut into its sheets at a settled scale, with its sentences. */
function laidOut(
  size: SheetRoom,
  spans: { x: readonly Span[]; y: readonly Span[] },
  room: SheetRoom,
  scale: number,
): DrawingSheetPlan {
  const sheetWidth = room.width / scale;
  const sheetHeight = room.height / scale;
  const columnStarts = cutsAlong(size.width, sheetWidth, spans.x);
  const rowStarts = cutsAlong(size.height, sheetHeight, spans.y);
  const columns = columnStarts.length;
  const rows = rowStarts.length;
  const total = columns * rows;

  if (total === 1) {
    return onePiece(size, scale, false);
  }

  const sheets = rowStarts.flatMap((top, rowIndex) =>
    columnStarts.map((left, columnIndex) => {
      const region: DrawingRegion = {
        x: left,
        y: top,
        width: Math.min(sheetWidth, size.width - left),
        height: Math.min(sheetHeight, size.height - top),
      };

      return {
        region,
        number: rowIndex * columns + columnIndex + 1,
        column: columnIndex + 1,
        row: rowIndex + 1,
        width: region.width * scale,
        height: region.height * scale,
        caption: describeSheet(
          rowIndex * columns + columnIndex + 1,
          total,
          columnIndex + 1,
          columns,
          rowIndex + 1,
          rows,
        ),
      };
    }),
  );

  return {
    scale,
    sheets,
    columns,
    rows,
    inline: false,
    tiled: true,
    smallestTextPoints: textPoints(scale),
    spread: describeSpread(total, columns, rows),
    tooSmall: textPoints(scale) < MIN_TEXT_POINTS ? describeTooSmall(scale) : null,
  };
}

/** What a drawing that is one sheet but not in the flow says about itself. */
const ONE_SHEET_OF_ITS_OWN = 'The drawing follows on a sheet of its own.';

/**
 * What one sheet of a tiled drawing is called.
 *
 * The count alone is what a reader needs when the sheets run one way — sheet 2
 * of 3 is unambiguous when there are three sheets in a row. The column and the
 * row are added only when there are both, because that is the only case where
 * knowing the number does not tell you where to hold the paper.
 */
function describeSheet(
  number: number,
  total: number,
  column: number,
  columns: number,
  row: number,
  rows: number,
): string {
  const place = `Drawing, sheet ${number} of ${total}`;

  return columns > 1 && rows > 1
    ? `${place} — column ${column} of ${columns}, row ${row} of ${rows}.`
    : `${place}.`;
}

/** What the document says before a tiled drawing starts, so nobody hunts. */
function describeSpread(total: number, columns: number, rows: number): string {
  if (columns > 1 && rows > 1) {
    return `The drawing follows on ${total} sheets — ${columns} across and ${rows} down, left to right and then top to bottom.`;
  }

  const order = columns > 1 ? 'left to right' : 'top to bottom';

  return `The drawing follows on ${total} sheets, ${order}.`;
}

/**
 * What the document says when the floor had to give way to the sheet cap.
 *
 * It names the floor, the size actually used and where every label still is, in
 * the shape D69's marking sentence uses: what happened, why, and what the
 * reader can do about it. A drawing this large is unreadable on paper whatever
 * is done to it, and the honest thing is to say so in the document rather than
 * to let a reader work it out from the picture.
 */
function describeTooSmall(scale: number): string {
  const points = textPoints(scale);
  const printed = points >= 0.1 ? `${points.toFixed(1)} pt` : 'under 0.1 pt';

  return `This drawing is too large to print at ${MIN_TEXT_POINTS} pt: at that size it would need more than ${MAX_DRAWING_SHEETS} sheets. It is shown smaller, with its smallest text at ${printed}. Both tables below carry every label at full size.`;
}
