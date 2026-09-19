import { describe, expect, it } from 'vitest';

import type { LoadErrorReport } from './describeLoadError';
import {
  MAX_PROBLEMS_SHOWN,
  describeHiddenProblems,
  describeLoadError,
  describeSyntaxFault,
  describeUnsupportedFile,
} from './describeLoadError';
import { DesignLayoutError } from './layout';
import { DesignSyntaxError, loadDesign } from './loadDesign';

/**
 * Every test here is one broken file in and the messages a user reads out.
 *
 * The syntax cases pass the engine's message in by hand rather than provoking
 * one, because the message is not the same on every engine and Vitest only ever
 * sees the one it is running on. A JavaScriptCore message is a string like any
 * other here, so Safari's case is a test that runs on Node.
 */

/** V8, on the trailing comma below: a position, a line and a column. */
const V8_WITH_LINE =
  'Expected double-quoted property name in JSON at position 59 (line 5 column 1)';

/** Older V8: a position and nothing else, so the line has to be computed. */
const V8_POSITION_ONLY = 'Unexpected token } in JSON at position 59';

/** JavaScriptCore — Safari — names no position, no line and no column. */
const JAVASCRIPTCORE = "JSON Parse error: Expected '}'";

/**
 * SpiderMonkey — Firefox — is the third shape: a line and a column, and no
 * position at all. This is the engine's own message for the same trailing comma
 * `V8_WITH_LINE` above describes, so the two can be held against each other.
 *
 * Measured, not remembered, and not taken from documentation: every
 * SpiderMonkey string in this file was read out of Firefox 156.0
 * (`Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101
 * Firefox/156.0`) by running `JSON.parse` on these exact file texts in a
 * content page over Marionette, during the cycle that added this case.
 */
const SPIDERMONKEY_WITH_LINE =
  'JSON.parse: expected double-quoted property name at line 5 column 1 of the JSON data';

/** SpiderMonkey on the file with something after the design, measured the same way. */
const SPIDERMONKEY_AFTER_THE_JSON =
  'JSON.parse: unexpected non-whitespace character after JSON data at line 2 column 1 of the JSON data';

/**
 * SpiderMonkey on the YAML file whose own text says `position 900`.
 *
 * It is here to record something measured rather than to vary the wording:
 * SpiderMonkey does not quote the file at all, so the trap V8's no-position
 * form sets — the user's own bytes read back as an engine's clause — has no
 * SpiderMonkey equivalent. Its line and column are its own.
 */
const SPIDERMONKEY_ON_A_FILE_NAMING_A_POSITION =
  'JSON.parse: unexpected character at line 1 column 1 of the JSON data';

/** What V8 says about a file that is not text at all: the bytes come with it. */
const V8_ON_BYTES =
  'Unexpected token \'\x89\', "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01\x00" is not valid JSON';

/** The file those two positions point into: the comma on line 4 is the fault. */
const TRAILING_COMMA = '{\n  "title": "Order intake",\n  "nodes": [],\n  "edges": [],\n}';

/**
 * V8's *no-position* form, which quotes the file's own first bytes back.
 *
 * Every message below was measured from `JSON.parse` on Node 24 / V8 13.6
 * rather than remembered. This one is a YAML config saved with a `.json` name:
 * V8 clipped its first line to ten characters, so the `900` the file's author
 * wrote arrives as `position 9`. None of it is a position clause — the digits
 * are the user's.
 */
const V8_QUOTING_A_FILE = 'Unexpected token \'p\', "position 9"... is not valid JSON';

/** The file that message quotes. Its real fault is line 1, column 1. */
const YAML_NAMING_A_POSITION = 'position 900: gantry\nnodes:\n  - id: a\n';

/** The same trap at its sharpest: a short file is quoted whole, so the snippet
 * can hold the engine's own clause words verbatim. */
const V8_QUOTING_A_WHOLE_FILE =
  'Unexpected token \'J\', "JSON at position 900" is not valid JSON';

/** The file that message quotes, in full. */
const FILE_NAMING_A_POSITION = 'JSON at position 900';

