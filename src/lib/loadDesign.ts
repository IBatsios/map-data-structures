/**
 * The boundary of the app: the one place where text a person chose off their
 * own disk becomes a `Design` the rest of the code is allowed to trust.
 *
 * Nothing downstream re-checks what comes out of here, so nothing may leave
 * here half-validated. A file that is not a design does not return a partial
 * one; it throws a `DesignLoadError`, and the error carries whatever evidence
 * Task 04 has to work with — `JSON.parse`'s own message and error, or the field
 * paths Zod reported. Neither is flattened into a sentence on the way out,
 * because a sentence cannot be pointed at a line.
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
 * original error is kept as `cause`. What that message contains is the
 * engine's business, not this app's, and it is not the same everywhere: V8
 * names a position and often a line and column, while JavaScriptCore — Safari,
 * a browser this desktop app plainly targets — names none of the three. So
 * what this class promises is the message and the cause, not a position.
 *
 * Task 04 has to say where the fault is, and on some engines there will be
 * nothing here to say it from. That is Task 04's second acceptance criterion
 * and its design work; this class's job is to hand over whatever there was
 * without flattening or inventing it.
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
