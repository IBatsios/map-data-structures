import { describe, expect, it } from 'vitest';

import { UNDRAWABLE_MARK } from '../../src/lib/drawableText';
import { NOTHING_TO_DRAW } from '../../src/lib/exportFurniture';
import { missingFrom, textThatMustSurvive } from './survivingText';

/**
 * What a `.docx` has to still say after LibreOffice has rewritten it.
 *
 * The list comes from the design's own JSON rather than from the plan the
 * export built, and that is the point: asking the exporter what it meant to
 * write and then checking the file says that would pass a build that dropped
 * every label, as long as it dropped it in both places. The file the user
 * wrote is the only honest source, and the one transformation between it and
 * the document — D76's marking of characters XML has no room for — is applied
 * through `safeDocxText`, which is the export's own function and is pinned by
 * `docxPlan.test.ts`.
 */

/**
 * U+0001, built rather than typed.
 *
 * A raw control character in a source file is invisible to the reader and to
 * every review that would have to spot it, and it is exactly the character
 * this test is about, so it is named instead.
 */
const START_OF_HEADING = String.fromCodePoint(0x01);

/** A design with one of everything worth asking about. */
const DESIGN = JSON.stringify({
  title: 'Order intake',
  nodes: [
    { id: 'customer', label: 'Customer', type: 'user' },
    { id: 'api', label: 'Public API', type: 'service' },
  ],
  edges: [{ from: 'customer', to: 'api', label: 'places order' }],
});

describe('the text a converted document has to still carry', () => {
  it('asks for the title and every node and edge label', () => {
    const wanted = textThatMustSurvive(DESIGN);

    expect(wanted).toContain('Order intake');
    expect(wanted).toContain('Customer');
    expect(wanted).toContain('Public API');
    expect(wanted).toContain('places order');
  });

  it('asks for the marked form of a label the format cannot carry', () => {
    // D76: a raw U+0001 makes `word/document.xml` ill-formed and LibreOffice
    // refuses the file outright, so the export marks it. Asking for the raw
    // character back would be asking the export to undo the fix.
    const wanted = textThatMustSurvive(
      JSON.stringify({
        title: 'Control characters',
        nodes: [{ id: 'soh', label: `Soh${START_OF_HEADING}Charlie`, type: 'queue' }],
        edges: [],
      }),
    );

    expect(wanted).toContain(`Soh${UNDRAWABLE_MARK}Charlie`);
  });

  it('asks for each line of a two-line label on its own', () => {
    // The export writes a line break as a real `w:br`, and a reader that
    // re-flowed it into two paragraphs would still be carrying every word.
    // Asking line by line passes both shapes and fails a dropped line.
    const wanted = textThatMustSurvive(
      JSON.stringify({
        title: 'Lines',
        nodes: [{ id: 'echo', label: 'Newline\nEcho', type: 'external' }],
        edges: [],
      }),
    );

    expect(wanted).toContain('Newline');
    expect(wanted).toContain('Echo');
    expect(wanted).not.toContain('Newline\nEcho');
  });

  it('leaves out the blank line inside a label, because finding it proves nothing', () => {
    // The schema rejects a label that is *entirely* blank, but a label with a
    // blank line in the middle of it is a valid design, and splitting on line
    // endings makes an empty line out of it. Every document contains an empty
    // string, so asking for one would be an assertion that cannot fail.
    const wanted = textThatMustSurvive(
      JSON.stringify({
        title: 'Blank lines',
        nodes: [{ id: 'gap', label: 'Top\n\nBottom', type: 'service' }],
        edges: [],
      }),
    );

    expect(wanted).toEqual(['Blank lines', 'Top', 'Bottom']);
  });

  it('asks for nothing twice, however often the design says it', () => {
    const wanted = textThatMustSurvive(
      JSON.stringify({
        title: 'Same',
        nodes: [
          { id: 'one', label: 'Same', type: 'service' },
          { id: 'two', label: 'Same', type: 'service' },
        ],
        edges: [],
      }),
    );

    expect(wanted.filter((text) => text === 'Same')).toHaveLength(1);
  });

  it('asks for the D51 sentence when the design has no nodes to draw', () => {
    // Otherwise `empty-design` would be checked for its title alone, and a
    // conversion that dropped the body of the document would pass.
    const wanted = textThatMustSurvive(
      JSON.stringify({ title: 'Nothing yet', nodes: [], edges: [] }),
    );

    expect(wanted).toContain(NOTHING_TO_DRAW);
  });

  it('refuses a file that is not a design rather than asking for nothing', () => {
    // A check whose expectations quietly came back empty would pass every
    // document, which is the failure shape `docxText.ts` is strict about too.
    expect(() => textThatMustSurvive('{ "nope": true }')).toThrow();
  });
});

describe('what a converted document lost', () => {
  it('names the strings the document no longer carries', () => {
    const lost = missingFrom('Order intake\nCustomer', ['Order intake', 'Public API']);

    expect(lost).toEqual(['Public API']);
  });

  it('comes back empty when everything survived', () => {
    expect(missingFrom('Order intake\nCustomer', ['Customer'])).toEqual([]);
  });
});
