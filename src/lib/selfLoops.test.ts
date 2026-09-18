import { describe, expect, it } from 'vitest';

import type { PreparedEdge } from './layout.types';
import { SELF_LOOP_EXTENT, selfLoop, selfLoopSlots } from './selfLoops';

/**
 * A node's box, sized so the band arithmetic has room: at 120 tall, a first
 * loop's ends sit 20px either side of the middle and the cap never bites.
 */
const box = { x: 100, y: 200, width: 140, height: 120 } as const;

/** A plate of a given height, which is all the stacking arithmetic reads. */
function plate(height: number, lines: readonly string[] = ['plate']) {
  return { lines, width: 60, height };
}

/** One entry of what `readRoutedEdges` prepares, built here without dagre. */
function prepared(index: number, from: string, to: string, height = 24): PreparedEdge {
  return {
    edge: { from, to, label: `${from} to ${to} ${index}` },
    index,
    plate: plate(height),
  };
}

describe('selfLoopSlots', () => {
  it('gives a slot to every self-edge and to no other edge', () => {
    const slots = selfLoopSlots([
      prepared(0, 'a', 'b'),
      prepared(1, 'a', 'a'),
      prepared(2, 'b', 'c'),
      prepared(3, 'b', 'b'),
    ]);

    expect([...slots.keys()].sort()).toEqual([1, 3]);
  });

  it('numbers a node loops from zero in the order the file listed them', () => {
    const slots = selfLoopSlots([
      prepared(0, 'a', 'a'),
      prepared(1, 'a', 'b'),
      prepared(2, 'a', 'a'),
      prepared(3, 'a', 'a'),
    ]);

    expect(slots.get(0)?.ordinal).toBe(0);
    expect(slots.get(2)?.ordinal).toBe(1);
    expect(slots.get(3)?.ordinal).toBe(2);
    expect(slots.get(0)?.loopCount).toBe(3);
  });

  it('counts each node loops separately, so one loop each is every node first', () => {
    const slots = selfLoopSlots([
      prepared(0, 'a', 'a'),
      prepared(1, 'b', 'b'),
      prepared(2, 'c', 'c'),
    ]);

    for (const index of [0, 1, 2]) {
      expect(slots.get(index)?.ordinal).toBe(0);
      expect(slots.get(index)?.loopCount).toBe(1);
    }
  });

  it('starts the first plate at the top of the stack and clears every earlier one', () => {
    const heights = [24, 40, 16];
    const slots = selfLoopSlots(
      heights.map((height, index) => prepared(index, 'a', 'a', height)),
    );
    const tops = [0, 1, 2].map((index) => slots.get(index)?.plateTop ?? -1);

    expect(tops[0]).toBe(0);

    // Each plate starts past the bottom of the one above it, with a gap: a
    // plate landing on a plate is the lost label D37 was about.
    expect(tops[1]).toBeGreaterThan((tops[0] ?? 0) + heights[0]);
    expect(tops[2]).toBeGreaterThan((tops[1] ?? 0) + heights[1]);
  });

  it('measures the stack as every plate on that node plus the gaps between them', () => {
    const heights = [24, 40, 16];
    const slots = selfLoopSlots(
      heights.map((height, index) => prepared(index, 'a', 'a', height)),
    );
    const last = slots.get(2);

    // The stack ends exactly where the last plate does, which is what lets
    // `selfLoop` centre the whole column on the node's middle.
    expect(last?.stackHeight).toBe((last?.plateTop ?? 0) + 16);

    // Every loop on the node reads the same stack, so they all centre on the
    // same column rather than each centring on its own.
    expect(
      [0, 1, 2].every((index) => slots.get(index)?.stackHeight === last?.stackHeight),
    ).toBe(true);
  });

  it('gives a lone loop a stack of its own plate and nothing else', () => {
    const slots = selfLoopSlots([prepared(0, 'a', 'a', 24)]);

    expect(slots.get(0)).toEqual({
      ordinal: 0,
      loopCount: 1,
      plateTop: 0,
      stackHeight: 24,
    });
  });

  it('finds no slots in a design that loops nowhere', () => {
    const slots = selfLoopSlots([prepared(0, 'a', 'b'), prepared(1, 'b', 'c')]);

    expect(slots.size).toBe(0);
  });
});

