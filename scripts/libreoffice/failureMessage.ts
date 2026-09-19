/**
 * What a fixture that did not survive the round trip tells whoever reads it.
 *
 * This is the one part of the check anybody actually reads. A green run says
 * `5 passed` and is forgotten; this message is read exactly once, by someone
 * who does not yet know what is wrong, and whatever it leaves out is an
 * afternoon of rediscovery. The whole point of the cycle was to turn that
 * afternoon into one command, so the message is a deliverable rather than a
 * formatting detail — and it is pure, and lives here rather than in
 * `docxRoundTrip.spec.ts`, so `failureMessage.test.ts` can pin it on a machine
 * with no LibreOffice.
 *
 * **Both streams, always.** LibreOffice explains a refusal on **stderr**, and
 * says nothing at all on stdout while it does it. Measured against a malformed
 * `.docx`: stdout came back `""` and stderr carried `Error: source file could
 * not be loaded` — the exact refusal D76 exists to prevent, and the reason
 * `control-labels` is a fixture at all. A message built from stdout alone
 * reports that failure as "LibreOffice printed nothing" while the diagnosis
 * sits collected and unread, which is the failure this check exists to catch
 * being the one it explains worst.
 *
 * `verdict.ts` promises that stderr "goes straight to `diagnostics` where a
 * human can read it". Printing it is what makes that sentence true.
 *
 * **Neither stream is summarised, filtered or trimmed away.** Every successful
 * conversion writes `Could not find platform independent libraries <prefix>` to
 * stderr, so it is tempting to drop that line as noise — but a filter that
 * knows which lines matter is the same mistake in a smaller form, and the
 * refusal arrives directly underneath the warning. Both go out, labelled with
 * the stream they came from so a reader can tell the warning from the reason.
 */

/** One fixture that failed, and everything that is known about why. */
export interface ConversionFailure {
  /** The fixture that failed, named because one run does five of them. */
  readonly fixture: string;
  /** The directory the exported and converted files were left in. */
  readonly room: string;
  /** What went wrong, in one sentence, naming the command when it is bad news. */
  readonly reason: string;
  /** Everything the run said on stdout. */
  readonly stdout: string;
  /**
   * Everything the run said on stderr, straight from `verdict.diagnostics`.
   *
   * Required rather than optional on purpose: this message once had no way to
   * receive it, and a caller that forgets it should be a type error rather
   * than a quiet half-diagnosis.
   */
  readonly diagnostics: string;
}

/**
 * One failure message: what went wrong, where the files still are, and
 * everything LibreOffice said on its way to failing.
 *
 * @param failure - the fixture, the room, the reason, and both streams
 * @returns the message, ready to be handed to an assertion
 *
 * @example
 * ```typescript
 * describeFailure({ fixture, room, reason: verdict.reason, stdout, diagnostics: verdict.diagnostics });
 * // control-labels.json: LibreOffice exited with code 1. The command was: …
 * // The exported and converted files are still in …
 * // LibreOffice printed nothing on stdout.
 * // LibreOffice said on stderr:
 * // Could not find platform independent libraries <prefix>
 * // Error: source file could not be loaded
 * ```
 */
export function describeFailure(failure: ConversionFailure): string {
  return [
    `${failure.fixture}: ${failure.reason}`,
    `The exported and converted files are still in ${failure.room}.`,
    whatWasSaid('stdout', failure.stdout),
    whatWasSaid('stderr', failure.diagnostics),
  ].join('\n');
}

/**
 * One stream, quoted under its own name — or said to have been silent.
 *
 * Silence is reported rather than skipped. A stream left out of the message
 * reads the same as a stream that was never collected, and telling those two
 * apart is most of what a reader is trying to do.
 */
function whatWasSaid(stream: 'stdout' | 'stderr', said: string): string {
  const text = said.trim();

  return text === ''
    ? `LibreOffice printed nothing on ${stream}.`
    : `LibreOffice said on ${stream}:\n${text}`;
}
