import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import { MAX_DRAWING_SHEETS, MIN_TEXT_POINTS, SMALLEST_TEXT_PX } from './drawingSheets';
import { layoutDesign } from './layout';
import type { MeasureText, PdfItem, PdfPage } from './pdfPlan';
import { NOTHING_TO_DRAW, PAGE_MARGIN, pdfPlan } from './pdfPlan';
import { toMarkdown } from './toMarkdown';

/**
 * The PDF's plan: where every piece of the document goes, and on which page.
 *
 * This is the half of the PDF export a unit test can reach. The other half is
 * `toPdf`, which needs a `Document` — `renderDrawing` builds DOM elements and
 * `svg2pdf` reads them — and this project's Vitest run has no DOM at all, so
 * everything DOM-shaped is asserted in `e2e/exportPdf.spec.ts` against a real
 * browser. D55 recorded that split for Task 06 and this follows it: what a
 * string and a number can answer belongs here, and that is most of the
 * document — the tables' text, the ordering, the wrapping, the page count, and
 * the sentence a design with nothing in it gets instead of a drawing.
 *
 * Every test goes in through `layoutDesign`, for the reason `toMarkdown.test.ts`
 * and `toHtml.test.ts` both give: the export's promise is that it shows what
 * the preview shows (intake 5.2), and the preview draws from the layout. A
 * hand-built `DesignLayout` would be testing a shape nothing produces.
 *
 * Text is measured by a stand-in rather than by jsPDF, so the numbers in these
 * tests are arithmetic rather than font metrics. What is under test is how the
 * plan *uses* a measurement — where it wraps, when it turns the page — not how
 * wide Roboto happens to draw an "m".
 */

/** A stand-in for a font's metrics: every character is half the font size. */
const measure: MeasureText = (text, size) => text.length * size * 0.5;

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
  return pdfPlan(layoutDesign(design), measure);
}

/** One design with as many plain nodes as asked for, to fill pages with. */
function manyNodes(count: number): Design {
  return designOf(
    'Long one',
    Array.from({ length: count }, (_, index) => node(`n${index}`, `Node ${index}`)),
  );
}

/** Every piece of text on one page, in the order it is drawn. */
function textOn(page: PdfPage): readonly string[] {
  return page.items.filter((item) => item.kind === 'text').map((item) => item.text);
}

/** Every piece of text in the whole document, page by page. */
function allText(pages: readonly PdfPage[]): readonly string[] {
  return pages.flatMap((page) => textOn(page));
}

/** Every item in the whole document, whatever kind it is. */
function allItems(pages: readonly PdfPage[]): readonly PdfItem[] {
  return pages.flatMap((page) => [...page.items]);
}

