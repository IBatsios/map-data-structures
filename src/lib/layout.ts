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
 */

import dagre, { Graph } from '@dagrejs/dagre';
import type { EdgeLabel, GraphLabel, NodeLabel, Point } from '@dagrejs/dagre';

import type { Design, DesignEdge, DesignNode } from './design.types';
import type { NodeShape } from './shapes';
import { shapeForType } from './shapes';
import { estimateTextWidth, wrapText } from './text';

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

/** Clear space between the drawing and every edge of the canvas, in pixels. */
export const DRAWING_MARGIN = 28;

/** Clear space between two boxes on the same row, in pixels. */
const NODE_SEPARATION = 48;

/** Clear space between two rows, in pixels. */
const RANK_SEPARATION = 72;

/**
 * How far a self-edge's loop reaches out past the node it loops on, in pixels.
 *
 * The first loop on a node reaches this far, the second twice as far, and so
 * on, so two loops on one node are two loops rather than one drawn twice. There
 * is room for them: dagre reserves a lane beside the node for every self-edge
 * and sizes each lane to that edge's own label, so the loops and their plates
 * stay well inside the space already set aside rather than reaching a
 * neighbour's box.
 */
export const SELF_LOOP_EXTENT = 34;

/** Clear space between a self-edge's loop and its label plate, in pixels. */
const SELF_LOOP_LABEL_GAP = 8;

/** Clear space between the label plates of two loops on one node, in pixels. */
const SELF_LOOP_PLATE_GAP = 6;

/**
 * How far the ends of a node's first loop sit from the middle of its border, as
 * a fraction of the node's height.
 *
 * The second loop's ends sit twice as far out, the third three times, so an
 * outer loop wraps around an inner one instead of tracing over its arms and
 * landing its arrowhead on the same pixel.
 */
const SELF_LOOP_BAND = 1 / 6;

/** How near a corner of the node's border a loop's end may land, in pixels. */
const SELF_LOOP_BAND_INSET = 2;

/** Padding inside an edge label's plate, in pixels. */
export const EDGE_LABEL_PADDING = { x: 7, y: 4 } as const;

/**
 * Dagre's own graph, typed to the labels this module actually puts on it.
 * `dagre` itself is a value, not a namespace, so the label types are imported
 * by name rather than reached through it.
 */
type LayoutGraph = Graph<GraphLabel, NodeLabel, EdgeLabel>;

/** One position in the drawing, in pixels from the top-left of the canvas. */
export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

/** One rectangle in the drawing, given by its top-left corner and its size. */
export interface LayoutBox extends LayoutPoint {
  readonly width: number;
  readonly height: number;
}

/** One node, placed: where its box is, what to draw it as, and what it says. */
export interface LayoutNode extends LayoutBox {
  readonly id: string;
  /** The label exactly as the file gave it. */
  readonly label: string;
  /** The label split into the lines it is drawn on. */
  readonly labelLines: readonly string[];
  /** The type exactly as the file gave it, printed under the label. */
  readonly type: string;
  readonly shape: NodeShape;
}

/** One edge, routed: the line to draw and where its label sits on it. */
export interface LayoutEdge {
  readonly from: string;
  readonly to: string;
  /** The label exactly as the file gave it. */
  readonly label: string;
  /** The label split into the lines its plate is drawn with. */
  readonly labelLines: readonly string[];
  /** The route, in order, from the source's border to the target's. */
  readonly points: readonly LayoutPoint[];
  /** Where the label's plate sits, sized to hold the label. */
  readonly labelBox: LayoutBox;
}

/** A whole design, placed: the canvas and everything on it. */
export interface DesignLayout {
  /** The design's title, for the SVG's own `<title>`. */
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
}

/** A node sized but not yet placed: everything except `x` and `y`. */
type SizedNode = Omit<LayoutNode, 'x' | 'y'>;

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
  const graph = buildGraph(sized, design);

  dagre.layout(graph);

  const placed = readPlacedNodes(sized, graph);
  const routed = readRoutedEdges(design, graph, placed);
  const offset = offsetToMargin(placed, routed);

  const nodes = placed.map((node) => shiftBox(node, offset));
  const edges = routed.map((edge) => shiftEdge(edge, offset));

  return { title: design.title, ...canvasFor(nodes, edges), nodes, edges };
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

