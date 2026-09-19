/**
 * The boundary of the app: the one place where text a person chose off their
 * own disk becomes a `Design` the rest of the code is allowed to trust.
 *
 * Nothing downstream re-checks what comes out of here, so nothing may leave
 * here half-validated. A file that is not a design does not return a partial
 * one; it throws a `DesignLoadError`, and the error carries every piece of
 * evidence `describeLoadError` needs to point at the fault — `JSON.parse`'s
 * own message and error, or the field paths Zod reported. Neither is flattened
 * into a sentence on the way out, because a sentence cannot be pointed at a
 * line.
 */

import type { z } from 'zod';

import { designSchema } from './design.schema';
import type { Design } from './design.types';

/** Which of the two ways a file can fail happened. */
export type DesignLoadErrorCode = 'invalid-json' | 'invalid-design';

/**
 * A file that could not become a design. Callers that only need to say
 * "that did not work" can catch this; Task 04 switches on `code` and reads the
 * detail off the subclass.
 */
export class DesignLoadError extends Error {
  readonly code: DesignLoadErrorCode;

  constructor(message: string, code: DesignLoadErrorCode, cause: unknown) {
    super(message, { cause });
    // Without this, `instanceof` fails whenever the class is transpiled down to
    // ES5, which is exactly where a caught error is hardest to debug.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.code = code;
  }
}

/**
 * The file is not JSON at all.
 *
 * The message is the one `JSON.parse` produced, kept word for word, and the
 * original error is kept as `cause`. What that message contains is the engine's
 * business, not this app's, and it is not the same everywhere. Three shapes are
 * known, and they agree on nothing:
 *
 * - **V8** — Chrome and Edge, and the Node that Vitest runs on — names a
 *   character position, and for some faults a line and column beside it. For a
 *   file that ends early it names none of them.
 * - **SpiderMonkey** — Firefox — names a line and a column and never a
 *   position. Measured on Firefox 156.0 in the cycle that recorded D99.
 * - **JavaScriptCore** — Safari — names none of the three (D32).
 *
 * So what this class promises is the message and the cause, and not a position:
 * a caller that wants one has to read it out of the message itself, knowing
 * that on some engines there is nothing there to read.
 *
 * Which is what `describeSyntaxFault` in `describeLoadError.ts` does, and where
 * the reading is tested — one engine's phrasing at a time, as a string, so that
 * Safari's and Firefox's cases are tests that run on Node. This class's own job
 * is only to hand over whatever there was without flattening or inventing it.
 */
export class DesignSyntaxError extends DesignLoadError {
  constructor(cause: SyntaxError) {
    super(cause.message, 'invalid-json', cause);
  }
}

/**
 * The file is JSON, but it is not a design. `issues` is Zod's list, untouched:
 * every fault in the file, each with the `path` of the field at fault. The
 * loader does not choose which one matters — that is a presentation decision,
 * and it belongs to Task 04.
 */
export class DesignSchemaError extends DesignLoadError {
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(cause: z.ZodError) {
    super('That JSON file is not a design.', 'invalid-design', cause);
    this.issues = cause.issues;
  }
}

/**
 * Turns the text of an uploaded file into a design.
 *
 * Pure: it reads a string and builds new objects, so the caller keeps nothing
 * shared with the result and the result can be handed to the layout and the
 * exporters as it is.
 *
 * @param text - the contents of the file the user chose, read in the browser
 * @returns the design's title with every node and edge, in file order
 * @throws {DesignSyntaxError} if the text is not JSON
 * @throws {DesignSchemaError} if the JSON is not a design
 *
 * @example
 * ```typescript
 * const design = loadDesign(await file.text());
 * design.nodes.length; // 2
 * ```
 */
export function loadDesign(text: string): Design {
  const result = designSchema.safeParse(parseJson(text));

  if (!result.success) {
    throw new DesignSchemaError(result.error);
  }

  return result.data;
}

/** `JSON.parse`, with its failure translated and its own message kept. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new DesignSyntaxError(
      error instanceof SyntaxError ? error : new SyntaxError(String(error)),
    );
  }
}
