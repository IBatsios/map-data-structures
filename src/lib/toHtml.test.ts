import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import { layoutDesign } from './layout';
import { htmlPage } from './toHtml';

/**
 * The HTML export, read the way a user reads it: one file that opens in a
 * browser, showing the design's name, its drawing, and the two tables.
 *
 * What is tested here is `htmlPage` — the whole document given the drawing's
 * markup — and not `toHtml`, which is the same function with the drawing
 * serialised out of a real `Document` first. That split is deliberate and D55
 * records it: this project's Vitest run has no DOM at all, so the DOM half is
 * Playwright's (`e2e/export.spec.ts`) and everything a string can answer is
 * here. The drawing is passed in as a stand-in string so that a test can tell
 * where the drawing went without a browser.
 *
 * Every test goes in through `layoutDesign`, for the reason `toMarkdown.test.ts`
 * gives: the export's promise is that it shows what the preview shows (intake
 * 5.2), and the preview draws from the layout. A hand-built `DesignLayout`
 * would be testing a shape nothing produces.
 */

/** Stands in for the drawing, so a test can see where it was put. */
const DRAWING = '<svg data-part="drawing"><title>Order intake</title></svg>';

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

function pageOf(design: Design, drawing = DRAWING): string {
  return htmlPage(layoutDesign(design), drawing);
}

/** The cells of one table's body rows, found by the heading above it. */
function tableRows(page: string, heading: string): readonly (readonly string[])[] {
  const section = page.split(`<h2>${heading}</h2>`)[1]?.split('</table>')[0] ?? '';
  const body = section.split('<tbody>')[1] ?? '';

  return [...body.matchAll(/<tr>(.*?)<\/tr>/gsu)].map(([, row]) =>
    [...(row ?? '').matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gsu)].map(
      ([, cell]) => cell ?? '',
    ),
  );
}

describe('htmlPage', () => {
  it('is a whole HTML document, opening with a doctype and closing the page', () => {
    const page = pageOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('<html lang="en">');
    expect(page.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('names the page after the design and heads it with the same name', () => {
    const page = pageOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(page).toContain('<title>Order intake</title>');
    expect(page).toContain('<h1>Order intake</h1>');
  });

  it('puts the drawing it was given on the page', () => {
    const page = pageOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(page).toContain(DRAWING);
  });

  it('lists every node in file order with its id, label and type', () => {
    const page = pageOf(
      designOf('Two', [node('api', 'Public API', 'service'), node('db', 'Orders', 'db')]),
    );

    expect(tableRows(page, 'Nodes')).toEqual([
      ['api', 'Public API', 'service'],
      ['db', 'Orders', 'db'],
    ]);
  });

  it('lists every edge in file order with both ends and its label', () => {
    const page = pageOf(
      designOf(
        'Two',
        [node('api', 'Public API'), node('db', 'Orders')],
        [
          { from: 'api', to: 'db', label: 'writes order' },
          { from: 'db', to: 'api', label: 'answers' },
        ],
      ),
    );

    expect(tableRows(page, 'Edges')).toEqual([
      ['api', 'db', 'writes order'],
      ['db', 'api', 'answers'],
    ]);
  });

  it('gives every table a row of column headings', () => {
    const page = pageOf(designOf('Two', [node('api', 'Public API')]));

    expect(page).toContain('<th scope="col">Id</th>');
    expect(page).toContain('<th scope="col">Label</th>');
    expect(page).toContain('<th scope="col">Type</th>');
    expect(page).toContain('<th scope="col">From</th>');
    expect(page).toContain('<th scope="col">To</th>');
  });

  it('heads each part of the page, so the document can be read by its outline', () => {
    const page = pageOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(page).toContain('<h2>Drawing</h2>');
    expect(page).toContain('<h2>Nodes</h2>');
    expect(page).toContain('<h2>Edges</h2>');
  });

  it('shows a label that is markup as the text it is, not as an element', () => {
    const page = pageOf(designOf('Risky', [node('x', '<script>alert(1)</script>')]));

    // Escaped, never stripped: the label the preview draws is the label the
    // page shows. Mermaid's strict sanitiser dropped this text in Task 05 and
    // that is exactly what intake 5.2 rules out.
    expect(tableRows(page, 'Nodes')[0]?.[1]).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(page).not.toContain('<script');
  });

  it('shows a title that is markup as the text it is', () => {
    const page = pageOf(designOf('<img src=x onerror=go>', [node('a', 'One')]));

    expect(page).toContain('<title>&lt;img src=x onerror=go&gt;</title>');
    expect(page).toContain('<h1>&lt;img src=x onerror=go&gt;</h1>');
    expect(page).not.toContain('<img');
  });

  it('escapes the ampersand first, so an entity in a label stays what it said', () => {
    const page = pageOf(designOf('Amp', [node('a', '&lt;b&gt; & "quoted"')]));

    expect(tableRows(page, 'Nodes')[0]?.[1]).toBe(
      '&amp;lt;b&amp;gt; &amp; &quot;quoted&quot;',
    );
  });

  it('keeps a label exactly as the file gave it, spaces and all (D39)', () => {
    const page = pageOf(designOf('Spaced', [node('a', '  Public API  ')]));

    expect(tableRows(page, 'Nodes')[0]?.[1]).toBe('  Public API  ');
  });

  it('says a design with no nodes has nothing to draw, rather than showing an empty canvas', () => {
    const page = pageOf(designOf('Nothing yet', []));

    expect(page).toContain('This design has no nodes, so there is nothing to draw.');
    expect(page).not.toContain('<svg');
  });

  it('keeps both tables and their headings when the design holds nothing', () => {
    const page = pageOf(designOf('Nothing yet', []));

    expect(page).toContain('<h2>Nodes</h2>');
    expect(page).toContain('<h2>Edges</h2>');
    expect(tableRows(page, 'Nodes')).toEqual([]);
    expect(tableRows(page, 'Edges')).toEqual([]);
  });

  it('carries its styles in the page itself', () => {
    const page = pageOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(page).toContain('<style>');
    expect(page).toContain("[data-kind='service']");
  });

  it('fetches nothing from anywhere: no stylesheet, script, font or image', () => {
    const page = pageOf(
      designOf(
        'Order intake',
        [node('a', 'Public API'), node('b', 'Orders', 'database')],
        [{ from: 'a', to: 'b', label: 'writes order' }],
      ),
    );

    expect(page).not.toContain('<link');
    expect(page).not.toContain('<script');
    expect(page).not.toContain('<img');
    expect(page).not.toContain('@import');
    expect(page).not.toMatch(/\bsrc\s*=/u);
    expect(page).not.toMatch(/https?:\/\/(?!www\.w3\.org)/u);
  });
});