describe('pdfPlan', () => {
  it('heads the first page with the design’s title', () => {
    const plan = planOf(designOf('Order intake', [node('api', 'Public API')]));

    expect(plan.title).toBe('Order intake');
    expect(textOn(plan.pages[0] as PdfPage)[0]).toBe('Order intake');
  });

  it('places the drawing on the first page, keeping the shape the preview drew', () => {
    const layout = layoutDesign(designOf('One', [node('api', 'Public API')]));
    const plan = pdfPlan(layout, measure);
    const drawing = allItems(plan.pages).find((item) => item.kind === 'drawing');

    expect(drawing).toBeDefined();
    expect(plan.pages[0]?.items).toContain(drawing);
    // The same proportions, so nothing in the picture is stretched out of the
    // shape the reader just looked at.
    expect((drawing?.width ?? 0) / (drawing?.height ?? 1)).toBeCloseTo(
      layout.width / layout.height,
      5,
    );
  });

  it('never blows a small drawing up to fill the page', () => {
    const layout = layoutDesign(designOf('One', [node('api', 'API')]));
    const plan = pdfPlan(layout, measure);
    const drawing = allItems(plan.pages).find((item) => item.kind === 'drawing');

    expect(layout.width).toBeLessThan(plan.width - PAGE_MARGIN * 2);
    expect(drawing?.width).toBeCloseTo(layout.width, 5);
  });

  it('shrinks a drawing wider than the page to fit inside the margins', () => {
    const wide = designOf(
      'Wide',
      Array.from({ length: 12 }, (_, index) => node(`n${index}`, `Node ${index}`)),
      Array.from({ length: 11 }, (_, index) => ({
        from: 'n0',
        to: `n${index + 1}`,
        label: `to ${index + 1}`,
      })),
    );
    const layout = layoutDesign(wide);
    const plan = pdfPlan(layout, measure);
    const drawing = allItems(plan.pages).find((item) => item.kind === 'drawing');

    expect(layout.width).toBeGreaterThan(plan.width - PAGE_MARGIN * 2);
    expect(drawing?.width).toBeLessThanOrEqual(plan.width - PAGE_MARGIN * 2);
    expect(drawing?.x).toBeGreaterThanOrEqual(PAGE_MARGIN);
  });

  it('lists every node in file order with its id, label and type', () => {
    const plan = planOf(
      designOf('Two', [
        node('api', 'Public API', 'service'),
        node('db', 'Order store', 'database'),
      ]),
    );
    const text = allText(plan.pages);

    expect(text).toContain('Id');
    expect(text).toContain('Label');
    expect(text).toContain('Type');
    expect(text.indexOf('Public API')).toBeLessThan(text.indexOf('Order store'));
    expect(text).toContain('api');
    expect(text).toContain('db');
    expect(text).toContain('database');
  });

  it('lists every edge in file order with both ends and its label', () => {
    const plan = planOf(
      designOf(
        'Two',
        [node('api', 'Public API'), node('db', 'Order store')],
        [
          { from: 'api', to: 'db', label: 'writes order' },
          { from: 'db', to: 'api', label: 'answers' },
        ],
      ),
    );
    const text = allText(plan.pages);

    expect(text).toContain('From');
    expect(text).toContain('To');
    expect(text.indexOf('writes order')).toBeLessThan(text.indexOf('answers'));
  });

  it('heads each table so a reader knows which list they are looking at', () => {
    const plan = planOf(designOf('Two', [node('api', 'Public API')]));
    const text = allText(plan.pages);

    expect(text).toContain('Nodes');
    expect(text).toContain('Edges');
    expect(text.indexOf('Nodes')).toBeLessThan(text.indexOf('Edges'));
  });

  it('writes a design with no nodes the same sentence the other exports write', () => {
    const plan = planOf(designOf('Nothing yet', []));
    const text = allText(plan.pages);

    expect(text).toContain('This design has no nodes, so there is nothing to draw.');
    expect(allItems(plan.pages).some((item) => item.kind === 'drawing')).toBe(false);
    // Both tables still print their headings, exactly as the `.md` and the
    // `.html` do, so the three formats are the same shape.
    expect(text).toContain('Nodes');
    expect(text).toContain('Edges');
    expect(text).toContain('Id');
    expect(text).toContain('From');
  });

  it('says that in the Markdown export’s own words, so the formats cannot drift', () => {
    const empty = designOf('Nothing yet', []);

    // Three formats now carry this sentence and a third literal copy is how
    // three copies start disagreeing. The `.md` is the one that wrote it first
    // (D51) and the `.html` followed it (D60), so this is the one place that
    // checks the PDF still says exactly what they say.
    expect(toMarkdown(layoutDesign(empty))).toContain(NOTHING_TO_DRAW);
    expect(allText(planOf(empty).pages)).toContain(NOTHING_TO_DRAW);
  });

  it('is one page for a design small enough to be one page', () => {
    const plan = planOf(designOf('Small', [node('api', 'Public API')]));

    expect(plan.pages).toHaveLength(1);
  });

  describe('a drawing too large to print at a readable size on one page', () => {
    /** Wide enough that fitting one page would put its text under the floor. */
    const layout = layoutDesign(manyNodes(14));
    const plan = pdfPlan(layout, measure);
    const drawings = allItems(plan.pages).filter((item) => item.kind === 'drawing');

    it('is tiled across sheets rather than shrunk under the floor', () => {
      expect(drawings.length).toBeGreaterThan(1);
    });

    it('never prints the drawing’s smallest text below the floor', () => {
      for (const drawing of drawings) {
        expect(SMALLEST_TEXT_PX * (drawing.width / drawing.region.width)).toBeCloseTo(
          MIN_TEXT_POINTS,
          5,
        );
      }
    });

    it('shows a different piece of the drawing on each sheet', () => {
      const regions = drawings.map((drawing) => JSON.stringify(drawing.region));

      expect(new Set(regions).size).toBe(drawings.length);
    });

    it('leaves no part of the drawing off every sheet', () => {
      const covered = (x: number, y: number): boolean =>
        drawings.some(
          (drawing) =>
            drawing.region.x <= x &&
            x <= drawing.region.x + drawing.region.width &&
            drawing.region.y <= y &&
            y <= drawing.region.y + drawing.region.height,
        );

      for (let step = 0; step <= 40; step += 1) {
        expect(covered((layout.width * step) / 40, (layout.height * step) / 40)).toBe(
          true,
        );
      }
    });

    it('gives every sheet of the drawing a page to itself', () => {
      const pagesWithDrawings = plan.pages.filter((page) =>
        page.items.some((item) => item.kind === 'drawing'),
      );

      expect(pagesWithDrawings).toHaveLength(drawings.length);
      for (const page of pagesWithDrawings) {
        expect(page.items.filter((item) => item.kind === 'drawing')).toHaveLength(1);
      }
    });

    it('says on the title page how many sheets the drawing runs to', () => {
      expect(textOn(plan.pages[0] as PdfPage).join(' ')).toContain(
        `The drawing follows on ${drawings.length} sheets`,
      );
    });

    it('captions each sheet with its place in the whole', () => {
      const captions = allText(plan.pages).filter((text) =>
        text.startsWith('Drawing, sheet'),
      );

      expect(captions).toHaveLength(drawings.length);
      expect(captions[0]).toContain(`1 of ${drawings.length}`);
    });

    it('still prints both tables after the drawing, headings and all', () => {
      const text = allText(plan.pages);

      expect(text).toContain('Nodes');
      expect(text).toContain('Edges');
      expect(text.indexOf('Node 0')).toBeGreaterThan(
        text.indexOf('Drawing, sheet 1 of ' + drawings.length),
      );
    });

    it('keeps every tile inside the margins and in the shape it was cut', () => {
      for (const drawing of drawings) {
        expect(drawing.x).toBeGreaterThanOrEqual(PAGE_MARGIN);
        expect(drawing.x + drawing.width).toBeLessThanOrEqual(
          plan.width - PAGE_MARGIN + 0.001,
        );
        expect(drawing.width / drawing.height).toBeCloseTo(
          drawing.region.width / drawing.region.height,
          5,
        );
      }
    });
  });

  it('never asks for more sheets of drawing than the cap allows', () => {
    const plan = pdfPlan(layoutDesign(manyNodes(400)), measure);
    const drawings = allItems(plan.pages).filter((item) => item.kind === 'drawing');

    expect(drawings.length).toBeLessThanOrEqual(MAX_DRAWING_SHEETS);
    // And when the cap is what stopped it, the document says so rather than
    // printing a drawing nobody can read and leaving the reader to guess.
    expect(allText(plan.pages).join(' ')).toContain('too large to print at');
  });

  it('leaves a drawing that already prints large enough exactly where it was', () => {
    const plan = planOf(designOf('Small', [node('api', 'Public API')]));
    const drawings = allItems(plan.pages).filter((item) => item.kind === 'drawing');

    expect(drawings).toHaveLength(1);
    expect(drawings[0]?.region).toEqual({
      x: 0,
      y: 0,
      width: layoutDesign(designOf('Small', [node('api', 'Public API')])).width,
      height: layoutDesign(designOf('Small', [node('api', 'Public API')])).height,
    });
    expect(allText(plan.pages).some((text) => text.startsWith('Drawing, sheet'))).toBe(
      false,
    );
  });

  it('turns the page when the rows run past the bottom, and repeats the column headings', () => {
    const plan = planOf(manyNodes(80));
    // The pages the node table runs onto, rather than every page after the
    // first: a design this size now spends its middle pages on the sheets of
    // the drawing, and a sheet of drawing carries a caption and no columns.
    const tablePages = plan.pages.filter((page) =>
      textOn(page).some((text) => text.startsWith('Node ')),
    );

    expect(tablePages.length).toBeGreaterThan(1);
    // A reader who turns to the third page of the table should still be able
    // to tell which column is which.
    for (const page of tablePages) {
      expect(textOn(page)).toContain('Id');
    }
  });

  it('keeps every node on some page, however many there are', () => {
    const plan = planOf(manyNodes(80));
    const text = allText(plan.pages);

    for (let index = 0; index < 80; index += 1) {
      expect(text, `node ${index} is missing`).toContain(`Node ${index}`);
    }
  });

  it('wraps a label too wide for its column rather than cutting it short', () => {
    const long =
      'A label long enough that it cannot possibly fit inside one column of this table';
    const plan = planOf(designOf('Long', [node('api', long)]));
    const text = allText(plan.pages);

    expect(text).not.toContain(long);
    expect(text.join(' ')).toContain('A label long enough');
    // Every word of it survives somewhere: wrapped, never truncated (D26).
    for (const word of long.split(' ')) {
      expect(text.join(' '), `"${word}" was lost`).toContain(word);
    }
  });

  it('breaks a single unbroken word rather than letting it run off the page', () => {
    const unbroken = 'x'.repeat(300);
    const plan = planOf(designOf('Unbroken', [node('api', unbroken)]));
    const lines = allText(plan.pages).filter((line) => line.startsWith('x'));

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(unbroken);
  });

  it('draws a label’s own line break as a line break', () => {
    const plan = planOf(designOf('Broken', [node('api', 'first\nsecond')]));
    const text = allText(plan.pages);

    expect(text).toContain('first');
    expect(text).toContain('second');
  });

  it('keeps a label’s own spaces, because the drawing keeps them too', () => {
    const plan = planOf(designOf('Spaced', [node('api', '  padded  ')]));

    expect(allText(plan.pages)).toContain('  padded  ');
  });

  it('keeps every piece of the document inside the page’s margins', () => {
    const plan = planOf(manyNodes(40));

    for (const item of allItems(plan.pages)) {
      expect(item.x).toBeGreaterThanOrEqual(PAGE_MARGIN - 0.001);
      expect(item.y).toBeGreaterThanOrEqual(PAGE_MARGIN - 0.001);
      expect(item.y).toBeLessThanOrEqual(plan.height - PAGE_MARGIN + 0.001);
      expect(widthOf(item)).toBeLessThanOrEqual(plan.width - PAGE_MARGIN * 2 + 0.001);
    }
  });

  it('leaves no page empty', () => {
    const plan = planOf(manyNodes(80));

    for (const page of plan.pages) {
      expect(page.items.length).toBeGreaterThan(0);
    }
  });
});

/** How much room one item takes across the page, for the margin check. */
function widthOf(item: PdfItem): number {
  if (item.kind === 'text') {
    return measure(item.text, item.size);
  }

  return item.width;
}
