import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import type { DocxTablePlan } from './docxPlan';
import {
  CONTENT_WIDTH_PX,
  DRAWING_MAX_HEIGHT_PX,
  PAGE_HEIGHT_DXA,
  PAGE_MARGIN_DXA,
  PAGE_WIDTH_DXA,
  RASTER_SCALE,
  describeMarkedControls,
  docxPlan,
  safeDocxText,
} from './docxPlan';
import { UNDRAWABLE_MARK } from './drawableText';
import { layoutDesign } from './layout';

/**
 * The Word document's plan: what goes in it, in what order, and how big.
 *
 * This is the half of the Word export a unit test can reach, and the split is
 * the one D63 settled for the PDF: `toDocx` needs a real browser — it renders
 * the drawing and rasterises it through a canvas — while everything here is
 * arithmetic over strings. So the document's whole structure is decided here
 * and asserted here, and `e2e/exportWord.spec.ts` asserts the bytes.
 *
 * Every test goes in through `layoutDesign`, for the reason `toMarkdown.test.ts`,
 * `toHtml.test.ts` and `pdfPlan.test.ts` all give: the export's promise is that
 * it shows what the preview shows (intake 5.2), and the preview draws from the
 * layout, so a hand-built `DesignLayout` would be testing a shape nothing
 * produces.
 */

function designOf(
  title: string,
  nodes: readonly DesignNode[],
  edges: readonly DesignEdge[] = [],
): Design {
  return { title, nodes, edges };
}

function node(id: string, label: string, type = 'service'): DesignNode {
  return { id, label, type };
}

function planOf(design: Design) {
  return docxPlan(layoutDesign(design));
}

/** One table of the plan, by the heading above it. */
function tableUnder(
  plan: ReturnType<typeof planOf>,
  heading: string,
): DocxTablePlan | undefined {
  return plan.tables.find((table) => table.heading === heading);
}

/** Every cell of a table, joined back into one string per row. */
function rowsOf(table: DocxTablePlan | undefined): readonly string[] {
  return (table?.rows ?? []).map((row) => row.map((cell) => cell.join('\n')).join(' | '));
}

const SMALL = designOf(
  'Order intake',
  [node('api', 'Public API'), node('queue', 'Order queue', 'queue')],
  [{ from: 'api', to: 'queue', label: 'publishes order' }],
);

