/**
 * The last three steps of laying a design out: work out how far everything has
 * to move, move it, and size the canvas around what came out.
 *
 * Dagre's origin is its own business — a route point or an edge label can sit
 * at a negative coordinate — so the drawing it produces is normalised here
 * rather than trusted where it lies. The invariant this buys is worth having
 * and is what the page and all four exporters draw against: whatever the
 * design, the top-left-most thing on the canvas is at `DRAWING_MARGIN`,
 * nothing is ever off the edge, and the canvas is big enough for all of it
 * with the same margin on the other two sides.
 *
 * Nothing here knows what a node means or where dagre put it. It reads boxes,
 * routes and plates, and returns new ones — the design it was handed is never
 * moved, only copied further along.
 */

import type { LayoutBox, LayoutEdge, LayoutNode, LayoutPoint } from './layout.types';

/** Clear space between the drawing and every edge of the canvas, in pixels. */
export const DRAWING_MARGIN = 28;

/**
 * How far to move everything so the drawing starts exactly one margin from the
 * top-left corner.
 *
 * Dagre's origin is its own business — an edge label or a route can sit at a
 * negative coordinate — so rather than trusting `graph().width`, this measures
 * what actually came out and moves it. The result is an invariant worth having:
 * whatever the design, the top-left-most thing on the canvas is at
 * `DRAWING_MARGIN`, and nothing is ever off the edge.
 *
 * @returns the offset to add to every box and every point; `{ x: 0, y: 0 }`
 *   when there is nothing placed to measure
 */
export function offsetToMargin(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
): LayoutPoint {
  const xs = everyX(nodes, edges);
  const ys = everyY(nodes, edges);

  if (xs.length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: DRAWING_MARGIN - Math.min(...xs),
    y: DRAWING_MARGIN - Math.min(...ys),
  };
}

function everyX(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
): readonly number[] {
  return [
    ...nodes.flatMap((node) => [node.x, node.x + node.width]),
    ...edges.flatMap((edge) => [
      edge.labelBox.x,
      edge.labelBox.x + edge.labelBox.width,
      ...edge.points.map((point) => point.x),
    ]),
  ];
}

function everyY(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
): readonly number[] {
  return [
    ...nodes.flatMap((node) => [node.y, node.y + node.height]),
    ...edges.flatMap((edge) => [
      edge.labelBox.y,
      edge.labelBox.y + edge.labelBox.height,
      ...edge.points.map((point) => point.y),
    ]),
  ];
}

/** The same box, moved, with everything else it carries left as it was. */
export function shiftBox<T extends LayoutBox>(box: T, offset: LayoutPoint): T {
  return { ...box, x: box.x + offset.x, y: box.y + offset.y };
}

/** The same edge, moved: every point of its route, and its plate with them. */
export function shiftEdge(edge: LayoutEdge, offset: LayoutPoint): LayoutEdge {
  return {
    ...edge,
    points: edge.points.map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y,
    })),
    labelBox: shiftBox(edge.labelBox, offset),
  };
}

/**
 * The canvas: everything that was placed, plus a margin all round.
 *
 * An empty design still gets a canvas, because an empty design is valid (D19)
 * and has to draw as an empty picture rather than as a failure.
 */
export function canvasFor(
  nodes: readonly LayoutNode[],
  edges: readonly LayoutEdge[],
): { width: number; height: number } {
  const xs = everyX(nodes, edges);
  const ys = everyY(nodes, edges);

  return {
    width: Math.ceil(Math.max(0, ...xs) + DRAWING_MARGIN),
    height: Math.ceil(Math.max(0, ...ys) + DRAWING_MARGIN),
  };
}
