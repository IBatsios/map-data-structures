import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrastRatio';
import { declaredColour } from './stylesheetColours';

/**
 * "The error panel is a live region and its text is readable" is an acceptance
 * criterion of Task 04, and half of it is a colour measurement. D27 set the
 * precedent for the drawing's colour bands; the panel is measured the same way,
 * so the next person to restyle it finds out from a failing test rather than
 * from someone who could not read what went wrong with their file.
 *
 * The bare page is no longer white. Task 09 gave both pages a surface of their
 * own, so the measurement below reads that surface out of `page.module.css`
 * rather than naming a colour the page does not have any more — a contrast test
 * that still passes while measuring the wrong background is worse than none.
 */

/** WCAG 2.1 AA, normal text. */
const MINIMUM_RATIO = 4.5;

const STYLESHEET = readFileSync(new URL('./upload.module.css', import.meta.url), 'utf8');

const PAGE_STYLESHEET = readFileSync(
  new URL('./page.module.css', import.meta.url),
  'utf8',
);

/** One `--problems-…: #rrggbb;` declaration, wherever it is set. */
function colourNamed(property: string): string {
  return declaredColour(STYLESHEET, `problems-${property}`);
}

describe('the validation panel stylesheet', () => {
  it('names a surface and a text colour of its own', () => {
    expect(() => colourNamed('surface')).not.toThrow();
    expect(() => colourNamed('text')).not.toThrow();
  });

  it('reads its messages against its own surface', () => {
    expect(
      contrastRatio(colourNamed('text'), colourNamed('surface')),
    ).toBeGreaterThanOrEqual(MINIMUM_RATIO);
  });

  it('reads its messages against the page behind it, before any tint applies', () => {
    // The panel's own background is a tint, but a browser in forced-colours or
    // high-contrast mode may drop it and leave the text on the page itself.
    expect(
      contrastRatio(colourNamed('text'), declaredColour(PAGE_STYLESHEET, 'page-surface')),
    ).toBeGreaterThanOrEqual(MINIMUM_RATIO);
  });

  it('marks the panel by a state attribute rather than by a class the script sets', () => {
    // D23 and D27: the CSS owns the hashed class name, the script owns the
    // state. A script that reached for a class name here would be reaching for
    // a name this file is free to change.
    expect(STYLESHEET).toContain("[data-state='problems']");
  });
});
