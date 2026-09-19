/**
 * Where everything goes: a `Design` in, a box for every node and a route for
 * every edge out.
 *
 * This is the one module Tasks 05 to 08 all consume. The preview and the four
 * exporters read the same result, which is what makes "every export format
 * shows the same content as the browser preview" (intake 5.2) true by
 * construction rather than by four people being careful.
 *
 * Two properties follow from that and are load-bearing:
 *
 * 1. **Pure.** No `document`, no measuring against a live browser, no reading
 *    the clock. Text width is estimated in `text.ts` instead of measured, which
 *    is what lets this run in Vitest, in a worker, and inside a PDF exporter.
 * 2. **Serialisable.** Everything it returns is plain numbers, strings and
 *    arrays, so an exporter can hand it across any boundary it likes.
 *
 * The placement itself is `@dagrejs/dagre`'s: a layered directed-graph layout,
 * which is what "boxes and arrows in a flow" is. Dagre works in centres, in its
 * own coordinate space, and mutates the graph object it is given; this module
 * is the wall around all three. What comes out is top-left origins, normalised
 * so the drawing starts exactly one margin from the corner, in new objects that
 * share nothing with the design that went in.
 *
 * What it will not do is tidy the data. A whitespace-only label is laid out as
 * a whitespace-only label and an unrecognised type still gets a box. The
 * drawing shows what the file said.
 *
 * Three of its parts live in modules of their own, and both properties above
 * hold of each of them:
 *
 * - `layout.types.ts` — the vocabulary all of them speak: `LayoutPoint`,
 *   `LayoutBox`, `LayoutNode`, `LayoutEdge`, `DesignLayout`.
 * - `selfLoops.ts` — a node's n-th loop: the route a self-edge takes, which is
 *   drawn here rather than read from dagre (D34, D37).
 * - `parallelEdges.ts` — what to do when dagre cannot lay a multigraph out:
 *   which edges share one dagre edge, and how they are fanned back apart (D98).
 * - `normaliseDrawing.ts` — the last three steps: how far everything moves to
 *   sit one margin from the corner, moving it, and sizing the canvas.
 *
 * Nothing outside this folder imports any of them. **This module is the one
 * door**: every public name below is either declared here or re-exported here,
 * so a consumer imports from `./layout` and never learns which file a constant
 * sits in. A moved constant is re-exported, never re-declared — two copies that
 * agree today are two that disagree the day one is tuned.
 */

import dagre, { Graph } from '@dagrejs/dagre';
import type { EdgeLabel, GraphLabel, NodeLabel, Point } from '@dagrejs/dagre';

import type { Design, DesignNode } from './design.types';
import type {
  DesignLayout,
  EdgeLabelPlate,
  LayoutEdge,
  LayoutNode,
  LayoutPoint,
  PreparedEdge,
} from './layout.types';
import { canvasFor, offsetToMargin, shiftBox, shiftEdge } from './normaliseDrawing';
import type { EdgeShare, SharedRoutes } from './parallelEdges';
import {
  EDGE_KEYINGS,
  fanOutRoute,
  labelRoomFor,
  shareRoutes,
  stackedLabelCentre,
} from './parallelEdges';
import { selfLoop, selfLoopSlots } from './selfLoops';
import { shapeForType } from './shapes';
import { estimateTextWidth, wrapText } from './text';

export type {
  DesignLayout,
  LayoutBox,
  LayoutEdge,
  LayoutNode,
  LayoutPoint,
} from './layout.types';
export { DRAWING_MARGIN } from './normaliseDrawing';
export { SELF_LOOP_EXTENT } from './selfLoops';

/** Font size of a node's own label, in pixels. */
export const LABEL_FONT_SIZE = 14;

/** Font size of the small `type` line under a node's label, in pixels. */
export const TYPE_FONT_SIZE = 11;

/** Font size of an edge's label, in pixels. */
export const EDGE_LABEL_FONT_SIZE = 12;

/** Distance between the baselines of two wrapped label lines, in pixels. */
export const LINE_HEIGHT = 18;

/** The same, for the smaller text on an edge's label plate, in pixels. */
export const EDGE_LABEL_LINE_HEIGHT = 16;

/** Vertical room the `type` line occupies under the label, in pixels. */
const TYPE_LINE_HEIGHT = 16;

/** No box is narrower than this, however short its label. */
export const MIN_NODE_WIDTH = 132;

/** A label wider than this wraps onto another line instead of widening the box. */
export const MAX_TEXT_WIDTH = 220;

/** Clear space between two boxes on the same row, in pixels. */
const NODE_SEPARATION = 48;

/** Clear space between two rows, in pixels. */
const RANK_SEPARATION = 72;

