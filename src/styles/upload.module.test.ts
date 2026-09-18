import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrastRatio';

/**
 * "The error panel is a live region and its text is readable" is an acceptance
 * criterion of Task 04, and half of it is a colour measurement. D27 set the
 * precedent for the drawing's colour bands; the panel is measured the same way,
 * so the next person to restyle it finds out from a failing test rather than
 * from someone who could not read what went wrong with their file.
 */

/** WCAG 2.1 AA, normal text. */
const MINIMUM_RATIO = 4.5;

const STYLESHEET = readFileSync(new URL('./upload.module.css', import.meta.url), 'utf8');

/** One `--problems-…: #rrggbb;` declaration, wherever it is set. */
function colourNamed(property: string): string {
  const found = new RegExp(`--problems-${property}:\\s*(#[0-9a-f]{6})\\s*;`).exec(
    STYLESHEET,
  )?.[1];

  if (found === undefined) {
    throw new Error(`upload.module.css sets no --problems-${property}.`);
  }

  return found;
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
    expect(contrastRatio(colourNamed('text'), '#ffffff')).toBeGreaterThanOrEqual(
      MINIMUM_RATIO,
    );
  });

  it('marks the panel by a state attribute rather than by a class the script sets', () => {
    // D23 and D27: the CSS owns the hashed class name, the script owns the
    // state. A script that reached for a class name here would be reaching for
    // a name this file is free to change.
    expect(STYLESHEET).toContain("[data-state='problems']");
  });
});
