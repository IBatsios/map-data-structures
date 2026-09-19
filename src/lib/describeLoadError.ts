/**
 * What the page says when a file does not become a drawing.
 *
 * `loadDesign` throws structured errors and flattens nothing (D22): a syntax
 * error carries the engine's own message, a schema error carries Zod's issues
 * with the path of every field at fault. A design that loads and then cannot be
 * placed throws a `DesignLayoutError` instead, which carries no evidence for a
 * user at all, because there is nothing in the file to point at. This module is
 * where all three become sentences a person can act on, and it is pure — text
 * in, text out — so every message in the app is covered by `bun run test`
 * rather than by reading the page and hoping.
 *
 * Four rules hold it together:
 *
 * 1. **Never print a line number inferred from nothing.** `JSON.parse`'s
 *    message names a position on V8 for some faults, and never on
 *    JavaScriptCore or for a file that ends early (D32). Where there is a
 *    position, the line and the column are counted here from the file's own
 *    text rather than read out of the engine's phrasing, which buys one wording
 *    across every engine that gives one. Where there is none, the message says
 *    so. A wrong pointer into a file the user wrote themselves costs them more
 *    than no pointer at all. The position itself is read only from the engine's
 *    own clause and never from the quotation of the file beside it — see
 *    `ENGINE_POSITION_CLAUSE`, which is where this rule is actually enforced.
 * 2. **The engine is an argument, not an ambient fact.** `describeSyntaxFault`
 *    takes the message text and the file text, so a Safari-shaped message is a
 *    one-line test on Node.
 * 3. **Nothing untrusted is echoed unbounded.** Engine messages quote the first
 *    bytes of the file, and a schema message quotes ids the file's author wrote.
 *    Both go through `boundedText`, which strips control and format characters,
 *    collapses whitespace and cuts to a length. Everything here returns plain
 *    strings for `textContent`; **no caller may put them in `innerHTML`**,
 *    which is the one line between a panel that prints a file and a panel that
 *    runs one.
 * 4. **The list describes this pass and never claims to be exhaustive.** Zod
 *    reaches the rules that span fields only once every field has passed (D20),
 *    so a file can be handed a fourth problem after three are fixed. The
 *    summary says what this pass found, and a long list is capped with a count
 *    of what it left out.
 */

import type { z } from 'zod';

import { DesignLayoutError } from './layout';
import { DesignSchemaError, DesignSyntaxError } from './loadDesign';

/** What the panel shows: one heading, a bounded list, and what it left out. */
export interface LoadErrorReport {
  /** One sentence naming the file and the outcome; it heads the list. */
  readonly summary: string;
  /** One message per problem, in the order the file's own faults appear. */
  readonly problems: readonly string[];
  /** How many more problems this pass found than the list shows. */
  readonly hiddenProblemCount: number;
}

/** A file that did not load, with everything needed to say why. */
export interface LoadFailure {
  /** Whatever was thrown: usually a `DesignLoadError`, never assumed to be. */
  readonly error: unknown;
  /** The name of the file the user chose, used as given. */
  readonly fileName: string;
  /** The text that was read from it, which is what a position points into. */
  readonly fileText: string;
}

/**
 * How many problems the panel lists at once. A 120-node file with one
 * systematic mistake produces one issue per node, and a thousand list items
 * help nobody; the rest are counted instead.
 */
export const MAX_PROBLEMS_SHOWN = 10;

/** How much of any text the app did not write may reach the screen. */
const MAX_ECHOED_CHARACTERS = 120;

const EMPTY_FILE_MESSAGE =
  'That file is empty. A design file holds one JSON object: a title, a list of nodes and a list of edges.';

const BINARY_FILE_MESSAGE =
  'That file is not text at all: it holds bytes no JSON file can. ' +
  'It is probably an image or another binary file with a .json name.';

const NOT_A_DESIGN_MESSAGE =
  'The file has to be a JSON object with a title, a list of nodes and a list of edges';

/**
 * The one failure here that is the app's own and not the file's.
 *
 * A design only reaches the layout once `loadDesign` has passed it, so there is
 * nothing in the file to point at and nothing for the user to correct. Saying
 * so first is the honest part; the two suggestions are the actionable part, and
 * they are the two shapes D98 found the graph library struggling with. What
 * this deliberately does not do is quote the library — a sentence about an
 * intersection inside a rectangle is about a graph internal the user has never
 * heard of, attached to a file that is correct.
 */