/** Padding inside an edge label's plate, in pixels. */
export const EDGE_LABEL_PADDING = { x: 7, y: 4 } as const;

/**
 * Dagre's own graph, typed to the labels this module actually puts on it.
 * `dagre` itself is a value, not a namespace, so the label types are imported
 * by name rather than reached through it.
 */
type LayoutGraph = Graph<GraphLabel, NodeLabel, EdgeLabel>;

/** A node sized but not yet placed: everything except `x` and `y`. */
type SizedNode = Omit<LayoutNode, 'x' | 'y'>;

/**
 * A design the app could not find a place for every box in.
 *
 * It is not a bad file — a design only reaches this module once `loadDesign`
 * has passed it — so it is a failure of this app's own, and the panel says so
 * in this app's own words rather than in the graph library's. Nothing about
 * dagre reaches the screen: the library's error is kept as `cause` for whoever
 * is reading a stack trace, and `describeLoadError` writes the sentence.
 *
 * No design is known to reach this today. Every graph the probing in D98 could
 * produce is laid out by one keying or the other, and the fallback exists
 * because "no design we could produce" is a smaller claim than "no design".
 */
export class DesignLayoutError extends Error {
  constructor(cause: unknown) {
    super('The design could not be laid out.', { cause });
    // Without this, `instanceof` fails whenever the class is transpiled down to
    // ES5, which is exactly where a caught error is hardest to debug. The same
    // reasoning, and the same two lines, as `DesignLoadError`.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }
}

/**
 * Lays a design out.
 *
 * Pure: it reads the design and builds new objects, so the caller's design is
 * untouched and the result shares nothing with it.
 *
 * @param design - a design that has already been through `loadDesign`, so its
 *   node ids are unique and every edge names a node that exists (D20)
 * @returns the canvas size, a box for every node in file order, and a route for
 *   every edge in file order
 * @throws {DesignLayoutError} if no keying dagre was offered placed the whole
 *   graph; see `placeWithDagre` for what that means and D98 for why it exists
 *
 * @example
 * ```typescript
 * const layout = layoutDesign(design);
 * layout.nodes[0].x;        // 28
 * layout.edges[0].points;   // [{ x, y }, ...] source border to target border
 * ```
 */
export function layoutDesign(design: Design): DesignLayout {
  const sized = design.nodes.map(sizeNode);
  const prepared: readonly PreparedEdge[] = design.edges.map((edge, index) => ({
    edge,
    index,
    plate: edgeLabelPlate(edge.label),
  }));
  const { graph, shared } = placeWithDagre(sized, prepared);

  const placed = readPlacedNodes(sized, graph);
  const routed = readRoutedEdges(prepared, graph, placed, shared);
  const offset = offsetToMargin(placed, routed);

  const nodes = placed.map((node) => shiftBox(node, offset));
  const edges = routed.map((edge) => shiftEdge(edge, offset));

  return { title: design.title, ...canvasFor(nodes, edges), nodes, edges };
}

/**
 * Dagre's placement, from the first keying that produced a whole one.
 *
 * Dagre is asked for `'per-edge'` first, which is what it has always been
 * asked for and what it answers for all but a handful of graphs in thousands.
 * `'per-pair'` is the retry, and it exists because dagre 3.1.1 loses a dummy
 * node out of its own ordering when a pair of nodes carries both a two-cycle
 * and a parallel duplicate (D98).
 *
 * "Produced a whole one" is deliberately stricter than "did not throw", because
 * the lost dummy surfaces both ways. Where its coordinates are an edge's first
 * or last point, `assignNodeIntersects` throws on them; where they are not, the
 * `NaN` is simply handed back, and a `NaN` in a path's `d` voids the whole
 * path — an edge nobody can see, which is a dropped edge. So a layout only
 * counts if every number in it is one a renderer can draw.
 */
function placeWithDagre(
  sized: readonly SizedNode[],
  prepared: readonly PreparedEdge[],
): { graph: LayoutGraph; shared: SharedRoutes } {
  let lastFailure: unknown;

  for (const keying of EDGE_KEYINGS) {
    const shared = shareRoutes(prepared, keying);
    const graph = buildGraph(sized, shared);

    try {
      dagre.layout(graph);
    } catch (error) {
      lastFailure = error;
      continue;
    }

    if (isWhollyPlaced(graph)) {
      return { graph, shared };
    }

    lastFailure = new Error(`Dagre placed part of the graph under ${keying} keying.`);
  }

  throw new DesignLayoutError(lastFailure);
}

/** Whether every number dagre put on the graph is one a renderer can draw. */
function isWhollyPlaced(graph: LayoutGraph): boolean {
  const placed = graph
    .nodes()
    .every((id) => isDrawable(graph.node(id)?.x) && isDrawable(graph.node(id)?.y));

  return (
    placed &&
    graph
      .edges()
      .every((edge) =>
        (graph.edge(edge)?.points ?? []).every(
          (point) => isDrawable(point.x) && isDrawable(point.y),
        ),
      )
  );
}

/** A coordinate that can be drawn: a real number, not `NaN` and not infinite. */
function isDrawable(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value);
}