/** V8 on a file with something after the design: `after JSON`, not `in JSON`. */
const V8_AFTER_THE_JSON =
  'Unexpected non-whitespace character after JSON at position 8 (line 2 column 1)';

/** The file that message points into: the junk starts on line 2. */
const JSON_THEN_JUNK = '{"a":1}\nextra';

/**
 * Two control characters, written by code point.
 *
 * A control character typed straight into a source file is an invisible byte
 * nobody reviewing this can see, and formatters and editors are entitled to eat
 * it. These are the bytes a binary file and a mischievous label are made of, so
 * the tests need them; they just do not need them written literally.
 */
const BELL = String.fromCodePoint(0x07);
const NUL = String.fromCodePoint(0x00);

/** Whether any character here is one no screen can show. */
function holdsControlCharacters(text: string): boolean {
  return [...text].some((character) => {
    const code = character.codePointAt(0) ?? 0;

    return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
  });
}

/** A design that loads, for bending one field at a time. */
const twoNodesOneEdge = {
  title: 'Order intake',
  nodes: [
    { id: 'api', label: 'Public API', type: 'service' },
    { id: 'queue', label: 'Order queue', type: 'queue' },
  ],
  edges: [{ from: 'api', to: 'queue', label: 'publishes order' }],
};

/** The text of a file holding `design`, formatted the way a person would. */
function fileTextOf(design: unknown): string {
  return JSON.stringify(design, null, 2);
}

/** The report the page would show for a file that does not load. */
function reportFor(fileText: string, fileName = 'design.json'): LoadErrorReport {
  try {
    loadDesign(fileText);
  } catch (error) {
    return describeLoadError({ error, fileName, fileText });
  }

  throw new Error('Expected that file to fail to load, but it loaded.');
}

/** The messages the panel would list for a file that does not load. */
function problemsFor(fileText: string): readonly string[] {
  return reportFor(fileText).problems;
}