const LAYOUT_FAILED_MESSAGE =
  'That file is a valid design, but this app could not work out where to put the boxes. ' +
  'Nothing is wrong with the file itself. Try splitting it into smaller designs, ' +
  'or removing an edge that repeats one already running between the same two boxes.';

/**
 * Turns a failed load into what the panel shows.
 *
 * @param failure - the error, the file's name, and the text that was read
 * @returns a heading, the messages to list, and the count of any left out
 *
 * @example
 * ```typescript
 * describeLoadError({ error, fileName: 'design.json', fileText });
 * // { summary: 'design.json was not drawn:', problems: ['That file is empty. …'], … }
 * ```
 */
export function describeLoadError(failure: LoadFailure): LoadErrorReport {
  const { error, fileName, fileText } = failure;

  if (error instanceof DesignSyntaxError) {
    return oneProblem(fileName, describeSyntaxFault(error.message, fileText));
  }

  if (error instanceof DesignSchemaError) {
    return describeSchemaFaults(error.issues, fileName, fileText);
  }

  if (error instanceof DesignLayoutError) {
    return oneProblem(fileName, LAYOUT_FAILED_MESSAGE);
  }

  // Not a failure this app knows about, which is exactly when saying nothing
  // would be worst. Whatever it is, it gets said.
  return oneProblem(
    fileName,
    `Something went wrong while reading that file: ${sentence(boundedText(messageOf(error)))}`,
  );
}

/**
 * What to say about a file that is not JSON.
 *
 * Exported so the engine can be an argument: `JSON.parse`'s message is not the
 * same on every browser, and Vitest only ever sees the one it runs on.
 *
 * @param engineMessage - what `JSON.parse` said, word for word
 * @param fileText - the text it was given, which is what a position points into
 * @returns one message, safe to set as `textContent`
 */
export function describeSyntaxFault(engineMessage: string, fileText: string): string {
  // Both of these the file itself answers better than any engine message does,
  // and neither needs a position to be honest about.
  if (!/\S/u.test(fileText)) {
    return EMPTY_FILE_MESSAGE;
  }

  if (holdsRawBytes(fileText)) {
    return BINARY_FILE_MESSAGE;
  }

  const detail = engineDetail(engineMessage);
  const position = positionIn(engineMessage);

  return position === undefined
    ? withoutPosition(detail)
    : atPosition(lineColumnOf(fileText, position), detail);
}

/**
 * What to say about the problems the panel is not showing.
 *
 * The wording lives here rather than in the renderer because it is wording, and
 * wording is what this module is tested on. It promises the *rest*, not the
 * whole: a later pass can still find something this one could not reach (D20).
 *
 * @param hiddenProblemCount - `hiddenProblemCount` from the report
 * @returns one sentence, or an empty string when nothing was left out
 */
export function describeHiddenProblems(hiddenProblemCount: number): string {
  if (hiddenProblemCount <= 0) {
    return '';
  }

  const are = hiddenProblemCount === 1 ? 'problem is' : 'problems are';

  return `${hiddenProblemCount} more ${are} not listed. Fix these and load the file again to see the rest.`;
}

/** What to say about a file the app declined to read at all. */
export function describeUnsupportedFile(fileName: string): LoadErrorReport {
  return oneProblem(
    fileName,
    'That file is not JSON. Choose a file whose name ends in .json, or rename it if you know it holds JSON.',
  );
}

/** A report of exactly one problem, which is every failure but a schema one. */
function oneProblem(fileName: string, problem: string): LoadErrorReport {
  return {
    summary: `${boundedText(fileName)} was not drawn:`,
    problems: [problem],
    hiddenProblemCount: 0,
  };
}

/** The engine gave a position, so the line and the column are ours to count. */
function atPosition(place: LineAndColumn, detail: string): string {
  const where = `Line ${place.line}, column ${place.column}`;

  return detail === ''
    ? `That file is not valid JSON. The problem is at line ${place.line}, column ${place.column}.`
    : `That file is not valid JSON. ${where}: ${detail}`;
}

/** The engine gave no position, so the message says so rather than guessing. */
function withoutPosition(detail: string): string {
  return [
    'That file is not valid JSON, and this browser did not say where in it.',
    detail === '' ? '' : `It reported: ${detail}`,
    'Check the file for a missing comma, bracket or quote.',
  ]
    .filter((part) => part !== '')
    .join(' ');
}

