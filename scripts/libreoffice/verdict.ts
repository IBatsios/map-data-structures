/**
 * What one LibreOffice run meant, decided from three facts and nothing else.
 *
 * The facts are: did the run time out, what exit code did it leave, and is
 * there a file where the output was asked for. That is the whole input, and it
 * is why this module is pure — the conversion needs an office suite installed
 * and CI has none, but the rules for reading one can be unit-tested anywhere.
 * It is the same split `docxPlan.ts` makes against `toDocx.ts` and `pdfPlan.ts`
 * against `toPdf.ts` (D55, D63, D74): the decisions here, the environment next
 * door in `convert.ts`.
 *
 * **stderr is diagnostic text and never the verdict.** A successful conversion
 * on this machine writes `Could not find platform independent libraries
 * <prefix>` to stderr every time — a Python-embedding warning that has nothing
 * to do with the document. A check that read stderr as failure would call every
 * good run bad, which is the most likely way this whole thing ships broken. So
 * stderr comes in, and goes straight to `diagnostics` where a human can read
 * it; no branch below looks at it.
 *
 * **Exit 0 is not enough on its own.** LibreOffice answers a file it cannot
 * parse — D76's `Error: source file could not be loaded` — with a message and
 * an exit code of 0. The file it did not write is the only honest signal, so
 * the presence of the output is one of the three facts rather than something
 * the caller checks afterwards.
 */

/** What one conversion attempt looked like from outside the process. */
export interface ConversionAttempt {
  /** Exactly what was run, so a bad verdict can be repeated by hand. */
  readonly command: string;
  /** What the process exited with, or `null` if it was killed instead. */
  readonly exitCode: number | null;
  /** Everything it said on stderr, which is never why it passed or failed. */
  readonly stderr: string;
  /** Whether a file arrived where `--outdir` was told to put one. */
  readonly outputWritten: boolean;
  /** Whether the clock ran out before the process answered. */
  readonly timedOut: boolean;
  /** How long it was given, in milliseconds. */
  readonly timeoutMs: number;
}

/** How a conversion ended: one of three, never a boolean. */
export type ConversionKind = 'converted' | 'failed' | 'timedOut';

/** What the run meant, and what to tell whoever is reading the output. */
export interface ConversionVerdict {
  readonly kind: ConversionKind;
  /** One sentence for a human, naming the command when it is bad news. */
  readonly reason: string;
  /** Whatever the process said, carried for a reader and never for the verdict. */
  readonly diagnostics: string;
}

/**
 * Reads one conversion attempt and says what it was.
 *
 * A timeout is its own answer rather than a kind of failure, because the two
 * want different things done about them: a failure is a document that will not
 * convert, and a timeout is usually an invocation that is missing its own
 * profile directory and would hang forever.
 *
 * @param attempt - the three facts, plus the command and whatever it said
 * @returns the verdict, a sentence explaining it, and the run's own output
 *
 * @example
 * ```typescript
 * judgeConversion({ ...attempt, exitCode: 0, outputWritten: true }).kind;
 * // 'converted'
 * ```
 */
export function judgeConversion(attempt: ConversionAttempt): ConversionVerdict {
  const diagnostics = attempt.stderr.trim();

  if (attempt.timedOut) {
    return {
      kind: 'timedOut',
      reason: `LibreOffice did not answer within ${seconds(attempt.timeoutMs)}. The command was: ${attempt.command}`,
      diagnostics,
    };
  }

  if (attempt.exitCode !== 0) {
    return {
      kind: 'failed',
      reason: `LibreOffice ${exitPhrase(attempt.exitCode)}. The command was: ${attempt.command}`,
      diagnostics,
    };
  }

  if (!attempt.outputWritten) {
    return {
      kind: 'failed',
      reason: `LibreOffice exited cleanly but wrote no file, which is how it answers a document it cannot read. The command was: ${attempt.command}`,
      diagnostics,
    };
  }

  return { kind: 'converted', reason: 'LibreOffice converted the file.', diagnostics };
}

/** How a run ended when it did not end well, in words rather than in `null`. */
function exitPhrase(exitCode: number | null): string {
  return exitCode === null
    ? 'was killed before it finished'
    : `exited with code ${exitCode}`;
}

/** A duration a person can read, from the milliseconds a timer is set in. */
function seconds(milliseconds: number): string {
  return `${Math.round(milliseconds / 1000)}s`;
}