describe('describeSyntaxFault', () => {
  it('names the line and the column when the engine gives a position', () => {
    // Act
    const message = describeSyntaxFault(V8_WITH_LINE, TRAILING_COMMA);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 5, column 1: Expected double-quoted property name.',
    );
  });

  it('counts the line itself rather than reading the engine’s phrasing', () => {
    // Older V8 gives `position 59` and stops there. The file's text is in hand,
    // so the line and the column are ours to count — which also means one
    // wording across every engine that gives a position at all.
    // Act
    const message = describeSyntaxFault(V8_POSITION_ONLY, TRAILING_COMMA);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 5, column 1: Unexpected token }.',
    );
  });

  it('admits it does not know where, on an engine that gives no position', () => {
    // Safari's case, as a test that runs on Node.
    // Act
    const message = describeSyntaxFault(JAVASCRIPTCORE, TRAILING_COMMA);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON, and this browser did not say where in it. ' +
        "It reported: JSON Parse error: Expected '}'. " +
        'Check the file for a missing comma, bracket or quote.',
    );
  });

  it('names the line and column an engine gives without giving a position', () => {
    // The defect this case was added for: SpiderMonkey names a line and a
    // column and no character index at all, so the panel used to deny a
    // position in one sentence and quote the engine naming one in the next.
    // Act
    const message = describeSyntaxFault(SPIDERMONKEY_WITH_LINE, TRAILING_COMMA);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 5, column 1: ' +
        'JSON.parse: expected double-quoted property name.',
    );
    expect(message).not.toContain('did not say where');
  });

  it('reads an engine’s line and column out at most once', () => {
    // The standing invariant: whatever the position is read from has to be
    // stripped from the detail as well, or Firefox users are told where the
    // fault is twice — once in this app's words and once in the engine's.
    // Act
    const message = describeSyntaxFault(SPIDERMONKEY_WITH_LINE, TRAILING_COMMA);

    // Assert
    expect(message).not.toContain('of the JSON data');
    expect(message.match(/line 5/gi)).toHaveLength(1);
    expect(message.match(/column 1/gi)).toHaveLength(1);
  });

  it('puts two engines reading one broken file at the same line and column', () => {
    // V8 counts a character index and this app turns it into a place;
    // SpiderMonkey names the place itself. Both are describing the same comma,
    // so both have to arrive at the same sentence about where it is.
    // Act
    const fromV8 = describeSyntaxFault(V8_WITH_LINE, TRAILING_COMMA);
    const fromSpiderMonkey = describeSyntaxFault(SPIDERMONKEY_WITH_LINE, TRAILING_COMMA);

    // Assert
    expect(fromV8).toContain('Line 5, column 1:');
    expect(fromSpiderMonkey).toContain('Line 5, column 1:');
  });

  it('still names the line when SpiderMonkey puts its fault after the JSON', () => {
    // Act
    const message = describeSyntaxFault(SPIDERMONKEY_AFTER_THE_JSON, JSON_THEN_JUNK);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 2, column 1: ' +
        'JSON.parse: unexpected non-whitespace character after JSON data.',
    );
  });

  it('trusts SpiderMonkey’s own line, which never quotes the file back', () => {
    // The mirror of the V8 case below. V8's no-position form quotes the file's
    // first bytes, which is why the clause has to be anchored to the end of the
    // message; SpiderMonkey quotes nothing, so the line it names is always its
    // own. Measured on Firefox 156.0 rather than assumed.
    // Act
    const message = describeSyntaxFault(
      SPIDERMONKEY_ON_A_FILE_NAMING_A_POSITION,
      YAML_NAMING_A_POSITION,
    );

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 1, column 1: JSON.parse: unexpected character.',
    );
    expect(message).not.toContain('900');
  });

  it('never prints a line number it inferred from nothing', () => {
    // The standing rule: a wrong pointer into a file the user wrote themselves
    // costs them more than no pointer at all.
    // Act
    const message = describeSyntaxFault(JAVASCRIPTCORE, TRAILING_COMMA);

    // Assert
    expect(message).not.toMatch(/line \d/i);
    expect(message).not.toMatch(/column \d/i);
  });

  it('reads a position from the engine’s clause and never from the file it quotes', () => {
    // The round 1 defect. V8's no-position form quotes the file's own first
    // bytes, so a file whose text says `position 900` had that `9` scraped out
    // of the quotation and printed back as a column. The engine said nothing
    // about where; the only honest answer is that it did not.
    // Act
    const message = describeSyntaxFault(V8_QUOTING_A_FILE, YAML_NAMING_A_POSITION);

    // Assert
    expect(message).not.toMatch(/line \d/i);
    expect(message).not.toMatch(/column \d/i);
    expect(message).toContain('did not say where');
  });

  it('names no line for a short file quoted back whole, clause words and all', () => {
    // The same trap at its sharpest: the quotation holds the engine's own
    // clause words. What is quoted must also arrive intact — cutting a clause
    // out of the middle of a file's own text would misquote the file.
    // Act
    const message = describeSyntaxFault(V8_QUOTING_A_WHOLE_FILE, FILE_NAMING_A_POSITION);

    // Assert
    expect(message).not.toMatch(/line \d/i);
    expect(message).not.toMatch(/column \d/i);
    expect(message).toContain('"JSON at position 900"');
  });

  it('still names the line when the engine puts its position after the JSON', () => {
    // Not every position clause reads `in JSON at position`: a file with
    // something after the design gets `after JSON at position`. Anchoring the
    // clause must not cost this file the line it already had, and the
    // preposition belongs to the clause rather than to what is left behind.
    // Act
    const message = describeSyntaxFault(V8_AFTER_THE_JSON, JSON_THEN_JUNK);

    // Assert
    expect(message).toBe(
      'That file is not valid JSON. Line 2, column 1: Unexpected non-whitespace character.',
    );
  });

  it('says the file is empty rather than quoting an end-of-input message', () => {
    // `JSON.parse('')` names no position on V8 either, and "unexpected end of
    // input" is a poor way to tell someone their file has nothing in it.
    // Act
    const fromV8 = describeSyntaxFault('Unexpected end of JSON input', '');
    const fromJavaScriptCore = describeSyntaxFault(
      'JSON Parse error: Unexpected EOF',
      '',
    );

    // Assert
    expect(fromV8).toBe(
      'That file is empty. A design file holds one JSON object: a title, a list of nodes and a list of edges.',
    );
    expect(fromJavaScriptCore).toBe(fromV8);
  });

  it('treats a file of nothing but whitespace as an empty one', () => {
    // Act
    const message = describeSyntaxFault('Unexpected end of JSON input', '  \n\t ');

    // Assert
    expect(message).toContain('That file is empty.');
  });

  it('says a binary file is binary rather than echoing its bytes back', () => {
    // A file named `.json` and full of PNG reaches the parser, and V8 puts the
    // first bytes of it straight into its own message. The file's own text says
    // what it is far better than that message does.
    // Act
    const message = describeSyntaxFault(
      V8_ON_BYTES,
      '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR',
    );

    // Assert
    expect(message).toBe(
      'That file is not text at all: it holds bytes no JSON file can. ' +
        'It is probably an image or another binary file with a .json name.',
    );
    expect(message).not.toContain('IHDR');
  });

  it('strips control characters out of anything it echoes', () => {
    // Act
    const message = describeSyntaxFault(
      `JSON Parse error: unexpected ${BELL}bell${NUL}`,
      '{ "title": 1 ',
    );

    // Assert
    expect(holdsControlCharacters(message)).toBe(false);
    expect(message).toContain('bell');
  });

  it('bounds what it echoes from the engine, however long the engine is', () => {
    // Arrange
    const shouting = `JSON Parse error: ${'x'.repeat(4000)}`;

    // Act
    const message = describeSyntaxFault(shouting, '{ "title": 1 ');

    // Assert
    expect(message.length).toBeLessThan(400);
    expect(message).toContain('…');
  });

  it('clamps a position that runs past the end of the file', () => {
    // Nothing should throw because an engine counted in bytes and we count in
    // characters; the last line is the honest answer.
    // Act
    const message = describeSyntaxFault(
      'Unexpected end of input in JSON at position 9999',
      '{\n  "title": "T"\n',
    );

    // Assert
    expect(message).toContain('Line 3, column 1');
  });
});