/** An edge label's plate: the lines it is drawn on, and the room they need. */
interface EdgeLabelPlate {
  readonly lines: readonly string[];
  readonly width: number;
  readonly height: number;
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
 * a dropped edge, which intake 5.2 forbids. Each edge is keyed by its index in
 * the file, which is unique by definition and keeps file order readable back.
 */
function buildGraph(sized: readonly SizedNode[], design: Design): LayoutGraph {
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

  for (const [index, edge] of design.edges.entries()) {
    graph.setEdge(edge.from, edge.to, labelPlateSize(edge.label), String(index));
  }

  return graph;
}

/** The size dagre needs to reserve room for a label, without the lines. */
function labelPlateSize(label: string): { width: number; height: number } {
  const { width, height } = edgeLabelPlate(label);

  return { width, height };
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
 * would draw nothing; falling back to a straight line between the two centres
 * keeps the edge visible. An edge that is not drawn is a dropped edge.
 */
function readRoutedEdges(
  design: Design,
  graph: LayoutGraph,
  placed: readonly LayoutNode[],
): readonly LayoutEdge[] {
  const boxes = new Map(placed.map((node) => [node.id, node] as const));
  const prepared: readonly PreparedEdge[] = design.edges.map((edge, index) => ({
    edge,
    index,
    plate: edgeLabelPlate(edge.label),
  }));
  const slots = selfLoopSlots(prepared);

  return prepared.map(({ edge, index, plate }) => {
    const loopsOn = edge.from === edge.to ? boxes.get(edge.from) : undefined;
    const slot = slots.get(index);

    if (loopsOn && slot) {
      return selfLoop(edge, loopsOn, plate, slot);
    }

    const routed = graph.edge({ v: edge.from, w: edge.to, name: String(index) });
    const points = routed?.points ?? [];
    const centre = labelCentre(routed, points);

    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      labelLines: plate.lines,
      points: points.length >= 2 ? points.map(toPoint) : straightLine(edge, graph),
      labelBox: {
        x: centre.x - plate.width / 2,
        y: centre.y - plate.height / 2,
        width: plate.width,
        height: plate.height,
      },
    };
  });
}

/** One edge with the plate its label needs, ready to be routed. */
interface PreparedEdge {
  readonly edge: DesignEdge;
  /** Its place in the file, which is also the key its route is stored under. */
  readonly index: number;
  readonly plate: EdgeLabelPlate;
}

/** Where one self-edge sits among the self-edges its own node carries. */
interface SelfLoopSlot {
  /** Its place among them, in file order: 0 for the first loop on that node. */
  readonly ordinal: number;
  /** How many loops that node carries, which is how wide the widest one is. */
  readonly loopCount: number;
  /** The top of its label plate, measured down from the top of the stack. */
  readonly plateTop: number;
  /** How tall the stack of every plate on that node is. */
  readonly stackHeight: number;
}

/**
 * Which loop on its node each self-edge is, and where its plate sits among the
 * plates of the others.
 *
 * `selfLoop` draws its route from the node's box, and a node's box is the same
 * box every time — so without this, two self-edges on one node came out as one
 * route drawn twice with two plates on the same spot, and the opaque upper
 * plate hid the lower label. Three edges in the file, two on screen, which is
 * exactly the drawing intake 5.2 rules out.
 *
 * The ordinal steps each loop further out; the stack keeps the plates apart.
 * Both are measured per node, so a design where three nodes each loop once is
 * unchanged — every one of those loops is its node's first.
 */
function selfLoopSlots(
  prepared: readonly PreparedEdge[],
): ReadonlyMap<number, SelfLoopSlot> {
  const slots = new Map<number, SelfLoopSlot>();

  for (const loops of loopsByNode(prepared).values()) {
    const stackHeight = loops.reduce(
      (total, loop) => total + loop.plate.height,
      SELF_LOOP_PLATE_GAP * (loops.length - 1),
    );

    loops.forEach((loop, ordinal) => {
      slots.set(loop.index, {
        ordinal,
        loopCount: loops.length,
        plateTop: plateTopOf(loops, ordinal),
        stackHeight,
      });
    });
  }

  return slots;
}

/** The self-edges each node carries, in the order the file listed them. */
function loopsByNode(
  prepared: readonly PreparedEdge[],
): ReadonlyMap<string, readonly PreparedEdge[]> {
  const byNode = new Map<string, readonly PreparedEdge[]>();

  for (const candidate of prepared) {
    if (candidate.edge.from !== candidate.edge.to) {
      continue;
    }

    const id = candidate.edge.from;

    byNode.set(id, [...(byNode.get(id) ?? []), candidate]);
  }

  return byNode;
}

/** How far down the stack one plate starts: every earlier plate, plus the gaps. */
function plateTopOf(loops: readonly PreparedEdge[], ordinal: number): number {
  return loops
    .slice(0, ordinal)
    .reduce((total, earlier) => total + earlier.plate.height + SELF_LOOP_PLATE_GAP, 0);
}

/**
 * A loop from a node back to itself, drawn against that node's own box.
 *
 * Dagre keeps self-edges out of edge routing: it parks a stub in a lane beside
 * the node and leaves the loop itself to the consumer. Passing that stub
 * through drew a line and an arrowhead in empty space, touching neither end of
 * anything — a route that means nothing where it sits. So this one route is
 * ours: out of the node's right border, around, and back into it, which is what
 * lets a reader see which box the arrow loops on.
 *
 * The slot is what keeps a node's loops apart. Each one reaches further out
 * than the last and meets the border further from its middle, so an outer loop
 * wraps around an inner one rather than tracing over it. Their labels are
 * stacked in one column past the widest of the loops, so no plate is piled on
 * another and none covers a line. A node with a single self-edge is the first
 * loop in a stack of one, and is drawn exactly where it always was.
 */
function selfLoop(
  edge: DesignEdge,
  node: LayoutBox,
  plate: EdgeLabelPlate,
  slot: SelfLoopSlot,
): LayoutEdge {
  const border = node.x + node.width;
  const reach = border + SELF_LOOP_EXTENT * (slot.ordinal + 1);
  const widestReach = border + SELF_LOOP_EXTENT * slot.loopCount;
  const middle = node.y + node.height / 2;
  const band = Math.min(
    node.height * SELF_LOOP_BAND * (slot.ordinal + 1),
    node.height / 2 - SELF_LOOP_BAND_INSET,
  );

  return {
    from: edge.from,
    to: edge.to,
    label: edge.label,
    labelLines: plate.lines,
    points: [
      { x: border, y: middle - band },
      { x: reach, y: middle - band },
      { x: reach, y: middle + band },
      { x: border, y: middle + band },
    ],
    labelBox: {
      x: widestReach + SELF_LOOP_LABEL_GAP,
      y: middle - slot.stackHeight / 2 + slot.plateTop,
      width: plate.width,
      height: plate.height,
    },
  };
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

/** The fallback route: centre to centre, so the edge is at least drawn. */
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

/**
 * How far to move everything so the drawing starts exactly one margin from the
 * top-left corner.
 *
 * Dagre's origin is its own business — an edge label or a route can sit at a
 * negative coordinate — so rather than trusting `graph().width`, this measures
 * what actually came out and moves it. The result is an invariant worth having:
 * whatever the design, the top-left-most thing on the canvas is at
 * `DRAWING_MARGIN`, and nothing is ever off the edge.
 */
function offsetToMargin(
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

function shiftBox<T extends LayoutBox>(box: T, offset: LayoutPoint): T {
  return { ...box, x: box.x + offset.x, y: box.y + offset.y };
}

function shiftEdge(edge: LayoutEdge, offset: LayoutPoint): LayoutEdge {
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
function canvasFor(
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
