import { describe, expect, it } from 'vitest';

import type { Design, DesignEdge, DesignNode } from './design.types';
import { layoutDesign } from './layout';
import { KNOWN_SHAPES } from './shapes';
import { toMarkdown } from './toMarkdown';

/**
 * The Markdown export, read the way a user reads it: the title, the two tables,
 * and a diagram that renders where they paste it.
 *
 * Every test here goes in through `layoutDesign`, because the export's promise
 * is that it shows what the preview shows (intake 5.2) and the preview draws
 * from the layout. A test that built a `DesignLayout` by hand would be testing
 * a shape nothing produces.
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

function markdownOf(design: Design): string {
  return toMarkdown(layoutDesign(design));
}

/** The lines inside the fenced ```mermaid block, without the fence itself. */
function mermaidLines(markdown: string): readonly string[] {
  const block = /```mermaid\n(.*?)```/su.exec(markdown)?.[1];

  if (block === undefined) {
    throw new Error('The Markdown holds no fenced mermaid block.');
  }

  return block.split('\n').filter((line) => line !== '');
}

/** The body rows of one table, found by the heading above it. */
function tableRows(markdown: string, heading: string): readonly string[] {
  const section = markdown.split(`## ${heading}\n`)[1] ?? '';
  const lines: string[] = [];

  for (const line of section.split('\n')) {
    if (line.startsWith('## ')) {
      break;
    }
    if (line.startsWith('|')) {
      lines.push(line);
    }
  }

  // Past the headings and the divider, so only what the design put there.
  return lines.slice(2);
}

