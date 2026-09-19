/**
 * What to do when dagre cannot lay a multigraph out: give it one edge per pair
 * of nodes instead of one per edge, then put the duplicates back here.
 *
 * Dagre 3.1.1 has a special case in its ordering pass for two parallel dummy
 * chains between the same pair of nodes, and that case drops one of them out of
 * the ordering when the pair also carries a two-cycle. A dropped dummy is never
 * given a position, so its coordinates come back as `NaN`: sometimes loudly,
 * because `assignNodeIntersects` throws on them, and sometimes silently, as a
 * `NaN` in the middle of a route. Both are the same fault, and both are D98.
 *
 * The remedy is not to argue with dagre about ordering but to stop handing it
 * the shape that triggers the case. Merge the parallel duplicates into one
 * dagre edge, let dagre route that, and fan the duplicates back apart here —
 * which is squarely `layout.ts`'s job as the wall around the library.
 *
 * Two properties make this safe to have in the path at all:
 *
 * 1. **`'per-edge'` keying changes nothing.** Every group has exactly one
 *    member, so `labelRoomFor` returns that member's own plate,
 *    `fanOutRoute` returns the route it was given, and `stackedLabelCentre`
 *    returns the centre it was given. The layout of every design that dagre can
 *    already lay out is byte-for-byte what it was.
 * 2. **A self-edge is never merged.** D34 and D37 own self-loops and draw them
 *    here rather than reading them from dagre, and merging two loops on one node
 *    would quietly take back the room dagre reserves for each. They stay keyed
 *    by their own index under both keyings.
 *
 * Like `selfLoops.ts` and `normaliseDrawing.ts`, nothing outside this folder
 * imports from here: `./layout` is the one door.
 */

import type { DesignEdge } from './design.types';
import type { EdgeLabelPlate, LayoutPoint, PreparedEdge } from './layout.types';

/**
 * How an edge is keyed in dagre's graph, which is what decides what shares a
 * route: one dagre edge per edge in the file, or one per pair of nodes.
 */
export type EdgeKeying = 'per-edge' | 'per-pair';

/**
 * The keyings to try, in order. `'per-edge'` is what dagre is asked for first
 * and all but always answers; `'per-pair'` is the retry for the graphs it
 * cannot.
 */
export const EDGE_KEYINGS: readonly EdgeKeying[] = ['per-edge', 'per-pair'];

/** The name every merged edge between a pair of nodes is keyed by. */
const MERGED_EDGE_NAME = 'merged';

/** How far apart two edges sharing one route are pulled, in pixels. */
const PARALLEL_ROUTE_SPREAD = 18;

/** Clear space between two label plates stacked on one route, in pixels. */
const PARALLEL_LABEL_GAP = 4;

/** The fewest points a route can have and still have a middle to move. */
const POINTS_WITH_A_MIDDLE = 3;

/** One dagre edge, and the file's edges that will share the route it gets. */
export interface EdgeGroup {
  readonly from: string;
  readonly to: string;
  /** The name dagre knows this one edge by. */
  readonly name: string;
  /** The file's edges sharing it, in file order. */
  readonly members: readonly PreparedEdge[];
}

/** Where one of the file's edges sits among the edges sharing its route. */
export interface EdgeShare {
  /** The name to look the route up by. */
  readonly name: string;
  /** Its place among the sharers, counted from zero, in file order. */
  readonly place: number;
  readonly members: readonly PreparedEdge[];
}

/** The groups to put in the graph, and where each file edge went. */
export interface SharedRoutes {
  readonly groups: readonly EdgeGroup[];
  /** Keyed by an edge's index in the file, which is `PreparedEdge.index`. */
  readonly shares: ReadonlyMap<number, EdgeShare>;
}

/**
 * Works out which edges share a route under a keying, and which do not.
 *
 * @param prepared - every edge in the file, in file order, with its plate
 * @param keying - one dagre edge per file edge, or one per pair of nodes
 * @returns the edges to give dagre, and each file edge's place among sharers
 */
export function shareRoutes(
  prepared: readonly PreparedEdge[],
  keying: EdgeKeying,
): SharedRoutes {
  const grouped = new Map<string, PreparedEdge[]>();

  for (const edge of prepared) {
    const key = groupKeyOf(edge.edge, edge.index, keying);
    const existing = grouped.get(key);

    if (existing) {
      existing.push(edge);
      continue;
    }

    grouped.set(key, [edge]);
  }

  const groups = [...grouped.values()].map(groupOf);
  const shares = new Map<number, EdgeShare>();

  for (const group of groups) {
    group.members.forEach((member, place) => {
      shares.set(member.index, { name: group.name, place, members: group.members });
    });
  }

  return { groups, shares };
}

