/**
 * Replacing characters throughout a laid-out design, one for one.
 *
 * Two exports need the same walk for different reasons. The PDF replaces what
 * its embedded font cannot draw (`drawableText.ts`, D69, D72); the Word file
 * replaces what XML 1.0 forbids, because a `.docx` is XML and a file carrying
 * one is a file Word and LibreOffice refuse to open (`docxPlan.ts`). The
 * *rule* differs; the walk — title, then every node's id, label, drawn lines
 * and type, then every edge's ends, label and drawn lines — is identical, and
 * a second copy of it is a second thing to drift.
 *
 * So the walk lives here and the rule arrives as an argument, the same way
 * `pdfPlan(layout, measure)` takes its measurement and `renderDrawing(layout,
 * doc)` takes its document.
 *
 * **One mark per character, and the geometry is never recomputed.** A
 * substitution that changed the length of a label would need the design laid
 * out again, and every export's promise is that the file shows what the
 * preview shows. So the marked layout keeps every box, route and canvas the
 * preview used, and only the text differs.
 *
 * Pure arithmetic over strings, so both callers are unit-tested without a DOM.
 */

import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';

/** One piece of text, marked, and how many characters had to be marked in it. */
export interface MarkedText {
  readonly text: string;
  readonly marked: number;
}

/** A rule for one piece of text: what to write, and how much was replaced. */
export type MarkText = (text: string) => MarkedText;

/** A whole layout, marked, and how many characters the rule replaced in it. */
export interface MarkedLayout {
  readonly layout: DesignLayout;
  readonly marked: number;
}

/**
 * Applies one marking rule to every piece of text in a laid-out design.
 *
 * @param layout - the design as the preview drew it, which is left untouched
 * @param mark - what to write for one piece of text, and how much it replaced
 * @returns the layout to export, and how many characters were replaced in it —
 *   counted once per piece of the design's own text, not once per line a label
 *   happens to be drawn on
 *
 * @example
 * ```typescript
 * const marked = markLayout(layout, (text) => markUndrawable(text, coverage));
 * ```
 */
export function markLayout(layout: DesignLayout, mark: MarkText): MarkedLayout {
  const title = mark(layout.title);
  const nodes = layout.nodes.map((node) => markNode(node, mark));
  const edges = layout.edges.map((edge) => markEdge(edge, mark));

  return {
    layout: {
      ...layout,
      title: title.text,
      nodes: nodes.map((one) => one.node),
      edges: edges.map((one) => one.edge),
    },
    marked: title.marked + totalOf(nodes) + totalOf(edges),
  };
}

/** One node: its id, its label, the lines it is drawn on, and its type. */
function markNode(
  node: LayoutNode,
  mark: MarkText,
): { readonly node: LayoutNode; readonly marked: number } {
  const id = mark(node.id);
  const label = mark(node.label);
  const type = mark(node.type);

  return {
    node: {
      ...node,
      id: id.text,
      label: label.text,
      type: type.text,
      labelLines: markLines(node.labelLines, mark),
    },
    marked: id.marked + label.marked + type.marked,
  };
}

/** One edge: both ends, its label, and the lines its plate is drawn with. */
function markEdge(
  edge: LayoutEdge,
  mark: MarkText,
): { readonly edge: LayoutEdge; readonly marked: number } {
  const from = mark(edge.from);
  const to = mark(edge.to);
  const label = mark(edge.label);

  return {
    edge: {
      ...edge,
      from: from.text,
      to: to.text,
      label: label.text,
      labelLines: markLines(edge.labelLines, mark),
    },
    marked: from.marked + to.marked + label.marked,
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
function markLines(lines: readonly string[], mark: MarkText): readonly string[] {
  return lines.map((line) => mark(line).text);
}

function totalOf(marked: readonly { readonly marked: number }[]): number {
  return marked.reduce((total, one) => total + one.marked, 0);
}
