import { describe, expect, it } from 'vitest';

import type { PreparedEdge } from './layout.types';
import type { EdgeShare } from './parallelEdges';
import {
  EDGE_KEYINGS,
  fanOutRoute,
  labelRoomFor,
  shareRoutes,
  stackedLabelCentre,
} from './parallelEdges';

/**
 * The tests of the retry `layout.ts` makes when dagre cannot lay a multigraph
 * out at all (D98).
 *
 * The one that matters most is the first block: under `'per-edge'` keying this
 * module has to be a no-op to the pixel, because that is the keying every
 * design dagre can already place goes through. If any of those assertions ever
 * fails, every drawing this app has ever produced has moved.
 */

/** One edge with a plate, shaped the way `layout.ts` prepares them. */
function preparedEdge(
  index: number,
  from: string,
  to: string,
  plate: { width: number; height: number } = { width: 60, height: 20 },
): PreparedEdge {
  return {
    edge: { from, to, label: `edge ${index}` },
    index,
    plate: { lines: [`edge ${index}`], ...plate },
  };
}

/** A share of a route, built from the members that are on it. */
function shareOf(members: readonly PreparedEdge[], place: number): EdgeShare {
  return { name: 'merged', place, members };
}

const ROUTE = [
  { x: 100, y: 50 },
  { x: 100, y: 120 },
  { x: 100, y: 190 },
  { x: 100, y: 260 },
];

describe('shareRoutes, under per-edge keying', () => {
  it('gives every edge a route of its own, keyed by its place in the file', () => {
    // Arrange
    const prepared = [
      preparedEdge(0, 'a', 'b'),
      preparedEdge(1, 'a', 'b'),
      preparedEdge(2, 'b', 'a'),
    ];

    // Act
    const { groups, shares } = shareRoutes(prepared, 'per-edge');

    // Assert
    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.name)).toEqual(['0', '1', '2']);
    expect([...shares.values()].every((share) => share.members.length === 1)).toBe(true);
  });

  it('reserves exactly the plate the edge asked for, and no more', () => {
    // This is the whole no-op claim in one assertion: the size dagre is given
    // for a group of one is that one edge's own plate.
    // Arrange
    const only = preparedEdge(0, 'a', 'b', { width: 71, height: 24 });

    // Act, Assert
    expect(labelRoomFor([only])).toEqual({ width: 71, height: 24 });
  });

  it('returns the route dagre gave, as the very same array', () => {
    // Act
    const fanned = fanOutRoute(ROUTE, shareOf([preparedEdge(0, 'a', 'b')], 0));

    // Assert
    expect(fanned).toBe(ROUTE);
  });

  it('returns the label centre dagre gave, unchanged', () => {
    // Act
    const centre = stackedLabelCentre(
      { x: 120, y: 155 },
      shareOf([preparedEdge(0, 'a', 'b')], 0),
    );

    // Assert
    expect(centre).toEqual({ x: 120, y: 155 });
  });
});

describe('shareRoutes, under per-pair keying', () => {
  it('puts two edges between the same pair on one route', () => {
    // Arrange
    const prepared = [preparedEdge(0, 'a', 'b'), preparedEdge(1, 'a', 'b')];

    // Act
    const { groups, shares } = shareRoutes(prepared, 'per-pair');

    // Assert
    expect(groups).toHaveLength(1);
    expect(shares.get(0)?.place).toBe(0);
    expect(shares.get(1)?.place).toBe(1);
  });

  it('keeps the two directions of a two-cycle apart', () => {
    // A pair of nodes is not an unordered pair here: `a → b` and `b → a` are
    // two edges dagre has to route in two directions, and merging them would
    // lose one of them outright.
    // Arrange
    const prepared = [preparedEdge(0, 'a', 'b'), preparedEdge(1, 'b', 'a')];

    // Act
    const { groups } = shareRoutes(prepared, 'per-pair');

    // Assert
    expect(groups).toHaveLength(2);
  });

  it('never merges two loops on the same node', () => {
    // D34 and D37 own self-loops: they are drawn by `selfLoops.ts` rather than
    // read from dagre, and merging them would take back the room dagre reserves
    // for each. They keep their own index under both keyings.
    // Arrange
    const prepared = [preparedEdge(0, 'a', 'a'), preparedEdge(1, 'a', 'a')];

    // Act
    const { groups } = shareRoutes(prepared, 'per-pair');

    // Assert
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.name)).toEqual(['0', '1']);
  });

  it('reserves room for every label on a shared route, stacked', () => {
    // Arrange
    const members = [
      preparedEdge(0, 'a', 'b', { width: 60, height: 20 }),
      preparedEdge(1, 'a', 'b', { width: 90, height: 36 }),
    ];

    // Act
    const room = labelRoomFor(members);

    // Assert
    expect(room.width).toBe(90);
    expect(room.height).toBeGreaterThanOrEqual(56);
  });

  it('moves the middle of a shared route aside but not its ends', () => {
    // The ends are where dagre put them, which is on the two borders. Moving
    // them would take the arrow off the box it points at.
    // Arrange
    const members = [preparedEdge(0, 'a', 'b'), preparedEdge(1, 'a', 'b')];

    // Act
    const first = fanOutRoute(ROUTE, shareOf(members, 0));
    const second = fanOutRoute(ROUTE, shareOf(members, 1));

    // Assert
    expect(first[0]).toEqual(ROUTE[0]);
    expect(first.at(-1)).toEqual(ROUTE.at(-1));
    expect(second[0]).toEqual(ROUTE[0]);
    expect(second.at(-1)).toEqual(ROUTE.at(-1));
    expect(first[1]?.x).not.toBe(second[1]?.x);
  });

  it('gives a route with no middle one, so both duplicates can be seen', () => {
    // Two nodes on neighbouring rows get a two-point route, and two of those
    // drawn on top of each other is one line the reader can see.
    // Arrange
    const members = [preparedEdge(0, 'a', 'b'), preparedEdge(1, 'a', 'b')];
    const short = [
      { x: 100, y: 50 },
      { x: 100, y: 120 },
    ];

    // Act
    const first = fanOutRoute(short, shareOf(members, 0));
    const second = fanOutRoute(short, shareOf(members, 1));

    // Assert
    expect(first).toHaveLength(3);
    expect(first[1]?.y).toBe(85);
    expect(first[1]?.x).not.toBe(second[1]?.x);
  });

  it('stacks the plates down the route in the order the file listed them', () => {
    // Arrange
    const members = [
      preparedEdge(0, 'a', 'b', { width: 60, height: 20 }),
      preparedEdge(1, 'a', 'b', { width: 60, height: 20 }),
    ];
    const centre = { x: 120, y: 155 };

    // Act
    const first = stackedLabelCentre(centre, shareOf(members, 0));
    const second = stackedLabelCentre(centre, shareOf(members, 1));

    // Assert
    expect(first.y).toBeLessThan(second.y);
    expect(second.y - first.y).toBeGreaterThanOrEqual(20);
    expect((first.y + second.y) / 2).toBe(centre.y);
  });
});

describe('EDGE_KEYINGS', () => {
  it('asks dagre for one edge per file edge before it asks for anything else', () => {
    // The order is the safety property: the keying that changes nothing is
    // always tried first, so the retry only ever runs on a graph dagre failed.
    expect(EDGE_KEYINGS).toEqual(['per-edge', 'per-pair']);
  });
});