describe('toMarkdown', () => {
  it('opens with the design title as the document heading', () => {
    const markdown = markdownOf(designOf('Order intake', [node('a', 'Public API')]));

    expect(markdown.startsWith('# Order intake\n')).toBe(true);
  });

  it('lists every node in file order with its id, label and type', () => {
    const markdown = markdownOf(
      designOf('Two', [node('api', 'Public API', 'service'), node('db', 'Orders', 'db')]),
    );

    expect(tableRows(markdown, 'Nodes')).toEqual([
      '| api | Public API | service |',
      '| db | Orders | db |',
    ]);
  });

  it('lists every edge in file order with both ends and its label', () => {
    const design = designOf(
      'Two',
      [node('api', 'Public API'), node('db', 'Orders')],
      [
        { from: 'api', to: 'db', label: 'writes order' },
        { from: 'db', to: 'api', label: 'answers' },
      ],
    );

    expect(tableRows(markdownOf(design), 'Edges')).toEqual([
      '| api | db | writes order |',
      '| db | api | answers |',
    ]);
  });

  it('draws the design as a fenced mermaid flowchart running top to bottom', () => {
    // `layout.ts` lays dagre out with `rankdir: 'TB'`, so `TD` is the direction
    // the user just looked at in the preview.
    const markdown = markdownOf(designOf('One', [node('a', 'Public API')]));

    expect(markdown).toContain('```mermaid\nflowchart TD\n');
    expect(mermaidLines(markdown)[0]).toBe('flowchart TD');
  });

  it('gives every node and every edge a line in the diagram', () => {
    const design = designOf(
      'Three',
      [node('a', 'A'), node('b', 'B'), node('c', 'C')],
      [
        { from: 'a', to: 'b', label: 'one' },
        { from: 'b', to: 'c', label: 'two' },
      ],
    );

    expect(mermaidLines(markdownOf(design))).toEqual([
      'flowchart TD',
      '    n0("A")',
      '    n1("B")',
      '    n2("C")',
      '    n0 -->|"one"| n1',
      '    n1 -->|"two"| n2',
    ]);
  });

  it('draws each kind as the silhouette the preview drew it as', () => {
    const design = designOf('Kinds', [
      node('a', 'A', 'service'),
      node('b', 'B', 'database'),
      node('c', 'C', 'queue'),
      node('d', 'D', 'external'),
      node('e', 'E', 'user'),
      node('f', 'F', 'decision'),
    ]);

    expect(mermaidLines(markdownOf(design)).slice(1)).toEqual([
      '    n0("A")',
      '    n1[("B")]',
      '    n2(["C"])',
      '    n3[["D"]]',
      '    n4{{"E"}}',
      '    n5{"F"}',
    ]);
  });

  it('draws an alias as the kind it resolves to, exactly as the preview does', () => {
    // `db` is a database in `shapes.ts` (D25), so the `.md` and the SVG cannot
    // disagree about what kind a node is.
    const markdown = markdownOf(designOf('Alias', [node('a', 'Orders', 'DB')]));

    expect(mermaidLines(markdown)[1]).toBe('    n0[("Orders")]');
  });

  it('has a silhouette of its own for every kind shapes.ts knows', () => {
    // The guard against drift: a seventh kind added to `shapes.ts` fails here
    // rather than quietly exporting as a rectangle.
    const design = designOf(
      'Every kind',
      KNOWN_SHAPES.map((shape, index) => node(`n${index}`, 'X', shape.kind)),
    );
    // Compared without the minted id, so two kinds drawn the same way collide
    // here instead of passing on their differing ids.
    const drawn = mermaidLines(markdownOf(design))
      .slice(1)
      .map((line) => line.replace(/^\s*n\d+/u, ''));

    expect(new Set(drawn).size).toBe(KNOWN_SHAPES.length);
    expect(drawn).not.toContain('["X"]');
  });

  it('draws a type nobody has heard of as a plain rectangle', () => {
    const markdown = markdownOf(designOf('Odd', [node('a', 'Ledger', 'widget-factory')]));

    expect(mermaidLines(markdown)[1]).toBe('    n0["Ledger"]');
    expect(tableRows(markdown, 'Nodes')).toEqual(['| a | Ledger | widget-factory |']);
  });

  it('mints its own diagram ids, so an id with spaces still renders', () => {
    const design = designOf(
      'Loose ids',
      [node('order service', 'Orders'), node('pay[1]', 'Payments')],
      [{ from: 'order service', to: 'pay[1]', label: 'pays' }],
    );
    const markdown = markdownOf(design);

    expect(mermaidLines(markdown).slice(1)).toEqual([
      '    n0("Orders")',
      '    n1("Payments")',
      '    n0 -->|"pays"| n1',
    ]);
    // The user's own ids are not lost: the table still names them.
    expect(tableRows(markdown, 'Edges')).toEqual(['| order service | pay[1] | pays |']);
  });

  it('points a self-edge at the node it came from', () => {
    const design = designOf(
      'Loop',
      [node('a', 'Worker')],
      [{ from: 'a', to: 'a', label: 'retries' }],
    );

    expect(mermaidLines(markdownOf(design))).toContain('    n0 -->|"retries"| n0');
  });

  it('escapes a double quote in a label rather than ending the label on it', () => {
    const design = designOf(
      'Quoted',
      [node('a', 'The "public" API')],
      [{ from: 'a', to: 'a', label: 'says "hello"' }],
    );

    expect(mermaidLines(markdownOf(design)).slice(1)).toEqual([
      '    n0("The #quot;public#quot; API")',
      '    n0 -->|"says #quot;hello#quot;"| n0',
    ]);
  });

  it('escapes a hash, so text that looks like an entity code survives', () => {
    // Mermaid reads `#9829;` as a character code. Escaping the hash first is
    // what makes the label show the text the file held.
    const markdown = markdownOf(designOf('Hash', [node('a', 'Queue #9829; deep')]));

    expect(mermaidLines(markdown)[1]).toBe('    n0("Queue #35;9829; deep")');
  });

  it('keeps an arrow inside a label instead of letting it draw an edge', () => {
    const design = designOf(
      'Arrows',
      [node('a', 'A --> B')],
      [{ from: 'a', to: 'a', label: 'a --> b' }],
    );

    expect(mermaidLines(markdownOf(design)).slice(1)).toEqual([
      '    n0("A --> B")',
      '    n0 -->|"a --> b"| n0',
    ]);
  });

  it('turns a line break in a label into one the diagram can carry', () => {
    // A raw newline would end the statement and break the whole block.
    const markdown = markdownOf(designOf('Broken', [node('a', 'Order\nqueue')]));

    expect(mermaidLines(markdown)[1]).toBe('    n0("Order<br/>queue")');
  });

  it('keeps the spaces inside a label rather than trimming them (D39)', () => {
    const markdown = markdownOf(designOf('Spaced', [node('a', '  Public API  ')]));

    expect(mermaidLines(markdown)[1]).toBe('    n0("  Public API  ")');
    expect(tableRows(markdown, 'Nodes')).toEqual(['| a |   Public API   | service |']);
  });

  it('escapes a pipe in a cell so one label cannot break the table', () => {
    const design = designOf(
      'Pipes',
      [node('a|b', 'A | B')],
      [{ from: 'a|b', to: 'a|b', label: 'x|y' }],
    );
    const markdown = markdownOf(design);

    expect(tableRows(markdown, 'Nodes')).toEqual([
      String.raw`| a\|b | A \| B | service |`,
    ]);
    expect(tableRows(markdown, 'Edges')).toEqual([String.raw`| a\|b | a\|b | x\|y |`]);
  });

  it('escapes a backslash, so one before a pipe cannot swallow the divider', () => {
    // Written this way because a template literal cannot end in a backslash.
    const slash = '\\';
    const markdown = markdownOf(designOf('Slashes', [node('a', `path${slash}`)]));

    expect(tableRows(markdown, 'Nodes')).toEqual([
      `| a | path${slash}${slash} | service |`,
    ]);
  });

  it('carries a line break in a cell without ending the row', () => {
    const markdown = markdownOf(designOf('Rows', [node('a', 'Order\nqueue')]));

    expect(tableRows(markdown, 'Nodes')).toEqual(['| a | Order<br/>queue | service |']);
  });

  it('says a design with nothing in it has nothing to draw, rather than emitting an empty diagram', () => {
    // A design with no nodes and no edges is valid (D19). An empty fenced block
    // is the one thing that could render as an error where the file is pasted.
    const markdown = markdownOf(designOf('Nothing yet', []));

    expect(markdown).not.toContain('```mermaid');
    expect(markdown).toContain('# Nothing yet');
    expect(markdown).toContain('This design has no nodes, so there is nothing to draw.');
    expect(tableRows(markdown, 'Nodes')).toEqual([]);
    expect(tableRows(markdown, 'Edges')).toEqual([]);
  });

  it('still draws the nodes of a design that has no edges at all', () => {
    const markdown = markdownOf(designOf('Islands', [node('a', 'A'), node('b', 'B')]));

    expect(mermaidLines(markdown)).toEqual([
      'flowchart TD',
      '    n0("A")',
      '    n1("B")',
    ]);
    expect(tableRows(markdown, 'Edges')).toEqual([]);
  });

  it('ends the file with a single newline', () => {
    const markdown = markdownOf(designOf('One', [node('a', 'A')]));

    expect(markdown.endsWith('\n')).toBe(true);
    expect(markdown.endsWith('\n\n')).toBe(false);
  });
});
