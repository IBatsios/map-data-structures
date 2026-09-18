/**
 * What the PDF export does about a character its font cannot draw.
 *
 * **The defect this exists to close.** jsPDF writes nothing at all for a
 * character the embedded face has no glyph for: not in the picture and not in
 * the tables either, so no copy of it survives anywhere in the file, and the
 * export still reports success. `API gateway (東京)` arrived as
 * `API gateway ()`, which reads as a complete label — a reader has no way to
 * know a region name was ever there, and neither has the person who exported
 * it. That is intake 5.2's "mislabeled" rather than an honest limit, and it is
 * not only about scripts: the face carries no arrow either, so `Gateway →
 * Queue` lost its arrow in ordinary English designs.
 *
 * **The fix is not a bigger font.** A face covering every script is megabytes,
 * and one would still have gaps. The fix is that the loss stops being silent:
 * every character the font cannot draw is replaced, one for one, with a mark
 * the reader can see, in the drawing and in the tables alike. `describeUndrawable`
 * gives the page the sentence to say afterwards, naming how many there were and
 * which exports still carry them.
 *
 * **One mark per character, and the geometry is never recomputed.** A
 * substitution that changed the length of a label would need the design laid
 * out again, and the export's whole promise is that the file shows what the
 * preview shows. So the marked layout keeps every box, route and canvas the
 * preview used, and only the text differs — by one visible mark wherever a
 * character could not be drawn.
 *
 * Pure arithmetic over strings, so it is unit-tested in `drawableText.test.ts`;
 * `toPdf` is the only caller, and the sentence is shown by the page.
 */

import type { FontCoverage } from './fontCoverage';
import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';

/**
 * What stands in for a character the font cannot draw.
 *
 * A filled square, U+25A0, and the choice is a measured one rather than a
 * taste: the usual "tofu" is the hollow U+25A1 and the embedded face has no
 * glyph for *that* either, so a hollow square would have been dropped in its
 * turn and the file would be back to saying nothing. A unit test asserts the
 * face can draw whatever this is set to.
 */
export const UNDRAWABLE_MARK = '■';

/** One piece of text, marked, and how many characters had to be marked in it. */
export interface MarkedText {
  readonly text: string;
  readonly undrawable: number;
}

/** A whole layout, marked, and how many characters the font could not draw. */
export interface DrawableLayout {
  readonly layout: DesignLayout;
  readonly undrawable: number;
}

/** The one control character nothing is ever asked to draw: a line break. */
const LINE_BREAK = 0x0a;

/** The C0 range, then DEL and the C1 range that follows Latin-1. */
const LAST_C0 = 0x1f;
const FIRST_C1 = 0x7f;
const LAST_C1 = 0x9f;

/**
 * Replaces every character the font cannot draw with a visible mark.
 *
 * @param text - one piece of the design's text, exactly as the file gave it
 * @param coverage - what the embedded face can draw, from `readFontCoverage`
 * @returns the text to write, and how many characters were replaced in it
 *
 * @example
 * ```typescript
 * markUndrawable('Gateway → Queue', coverage);
 * // { text: 'Gateway ■ Queue', undrawable: 1 }
 * ```
 */
export function markUndrawable(text: string, coverage: FontCoverage): MarkedText {
  let marked = '';
  let undrawable = 0;

  // Character by character rather than code unit by code unit, so something
  // from beyond the basic plane — which jsPDF cannot look up at all — becomes
  // one mark rather than two.
  for (const character of text) {
    if (isDrawable(character.codePointAt(0) ?? 0, coverage)) {
      marked += character;
      continue;
    }

    marked += UNDRAWABLE_MARK;
    undrawable += 1;
  }

  return { text: marked, undrawable };
}

/**
 * Marks every piece of text in a laid-out design.
 *
 * @param layout - the design as the preview drew it, which is left untouched
 * @param coverage - what the embedded face can draw
 * @returns the layout to export, and how many characters the font could not
 *   draw in it — counted once per piece of the design's own text, not once per
 *   line a label happens to be drawn on
 *
 * @example
 * ```typescript
 * const drawable = drawableLayout(layout, readFontCoverage(FONT));
 * const plan = pdfPlan(drawable.layout, measure);
 * ```
 */