describe('describeLoadError, for a file that is not JSON', () => {
  it('reports the one syntax fault, with the engine message it was given', () => {
    // Arrange
    const error = new DesignSyntaxError(new SyntaxError(JAVASCRIPTCORE));

    // Act
    const report = describeLoadError({
      error,
      fileName: 'design.json',
      fileText: TRAILING_COMMA,
    });

    // Assert
    expect(report.summary).toBe('design.json was not drawn:');
    expect(report.problems).toEqual([
      describeSyntaxFault(JAVASCRIPTCORE, TRAILING_COMMA),
    ]);
    expect(report.hiddenProblemCount).toBe(0);
  });

  it('reports an empty file as empty, whichever engine read it', () => {
    // This one can be provoked rather than staged: no engine gives a position
    // for an empty file.
    // Act
    const problems = problemsFor('');

    // Assert
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('That file is empty.');
  });
});

describe('describeLoadError, for JSON that is not a design', () => {
  it('names a field the file left out, and what belongs there', () => {
    // Arrange
    const text = fileTextOf({ title: 'Order intake' });

    // Act
    const problems = problemsFor(text);

    // Assert
    expect(problems).toContain('nodes is missing. It has to be a list.');
    expect(problems).toContain('edges is missing. It has to be a list.');
  });

  it('names the node and the field when a node has no label', () => {
    // Arrange
    const text = fileTextOf({
      title: 'Order intake',
      nodes: [{ id: 'api', type: 'service' }],
      edges: [],
    });

    // Act, Assert
    expect(problemsFor(text)).toEqual(['nodes[0].label is missing. It has to be text.']);
  });

  it('says what the file gave instead, when a field is the wrong type', () => {
    // Arrange
    const text = fileTextOf({
      title: 'Order intake',
      nodes: [{ id: 'api', label: 42, type: 'service' }],
      edges: [],
    });

    // Act, Assert
    expect(problemsFor(text)).toEqual([
      'nodes[0].label has to be text, but it is a number.',
    ]);
  });

  it('tells an empty field apart from a blank one', () => {
    // Arrange
    const empty = fileTextOf({ ...twoNodesOneEdge, title: '' });
    const blank = fileTextOf({ ...twoNodesOneEdge, title: '   ' });

    // Act, Assert
    expect(problemsFor(empty)).toEqual(['title is empty. It has to say something.']);
    expect(problemsFor(blank)).toEqual([
      'title holds only whitespace. It has to say something.',
    ]);
  });

  it('names the end of the edge that points at a node nobody defined', () => {
    // Arrange
    const text = fileTextOf({
      ...twoNodesOneEdge,
      edges: [{ from: 'api', to: 'ghost', label: 'publishes order' }],
    });

    // Act, Assert
    expect(problemsFor(text)).toEqual([
      'edges[0].to: This edge\'s "to" is "ghost", which no node defines.',
    ]);
  });

  it('names the second of two nodes that share an id', () => {
    // Arrange
    const text = fileTextOf({
      ...twoNodesOneEdge,
      nodes: [
        { id: 'api', label: 'Public API', type: 'service' },
        { id: 'api', label: 'Internal API', type: 'service' },
      ],
      edges: [],
    });

    // Act, Assert
    expect(problemsFor(text)).toEqual([
      'nodes[1].id: Two nodes share the id "api". Every node id has to be unique.',
    ]);
  });

  it('says what a design is, when the file is JSON but not an object', () => {
    // Act
    const problems = problemsFor('[1, 2, 3]');

    // Assert
    expect(problems).toEqual([
      'The file has to be a JSON object with a title, a list of nodes and a list of edges, but it is a list.',
    ]);
  });

  it('counts the problems in its summary without claiming to be exhaustive', () => {
    // Zod checks the rules that span fields only once every field has passed
    // (D20), so a file can be handed a fourth problem after fixing three. The
    // panel describes this pass and never promises the whole list.
    // Arrange
    const text = fileTextOf({ title: 'Order intake' });

    // Act
    const report = reportFor(text, 'order-intake.json');

    // Assert
    expect(report.summary).toBe(
      'order-intake.json was not drawn. This pass found 2 problems in it:',
    );
  });

  it('counts one problem in the singular', () => {
    // Arrange
    const text = fileTextOf({ ...twoNodesOneEdge, title: 42 });

    // Act
    const report = reportFor(text, 'order-intake.json');

    // Assert
    expect(report.summary).toBe(
      'order-intake.json was not drawn. This pass found 1 problem in it:',
    );
  });

  it('caps the list and counts what it left out', () => {
    // A systematic mistake in a large file produces one issue per node, and a
    // thousand list items help nobody.
    // Arrange
    const brokenNodeCount = MAX_PROBLEMS_SHOWN + 5;
    const text = fileTextOf({
      title: 'Order intake',
      nodes: Array.from({ length: brokenNodeCount }, (_unused, index) => ({
        id: `n${index}`,
        label: `Node ${index}`,
      })),
      edges: [],
    });

    // Act
    const report = reportFor(text);

    // Assert
    expect(report.problems).toHaveLength(MAX_PROBLEMS_SHOWN);
    expect(report.hiddenProblemCount).toBe(5);
    expect(report.summary).toContain(`${brokenNodeCount} problems`);
  });

  it('bounds a message that quotes the file’s own text', () => {
    // The id of a duplicated node is quoted back, and an id can be as long as
    // the file's author felt like making it.
    // Arrange
    const longId = 'a'.repeat(3000);
    const text = fileTextOf({
      title: 'Order intake',
      nodes: [
        { id: longId, label: 'One', type: 'service' },
        { id: longId, label: 'Two', type: 'service' },
      ],
      edges: [],
    });

    // Act
    const problems = problemsFor(text);

    // Assert
    expect(problems).toHaveLength(1);
    expect(problems[0]?.length).toBeLessThan(300);
  });

  it('strips control characters out of a message that quotes the file', () => {
    // Arrange
    const text = fileTextOf({
      ...twoNodesOneEdge,
      edges: [{ from: 'api', to: `gh${BELL}os${NUL}t`, label: 'publishes order' }],
    });

    // Act
    const problems = problemsFor(text);

    // Assert
    expect(holdsControlCharacters(problems.join(' '))).toBe(false);
  });
});

