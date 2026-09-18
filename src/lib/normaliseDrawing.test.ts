import { describe, expect, it } from 'vitest';

import type { LayoutEdge, LayoutNode } from './layout.types';
import {
  DRAWING_MARGIN,
  canvasFor,
  offsetToMargin,
  shiftBox,
  shiftEdge,
} from './normaliseDrawing';
import { DEFAULT_SHAPE } from './shapes';

/** A placed node, built here rather than laid out, so the sums are readable. */
function node(x: number, y: number, width = 100, height = 50): LayoutNode {
  return {
    id: 'a',
    label: 'A',
    labelLines: ['A'],
    type: 'service',
    shape: DEFAULT_SHAPE,
    x,
    y,
    width,
    height,
  };
}

/** A routed edge: a two-point line and a plate, which is all this module reads. */
function edge(points: readonly (readonly [number, number])[], labelX = 0, labelY = 0) {
  return {
    from: 'a',
    to: 'b',
    label: 'goes to',
    labelLines: ['goes to'],
    points: points.map(([x, y]) => ({ x, y })),
    labelBox: { x: labelX, y: labelY, width: 40, height: 20 },
  } satisfies LayoutEdge;
}

describe('offsetToMargin', () => {
  it('moves the top-left-most box to exactly one margin from the corner', () => {
    const offset = offsetToMargin([node(60, 90)], []);

    expect(offset).toEqual({ x: DRAWING_MARGIN - 60, y: DRAWING_MARGIN - 90 });
  });

  it('brings a drawing back from dagre negative coordinates', () => {
    // Dagre's origin is its own business: an edge label or a route point can
    // sit at a negative coordinate, and nothing may end up off the canvas.
    const offset = offsetToMargin([node(0, 0)], [edge([[-40, -12]], -55, -30)]);

    expect(offset).toEqual({ x: DRAWING_MARGIN + 55, y: DRAWING_MARGIN + 30 });
  });

  it('measures route points and label plates, not only the node boxes', () => {
    const nodes = [node(100, 100)];

    expect(offsetToMargin(nodes, [edge([[10, 100]], 100, 4)])).toEqual({
      x: DRAWING_MARGIN - 10,
      y: DRAWING_MARGIN - 4,
    });
  });

  it('moves nothing when there is nothing placed', () => {
    expect(offsetToMargin([], [])).toEqual({ x: 0, y: 0 });
  });
});

describe('shiftBox', () => {
  it('moves a box and keeps everything else it was carrying', () => {
    const moved = shiftBox(node(10, 20), { x: 5, y: 7 });

    expect(moved.x).toBe(15);
    expect(moved.y).toBe(27);
    expect(moved.width).toBe(100);
    expect(moved.label).toBe('A');
    expect(moved.shape).toBe(DEFAULT_SHAPE);
  });

  it('returns a new box rather than moving the one it was given', () => {
    const original = node(10, 20);
    const moved = shiftBox(original, { x: 5, y: 7 });

    expect(original.x).toBe(10);
    expect(moved).not.toBe(original);
  });
});

describe('shiftEdge', () => {
  it('moves every point of the route and the plate with them', () => {
    const moved = shiftEdge(
      edge(
        [
          [0, 0],
          [10, 20],
        ],
        4,
        6,
      ),
      { x: 100, y: 200 },
    );

    expect(moved.points).toEqual([
      { x: 100, y: 200 },
      { x: 110, y: 220 },
    ]);
    expect(moved.labelBox).toEqual({ x: 104, y: 206, width: 40, height: 20 });
  });

  it('leaves the edge own words alone and does not touch the route it was given', () => {
    const original = edge([[0, 0]]);
    const moved = shiftEdge(original, { x: 1, y: 1 });

    expect(moved.label).toBe('goes to');
    expect(moved.labelLines).toEqual(['goes to']);
    expect(original.points[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('canvasFor', () => {
  it('fits around everything placed, with a margin all round', () => {
    const size = canvasFor([node(DRAWING_MARGIN, DRAWING_MARGIN, 200, 80)], []);

    expect(size.width).toBe(DRAWING_MARGIN * 2 + 200);
    expect(size.height).toBe(DRAWING_MARGIN * 2 + 80);
  });

  it('counts a label plate that reaches past the last box', () => {
    const size = canvasFor(
      [node(DRAWING_MARGIN, DRAWING_MARGIN)],
      [edge([[0, 0]], 500, 0)],
    );

    expect(size.width).toBe(540 + DRAWING_MARGIN);
  });

  it('rounds a fractional extent up, so nothing is clipped by half a pixel', () => {
    const size = canvasFor([node(DRAWING_MARGIN, DRAWING_MARGIN, 100.4, 50.2)], []);

    expect(size.width).toBe(Math.ceil(DRAWING_MARGIN * 2 + 100.4));
    expect(size.height).toBe(Math.ceil(DRAWING_MARGIN * 2 + 50.2));
  });

  it('still gives an empty design a canvas, because an empty design is valid', () => {
    // D19: an empty design draws as an empty picture rather than as a failure.
    expect(canvasFor([], [])).toEqual({
      width: DRAWING_MARGIN,
      height: DRAWING_MARGIN,
    });
  });
});