/**
 * How big a node's box has to be to hold its own text.
 *
 * The width comes from the widest line the label wraps to, floored at
 * `MIN_NODE_WIDTH` so a one-character label is still a box rather than a stub,
 * and the height from how many lines that took plus the `type` line under them.
 * Which is why a long label makes a taller box, not a wider one.
 */
function sizeNode(node: DesignNode): SizedNode {
  const shape = shapeForType(node.type);
  const labelLines = wrapText(node.label, MAX_TEXT_WIDTH, LABEL_FONT_SIZE);
  const textWidth = Math.max(
    widestLine(labelLines, LABEL_FONT_SIZE),
    estimateTextWidth(node.type, TYPE_FONT_SIZE),
  );

  return {
    id: node.id,
    label: node.label,
    labelLines,
    type: node.type,
    shape,
    width: Math.max(MIN_NODE_WIDTH, Math.ceil(textWidth) + shape.padding.x * 2),
    height: labelLines.length * LINE_HEIGHT + TYPE_LINE_HEIGHT + shape.padding.y * 2,
  };
}

function widestLine(lines: readonly string[], fontSize: number): number {
  return Math.max(0, ...lines.map((line) => estimateTextWidth(line, fontSize)));
}

/**
 * The plate an edge label is drawn on, sized to hold the label.
 *
 * It wraps at the same text limit a node label does, and for the same reason:
 * without one, a single long label makes a plate wide enough that the SVG
 * scales the whole drawing down to fit it, and every other label with it.
 * Nothing is ever shortened — the plate grows taller, exactly as a node's box
 * does (D26).
 */
function edgeLabelPlate(label: string): EdgeLabelPlate {
  const lines = wrapText(label, MAX_TEXT_WIDTH, EDGE_LABEL_FONT_SIZE);

  return {
    lines,
    width: Math.ceil(widestLine(lines, EDGE_LABEL_FONT_SIZE)) + EDGE_LABEL_PADDING.x * 2,
    height: lines.length * EDGE_LABEL_LINE_HEIGHT + EDGE_LABEL_PADDING.y * 2,
  };
}

/**
 * The design as a graph dagre can lay out.
 *
 * `multigraph` is not optional here: the schema allows two edges between the
 * same pair of nodes, and a plain graph would keep only the last of them —
 * a dropped edge, which intake 5.2 forbids. Which edges get an edge of their
 * own and which share one is `parallelEdges.ts`'s answer, already made; under
 * the keying dagre is asked for first every edge gets its own, keyed by its
 * index in the file, which is unique by definition and keeps file order
 * readable back.
 */
function buildGraph(sized: readonly SizedNode[], shared: SharedRoutes): LayoutGraph {
  const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({ multigraph: true });

  graph.setGraph({
    rankdir: 'TB',
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of sized) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }

  for (const group of shared.groups) {
    graph.setEdge(group.from, group.to, labelRoomFor(group.members), group.name);
  }

  return graph;
}

/**
 * Dagre's placements, converted from centres to top-left corners and put back
 * in the order the file listed the nodes.
 *
 * The throw is an assertion about this app's own invariant, not a message for a
 * user: every node was put into the graph a few lines above, so a miss here
 * means dagre and this module disagree about what a node is. It replaces the
 * guard that used to live in the page's `renderEdge`, where a dangling edge
 * could reach it; D20 moved that case into the schema, so this one is
 * unreachable by any file a user can write.
 */
function readPlacedNodes(
  sized: readonly SizedNode[],
  graph: LayoutGraph,
): readonly LayoutNode[] {
  return sized.map((node) => {
    const placed = graph.node(node.id);

    if (!placed || placed.x === undefined || placed.y === undefined) {
      throw new Error(`The layout placed no box for the node "${node.id}".`);
    }

    return {
      ...node,
      x: placed.x - node.width / 2,
      y: placed.y - node.height / 2,
    };
  });
}

/**
 * Dagre's routes, in the order the file listed the edges.
 *
 * Dagre gives an edge whose ends it could not route no points at all, which
 * would draw nothing; falling back to a straight line keeps the edge visible.
 * An edge that is not drawn is a dropped edge. See `straightLine` below for
 * what is known about when that fallback is taken.
 *
 * Where several edges shared one dagre edge, they come back here on one route
 * and one plate, and `parallelEdges.ts` moves them apart again. Where none did
 * — which is every design dagre lays out on the first ask — it hands back the
 * route and the centre it was given, so nothing moves.
 */