/** One message per Zod issue, capped, under a summary that counts them all. */
function describeSchemaFaults(
  issues: readonly z.core.$ZodIssue[],
  fileName: string,
  fileText: string,
): LoadErrorReport {
  const file = parseQuietly(fileText);
  const problems = issues.map((issue) => describeIssue(issue, file));
  const shown = problems.slice(0, MAX_PROBLEMS_SHOWN);

  return {
    summary: `${boundedText(fileName)} was not drawn. This pass found ${countOf(problems.length, 'problem')} in it:`,
    problems: shown,
    hiddenProblemCount: problems.length - shown.length,
  };
}

/**
 * One issue, as a sentence that starts with the field at fault.
 *
 * The file is re-read to see what is actually at the issue's path, because
 * "that field is missing" and "that field is a number" are different things to
 * be told and Zod's issue keeps neither the value nor whether there was one.
 * Only the *shape* of the value is ever reported, never the value itself.
 */
function describeIssue(issue: z.core.$ZodIssue, file: ParsedFile): string {
  const label = pathLabel(issue.path);

  if (!file.parsed) {
    return `${label}: ${sentence(boundedText(issue.message))}`;
  }

  const value = valueAt(file.value, issue.path);

  if (issue.code === 'invalid_type') {
    return describeTypeFault(label, wordForType(issue.expected), value);
  }

  if (typeof value === 'string' && !/\S/u.test(value)) {
    return value === ''
      ? `${label} is empty. It has to say something.`
      : `${label} holds only whitespace. It has to say something.`;
  }

  // Everything else — including both of the schema's cross-field rules, which
  // already word themselves around the file's own ids.
  return `${label}: ${sentence(boundedText(issue.message))}`;
}

/** A field that is missing, or there and the wrong kind of thing. */
function describeTypeFault(label: string, expected: string, value: unknown): string {
  if (value === undefined) {
    return `${label} is missing. It has to be ${expected}.`;
  }

  return label === 'The file'
    ? `${NOT_A_DESIGN_MESSAGE}, but it is ${wordForValue(value)}.`
    : `${label} has to be ${expected}, but it is ${wordForValue(value)}.`;
}

/** `nodes[0].label`, the way the file's author would search for it. */
function pathLabel(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return 'The file';
  }

  return path.reduce<string>((label, segment) => {
    if (typeof segment === 'number') {
      return `${label}[${segment}]`;
    }

    return label === '' ? String(segment) : `${label}.${String(segment)}`;
  }, '');
}

/** What the file actually holds at an issue's path, if anything. */
function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let found = root;

  for (const segment of path) {
    if (found === null || typeof found !== 'object') {
      return undefined;
    }

    found = (found as Record<PropertyKey, unknown>)[segment];
  }

  return found;
}

/** The file, parsed again, or the fact that it could not be. */
interface ParsedFile {
  readonly parsed: boolean;
  readonly value: unknown;
}

/**
 * Re-reads the file to look up the values the issues point at.
 *
 * It parsed once already to get this far, so this all but cannot fail; if it
 * does, `parsed` is false and every message falls back to Zod's own wording
 * rather than claiming a field is missing on no evidence.
 */
function parseQuietly(fileText: string): ParsedFile {
  try {
    return { parsed: true, value: JSON.parse(fileText) };
  } catch {
    return { parsed: false, value: undefined };
  }
}

/** Where a character index falls in a file, counted from one. */
interface LineAndColumn {
  readonly line: number;
  readonly column: number;
}

