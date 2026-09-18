import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import type { DrawingRegion, DrawingRoom, DrawingSheetPlan } from './drawingSheets';
import {
  MAX_DRAWING_SHEETS,
  MIN_TEXT_POINTS,
  SMALLEST_TEXT_PX,
  drawingElements,
  planDrawingSheets,
} from './drawingSheets';
import type { DesignLayout } from './layout';
import { TYPE_FONT_SIZE, layoutDesign } from './layout';

/**
 * The arithmetic both paginated exports share: how small the drawing's text is
 * allowed to print, and how many sheets it gets at that size.
 *
 * This is the seam the PDF and the Word export both read (D78's precedent), so
 * it is pinned here once rather than twice. Everything in it is pure — a
 * `DesignLayout` in, rectangles out — which is the whole reason it was pulled
 * out of the two planners: the decision that was wrong lived in three lines of
 * each of them and could not be tested from either.
 *
 * Every test goes in through `layoutDesign`, as `pdfPlan.test.ts` and
 * `docxPlan.test.ts` do: the export's promise is that it shows what the preview
 * shows (intake 5.2), so a hand-built `DesignLayout` would pin a shape nothing
 * produces.
 */

/** The PDF's room, in points: the text column, and a whole sheet under it. */
const PDF_ROOM: DrawingRoom = {
  inline: { width: 516, height: 651 },
  sheet: { width: 516, height: 677 },
};

/** The Word export's room, in points, which is a different page (D75). */
const WORD_ROOM: DrawingRoom = {
  inline: { width: 468, height: 576 },
  sheet: { width: 468, height: 624 },
};

function node(id: string, label: string, type = 'service'): DesignNode {
  return { id, label, type };
}

function designOf(
  title: string,
  nodes: readonly DesignNode[],
  edges: readonly DesignEdge[] = [],
): Design {
  return { title, nodes, edges };
}

/** A design of `count` nodes in one rank, which dagre lays out very wide. */
function wideDesign(count: number): Design {
  return designOf(
    `Wide ${count}`,
    Array.from({ length: count }, (_, index) => node(`n${index}`, `Node ${index}`)),
  );
}

/** A chain of `count` nodes, which dagre lays out very tall. */
function tallDesign(count: number): Design {
  return designOf(
    `Tall ${count}`,
    Array.from({ length: count }, (_, index) => node(`n${index}`, `Node ${index}`)),
    Array.from({ length: count - 1 }, (_, index) => ({
      from: `n${index}`,
      to: `n${index + 1}`,
      label: 'next',
    })),
  );
}

const SMALL = layoutDesign(
  designOf(
    'Order intake',
    [node('api', 'Public API'), node('queue', 'Order queue', 'queue')],
    [{ from: 'api', to: 'queue', label: 'publishes order' }],
  ),
);

/** Whether one rectangle sits entirely inside another. */
function contains(outer: DrawingRegion, inner: DrawingRegion): boolean {
  return (
    outer.x <= inner.x + 0.001 &&
    outer.y <= inner.y + 0.001 &&
    inner.x + inner.width <= outer.x + outer.width + 0.001 &&
    inner.y + inner.height <= outer.y + outer.height + 0.001
  );
}

/** The elements no sheet holds whole, which a sheet-sized one must never be. */
function cutElements(
  plan: DrawingSheetPlan,
  layout: DesignLayout,
): readonly DrawingRegion[] {
  return drawingElements(layout).filter(
    (element) => !plan.sheets.some((sheet) => contains(sheet.region, element)),
  );
}

/** Whether every pixel of the drawing is on some sheet, sampled on a grid. */
function fullyCovered(plan: DrawingSheetPlan, layout: DesignLayout): boolean {
  const steps = 40;

  for (let column = 0; column <= steps; column += 1) {
    for (let row = 0; row <= steps; row += 1) {
      const x = (layout.width * column) / steps;
      const y = (layout.height * row) / steps;
      const covered = plan.sheets.some(
        (sheet) =>
          sheet.region.x <= x &&
          x <= sheet.region.x + sheet.region.width &&
          sheet.region.y <= y &&
          y <= sheet.region.y + sheet.region.height,
      );

      if (!covered) {
        return false;
      }
    }
  }

  return true;
}