function readRoutedEdges(
  prepared: readonly PreparedEdge[],
  graph: LayoutGraph,
  placed: readonly LayoutNode[],
  shared: SharedRoutes,
): readonly LayoutEdge[] {
  const boxes = new Map(placed.map((node) => [node.id, node] as const));
  const slots = selfLoopSlots(prepared);

  return prepared.map(({ edge, index, plate }) => {
    const loopsOn = edge.from === edge.to ? boxes.get(edge.from) : undefined;
    const slot = slots.get(index);

    if (loopsOn && slot) {
      return selfLoop(edge, loopsOn, plate, slot);
    }

    const share = shareFor(shared, index);
    const routed = graph.edge({ v: edge.from, w: edge.to, name: share.name });
    const points = routed?.points ?? [];
    const whole = points.length >= 2 ? points.map(toPoint) : straightLine(edge, graph);
    const centre = stackedLabelCentre(labelCentre(routed, points), share);

    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      labelLines: plate.lines,
      points: fanOutRoute(whole, share),
      labelBox: {
        x: centre.x - plate.width / 2,
        y: centre.y - plate.height / 2,
        width: plate.width,
        height: plate.height,
      },
    };
  });
}

/**
 * Which route an edge was given, and who else is on it.
 *
 * The throw is an assertion about this app's own invariant, not a message for
 * a user: `shareRoutes` is handed the same list this function walks, so it has
 * an answer for every index in it. A miss would mean the two disagreed about
 * what the file's edges are.
 */
function shareFor(shared: SharedRoutes, index: number): EdgeShare {
  const share = shared.shares.get(index);

  if (!share) {
    throw new Error(`No route was keyed for the edge at ${index}.`);
  }

  return share;
}

/** Where dagre put the label, or the middle of the route if it put it nowhere. */
function labelCentre(
  routed: EdgeLabel | undefined,
  points: readonly Point[],
): LayoutPoint {
  if (routed?.x !== undefined && routed.y !== undefined) {
    return { x: routed.x, y: routed.y };
  }

  const middle = points[Math.floor(points.length / 2)];

  return middle ? toPoint(middle) : { x: 0, y: 0 };
}

/**
 * The fallback route: centre to centre, so the edge is at least drawn.
 *
 * **Not reached by any graph yet found, and measured rather than assumed
 * (D58, corrected by D98).** D58 called this unreachable on the strength of one
 * claim: that dagre ends its own layout with `assignNodeIntersects`, which
 * unconditionally puts the source border's intersection at the front of every
 * edge's points and the target border's at the back. That claim was wrong, and
 * the shaped graphs it was measured on — parallel edges, two-cycles, self-loops
 * among them — missed why. `assignNodeIntersects` is the step that calls
 * `intersectRect`, and on a graph that carries a two-cycle *and* a parallel
 * duplicate between the same pair of nodes, dagre 3.1.1 reaches it holding a
 * dummy node it never gave coordinates to, and the step does not complete.
 * D58's evidence was ten shaped graphs, each carrying one of those shapes;
 * this one needs two at once.
 *
 * What makes the fallback unreached today is therefore not that
 * `assignNodeIntersects` always finishes, but that `placeWithDagre` never reads
 * a graph where it did not: a layout that threw, or that came back holding a
 * coordinate no renderer can draw, is discarded and asked for again under
 * another keying rather than handed on to this function. On every layout that
 * does get read — the repro above, and the 2500 fuzzed multigraphs in
 * `layout.test.ts` — dagre returned three points at the fewest.
 *
 * It is kept rather than deleted because it guards against a change in a
 * library this module does not own, and D98 is the second time that library has
 * done something its documentation did not say it would. If dagre ever did hand
 * back nothing, the alternative is a path with an empty `d`, which is an edge
 * the reader cannot see at all; a line between two centres is visibly wrong
 * instead, and visibly wrong is the failure worth having. Being unreached is
 * also why it is still centre to centre while every other route in this file
 * runs border to border: a correction here could not be tested, and an untested
 * correction to code nothing can reach is worth less than the note explaining
 * it.
 */
function straightLine(
  edge: { readonly from: string; readonly to: string },
  graph: LayoutGraph,
): readonly LayoutPoint[] {
  const from = graph.node(edge.from);
  const to = graph.node(edge.to);

  return [
    { x: from?.x ?? 0, y: from?.y ?? 0 },
    { x: to?.x ?? 0, y: to?.y ?? 0 },
  ];
}

function toPoint(point: Point): LayoutPoint {
  return { x: point.x, y: point.y };
}