describe('describeLoadError, for a design that could not be laid out', () => {
  /** What dagre says when its own layout fails; a user has never heard of it. */
  const DAGRE_MESSAGE = 'Not possible to find intersection inside of the rectangle';

  it('says it in the app’s own words rather than the graph library’s', () => {
    // No design is known to reach this any more (D98), which is exactly why it
    // is tested here rather than provoked: a floor nobody can stand on is still
    // a floor, and this is the wording under it.
    // Act
    const report = describeLoadError({
      error: new DesignLayoutError(new Error(DAGRE_MESSAGE)),
      fileName: 'settlement-mesh.json',
      fileText: '{ "title": "Settlement mesh", "nodes": [], "edges": [] }',
    });

    // Assert
    expect(report.summary).toBe('settlement-mesh.json was not drawn:');
    expect(report.problems).toEqual([
      'That file is a valid design, but this app could not work out where to put the boxes. ' +
        'Nothing is wrong with the file itself. Try splitting it into smaller designs, ' +
        'or removing an edge that repeats one already running between the same two boxes.',
    ]);
  });

  it('never repeats the graph library’s own words back to the user', () => {
    // D43's rule, and the reason this branch exists at all: before it, this
    // error fell through to the last branch and the panel printed dagre's
    // sentence about a rectangle, attached to a file that was correct.
    // Act
    const report = describeLoadError({
      error: new DesignLayoutError(new Error(DAGRE_MESSAGE)),
      fileName: 'settlement-mesh.json',
      fileText: '{}',
    });

    // Assert
    expect(report.problems[0]).not.toContain('intersection');
    expect(report.problems[0]).not.toContain('rectangle');
    expect(report.problems[0]).not.toContain('Something went wrong');
  });
});

