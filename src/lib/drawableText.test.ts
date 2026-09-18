import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import {
  UNDRAWABLE_MARK,
  describeUndrawable,
  drawableLayout,
  markUndrawable,
} from './drawableText';
import type { FontCoverage } from './fontCoverage';
import { readFontCoverage } from './fontCoverage';
import { ROBOTO_REGULAR_BASE64 } from './fonts/robotoRegular';
import { layoutDesign } from './layout';

/**
 * What the PDF export does about a character its font cannot draw.
 *
 * The behaviour under test is the answer to Task 07's round-two defect: the
 * loss has to stop being silent. A character the embedded face has no glyph for
 * is drawn as a mark the reader can see, in the picture and in the tables
 * alike, and the page says afterwards how many there were and which exports
 * still carry them.
 *
 * The coverage is made up here rather than read out of the real font, because
 * what is under test is what this module does with an answer and not which
 * answer Roboto happens to give — `fontCoverage.test.ts` pins that. The one
 * exception is the last test, which checks the mark itself against the real
 * face: a placeholder the font cannot draw either would be dropped in its turn,
 * and the file would be back to saying nothing.
 *
 * Layouts go in through `layoutDesign` for the reason `pdfPlan.test.ts` gives:
 * the export's promise is that it shows what the preview shows (intake 5.2),
 * and the preview draws from the layout, so a hand-built one would be testing a
 * shape nothing produces.
 */

/** Every printable ASCII character, as a stand-in for a small font. */
const ASCII: FontCoverage = new Set(
  Array.from({ length: 0x7f - 0x20 }, (_, index) => 0x20 + index),
);

function coverageOf(characters: string): FontCoverage {
  return new Set([...characters].map((character) => character.codePointAt(0) ?? 0));
}

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

