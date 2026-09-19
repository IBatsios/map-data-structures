/**
 * The design as one standalone HTML file: a title, the preview's own drawing
 * inlined, and the same tables of nodes and edges the Markdown export writes.
 *
 * It opens in any browser from any folder with nothing beside it. Nothing is
 * fetched — the styles travel in a `<style>` element (`exportStyles.ts`) and
 * the drawing travels as inline SVG — because that is the task's third
 * criterion and it is absolute.
 *
 * **Two functions, and the split is the point.**
 *
 * - `toHtml(layout, doc)` is what the page calls. It needs a `Document`
 *   because the drawing is `renderDrawing`'s, and `renderDrawing` builds DOM
 *   elements rather than a string. It takes that `Document` as an argument the
 *   way `renderDrawing(layout, doc)` and `downloadBlob(blob, name, doc)` do
 *   (D52), rather than reaching for a global.
 * - `htmlPage(layout, drawing)` is the whole document given the drawing's
 *   markup, and is pure. This project's Vitest run has no DOM at all, so this
 *   is the half a unit test can reach; the other half is Playwright's. D55
 *   records that split.
 *
 * It takes the **layout**, not the design, for D48's reason: the layout carries
 * the title, both lists in file order, and every label exactly as the file gave
 * it, so the page and the picture cannot come from two different computations.
 *
 * **What is escaped, and what is already safe.** This is the first output in
 * the project that a browser will execute, so injection stops being theoretical:
 *
 * - The drawing is safe by construction *because it is serialised, never
 *   rebuilt*. `renderDrawing` sets every label with `textContent` and never
 *   `innerHTML`, so a label that reads `<script>` is already text in the DOM,
 *   and serialising that DOM escapes it on the way out. That is why `toHtml`
 *   hands the element to the serialiser instead of writing SVG by hand.
 * - Everything this module writes itself — the `<title>`, the `<h1>`, and every
 *   table cell — goes through `escapeHtml`, in one place rather than ad hoc at
 *   each call site.
 *
 * Escaped, never stripped. Mermaid's strict sanitiser removed such a label in
 * Task 05 and the box rendered empty; doing that here would drop a label the
 * preview shows, which is the one thing intake 5.2 rules out. The label keeps
 * its spaces too (D39) — the stylesheet's `white-space: pre-wrap` is what makes
 * them visible rather than collapsed.
 */

import { EDGE_HEADINGS, NODE_HEADINGS, NOTHING_TO_DRAW } from './exportFurniture';
import { EXPORT_STYLES } from './exportStyles';
import type { DesignLayout, LayoutEdge, LayoutNode } from './layout';
import { renderDrawing } from './renderDrawing';

/** The characters that would otherwise be read as markup, `&` first. */
const ESCAPES: readonly (readonly [RegExp, string])[] = [
  [/&/gu, '&amp;'],
  [/</gu, '&lt;'],
  [/>/gu, '&gt;'],
  [/"/gu, '&quot;'],
];

/**
 * Renders a laid-out design as one standalone HTML file.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param doc - the document to build the drawing in, the way `renderDrawing`
 *   takes one; nothing of it ends up in the file but the markup
 * @returns the whole page, ending in one newline
 *
 * @example
 * ```typescript
 * const page = toHtml(layoutDesign(design), document);
 * downloadBlob(new Blob([page], { type: 'text/html;charset=utf-8' }), 'x.html', document);
 * ```
 */
export function toHtml(layout: DesignLayout, doc: Document): string {
  return htmlPage(layout, serialiseDrawing(layout, doc));
}

/**
 * The whole page, given the drawing already serialised. Pure.
 *
 * @param layout - the design as the preview drew it
 * @param drawing - the drawing as markup, from `toHtml`; ignored when the
 *   design has no nodes, since that is where D51's sentence goes instead
 * @returns the whole page, ending in one newline
 */
export function htmlPage(layout: DesignLayout, drawing: string): string {
  const title = escapeHtml(layout.title);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<style>${EXPORT_STYLES}</style>`,
    '</head>',
    '<body>',
    '<main>',
    `<h1>${title}</h1>`,
    '<h2>Drawing</h2>',
    drawingSection(layout, drawing),
    '<h2>Nodes</h2>',
    tableOf('Nodes', NODE_HEADINGS, layout.nodes.map(nodeRow)),
    '<h2>Edges</h2>',
    tableOf('Edges', EDGE_HEADINGS, layout.edges.map(edgeRow)),
    '</main>',
    '</body>',
    '</html>',
  ]
    .join('\n')
    .concat('\n');
}

/**
 * The drawing, as the markup an HTML document can hold.
 *
 * The element is built by `renderDrawing` and handed to the serialiser whole:
 * reading `innerHTML` back off a holder is the escaping, since the browser
 * writes out a text node as the text it is. That is the opposite of setting
 * `innerHTML`, which is what D43 and `renderDrawing` rule out, and it is the
 * reason the SVG half of this export needs no sanitiser of its own.
 *
 * It renders even when the design has nothing in it. `htmlPage` is the one
 * place that decides whether a canvas with no boxes on it is worth showing
 * (D51), because asking the same question twice is how two answers drift.
 */
function serialiseDrawing(layout: DesignLayout, doc: Document): string {
  const holder = doc.createElement('div');

  holder.append(renderDrawing(layout, doc));

  return holder.innerHTML;
}

/** The drawing on the page, or the sentence that stands in for it (D51). */
function drawingSection(layout: DesignLayout, drawing: string): string {
  if (layout.nodes.length === 0) {
    return `<p class="empty">${escapeHtml(NOTHING_TO_DRAW)}</p>`;
  }

  return `<div class="drawing">${drawing}</div>`;
}

function nodeRow(node: LayoutNode): readonly string[] {
  return [node.id, node.label, node.type];
}

function edgeRow(edge: LayoutEdge): readonly string[] {
  return [edge.from, edge.to, edge.label];
}

/**
 * One table: a caption for anyone reading it out of context, a row of column
 * headings, and a body that is empty when the design is (D51).
 */
function tableOf(
  caption: string,
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const head = headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`);
  const body = rows.map(
    (row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`,
  );

  return [
    '<table>',
    `<caption>${escapeHtml(caption)}</caption>`,
    `<thead><tr>${head.join('')}</tr></thead>`,
    `<tbody>${body.join('')}</tbody>`,
    '</table>',
  ].join('');
}

/**
 * One piece of the user's text, safe to put in the page.
 *
 * The ampersand goes first, because every other replacement writes one: doing
 * it the other way round would turn `&lt;` the file held into `&amp;lt;` twice
 * over and print the entity rather than the text. Nothing is removed — a label
 * that is markup is shown as the markup it says, which is what the preview
 * shows too.
 */
function escapeHtml(text: string): string {
  return ESCAPES.reduce(
    (escaped, [character, entity]) => escaped.replace(character, entity),
    text,
  );
}