/** One group, named and addressed by the first member's own edge. */
function groupOf(members: readonly PreparedEdge[]): EdgeGroup {
  const [first] = members;

  if (!first) {
    throw new Error('An edge group was built with no edges in it.');
  }

  return {
    from: first.edge.from,
    to: first.edge.to,
    name: members.length === 1 ? String(first.index) : MERGED_EDGE_NAME,
    members,
  };
}

/**
 * What decides whether two edges land in the same group.
 *
 * An edge's own index is unique by definition, so keying by it groups nothing.
 * Keying by the pair groups the duplicates — except a self-edge, which keeps
 * its index under both keyings for the reason in this module's own comment.
 */
function groupKeyOf(edge: DesignEdge, index: number, keying: EdgeKeying): string {
  if (keying === 'per-edge' || edge.from === edge.to) {
    return `edge ${index}`;
  }

  return `pair ${JSON.stringify([edge.from, edge.to])}`;
}

/**
 * The room dagre has to reserve for every label on one route.
 *
 * The plates are stacked down the route rather than side by side, because a
 * route runs down the page and widening it would push the columns apart for a
 * label that is not beside them. For a group of one this is that one plate, to
 * the pixel.
 */
export function labelRoomFor(members: readonly PreparedEdge[]): {
  width: number;
  height: number;
} {
  const width = Math.max(0, ...members.map((member) => member.plate.width));
  const gaps = PARALLEL_LABEL_GAP * Math.max(0, members.length - 1);
  const height = members.reduce((total, member) => total + member.plate.height, gaps);

  return { width, height };
}

/**
 * The same route, moved aside so the edges sharing it can be told apart.
 *
 * The two ends are left exactly where dagre put them, which is on the source's
 * border and the target's; only what runs between them moves. A route with no
 * middle — two nodes on neighbouring rows — is given one, so that even the
 * shortest pair of duplicates is two visible lines rather than one drawn twice.
 *
 * @param points - the route dagre gave the group, from border to border
 * @param share - which sharer this is, and how many there are
 * @returns the route for this sharer; the one it was given, for a group of one
 */
export function fanOutRoute(
  points: readonly LayoutPoint[],
  share: EdgeShare,
): readonly LayoutPoint[] {
  const offset = offsetFor(share);

  if (offset === 0) {
    return points;
  }

  if (points.length < POINTS_WITH_A_MIDDLE) {
    return withAMiddle(points, offset);
  }

  return points.map((point, at) =>
    at === 0 || at === points.length - 1 ? point : { x: point.x + offset, y: point.y },
  );
}

/** A two-point route with a middle put in, so it can be moved aside. */
function withAMiddle(
  points: readonly LayoutPoint[],
  offset: number,
): readonly LayoutPoint[] {
  const [start, end] = points;

  if (!start || !end) {
    return points;
  }

  return [start, { x: (start.x + end.x) / 2 + offset, y: (start.y + end.y) / 2 }, end];
}

/**
 * Where this sharer's plate sits inside the room reserved for all of them.
 *
 * The plates stack down the route in file order, so the first edge listed is
 * the first label read. For a group of one the answer is the centre it was
 * given, unchanged.
 *
 * @param centre - where dagre put the one label for the whole group
 * @param share - which sharer this is, and what the others' plates measure
 */
export function stackedLabelCentre(centre: LayoutPoint, share: EdgeShare): LayoutPoint {
  const plate = plateOf(share);
  const room = labelRoomFor(share.members);
  const above = share.members
    .slice(0, share.place)
    .reduce((total, member) => total + member.plate.height + PARALLEL_LABEL_GAP, 0);

  return { x: centre.x, y: centre.y - room.height / 2 + above + plate.height / 2 };
}

/** How far aside this sharer goes: nowhere, when it shares with nobody. */
function offsetFor(share: EdgeShare): number {
  if (share.members.length <= 1) {
    return 0;
  }

  return (share.place - (share.members.length - 1) / 2) * PARALLEL_ROUTE_SPREAD;
}

/** This sharer's own plate, which its place in the group names. */
function plateOf(share: EdgeShare): EdgeLabelPlate {
  const plate = share.members[share.place]?.plate;

  if (!plate) {
    throw new Error(`An edge share named no plate at place ${share.place}.`);
  }

  return plate;
}