describe('marking the characters a font cannot draw', () => {
  it('leaves text the font covers exactly as it was', () => {
    const marked = markUndrawable('Gateway to queue', ASCII);

    expect(marked.text).toBe('Gateway to queue');
    expect(marked.undrawable).toBe(0);
  });

  it('writes a mark where a character the font lacks used to be', () => {
    // The everyday case, and the one round one lost silently: an arrow in a
    // label is ordinary in a tool for drawing systems.
    const marked = markUndrawable('Gateway → Queue', ASCII);

    expect(marked.text).toBe(`Gateway ${UNDRAWABLE_MARK} Queue`);
    expect(marked.undrawable).toBe(1);
  });

  it('marks each character on its own, so nothing else in the label moves', () => {
    const marked = markUndrawable('A→B←C', ASCII);

    expect(marked.text).toBe(`A${UNDRAWABLE_MARK}B${UNDRAWABLE_MARK}C`);
    expect(marked.undrawable).toBe(2);
  });

  it('marks a whole label the font has nothing for, rather than emptying it', () => {
    // `API gateway (東京)` came out of the round-one build as `API gateway ()`,
    // which reads as a complete label. This is the assertion that it cannot.
    const marked = markUndrawable('API gateway (東京)', ASCII);

    expect(marked.text).toBe(`API gateway (${UNDRAWABLE_MARK}${UNDRAWABLE_MARK})`);
    expect(marked.undrawable).toBe(2);
  });

  it('writes one mark for a character from beyond the basic plane', () => {
    // It is two UTF-16 code units and one character, and the reader sees one
    // thing missing rather than two.
    const marked = markUndrawable('ship 🚀 it', ASCII);

    expect(marked.text).toBe(`ship ${UNDRAWABLE_MARK} it`);
    expect(marked.undrawable).toBe(1);
  });

  it('marks a tab, because jsPDF ends the line it is in', () => {
    // The round-two defect. A tab used to be spared on the premise that
    // `pdfPlan` breaks a label's lines on it. It does not: `wrap` splits a
    // cell on a newline and on nothing else, and `splitWords` breaks on a
    // space rather than on whitespace. So the tab reached `pdf.text`, which
    // writes the text up to the first control character and drops the rest of
    // the line — `Alpha\tBravo` arrived in the Nodes table as `Alpha`.
    const marked = markUndrawable('lines\tapart', ASCII);

    expect(marked.text).toBe(`lines${UNDRAWABLE_MARK}apart`);
    expect(marked.undrawable).toBe(1);
  });

  it('marks every other control character, which ends a line the same way', () => {
    // Measured against jsPDF 4.2.1 with the embedded face: `AAA<c>ZZZ` wrote
    // `AAA` for every one of these. Strict JSON forbids a raw control
    // character inside a string, so each arrives as an escape — rarer than the
    // arrow was, and not a reason to lose the rest of the label.
    const controls = [
      '\u0001',
      '\u000b',
      '\u000c',
      '\r',
      '\u001f',
      '\u007f',
      '\u0085',
      '\u009f',
    ];

    for (const control of controls) {
      expect(markUndrawable(`Soh${control}Charlie`, ASCII)).toEqual({
        text: `Soh${UNDRAWABLE_MARK}Charlie`,
        undrawable: 1,
      });
    }
  });

  it('marks a control character the font does map, because jsPDF ends the line anyway', () => {
    // Asking the cmap is not enough on its own here, and the real face proves
    // it: Roboto Regular maps U+0000, U+0002 and U+000D, as many faces do. A
    // glyph existing changes nothing, because jsPDF ends the string at a
    // control character whichever way the font answers — a lone `\r` inside a
    // label would have arrived as everything before it and no more.
    const coverage = coverageOf('Alpha Bravo\r\u0000\u0002');

    expect(markUndrawable('Alpha\rBravo', coverage)).toEqual({
      text: `Alpha${UNDRAWABLE_MARK}Bravo`,
      undrawable: 1,
    });
  });

  it('marks the control characters the real embedded face does map', () => {
    // The second place this file reads the real font rather than a stand-in,
    // for the same reason as the last test in it: a fact about Roboto that the
    // fix depends on, pinned so regenerating the font cannot quietly undo it.
    const coverage = readFontCoverage(ROBOTO_REGULAR_BASE64);

    for (const control of ['\u0000', '\u0002', '\r']) {
      expect(coverage.has(control.codePointAt(0) ?? 0)).toBe(true);
      expect(markUndrawable(`a${control}b`, coverage)).toEqual({
        text: `a${UNDRAWABLE_MARK}b`,
        undrawable: 1,
      });
    }
  });

  it('leaves a line break alone, because nothing is ever asked to draw one', () => {
    // The one control character that is the document's own layout rather than
    // a loss, and the reason is checked rather than assumed: `pdfPlan`'s
    // `wrap` splits a cell on it before any line is measured, and svg2pdf
    // removes newlines from a text element before jsPDF sees it. Marking it
    // would put a black square in a label that broke exactly as it asked to.
    const marked = markUndrawable('two\nlines', ASCII);

    expect(marked.text).toBe('two\nlines');
    expect(marked.undrawable).toBe(0);
  });

  it('says nothing is undrawable in an empty string', () => {
    expect(markUndrawable('', ASCII)).toEqual({ text: '', undrawable: 0 });
  });
});