describe('describeLoadError, for anything else', () => {
  it('still says something rather than failing silently', () => {
    // Act
    const report = describeLoadError({
      error: new TypeError('reader is not a function'),
      fileName: 'design.json',
      fileText: '{}',
    });

    // Assert
    expect(report.summary).toBe('design.json was not drawn:');
    expect(report.problems).toEqual([
      'Something went wrong while reading that file: reader is not a function.',
    ]);
  });

  it('describes a thrown value that is not an error at all', () => {
    // Act
    const report = describeLoadError({
      error: 'boom',
      fileName: 'design.json',
      fileText: '{}',
    });

    // Assert
    expect(report.problems).toHaveLength(1);
    expect(report.problems[0]).toContain('Something went wrong');
  });
});

describe('describeUnsupportedFile', () => {
  it('says the file is not JSON and what to choose instead', () => {
    // Act
    const report = describeUnsupportedFile('logo.png');

    // Assert
    expect(report.summary).toBe('logo.png was not drawn:');
    expect(report.problems).toEqual([
      'That file is not JSON. Choose a file whose name ends in .json, or rename it if you know it holds JSON.',
    ]);
    expect(report.hiddenProblemCount).toBe(0);
  });

  it('bounds and cleans the file name, which is the user’s own text', () => {
    // Act
    const report = describeUnsupportedFile(`${'n'.repeat(3000)}${NUL}.png`);

    // Assert
    expect(report.summary.length).toBeLessThan(200);
    expect(holdsControlCharacters(report.summary)).toBe(false);
  });
});

describe('describeHiddenProblems', () => {
  it('says how many more this pass found than the panel is showing', () => {
    // Act, Assert
    expect(describeHiddenProblems(5)).toBe(
      '5 more problems are not listed. Fix these and load the file again to see the rest.',
    );
  });

  it('counts one left out in the singular', () => {
    // Act, Assert
    expect(describeHiddenProblems(1)).toBe(
      '1 more problem is not listed. Fix these and load the file again to see the rest.',
    );
  });

  it('says nothing at all when the list is the whole of this pass', () => {
    // Act, Assert
    expect(describeHiddenProblems(0)).toBe('');
  });
});
