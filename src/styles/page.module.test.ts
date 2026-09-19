import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from './contrastRatio';
import { declaredColour } from './stylesheetColours';

/**
 * The page itself now has colours, which is new: until this task both pages
 * were deliberately plain and the only measured colours in the project were the
 * drawing's bands (D27) and the validation panel's text.
 *
 * So the page joins them. Every colour the page sets text in is measured
 * against the surface it sits on, by the same formula, for the same reason: a
 * page whose quiet text is a shade too quiet looks fine to whoever chose it and
 * is unreadable to somebody else, and that is a thing a test can catch and an
 * eye cannot.
 *
 * The two surfaces are measured separately on purpose. The plate is the tint
 * the sample's code block and the field table sit on, and text that reads on
 * the page does not automatically read on the plate.
 */

/** WCAG 2.1 AA, normal text. */
const MINIMUM_RATIO = 4.5;

const STYLESHEET = readFileSync(new URL('./page.module.css', import.meta.url), 'utf8');

/** One of the page's own colours. */
function pageColour(name: string): string {
  return declaredColour(STYLESHEET, `page-${name}`);
}

describe('the page stylesheet', () => {
  it('names a surface, an ink, a quiet ink, a link colour and a plate', () => {
    for (const name of ['surface', 'ink', 'quiet', 'accent', 'plate']) {
      expect(() => pageColour(name), `--page-${name} is missing`).not.toThrow();
    }
  });

  it.each(['ink', 'quiet', 'accent'])('reads %s text on the page', (name) => {
    expect(contrastRatio(pageColour(name), pageColour('surface'))).toBeGreaterThanOrEqual(
      MINIMUM_RATIO,
    );
  });

  it.each(['ink', 'quiet', 'accent'])('reads %s text on the plate too', (name) => {
    // The plate is a tint over the page, so it is dimmer than the page is, and
    // the quiet ink is the one that gets there first.
    expect(contrastRatio(pageColour(name), pageColour('plate'))).toBeGreaterThanOrEqual(
      MINIMUM_RATIO,
    );
  });

  it('does not leave colour as the only thing that marks a link', () => {
    // Someone who cannot tell the accent from the ink still has to be able to
    // find the links, so they are underlined rather than only recoloured.
    expect(STYLESHEET).toMatch(/\.main a[^{]*\{[^}]*text-decoration: underline/u);
  });

  it('asks for less motion when the reader has', () => {
    expect(STYLESHEET).toContain('prefers-reduced-motion');
  });
});