describe('marking a whole laid-out design', () => {
  const design = designOf(
    'Traffic → regions',
    [
      node('gateway→', 'Gateway → Queue', 'service→'),
      node('plain', 'Plain node', 'database'),
    ],
    [{ from: 'gateway→', to: 'plain', label: 'replicates 東京' }],
  );

  it('marks every piece of text the document writes', () => {
    const drawable = drawableLayout(layoutDesign(design), ASCII);
    const [first] = drawable.layout.nodes;
    const [edge] = drawable.layout.edges;

    expect(drawable.layout.title).toBe(`Traffic ${UNDRAWABLE_MARK} regions`);
    expect(first?.id).toBe(`gateway${UNDRAWABLE_MARK}`);
    expect(first?.label).toBe(`Gateway ${UNDRAWABLE_MARK} Queue`);
    expect(first?.type).toBe(`service${UNDRAWABLE_MARK}`);
    expect(edge?.from).toBe(`gateway${UNDRAWABLE_MARK}`);
    expect(edge?.label).toBe(`replicates ${UNDRAWABLE_MARK}${UNDRAWABLE_MARK}`);
  });

  it('marks the lines a label is drawn on, so the picture matches the table', () => {
    // The drawing is drawn from `labelLines` and the table from `label`. If
    // only one of them were marked, the two halves of the same file would
    // disagree — which is the failure intake 5.2 names.
    const drawable = drawableLayout(layoutDesign(design), ASCII);

    for (const marked of drawable.layout.nodes) {
      expect(marked.labelLines.join(' ')).toBe(marked.label);
    }

    for (const marked of drawable.layout.edges) {
      expect(marked.labelLines.join(' ')).toBe(marked.label);
    }
  });

  it('marks a tab in a label, in the picture and in the table alike', () => {
    // The whole design, not one string: a label short enough to sit on one
    // line keeps its tab in the lines the drawing is drawn from (`wrapText`
    // returns text that fits exactly as it came in), so both halves of the
    // file would have lost everything after it. A label long enough to wrap is
    // rebuilt from its words, and there the tab has already become the line
    // break — which is why this asserts the two halves agree rather than
    // asserting a particular number of lines.
    const tabbed = designOf('Tabs', [node('alpha', 'Alpha\tBravo')]);
    const drawable = drawableLayout(layoutDesign(tabbed), ASCII);
    const [marked] = drawable.layout.nodes;

    expect(marked?.label).toBe(`Alpha${UNDRAWABLE_MARK}Bravo`);
    expect(marked?.labelLines.join(' ')).toBe(marked?.label);
    expect(drawable.undrawable).toBe(1);
  });

  it('counts each piece of the design once, not once per line it is drawn on', () => {
    // Title, one node id, one label, one type, one edge end and one edge
    // label: seven characters in all, the edge label carrying two of them.
    expect(drawableLayout(layoutDesign(design), ASCII).undrawable).toBe(7);
  });

  it('leaves the layout it was given untouched', () => {
    const layout = layoutDesign(design);
    const before = JSON.stringify(layout);

    drawableLayout(layout, ASCII);

    expect(JSON.stringify(layout)).toBe(before);
  });

  it('keeps the geometry the preview was drawn with', () => {
    // A mark stands in the place of one character, so nothing is re-laid out:
    // the boxes, the routes and the canvas are the ones the preview used.
    const layout = layoutDesign(design);
    const drawable = drawableLayout(layout, ASCII);

    expect(drawable.layout.width).toBe(layout.width);
    expect(drawable.layout.height).toBe(layout.height);
    expect(drawable.layout.nodes.map((marked) => marked.x)).toEqual(
      layout.nodes.map((original) => original.x),
    );
    expect(drawable.layout.edges[0]?.points).toEqual(layout.edges[0]?.points);
  });

  it('changes nothing at all when the font covers the whole design', () => {
    const plain = designOf('Order intake', [node('api', 'Public API')]);
    const layout = layoutDesign(plain);
    const drawable = drawableLayout(layout, ASCII);

    expect(drawable.undrawable).toBe(0);
    expect(drawable.layout).toEqual(layout);
  });

  it('marks a design with nothing in it without inventing anything', () => {
    const layout = layoutDesign(designOf('Nothing yet', []));

    expect(drawableLayout(layout, ASCII)).toEqual({ layout, undrawable: 0 });
  });
});

describe('telling the user what the font could not draw', () => {
  it('says nothing when the font drew every character', () => {
    // Announcing a finished download is a live-region question parked for all
    // four exports at once (D41), so a clean export still says nothing here.
    expect(describeUndrawable(0)).toBeNull();
  });

  it('counts one character in the singular', () => {
    expect(describeUndrawable(1)).toContain('1 character in this design');
  });

  it('counts more than one in the plural', () => {
    expect(describeUndrawable(4)).toContain('4 characters in this design');
  });

  it('names the mark it drew and where the characters did survive', () => {
    const sentence = describeUndrawable(2) ?? '';

    expect(sentence).toContain(UNDRAWABLE_MARK);
    expect(sentence).toContain('Markdown');
    expect(sentence).toContain('HTML');
  });
});

describe('the mark itself', () => {
  it('is a character the embedded face can draw', () => {
    // The guard on the whole fix. A placeholder the font has no glyph for would
    // be dropped in its turn and the file would be back to saying nothing —
    // which is what would have happened with the hollow `□` this started from:
    // Roboto carries the filled square and not the hollow one.
    const coverage = readFontCoverage(ROBOTO_REGULAR_BASE64);

    expect(coverage.has(UNDRAWABLE_MARK.codePointAt(0) ?? 0)).toBe(true);
    expect([...UNDRAWABLE_MARK]).toHaveLength(1);
  });

  it('is left alone when it is already in a label', () => {
    // A design that writes the mark itself is not a design that lost anything.
    const marked = markUndrawable(UNDRAWABLE_MARK, coverageOf(UNDRAWABLE_MARK));

    expect(marked).toEqual({ text: UNDRAWABLE_MARK, undrawable: 0 });
  });
});
