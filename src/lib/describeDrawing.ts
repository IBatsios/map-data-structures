/**
 * The drawing, said out loud.
 *
 * An SVG with `role="img"` is one object to a screen reader: it gets the
 * accessible name from its `<title>` and nothing else. "Drawing of Order
 * intake" is a true name and a useless one — it tells a non-sighted reader that
 * a picture exists and not one thing that is in it.
 *
 * So the drawing also carries a `<desc>`, and this is what writes it: every
 * node with its kind, and every edge in the direction its arrow points. Intake
 * 5.2 says the drawing must faithfully show every node and edge; this is that
 * promise kept for someone who cannot see the boxes.
 *
 * Like everything else in the drawing, it says what the file said. No trimming,
 * no substituting, no leaving out the node whose label is three spaces.
 */

import type { DesignLayout } from './layout';

/**
 * Describes a laid-out drawing in one paragraph of plain text.
 *
 * @param layout - the drawing, already laid out
 * @returns a sentence per part, safe to set as the `textContent` of a `<desc>`
 *
 * @example
 * ```typescript
 * describeDrawing(layout);
 * // 'Order intake. 2 nodes: Public API, a service; Order queue, a queue.
 * //  1 edge: Public API publishes order Order queue.'
 * ```
 */
export function describeDrawing(layout: DesignLayout): string {
  return [`${layout.title}.`, describeNodes(layout), describeEdges(layout)].join(' ');
}

function describeNodes(layout: DesignLayout): string {
  if (layout.nodes.length === 0) {
    return 'No nodes.';
  }

  const nodes = layout.nodes.map((node) => `${node.label}, a ${node.type}`).join('; ');

  return `${countOf(layout.nodes.length, 'node')}: ${nodes}.`;
}

function describeEdges(layout: DesignLayout): string {
  if (layout.edges.length === 0) {
    return 'No edges.';
  }

  const labelsById = new Map(layout.nodes.map((node) => [node.id, node.label]));
  const edges = layout.edges
    .map((edge) => {
      // The ids are what the file joined on, so they are the honest fallback if
      // a label is somehow missing: better a readable id than a blank phrase.
      const from = labelsById.get(edge.from) ?? edge.from;
      const to = labelsById.get(edge.to) ?? edge.to;

      return `${from} ${edge.label} ${to}`;
    })
    .join('; ');

  return `${countOf(layout.edges.length, 'edge')}: ${edges}.`;
}

/** `1 node`, `2 nodes` — the same plural rule `describeUpload` uses. */
function countOf(total: number, noun: string): string {
  return total === 1 ? `1 ${noun}` : `${total} ${noun}s`;
}