/** The line and column of a position, counted here rather than scraped. */
function lineColumnOf(fileText: string, position: number): LineAndColumn {
  const index = Math.min(Math.max(position, 0), fileText.length);
  const lines = fileText.slice(0, index).split('\n');

  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/**
 * The engine's own position clause: the only thing a line may be read from.
 *
 * It is anchored to the end of the message, and that anchor is the whole of the
 * rule. A `JSON.parse` message holds at most two things this app cares about —
 * the engine's clause, and a quotation of the file that failed — and the second
 * is the user's own bytes coming back. V8's *no-position* form is
 * `Unexpected token 'p', "position 9"... is not valid JSON`, so a search for
 * `position 123` anywhere in the message finds whatever the file happened to
 * say and prints a line the engine never named. Every engine that gives a
 * position ends its message with it, and every quotation ends
 * `is not valid JSON`, so a message can never end in a clause it is merely
 * quoting.
 *
 * Both prepositions are here because V8 says `in JSON` for a fault inside the
 * design and `after JSON` for anything following it. The preposition belongs to
 * the clause rather than to the sentence left behind once the clause is gone.
 */
const ENGINE_POSITION_CLAUSE =
  /\s*\b(?:in|after) JSON at position (\d+)(?:\s*\(line \d+ column \d+\))?\s*$/u;

/** The position an engine named, if it named one at all. */
function positionIn(engineMessage: string): number | undefined {
  const found = ENGINE_POSITION_CLAUSE.exec(engineMessage);

  return found === null ? undefined : Number(found[1]);
}

/**
 * The engine's own description, bounded and cleaned, without its position.
 *
 * The position clause is dropped because this app has already said the line and
 * the column in its own words; if the phrasing is one this does not recognise,
 * nothing is dropped and the whole message is shown. It is the same pattern
 * `positionIn` reads, so the two can never disagree about whether a message
 * carried a clause — a sentence that named a column and then ended
 * `… is not valid JSON` was how the round 1 defect announced itself.
 */
function engineDetail(engineMessage: string): string {
  const described = engineMessage.replace(ENGINE_POSITION_CLAUSE, '');
  const bounded = boundedText(described);

  return bounded === '' ? '' : sentence(bounded);
}

/**
 * Whether the file holds bytes that no text file has.
 *
 * A file named `.json` and full of PNG reaches the parser, and V8 answers with
 * the first bytes of it inside its own message. The file's own text says what
 * it is far better than that message does, and saying it here means those bytes
 * are never echoed at all.
 */
function holdsRawBytes(fileText: string): boolean {
  return [...fileText].some(isForbiddenControlCharacter);
}

/** The highest code point that is a C0 control character. */
const LAST_CONTROL_CODE = 0x1f;

/** Tab, line feed and carriage return: the three a text file may hold. */
const ALLOWED_CONTROL_CODES: ReadonlySet<number> = new Set([0x09, 0x0a, 0x0d]);

/**
 * Whether one character is a control character a text file has no business
 * holding. Written as code points rather than as a range in a regular
 * expression, because a range of control characters in a source file is a row
 * of invisible bytes nobody can review.
 */
function isForbiddenControlCharacter(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;

  return code <= LAST_CONTROL_CODE && !ALLOWED_CONTROL_CODES.has(code);
}

/**
 * Text the app did not write, made safe to show: no control or format
 * characters, no runs of whitespace, and never longer than a line or two.
 *
 * Cutting is by code point, so a bounded string never ends in half a character.
 * D26 and D35 say the drawing wraps rather than truncates, and this is the one
 * place that rule is deliberately reversed: a label is the user's own text and
 * all of it matters, while an engine quoting a megabyte of a file is not.
 */
function boundedText(text: string): string {
  const cleaned = text
    .replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Co}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  const characters = [...cleaned];

  if (characters.length <= MAX_ECHOED_CHARACTERS) {
    return cleaned;
  }

  return `${characters.slice(0, MAX_ECHOED_CHARACTERS).join('').trimEnd()}…`;
}

/** Ends a fragment the way a sentence ends, without doubling the full stop. */
function sentence(text: string): string {
  return /[.!?…]$/u.test(text) ? text : `${text}.`;
}

/** What Zod expected, in the words the schema page will use. */
function wordForType(expected: string): string {
  const words: Record<string, string> = {
    string: 'text',
    array: 'a list',
    object: 'an object',
    number: 'a number',
    boolean: 'true or false',
  };

  return words[expected] ?? expected;
}

/** What the file gave instead — its shape only, never its contents. */
function wordForValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'a list';
  }

  const words: Record<string, string> = {
    string: 'text',
    number: 'a number',
    boolean: 'true or false',
    object: 'an object',
  };

  return words[typeof value] ?? 'something else';
}

/** `1 problem`, `2 problems` — English's only plural rule this app needs. */
function countOf(total: number, noun: string): string {
  return total === 1 ? `1 ${noun}` : `${total} ${noun}s`;
}

/** Whatever was thrown, as text, whether or not it was an `Error`. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
