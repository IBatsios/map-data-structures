import { describe, expect, it } from 'vitest';

// The repro design is read from the fixture the e2e walk uploads, as its own
// bytes, rather than written out a second time here. Two copies of a design
// that has to stay exactly shaped to reproduce a bug are two that drift.
import twoCycleWithDuplicateEdgeFile from '../../e2e/fixtures/two-cycle-duplicate-edge.json?raw';
import type { Design } from './design.types';
import {
  DRAWING_MARGIN,
  EDGE_LABEL_PADDING,
  MAX_TEXT_WIDTH,
  MIN_NODE_WIDTH,
  SELF_LOOP_EXTENT,
  layoutDesign,
} from './layout';
import type { DesignLayout, LayoutBox, LayoutEdge, LayoutNode } from './layout';
import { loadDesign } from './loadDesign';
import { DEFAULT_SHAPE } from './shapes';

/** The README's own example: the smallest design that has a flow in it. */
const orderIntake: Design = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

function nodeById(nodes: readonly LayoutNode[], id: string): LayoutNode {
  const found = nodes.find((node) => node.id === id);

  if (!found) {
    throw new Error(`The layout placed no node for "${id}".`);
  }

  return found;
}

function overlaps(a: LayoutBox, b: LayoutBox): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** One routed edge by its place in the file, named rather than optional-chained. */
function edgeAt(edges: readonly LayoutEdge[], index: number): LayoutEdge {
  const found = edges[index];

  if (!found) {
    throw new Error(`The layout routed no edge at ${index}.`);
  }

  return found;
}

/** How far out from the node a loop reaches, which is its widest point. */
function reachOf(edge: LayoutEdge): number {
  return Math.max(...edge.points.map((point) => point.x));
}

/** The one edge of a two-node design, so a label can be varied on its own. */
function plateFor(label: string): LayoutEdge {
  const layout = layoutDesign({
    title: 'Edge labels',
    nodes: [
      { id: 'a', label: 'Alpha', type: 'service' },
      { id: 'b', label: 'Beta', type: 'service' },
    ],
    edges: [{ from: 'a', to: 'b', label }],
  });
  const edge = layout.edges[0];

  if (!edge) {
    throw new Error('The layout routed no edge.');
  }

  return edge;
}

