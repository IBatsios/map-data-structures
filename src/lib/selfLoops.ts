/**
 * A node's n-th loop: where a self-edge goes when it leaves its node and comes
 * straight back.
 *
 * Every ordinary edge is routed by dagre and read back out of the graph. A
 * self-edge is not: dagre keeps them out of edge routing, parks a stub in a
 * lane beside the node and leaves the loop itself to the consumer, so passing
 * that stub through drew a line and an arrowhead in empty space touching
 * neither end of anything (D34). This module is the route we draw instead —
 * out of the node's right border, around, and back into it.
 *
 * The whole idea here is the **ordinal**: which of its node's loops this one
 * is. A loop drawn from the node's box and nothing else is the same loop every
 * time, so two self-edges on one node came out as one route drawn twice with
 * two opaque plates on the same spot, and the upper one hid the lower label —
 * three edges in the file, two on screen, the quietly wrong drawing intake 5.2
 * rules out. So the n-th loop reaches `SELF_LOOP_EXTENT × n` past the border
 * and meets that border further from its middle than the one inside it, and
 * all of a node's plates are stacked in one column past the widest loop (D37).
 * A plate that stepped out with its own loop would sit across the loops
 * outside it and cut their lines.
 *
 * There is room for all of it: dagre reserves a lane beside the node for every
 * self-edge and sizes each lane to that edge's own label, so the loops and
 * their plates stay well inside space already set aside rather than reaching a
 * neighbour's box.
 *
 * Like `layout.ts`, which is its only caller, this is pure: it reads boxes and
 * plates and returns new objects. It measures nothing against a browser and
 * touches nothing it is given.
 */

import type { DesignEdge } from './design.types';
import type { EdgeLabelPlate, LayoutBox, LayoutEdge, PreparedEdge } from './layout.types';

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

/** Where one self-edge sits among the self-edges its own node carries. */
export interface SelfLoopSlot {
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
 *
 * @param prepared - every edge in the design, in file order, each with the
 *   plate its label needs; the ones that do not loop are passed over
 * @returns a slot for each self-edge, keyed by that edge's place in the file
 */
export function selfLoopSlots(
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
 *
 * @param edge - the self-edge as the file gave it, for its own words
 * @param node - the box it loops on, already placed
 * @param plate - the plate its label is drawn on, already sized
 * @param slot - which of that node's loops this is, from `selfLoopSlots`
 * @returns the route and the label box, in new objects
 */
export function selfLoop(
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
