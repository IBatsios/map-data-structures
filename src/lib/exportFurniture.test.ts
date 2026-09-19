import { describe, expect, it } from 'vitest';

import { NOTHING_TO_DRAW } from './exportFurniture';
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