describe('layoutDesign', () => {
  it('carries the design title onto the drawing', () => {
    expect(layoutDesign(orderIntake).title).toBe('Order intake');
  });

  it('places every node exactly once, in the order the file listed them', () => {
    const layout = layoutDesign(orderIntake);

    expect(layout.nodes.map((node) => node.id)).toEqual(['api', 'queue']);
  });

  it('carries the label and type of each node through untouched', () => {
    const layout = layoutDesign(orderIntake);

    expect(nodeById(layout.nodes, 'api').label).toBe('Public API');
    expect(nodeById(layout.nodes, 'api').type).toBe('service');
  });

  it('draws a whitespace-only label as it stands, rather than tidying it away', () => {
    // The schema admits '   ' today, and Task 04 owns whether it should. Until
    // then the drawing has to show what the file said, spaces and all, because
    // laundering it here would hide the very thing Task 04 has to see.
    const layout = layoutDesign({
      title: 'Blank labels',
      nodes: [{ id: 'a', label: '   ', type: '  ' }],
      edges: [],
    });

    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]?.label).toBe('   ');
    expect(layout.nodes[0]?.type).toBe('  ');
  });

  it('gives every node the shape its type implies', () => {
    const layout = layoutDesign(orderIntake);

    expect(nodeById(layout.nodes, 'api').shape.name).toBe('rounded');
    expect(nodeById(layout.nodes, 'queue').shape.name).toBe('stadium');
  });

  it('still places a node whose type it does not recognise', () => {
    const layout = layoutDesign({
      title: 'Unknown kinds',
      nodes: [{ id: 'thing', label: 'Widget factory', type: 'widget-factory' }],
      edges: [],
    });

    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]?.shape).toEqual(DEFAULT_SHAPE);
  });

  it('sizes a node to its label, never below the minimum width', () => {
    const layout = layoutDesign({
      title: 'Widths',
      nodes: [
        { id: 'short', label: 'A', type: 'service' },
        { id: 'long', label: 'Order fulfilment service', type: 'service' },
      ],
      edges: [],
    });

    const short = nodeById(layout.nodes, 'short');
    const long = nodeById(layout.nodes, 'long');

    expect(short.width).toBe(MIN_NODE_WIDTH);
    expect(long.width).toBeGreaterThan(short.width);
  });

  it('grows a node taller, not wider, once its label passes the text limit', () => {
    const layout = layoutDesign({
      title: 'Long labels',
      nodes: [
        { id: 'one', label: 'Order service', type: 'service' },
        {
          id: 'two',
          label:
            'Order fulfilment and dispatch coordination service for the eastern region',
          type: 'service',
        },
      ],
      edges: [],
    });

    const one = nodeById(layout.nodes, 'one');
    const two = nodeById(layout.nodes, 'two');

    expect(two.width).toBeLessThanOrEqual(MAX_TEXT_WIDTH + two.shape.padding.x * 2);
    expect(two.height).toBeGreaterThan(one.height);
  });

  it('lays the flow out top to bottom: a target sits below its source', () => {
    const layout = layoutDesign(orderIntake);

    const api = nodeById(layout.nodes, 'api');
    const queue = nodeById(layout.nodes, 'queue');

    expect(queue.y).toBeGreaterThan(api.y + api.height);
  });

  it('puts two unconnected nodes side by side on the same row', () => {
    const layout = layoutDesign({
      title: 'Two islands',
      nodes: [
        { id: 'a', label: 'Alpha', type: 'service' },
        { id: 'b', label: 'Beta', type: 'service' },
      ],
      edges: [],
    });

    const a = nodeById(layout.nodes, 'a');
    const b = nodeById(layout.nodes, 'b');

    expect(a.y).toBe(b.y);
    expect(a.x).not.toBe(b.x);
  });

  it('never overlaps two node boxes', () => {
    const layout = layoutDesign({
      title: 'A fuller design',
      nodes: [
        { id: 'user', label: 'Customer', type: 'user' },
        { id: 'api', label: 'Public API', type: 'service' },
        { id: 'queue', label: 'Order queue', type: 'queue' },
        { id: 'worker', label: 'Fulfilment worker', type: 'service' },
        { id: 'db', label: 'Order store', type: 'database' },
      ],
      edges: [
        { from: 'user', to: 'api', label: 'places order' },
        { from: 'api', to: 'queue', label: 'publishes order' },
        { from: 'queue', to: 'worker', label: 'delivers order' },
        { from: 'worker', to: 'db', label: 'writes order' },
        { from: 'api', to: 'db', label: 'reads order' },
      ],
    });

    for (const [index, node] of layout.nodes.entries()) {
      for (const other of layout.nodes.slice(index + 1)) {
        expect(overlaps(node, other)).toBe(false);
      }
    }
  });

  it('routes every edge from its source box to its target box', () => {
    const layout = layoutDesign(orderIntake);

    expect(layout.edges).toHaveLength(1);

    const route = layout.edges[0];
    const api = nodeById(layout.nodes, 'api');
    const queue = nodeById(layout.nodes, 'queue');

    expect(route?.from).toBe('api');
    expect(route?.to).toBe('queue');
    expect(route?.label).toBe('publishes order');
    expect(route?.points.length).toBeGreaterThanOrEqual(2);

    const first = route?.points[0];
    const last = route?.points.at(-1);

    expect(first?.y).toBeGreaterThanOrEqual(api.y);
    expect(first?.y).toBeLessThanOrEqual(api.y + api.height);
    expect(last?.y).toBeGreaterThanOrEqual(queue.y - 1);
    expect(last?.y).toBeLessThanOrEqual(queue.y + queue.height);
    expect(last?.y).toBeGreaterThan(first?.y ?? 0);
  });

  it('keeps both of two edges between the same pair, each with its own label', () => {
    const layout = layoutDesign({
      title: 'Two ways round',
      nodes: [
        { id: 'a', label: 'Alpha', type: 'service' },
        { id: 'b', label: 'Beta', type: 'service' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'asks' },
        { from: 'a', to: 'b', label: 'tells' },
      ],
    });

    expect(layout.edges.map((edge) => edge.label)).toEqual(['asks', 'tells']);
  });

  it('loops a self-edge against the node it points at, not out in empty space', () => {
    const layout = layoutDesign({
      title: 'Self reference',
      nodes: [{ id: 'a', label: 'Retry loop', type: 'service' }],
      edges: [{ from: 'a', to: 'a', label: 'retries' }],
    });

    expect(layout.edges).toHaveLength(1);

    const node = nodeById(layout.nodes, 'a');
    const route = layout.edges[0];
    const first = route?.points[0];
    const last = route?.points.at(-1);

    // Both ends sit on the node's own border, so the loop is attached at both
    // ends rather than floating beside the box.
    expect(first?.x).toBe(node.x + node.width);
    expect(last?.x).toBe(node.x + node.width);
    expect(first?.y).toBeGreaterThan(node.y);
    expect(first?.y).toBeLessThan(node.y + node.height);
    expect(last?.y).toBeGreaterThan(node.y);
    expect(last?.y).toBeLessThan(node.y + node.height);
    expect(last?.y).not.toBe(first?.y);

    // And it leaves the box in between, so it reads as a loop, not a dot.
    const reach = Math.max(...(route?.points ?? []).map((point) => point.x));

    expect(reach).toBe(node.x + node.width + SELF_LOOP_EXTENT);
  });

  it('keeps every part of a self-edge beside the node it loops on', () => {
    // The design the detached route was found on: dagre keeps self-edges out of
    // its routing and parks a stub beside the node for the consumer to replace,
    // and the stub landed clear of the box with its arrowhead pointing at
    // nothing. Every point of the loop belongs to its node's own neighbourhood.
    const layout = layoutDesign({
      title: 'Retries',
      nodes: [
        { id: 'a', label: 'Alpha', type: 'service' },
        { id: 'b', label: 'Beta', type: 'service' },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'asks' },
        { from: 'a', to: 'b', label: 'tells' },
        { from: 'a', to: 'a', label: 'loops to itself' },
      ],
    });

    const a = nodeById(layout.nodes, 'a');
    const self = layout.edges[2];

    expect(self?.from).toBe('a');
    expect(self?.to).toBe('a');

    for (const point of self?.points ?? []) {
      expect(point.x).toBeGreaterThanOrEqual(a.x + a.width);
      expect(point.x).toBeLessThanOrEqual(a.x + a.width + SELF_LOOP_EXTENT);
      expect(point.y).toBeGreaterThanOrEqual(a.y);
      expect(point.y).toBeLessThanOrEqual(a.y + a.height);
    }

    // The label belongs to the loop too: clear of it, level with the node.
    const labelBox = self?.labelBox;

    expect(labelBox?.x).toBeGreaterThanOrEqual(a.x + a.width + SELF_LOOP_EXTENT);
    expect((labelBox?.y ?? 0) + (labelBox?.height ?? 0) / 2).toBe(a.y + a.height / 2);
  });

  it('draws two self-edges on one node as two loops, neither hiding the other', () => {
    // A loop drawn from the node's box and nothing else is the same loop every
    // time. Two self-edges on one node landed on the same four points with
    // their plates on top of each other, and because a plate is opaque the
    // wider one hid the other label completely: three edges in the file, two on
    // screen. Dagre reserves a lane beside the node for every self-edge, so the
    // room is there; what was missing was which of them this one is.
    const layout = layoutDesign({
      title: 'Two loops',
      nodes: [
        { id: 'worker', label: 'Delivery worker', type: 'service' },
        { id: 'outbox', label: 'Outbox', type: 'queue' },
      ],
      edges: [
        { from: 'worker', to: 'worker', label: 'retries on failure' },
        { from: 'worker', to: 'worker', label: 'escalates after five' },
        { from: 'worker', to: 'outbox', label: 'reads batch' },
      ],
    });

    expect(layout.edges.map((edge) => edge.label)).toEqual([
      'retries on failure',
      'escalates after five',
      'reads batch',
    ]);

    const worker = nodeById(layout.nodes, 'worker');
    const border = worker.x + worker.width;
    const first = edgeAt(layout.edges, 0);
    const second = edgeAt(layout.edges, 1);

    // Both loops still hang off the node's own border at both ends.
    for (const loop of [first, second]) {
      expect(loop.points[0]?.x).toBe(border);
      expect(loop.points.at(-1)?.x).toBe(border);

      for (const point of loop.points) {
        expect(point.y).toBeGreaterThanOrEqual(worker.y);
        expect(point.y).toBeLessThanOrEqual(worker.y + worker.height);
      }
    }

    // But they are two loops, not one loop drawn twice: the second reaches
    // further out and meets the border somewhere the first does not.
    expect(second.points).not.toEqual(first.points);
    expect(reachOf(second)).toBeGreaterThan(reachOf(first));
    expect(second.points[0]?.y).not.toBe(first.points[0]?.y);

    // And both labels can be read, which needs the plates clear of each other
    // and clear of the node. A plate on top of a plate is a lost label.
    expect(overlaps(first.labelBox, second.labelBox)).toBe(false);
    expect(overlaps(first.labelBox, worker)).toBe(false);
    expect(overlaps(second.labelBox, worker)).toBe(false);
  });

  it('gives every edge a label box wide enough for its label', () => {
    const layout = layoutDesign(orderIntake);
    const route = layout.edges[0];

    expect(route?.labelBox.width).toBeGreaterThan(0);
    expect(route?.labelBox.height).toBeGreaterThan(0);
  });

  it('keeps a short edge label on one line', () => {
    const layout = layoutDesign(orderIntake);

    expect(layout.edges[0]?.labelLines).toEqual(['publishes order']);
  });

  it('wraps a long edge label, so its plate grows taller and not endlessly wider', () => {
    // A node label wraps and its box grows taller. An edge label did not, so
    // one long label made a plate wide enough to shrink the whole drawing to
    // fit it. The two behave the same way now.
    const short = plateFor('asks');
    const long = plateFor(
      'drains the outbox and hands every entry to the ledger in order '.repeat(5),
    );

    expect(long.labelLines.length).toBeGreaterThan(1);
    expect(long.labelBox.height).toBeGreaterThan(short.labelBox.height);
    expect(long.labelBox.width).toBeLessThanOrEqual(
      MAX_TEXT_WIDTH + EDGE_LABEL_PADDING.x * 2,
    );
  });

  it('loses no word from an edge label it had to wrap', () => {
    const label = 'drains the outbox and hands every entry to the ledger in order';

    expect(plateFor(label).labelLines.join(' ')).toBe(label);
  });

  it('starts the drawing exactly one margin from the top-left corner', () => {
    const layout = layoutDesign(orderIntake);
    const lefts = layout.nodes.map((node) => node.x);
    const tops = layout.nodes.map((node) => node.y);

    expect(Math.min(...lefts)).toBe(DRAWING_MARGIN);
    expect(Math.min(...tops)).toBe(DRAWING_MARGIN);
  });

  it('fits the canvas around everything it placed, with a margin all round', () => {
    const layout = layoutDesign(orderIntake);

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(DRAWING_MARGIN);
      expect(node.y).toBeGreaterThanOrEqual(DRAWING_MARGIN);
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width - DRAWING_MARGIN);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height - DRAWING_MARGIN);
    }

    for (const edge of layout.edges) {
      for (const point of edge.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(layout.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('places a lone node at the margin, at the size its shape asks for', () => {
    const layout = layoutDesign({
      title: 'One box',
      nodes: [{ id: 'a', label: 'A', type: 'service' }],
      edges: [],
    });

    const only = layout.nodes[0];

    expect(only?.x).toBe(DRAWING_MARGIN);
    expect(only?.y).toBe(DRAWING_MARGIN);
    expect(layout.width).toBe(MIN_NODE_WIDTH + DRAWING_MARGIN * 2);
    expect(layout.height).toBe((only?.height ?? 0) + DRAWING_MARGIN * 2);
  });

  it('lays an empty design out as an empty canvas that still has size', () => {
    const layout = layoutDesign({ title: 'Nothing yet', nodes: [], edges: [] });

    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it('does not touch the design it was given', () => {
    const before = JSON.stringify(orderIntake);

    layoutDesign(orderIntake);

    expect(JSON.stringify(orderIntake)).toBe(before);
  });

  it('lays the same design out the same way twice', () => {
    expect(layoutDesign(orderIntake)).toEqual(layoutDesign(orderIntake));
  });
});

/** Whether every number in a laid-out drawing is a number a renderer can use. */
function allCoordinatesAreFinite(layout: DesignLayout): boolean {
  const numbers = [
    layout.width,
    layout.height,
    ...layout.nodes.flatMap((node) => [node.x, node.y, node.width, node.height]),
    ...layout.edges.flatMap((edge) => [
      edge.labelBox.x,
      edge.labelBox.y,
      ...edge.points.flatMap((point) => [point.x, point.y]),
    ]),
  ];

  return numbers.every((value) => Number.isFinite(value));
}

/** The two routes of a pair of parallel edges, as strings that can be compared. */
function routeOf(edge: LayoutEdge): string {
  return edge.points.map((point) => `${point.x},${point.y}`).join(' ');
}

/**
 * A seeded generator, so "no failures in 2500 graphs" names a set of graphs
 * somebody else can produce. `mulberry32`: thirty-two bits of state, uniform
 * enough for picking node pairs and short enough to read.
 */
function randomNumbers(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** One random multigraph: a few nodes, and edges drawn between them at random. */
function randomDesign(next: () => number): Design {
  const nodeCount = 2 + Math.floor(next() * 7);
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `n${index}`,
    label: `Node ${index}`,
    type: 'service',
  }));
  const edgeCount = Math.floor(next() * nodeCount * 2);
  const pick = (): string => `n${Math.floor(next() * nodeCount)}`;
  const edges = Array.from({ length: edgeCount }, (_, index) => ({
    from: pick(),
    to: pick(),
    label: `edge ${index}`,
  }));

  return { title: 'Fuzzed', nodes, edges };
}

/**
 * The graphs dagre cannot lay out by itself, and what this module does instead.
 *
 * Dagre 3.1.1 drops a dummy node out of its own ordering when a pair of nodes
 * carries both a two-cycle and a parallel duplicate, which leaves that dummy
 * with no coordinates at all (D98). The design below is the smallest case of it
 * anybody on this project has found, and it is a design a user may legitimately
 * write: unique ids, every edge naming a node that exists, no blank field.
 */
describe('layoutDesign, on a graph dagre cannot lay out on its own', () => {
  const twoCycleWithDuplicateEdge = loadDesign(twoCycleWithDuplicateEdgeFile);

  it('accepts the fixture as a design before any of this is about layout', () => {
    // D20's two passes: the cross-field rules are only reached once every field
    // has passed, so a fixture that fails either pass is not a layout repro at
    // all. This is the test that says the crash is downstream of the loader.
    expect(twoCycleWithDuplicateEdge.nodes.map((node) => node.id)).toEqual([
      'n0',
      'n2',
      'n3',
      'n4',
      'n5',
      'n6',
    ]);
    expect(twoCycleWithDuplicateEdge.edges).toHaveLength(7);
  });

  it('draws all six nodes and all seven edges instead of throwing', () => {
    // Act
    const layout = layoutDesign(twoCycleWithDuplicateEdge);

    // Assert
    expect(layout.nodes.map((node) => node.id)).toEqual([
      'n0',
      'n2',
      'n3',
      'n4',
      'n5',
      'n6',
    ]);
    expect(layout.edges.map((edge) => `${edge.from}→${edge.to}`)).toEqual([
      'n2→n5',
      'n0→n6',
      'n0→n4',
      'n3→n4',
      'n6→n3',
      'n4→n0',
      'n0→n4',
    ]);
  });

  it('gives every node and every point of it a number a renderer can draw', () => {
    // The quieter half of the same dagre fault: where the dropped dummy is not
    // an edge's first or last point, dagre returns rather than throwing, and a
    // `NaN` in a path's `d` voids the whole path. An invisible edge is a
    // dropped edge, which is the thing intake 5.2 forbids.
    // Act
    const layout = layoutDesign(twoCycleWithDuplicateEdge);

    // Assert
    expect(allCoordinatesAreFinite(layout)).toBe(true);
  });

  it('routes the two parallel edges apart, so a reader can see both', () => {
    // Act
    const layout = layoutDesign(twoCycleWithDuplicateEdge);
    const first = edgeAt(layout.edges, 2);
    const second = edgeAt(layout.edges, 6);

    // Assert
    expect(routeOf(first)).not.toBe(routeOf(second));
    expect(overlaps(first.labelBox, second.labelBox)).toBe(false);
  });

  it('keeps each parallel edge’s own label on its own plate', () => {
    // Act
    const layout = layoutDesign(twoCycleWithDuplicateEdge);

    // Assert
    expect(edgeAt(layout.edges, 2).label).toBe('requests settlement');
    expect(edgeAt(layout.edges, 6).label).toBe('retries settlement');
  });

  it('lays out 2500 random multigraphs without one failure', () => {
    // 2500 is the scale at which this fault was caught twice by hand, so a
    // clean run at it is the number that means something. The seed is fixed:
    // `randomNumbers(FUZZ_SEED)` above regenerates exactly these graphs.
    // Arrange
    const FUZZ_SEED = 20260918;
    const FUZZ_RUNS = 2500;
    const next = randomNumbers(FUZZ_SEED);
    const failures: string[] = [];

    // Act
    for (let run = 0; run < FUZZ_RUNS; run += 1) {
      const design = randomDesign(next);

      try {
        if (!allCoordinatesAreFinite(layoutDesign(design))) {
          failures.push(`run ${run}: a coordinate was not finite`);
        }
      } catch (error) {
        failures.push(`run ${run}: ${error instanceof Error ? error.message : 'threw'}`);
      }
    }

    // Assert
    expect(failures).toEqual([]);
  });
});