describe('selfLoop', () => {
  const slotFor = (ordinal: number, loopCount: number) => ({
    ordinal,
    loopCount,
    plateTop: 0,
    stackHeight: 24,
  });

  it('hangs both ends of the loop on the node right border', () => {
    const route = selfLoop(
      { from: 'a', to: 'a', label: 'retries' },
      box,
      plate(24),
      slotFor(0, 1),
    );
    const border = box.x + box.width;

    expect(route.points[0]?.x).toBe(border);
    expect(route.points.at(-1)?.x).toBe(border);
    expect(route.points[0]?.y).not.toBe(route.points.at(-1)?.y);

    for (const point of route.points) {
      expect(point.y).toBeGreaterThan(box.y);
      expect(point.y).toBeLessThan(box.y + box.height);
    }
  });

  it('reaches SELF_LOOP_EXTENT past the border for the first loop, twice for the second', () => {
    const border = box.x + box.width;
    const edge = { from: 'a', to: 'a', label: 'retries' };
    const first = selfLoop(edge, box, plate(24), slotFor(0, 2));
    const second = selfLoop(edge, box, plate(24), slotFor(1, 2));

    expect(Math.max(...first.points.map((point) => point.x))).toBe(
      border + SELF_LOOP_EXTENT,
    );
    expect(Math.max(...second.points.map((point) => point.x))).toBe(
      border + SELF_LOOP_EXTENT * 2,
    );
  });

  it('meets the border further from its middle the further out the loop reaches', () => {
    const edge = { from: 'a', to: 'a', label: 'retries' };
    const middle = box.y + box.height / 2;
    const bandOf = (ordinal: number) =>
      middle - (selfLoop(edge, box, plate(24), slotFor(ordinal, 3)).points[0]?.y ?? 0);

    // Without this an outer loop traces over the arms of the inner one and
    // lands its arrowhead on the same pixel: one loop with a spare bar (D37).
    expect(bandOf(1)).toBeGreaterThan(bandOf(0));
    expect(bandOf(2)).toBeGreaterThan(bandOf(1));
  });

  it('keeps a loop ends off the corners of a short node, however many loops it has', () => {
    const short = { x: 0, y: 0, width: 132, height: 40 } as const;
    const route = selfLoop(
      { from: 'a', to: 'a', label: 'retries' },
      short,
      plate(24),
      slotFor(4, 5),
    );

    for (const point of route.points) {
      expect(point.y).toBeGreaterThan(short.y);
      expect(point.y).toBeLessThan(short.y + short.height);
    }
  });

  it('puts the label plate past the widest loop on the node, not just past its own', () => {
    const border = box.x + box.width;
    const inner = selfLoop(
      { from: 'a', to: 'a', label: 'retries' },
      box,
      plate(24),
      slotFor(0, 3),
    );

    // A plate that stepped out with its own loop would sit across the loops
    // outside it and, being opaque, cut their lines.
    expect(inner.labelBox.x).toBeGreaterThan(border + SELF_LOOP_EXTENT * 3);
  });

  it('centres the stack of plates on the middle of the node', () => {
    const edge = { from: 'a', to: 'a', label: 'retries' };
    const middle = box.y + box.height / 2;
    const first = selfLoop(edge, box, plate(24), {
      ordinal: 0,
      loopCount: 2,
      plateTop: 0,
      stackHeight: 54,
    });
    const second = selfLoop(edge, box, plate(24), {
      ordinal: 1,
      loopCount: 2,
      plateTop: 30,
      stackHeight: 54,
    });

    expect(first.labelBox.y).toBe(middle - 27);
    expect(second.labelBox.y).toBe(middle - 27 + 30);
    expect(second.labelBox.y).toBeGreaterThan(first.labelBox.y + first.labelBox.height);
  });

  it('carries the edge own words and lines through untouched', () => {
    const route = selfLoop(
      { from: 'a', to: 'a', label: '  retries  ' },
      box,
      { lines: ['retries', 'on failure'], width: 80, height: 40 },
      slotFor(0, 1),
    );

    expect(route.from).toBe('a');
    expect(route.to).toBe('a');
    expect(route.label).toBe('  retries  ');
    expect(route.labelLines).toEqual(['retries', 'on failure']);
    expect(route.labelBox.width).toBe(80);
    expect(route.labelBox.height).toBe(40);
  });

  it('reads the node box without touching it', () => {
    const node = { x: 100, y: 200, width: 140, height: 120 };
    const before = { ...node };

    selfLoop({ from: 'a', to: 'a', label: 'retries' }, node, plate(24), slotFor(0, 1));

    expect(node).toEqual(before);
  });
});
