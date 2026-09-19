import { describe, expect, it } from 'vitest';

import type { Column } from './exportFurniture';
import {
  EDGE_COLUMNS,
  EDGE_HEADINGS,
  NODE_COLUMNS,
  NODE_HEADINGS,
  NOTHING_TO_DRAW,
} from './exportFurniture';
import { NOTHING_TO_DRAW as PDF_NOTHING_TO_DRAW } from './pdfPlan';

/**
 * The furniture every export prints, and the thing that stops it drifting.
 *
 * Until this module existed the sentence a design with nothing in it gets was
 * written out four times — `pdfPlan.ts`, `toHtml.ts`, `toMarkdown.ts` and
 * `docxPlan.ts` — with one Vitest assertion holding two of the four together
 * and nothing at all holding the other two. This test plays the part
 * `exportStyles.test.ts` plays for the palette: there is now one copy, and
 * these assertions are what pin its text.
 */

describe('the sentence a design with nothing to draw gets', () => {
  it('is the wording D51 chose, to the character', () => {
    expect(NOTHING_TO_DRAW).toBe(
      'This design has no nodes, so there is nothing to draw.',
    );
  });

  it('is the same string `pdfPlan` exports, because that is a re-export', () => {
    // D66 claimed a third literal copy could not drift because a test compared
    // the PDF's copy with the Markdown export's. There is no second copy left
    // to compare: `pdfPlan` re-exports this one, so the guarantee is now
    // structural. This asserts the door is still the same room.
    expect(PDF_NOTHING_TO_DRAW).toBe(NOTHING_TO_DRAW);
  });
});

describe('the columns every export prints', () => {
  it('names and sizes the node table the way all four exports print it', () => {
    expect(NODE_COLUMNS).toEqual([
      { heading: 'Id', share: 0.26 },
      { heading: 'Label', share: 0.46 },
      { heading: 'Type', share: 0.28 },
    ]);
  });

  it('names and sizes the edge table the way all four exports print it', () => {
    expect(EDGE_COLUMNS).toEqual([
      { heading: 'From', share: 0.26 },
      { heading: 'To', share: 0.26 },
      { heading: 'Label', share: 0.48 },
    ]);
  });

  it.each([
    ['node', NODE_COLUMNS],
    ['edge', EDGE_COLUMNS],
  ])(
    'gives the whole %s table away, so no share is unaccounted for',
    (_name, columns) => {
      // `pdfPlan` spends the content width on these and `docxPlan` gives the last
      // column whatever its rounding left over. Both assume the shares are a
      // whole table; a set that summed to less would print a table narrower than
      // the text beside it in one export and full width in the other.
      const total = (columns as readonly Column[]).reduce(
        (sum, column) => sum + column.share,
        0,
      );

      expect(total).toBeCloseTo(1, 10);
    },
  );

  it.each([
    ['node', NODE_HEADINGS, NODE_COLUMNS],
    ['edge', EDGE_HEADINGS, EDGE_COLUMNS],
  ])(
    'derives the %s headings from those columns rather than re-typing them',
    (_name, headings, columns) => {
      // This is what stops `toMarkdown` and `toHtml` printing one set of names
      // while the two planners size another. The strings are written once; the
      // headings are what is left when the shares are dropped.
      expect(headings).toEqual(
        (columns as readonly Column[]).map((column) => column.heading),
      );
    },
  );
});
