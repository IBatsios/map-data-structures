/**
 * The design as Markdown: a heading, a table of nodes, a table of edges, and
 * the drawing as a fenced ` ```mermaid ` flowchart.
 *
 * It takes the **layout**, not the design, and that is the point. Intake 5.2
 * asks every export to show what the preview shows, and the preview draws from
 * `layoutDesign` — which keeps every node and every edge in file order, keeps
 * each label exactly as the file gave it, and has already resolved each node's
 * kind through `shapes.ts`. Reading those four facts off the same object the
 * SVG is drawn from is what stops the `.md` and the picture ever disagreeing.
 * The geometry is unused here: Mermaid computes its own layout, so no route,
 * box or plate from `layout.ts` is read.
 *
 * Pure, and no dependency: a fenced block is text, so this writes text (D7,
 * D8). Nothing here renders a diagram.
 *
 * Two things it is careful about, both correctness rather than security:
 *
 * 1. **Ids.** A node's `id` is free text (D14, D18, D19) and may hold spaces
 *    and brackets that Mermaid will not take as an id, so the block mints its
 *    own — `n0`, `n1`, in file order — and the user's id stays in the table
 *    where it is read rather than parsed.
 * 2. **Labels.** They may hold quotes, hashes, arrows or line breaks. Every one
 *    goes inside a quoted Mermaid label with the characters that would end it
 *    escaped, and every table cell has its pipes and backslashes escaped, so no
 *    label can break the row it sits in.
 *
 * What it will not do is tidy the text. A label that arrived with spaces around
 * it keeps them (D39): the file shows what the design said.
 */

import { EDGE_HEADINGS, NODE_HEADINGS, NOTHING_TO_DRAW } from './exportFurniture';
import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';

/**
 * Dagre is laid out with `rankdir: 'TB'` in `layout.ts`, so top-to-bottom is
 * the direction the reader just saw in the preview.
 */
const FLOWCHART_DIRECTION = 'TD';

/** What a Mermaid statement is indented by, as the Mermaid docs write it. */
const STATEMENT_INDENT = '    ';

/** The brackets that wrap a Mermaid label, opening and closing. */
type MermaidBrackets = readonly [open: string, close: string];

/**
 * A silhouette for every kind `shapes.ts` resolves a type to (D25), keyed by
 * that kind and never re-derived from the type string. A seventh kind added
 * there falls through to the rectangle below, which `toMarkdown.test.ts`
 * fails on rather than exporting quietly.
 */
const BRACKETS_BY_KIND: ReadonlyMap<string, MermaidBrackets> = new Map([
  ['service', ['(', ')']],
  ['database', ['[(', ')]']],
  ['queue', ['([', '])']],
  ['external', ['[[', ']]']],
  ['user', ['{{', '}}']],
  ['decision', ['{', '}']],
]);

/** The shape for a kind with no silhouette of its own: a plain rectangle. */
const DEFAULT_BRACKETS: MermaidBrackets = ['[', ']'];

/**
 * Renders a laid-out design as the text of a Markdown file.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @returns the whole file, ending in one newline
 * @throws {Error} if an edge names a node the layout does not hold, which
 *   `loadDesign` rules out (D20) and which would otherwise emit a diagram
 *   quietly missing an arrow
 *
 * @example
 * ```typescript
 * toMarkdown(layoutDesign(design)).split('\n')[0]; // '# Order intake'
 * ```
 */
export function toMarkdown(layout: DesignLayout): string {
  const ids = mermaidIds(layout.nodes);

  const sections = [
    `# ${layout.title}`,
    '## Nodes',
    tableOf(NODE_HEADINGS, layout.nodes.map(nodeRow)),
    '## Edges',
    tableOf(EDGE_HEADINGS, layout.edges.map(edgeRow)),
    '## Drawing',
    drawingOf(layout, ids),
  ];

  return `${sections.join('\n\n')}\n`;
}

/** Each node's own id, pointing at the id the diagram calls it by. */
function mermaidIds(nodes: readonly LayoutNode[]): ReadonlyMap<string, string> {
  return new Map(nodes.map((node, index) => [node.id, `n${index}`]));
}

function nodeRow(node: LayoutNode): readonly string[] {
  return [node.id, node.label, node.type];
}

function edgeRow(edge: LayoutEdge): readonly string[] {
  return [edge.from, edge.to, edge.label];
}

/** A GitHub-flavoured table: the headings, the divider, then the rows. */
function tableOf(
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const divider = headings.map(() => '---');
  const body = rows.map((row) => row.map(cell));

  return [headings, divider, ...body].map((row) => `| ${row.join(' | ')} |`).join('\n');
}

/**
 * One cell's text, safe to sit between two dividers.
 *
 * Backslashes go first: without that, a label ending in one would escape the
 * pipe after it and merge two cells. A line break becomes `<br/>`, because a
 * row ends at the end of its line.
 */
function cell(text: string): string {
  return breakLines(text.replace(/\\/gu, '\\\\').replace(/\|/gu, '\\|'));
}

/** The fenced diagram, or a sentence saying why there is not one. */
function drawingOf(layout: DesignLayout, ids: ReadonlyMap<string, string>): string {
  if (layout.nodes.length === 0) {
    return NOTHING_TO_DRAW;
  }

  const statements = [
    ...layout.nodes.map((node) => mermaidNode(node, ids)),
    ...layout.edges.map((edge) => mermaidEdge(edge, ids)),
  ];

  return ['```mermaid', `flowchart ${FLOWCHART_DIRECTION}`, ...statements, '```'].join(
    '\n',
  );
}

/** One box: its minted id, the brackets its kind draws as, and its label. */
function mermaidNode(node: LayoutNode, ids: ReadonlyMap<string, string>): string {
  const [open, close] = BRACKETS_BY_KIND.get(node.shape.kind) ?? DEFAULT_BRACKETS;

  return `${STATEMENT_INDENT}${idOf(node.id, ids)}${open}"${label(node.label)}"${close}`;
}

/** One arrow, from one minted id to another, carrying its label. */
function mermaidEdge(edge: LayoutEdge, ids: ReadonlyMap<string, string>): string {
  const from = idOf(edge.from, ids);
  const to = idOf(edge.to, ids);

  return `${STATEMENT_INDENT}${from} -->|"${label(edge.label)}"| ${to}`;
}

function idOf(id: string, ids: ReadonlyMap<string, string>): string {
  const minted = ids.get(id);

  if (minted === undefined) {
    throw new Error(`The drawing has an edge to a node it does not hold: ${id}`);
  }

  return minted;
}

/**
 * One label's text, safe inside a quoted Mermaid label.
 *
 * The hash goes first, because the escape for a quote is itself spelled with
 * one: doing it the other way round would turn every escaped quote back into
 * text. A hash the file held becomes `#35;`, which renders as a hash, so a
 * label that happens to read like an entity code survives as what it said.
 */
function label(text: string): string {
  return breakLines(text.replace(/#/gu, '#35;').replace(/"/gu, '#quot;'));
}

/** A line break the file held, as one the diagram and the table can carry. */
function breakLines(text: string): string {
  return text.replace(/\r\n|\r|\n/gu, '<br/>');
}