export function drawableLayout(
  layout: DesignLayout,
  coverage: FontCoverage,
): DrawableLayout {
  const title = markUndrawable(layout.title, coverage);
  const nodes = layout.nodes.map((node) => markNode(node, coverage));
  const edges = layout.edges.map((edge) => markEdge(edge, coverage));

  return {
    layout: {
      ...layout,
      title: title.text,
      nodes: nodes.map((marked) => marked.node),
      edges: edges.map((marked) => marked.edge),
    },
    undrawable: title.undrawable + totalOf(nodes) + totalOf(edges),
  };
}

/**
 * The sentence the page says when the font could not draw the whole design.
 *
 * It points at the two exports that do carry every character, because "some of
 * this is missing" without "here is where it is not" leaves the user nowhere.
 * A clean export says nothing at all: announcing a finished download is a
 * live-region question parked for all four exports at once (D41), and this is
 * not the place to answer it.
 *
 * @param undrawable - how many characters were marked, from `drawableLayout`
 * @returns one sentence for the status region, or `null` when nothing was lost
 */
export function describeUndrawable(undrawable: number): string | null {
  if (undrawable <= 0) {
    return null;
  }

  const characters = undrawable === 1 ? '1 character' : `${undrawable} characters`;

  return `Exported, but the font this PDF carries cannot draw ${characters} in this design and writes ${UNDRAWABLE_MARK} instead. The Markdown and HTML exports keep every character.`;
}

/**
 * Whether the font draws this code point, with only the line break spared.
 *
 * Every control character used to be spared, on the premise that `pdfPlan`
 * breaks a label's lines on them. It does not — `wrap` splits a cell on a
 * newline and on nothing else, and `splitWords` breaks on a space rather than
 * on whitespace — so a tab reached `pdf.text`, and jsPDF does not skip a
 * control character, it ends the string at one. `Alpha\tBravo` was written
 * into the Nodes table as `Alpha`, unmarked and uncounted, with the export
 * still reporting success. So a control character is marked like any other
 * character the face cannot draw: a mark in a rare label is the honest price
 * of never losing the rest of one.
 *
 * The font is not asked about one, because its answer would be misleading:
 * Roboto Regular maps U+0000, U+0002 and U+000D, as many faces do, and jsPDF
 * ends the string at them all the same. A glyph existing is not the question.
 *
 * The line break is the exception because nothing is ever asked to draw one.
 * `pdfPlan`'s `wrap` splits a cell on it before a line is measured, and
 * svg2pdf removes newlines from a text element before jsPDF sees it, so a
 * label written on two lines stays on two lines rather than gaining a square.
 */
function isDrawable(point: number, coverage: FontCoverage): boolean {
  if (isControl(point)) {
    return point === LINE_BREAK;
  }

  return coverage.has(point);
}

function isControl(point: number): boolean {
  return point <= LAST_C0 || (point >= FIRST_C1 && point <= LAST_C1);
}

/** One node: its id, its label, the lines it is drawn on, and its type. */
function markNode(
  node: LayoutNode,
  coverage: FontCoverage,
): { readonly node: LayoutNode; readonly undrawable: number } {
  const id = markUndrawable(node.id, coverage);
  const label = markUndrawable(node.label, coverage);
  const type = markUndrawable(node.type, coverage);

  return {
    node: {
      ...node,
      id: id.text,
      label: label.text,
      type: type.text,
      labelLines: markLines(node.labelLines, coverage),
    },
    undrawable: id.undrawable + label.undrawable + type.undrawable,
  };
}

/** One edge: both ends, its label, and the lines its plate is drawn with. */
function markEdge(
  edge: LayoutEdge,
  coverage: FontCoverage,
): { readonly edge: LayoutEdge; readonly undrawable: number } {
  const from = markUndrawable(edge.from, coverage);
  const to = markUndrawable(edge.to, coverage);
  const label = markUndrawable(edge.label, coverage);

  return {
    edge: {
      ...edge,
      from: from.text,
      to: to.text,
      label: label.text,
      labelLines: markLines(edge.labelLines, coverage),
    },
    undrawable: from.undrawable + to.undrawable + label.undrawable,
  };
}

/**
 * The lines a label is drawn on, marked but not counted a second time.
 *
 * They are the same text as the label, split for the picture, so counting them
 * would report a label twice over. Marking them is not optional though: the
 * drawing is drawn from these and the table from the label, and a file whose
 * two halves disagree is the failure intake 5.2 names.
 */
function markLines(lines: readonly string[], coverage: FontCoverage): readonly string[] {
  return lines.map((line) => markUndrawable(line, coverage).text);
}

function totalOf(marked: readonly { readonly undrawable: number }[]): number {
  return marked.reduce((total, one) => total + one.undrawable, 0);
}