describe('docxPlan', () => {
  describe('the page it plans for', () => {
    it('is US Letter portrait with an inch of margin, measured in twips', () => {
      const plan = planOf(SMALL);

      // A `.docx` measures its page in DXA — twentieths of a point — so 1440
      // is one inch, and the library's own default is A4 rather than Letter.
      expect(plan.page).toEqual({
        width: PAGE_WIDTH_DXA,
        height: PAGE_HEIGHT_DXA,
        margin: PAGE_MARGIN_DXA,
      });
      expect(PAGE_WIDTH_DXA).toBe(12_240);
      expect(PAGE_HEIGHT_DXA).toBe(15_840);
      expect(PAGE_MARGIN_DXA).toBe(1440);
      expect(PAGE_WIDTH_DXA).toBeLessThan(PAGE_HEIGHT_DXA);
    });

    it('carries the design’s title, a description and a language as metadata', () => {
      const plan = planOf(SMALL);

      // D71's habit: a file whose only metadata is the producer's name is
      // announced by its file name and has no language for a screen reader.
      expect(plan.metadata.title).toBe('Order intake');
      expect(plan.metadata.language).toBe('en');
      expect(plan.metadata.description).toContain('Public API');
      expect(plan.metadata.description).toContain('Order queue');
    });

    it('writes the title at the top, as its own lines', () => {
      expect(planOf(SMALL).title).toEqual(['Order intake']);
    });
  });

  describe('the two tables', () => {
    it('lists every node and every edge, in the order the file gave them', () => {
      const plan = planOf(
        designOf(
          'Two of each',
          [node('a', 'Alpha'), node('b', 'Bravo', 'database')],
          [
            { from: 'a', to: 'b', label: 'writes' },
            { from: 'b', to: 'a', label: 'answers' },
          ],
        ),
      );

      expect(rowsOf(tableUnder(plan, 'Nodes'))).toEqual([
        'a | Alpha | service',
        'b | Bravo | database',
      ]);
      expect(rowsOf(tableUnder(plan, 'Edges'))).toEqual([
        'a | b | writes',
        'b | a | answers',
      ]);
    });

    it('names its columns the way the other three exports name theirs', () => {
      const plan = planOf(SMALL);

      expect(tableUnder(plan, 'Nodes')?.columns).toEqual(['Id', 'Label', 'Type']);
      expect(tableUnder(plan, 'Edges')?.columns).toEqual(['From', 'To', 'Label']);
    });

    it('gives every column a width in twips that fills the text column exactly', () => {
      const plan = planOf(SMALL);
      const content = PAGE_WIDTH_DXA - PAGE_MARGIN_DXA * 2;

      for (const table of plan.tables) {
        // Word needs the table's own width and every cell's width to agree; a
        // column set as a percentage is what breaks the file elsewhere.
        expect(table.columnWidths).toHaveLength(table.columns.length);
        expect(table.columnWidths.reduce((total, one) => total + one, 0)).toBe(content);
        for (const width of table.columnWidths) {
          expect(Number.isInteger(width)).toBe(true);
          expect(width).toBeGreaterThan(0);
        }
      }
    });

    it('prints both headings for a design with nothing in it', () => {
      const plan = planOf(designOf('Nothing yet', [], []));

      expect(plan.tables.map((table) => table.heading)).toEqual(['Nodes', 'Edges']);
      expect(rowsOf(tableUnder(plan, 'Nodes'))).toEqual([]);
      expect(rowsOf(tableUnder(plan, 'Edges'))).toEqual([]);
    });
  });

  describe('the drawing', () => {
    it('is planned at a size that fits the page, and is never scaled up', () => {
      const plan = planOf(SMALL);

      expect(plan.drawing).not.toBeNull();
      expect(plan.drawing?.width).toBeLessThanOrEqual(CONTENT_WIDTH_PX);
      expect(plan.drawing?.height).toBeLessThanOrEqual(DRAWING_MAX_HEIGHT_PX);
      expect(plan.drawing?.width).toBeLessThanOrEqual(plan.drawing?.layout.width ?? 0);
    });

    it('keeps the drawing’s own proportions when it has to shrink it', () => {
      const wide = designOf(
        'Wide one',
        Array.from({ length: 24 }, (_, index) => node(`n${index}`, `Node ${index}`)),
      );
      const plan = planOf(wide);
      const layout = plan.drawing?.layout;

      expect(layout).toBeDefined();
      const scale = (plan.drawing?.width ?? 0) / (layout?.width ?? 1);

      expect(plan.drawing?.height).toBeCloseTo((layout?.height ?? 0) * scale, 5);
      expect(scale).toBeLessThan(1);
    });

    it('rasterises at a fixed multiple of the size it is placed at', () => {
      const plan = planOf(SMALL);

      // The canvas is measured against the placed size rather than the
      // drawing's own, so it is bounded whatever the design's size: a page is
      // a page, and a 200-node design rasterises into the same canvas a
      // 7-node one does.
      expect(plan.drawing?.rasterWidth).toBe(
        Math.round((plan.drawing?.width ?? 0) * RASTER_SCALE),
      );
      expect(plan.drawing?.rasterHeight).toBe(
        Math.round((plan.drawing?.height ?? 0) * RASTER_SCALE),
      );
      expect(plan.drawing?.rasterWidth).toBeLessThanOrEqual(
        CONTENT_WIDTH_PX * RASTER_SCALE,
      );
      expect(plan.drawing?.rasterHeight).toBeLessThanOrEqual(
        DRAWING_MAX_HEIGHT_PX * RASTER_SCALE,
      );
    });

    it('describes the picture for a reader who cannot see it', () => {
      const plan = planOf(SMALL);

      expect(plan.drawing?.altText).toContain('Public API');
      expect(plan.drawing?.altText).toContain('publishes order');
    });

    it('is a sentence rather than a picture when the design has no nodes', () => {
      const plan = planOf(designOf('Nothing yet', [], []));

      expect(plan.drawing).toBeNull();
      expect(plan.nothingToDraw).toEqual([
        'This design has no nodes, so there is nothing to draw.',
      ]);
    });

    it('has nothing to say when there is a drawing', () => {
      expect(planOf(SMALL).nothingToDraw).toBeNull();
    });
  });

  describe('text a `.docx` cannot carry', () => {
    it('marks a control character XML forbids, rather than writing a file Word refuses', () => {
      // Measured against `docx` 9.7.1: it writes a control character straight
      // into `word/document.xml`, which XML 1.0 forbids outright, and
      // LibreOffice answers the file with "source file could not be loaded".
      expect(safeDocxText('SohCharlie')).toEqual({
        lines: [`Soh${UNDRAWABLE_MARK}Charlie`],
        marked: 1,
      });
      expect(safeDocxText('Nul Golf')).toEqual({
        lines: [`Nul${UNDRAWABLE_MARK}Golf`],
        marked: 1,
      });
      expect(safeDocxText('VtFoxtrot')).toEqual({
        lines: [`Vt${UNDRAWABLE_MARK}Foxtrot`],
        marked: 1,
      });
      expect(safeDocxText('UsIndia')).toEqual({
        lines: [`Us${UNDRAWABLE_MARK}India`],
        marked: 1,
      });
    });

    it('keeps a tab as a tab, because a `.docx` draws one', () => {
      // Measured: a literal tab inside `w:t` renders as a tab in LibreOffice,
      // the same as `w:tab`. Marking it would lose a character the format
      // carries perfectly well, which is the opposite of the PDF's problem.
      expect(safeDocxText('Alpha\tBravo')).toEqual({
        lines: ['Alpha\tBravo'],
        marked: 0,
      });
    });

    it('keeps a character the format carries but a font may not', () => {
      // A `.docx` names a font rather than embedding one, so coverage is the
      // reader's machine's question. Marking these would lose fidelity.
      expect(safeDocxText('Regions → 東京')).toEqual({
        lines: ['Regions → 東京'],
        marked: 0,
      });
      expect(safeDocxText('DelDelta')).toEqual({
        lines: ['DelDelta'],
        marked: 0,
      });
    });

    it('turns a line break into a line rather than into a mark', () => {
      expect(safeDocxText('Newline\nEcho')).toEqual({
        lines: ['Newline', 'Echo'],
        marked: 0,
      });
    });

    it('reads a Windows line ending as one break, and a lone return as one too', () => {
      // Measured: an XML parser normalises a carriage return to a line feed
      // before Word ever sees it, and a line feed inside `w:t` then renders as
      // a space — so a return left alone is a break silently lost.
      expect(safeDocxText('carriage\r\nreturn')).toEqual({
        lines: ['carriage', 'return'],
        marked: 0,
      });
      expect(safeDocxText('lone\rreturn')).toEqual({
        lines: ['lone', 'return'],
        marked: 0,
      });
    });

    it('marks the same character in a label, an id, a type and a title', () => {
      const plan = planOf(
        designOf(
          'Titleone',
          [node('ida', 'Labela', 'typea')],
          [{ from: 'ida', to: 'ida', label: 'edgelabel' }],
        ),
      );

      expect(plan.title).toEqual([`Title${UNDRAWABLE_MARK}one`]);
      expect(plan.metadata.title).toBe(`Title${UNDRAWABLE_MARK}one`);
      expect(rowsOf(tableUnder(plan, 'Nodes'))).toEqual([
        `id${UNDRAWABLE_MARK}a | Label${UNDRAWABLE_MARK}a | type${UNDRAWABLE_MARK}a`,
      ]);
      expect(rowsOf(tableUnder(plan, 'Edges'))).toEqual([
        `id${UNDRAWABLE_MARK}a | id${UNDRAWABLE_MARK}a | edge${UNDRAWABLE_MARK}label`,
      ]);
    });

    it('counts once per piece of the design’s own text, not once per drawn line', () => {
      const plan = planOf(
        designOf(
          'Control characters',
          [
            node('alpha', 'Alpha\tBravo'),
            node('soh', 'SohCharlie', 'queue'),
            node('del', 'DelDelta', 'database'),
          ],
          [{ from: 'alpha', to: 'soh', label: 'edgewithmarks' }],
        ),
      );

      // One SOH and two in the edge label. The tab and the DEL are carried, so
      // neither is counted.
      expect(plan.marked).toBe(3);
    });

    it('hands the drawing the same marked text the tables carry', () => {
      const plan = planOf(designOf('Marked', [node('soh', 'SohCharlie')], []));
      const drawn = plan.drawing?.layout.nodes[0];

      // The picture is rasterised from this layout, and a file whose two
      // halves disagree is the failure intake 5.2 names. It matters twice
      // over here: the rasteriser serialises the drawing as XML too, so a raw
      // control character would stop the picture loading at all.
      expect(drawn?.label).toBe(`Soh${UNDRAWABLE_MARK}Charlie`);
      expect(drawn?.labelLines.join(' ')).toContain(UNDRAWABLE_MARK);
      expect(plan.drawing?.altText).not.toContain('');
    });

    it('says nothing when the design carries no control character at all', () => {
      expect(planOf(SMALL).marked).toBe(0);
      expect(describeMarkedControls(0)).toBeNull();
    });
  });

  describe('describeMarkedControls', () => {
    it('names how many were marked, what stands in for them, and where they survive', () => {
      const one = describeMarkedControls(1);

      expect(one).toContain('1 control character');
      expect(one).toContain(UNDRAWABLE_MARK);
      expect(one).toContain('Markdown');
      expect(one).toContain('HTML');
    });

    it('says characters rather than character when there is more than one', () => {
      expect(describeMarkedControls(6)).toContain('6 control characters');
    });
  });
});