describe('planDrawingSheets', () => {
  describe('the floor under the drawing’s smallest text', () => {
    it('is judged against the smallest size the drawing draws, not the label', () => {
      // The node label is 14 px and the edge label 12 px, but the type line
      // under every node is 11 px, and it is what goes illegible first.
      expect(SMALLEST_TEXT_PX).toBe(TYPE_FONT_SIZE);
      expect(SMALLEST_TEXT_PX).toBe(11);
    });

    it('is at least six points, which is the floor this cycle settled on', () => {
      expect(MIN_TEXT_POINTS).toBeGreaterThanOrEqual(6);
    });

    it('holds for a design far too wide to fit one sheet', () => {
      const plan = planDrawingSheets(layoutDesign(wideDesign(12)), PDF_ROOM);

      expect(plan.tiled).toBe(true);
      expect(plan.smallestTextPoints).toBeGreaterThanOrEqual(MIN_TEXT_POINTS);
    });

    it('holds for a design far too tall to fit one sheet', () => {
      const plan = planDrawingSheets(layoutDesign(tallDesign(12)), WORD_ROOM);

      expect(plan.tiled).toBe(true);
      expect(plan.smallestTextPoints).toBeGreaterThanOrEqual(MIN_TEXT_POINTS);
    });
  });

  describe('a drawing that already fits', () => {
    it('stays on one sheet, at the size it fits at, with nothing to say', () => {
      const plan = planDrawingSheets(SMALL, PDF_ROOM);

      expect(plan.sheets).toHaveLength(1);
      expect(plan.tiled).toBe(false);
      expect(plan.spread).toBeNull();
      expect(plan.tooSmall).toBeNull();
      expect(plan.sheets[0]?.caption).toBeNull();
    });

    it('is never scaled up, however much room it is given', () => {
      const plan = planDrawingSheets(SMALL, {
        inline: { width: 5000, height: 5000 },
        sheet: { width: 5000, height: 5000 },
      });

      expect(plan.scale).toBe(1);
    });

    it('covers the whole drawing in its one region', () => {
      const plan = planDrawingSheets(SMALL, PDF_ROOM);

      expect(plan.sheets[0]?.region).toEqual({
        x: 0,
        y: 0,
        width: SMALL.width,
        height: SMALL.height,
      });
    });
  });

  describe('a drawing that has to be tiled', () => {
    const layout = layoutDesign(wideDesign(12));
    const plan = planDrawingSheets(layout, PDF_ROOM);

    it('leaves no part of the drawing off every sheet', () => {
      expect(fullyCovered(plan, layout)).toBe(true);
    });

    it('cuts no node box, plate or route in half without a whole copy', () => {
      expect(cutElements(plan, layout)).toEqual([]);
    });

    it('gives each sheet a caption naming its place in the whole', () => {
      expect(plan.sheets[0]?.caption).toContain('1 of ');
      expect(plan.sheets.at(-1)?.caption).toContain(`${plan.sheets.length} of `);
    });

    it('says how many sheets the drawing runs to before they start', () => {
      expect(plan.spread).toContain(String(plan.sheets.length));
    });

    it('numbers the sheets left to right and then top to bottom', () => {
      expect(plan.sheets.map((sheet) => sheet.number)).toEqual(
        plan.sheets.map((_, index) => index + 1),
      );
      expect(plan.sheets[0]?.column).toBe(1);
      expect(plan.sheets[0]?.row).toBe(1);
    });

    it('places every sheet inside the room it was given', () => {
      for (const sheet of plan.sheets) {
        expect(sheet.width).toBeLessThanOrEqual(PDF_ROOM.sheet.width + 0.001);
        expect(sheet.height).toBeLessThanOrEqual(PDF_ROOM.sheet.height + 0.001);
      }
    });

    it('keeps every region inside the drawing', () => {
      for (const sheet of plan.sheets) {
        expect(sheet.region.x).toBeGreaterThanOrEqual(0);
        expect(sheet.region.y).toBeGreaterThanOrEqual(0);
        expect(sheet.region.x + sheet.region.width).toBeLessThanOrEqual(
          layout.width + 0.001,
        );
        expect(sheet.region.y + sheet.region.height).toBeLessThanOrEqual(
          layout.height + 0.001,
        );
      }
    });
  });

  describe('a drawing larger than the sheet cap allows', () => {
    const layout = layoutDesign(tallDesign(400));
    const plan = planDrawingSheets(layout, PDF_ROOM);

    it('never runs past the cap', () => {
      expect(plan.sheets.length).toBeLessThanOrEqual(MAX_DRAWING_SHEETS);
    });

    it('prints below the floor rather than pretending it did not', () => {
      expect(plan.smallestTextPoints).toBeLessThan(MIN_TEXT_POINTS);
      expect(plan.tooSmall).not.toBeNull();
    });

    it('says the floor and the size it actually used, in the app’s words', () => {
      expect(plan.tooSmall).toContain(`${MIN_TEXT_POINTS} pt`);
      expect(plan.tooSmall).toContain(String(MAX_DRAWING_SHEETS));
      expect(plan.tooSmall).toContain('tables');
    });

    it('still covers the whole drawing', () => {
      expect(fullyCovered(plan, layout)).toBe(true);
    });
  });

  describe('the bound on both formats', () => {
    for (const count of [40, 200, 600]) {
      it(`never asks for more than the cap at ${count} nodes, either way round`, () => {
        for (const room of [PDF_ROOM, WORD_ROOM]) {
          for (const design of [wideDesign(count), tallDesign(count)]) {
            const plan = planDrawingSheets(layoutDesign(design), room);

            expect(plan.sheets.length).toBeLessThanOrEqual(MAX_DRAWING_SHEETS);
            expect(plan.sheets.length).toBe(plan.columns * plan.rows);
          }
        }
      });
    }
  });
});
