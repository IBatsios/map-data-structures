import { describe, expect, it } from 'vitest';

import type { ConversionAttempt } from './verdict';
import { judgeConversion } from './verdict';

/**
 * What a LibreOffice run means, decided without a LibreOffice.
 *
 * This is the half of the `.docx` check that can be tested anywhere, and it is
 * split out for exactly that reason: the conversion itself needs an office
 * suite installed, and CI has none. The verdict does not. It is a function of
 * three facts — did the run time out, what did it exit with, and is there a
 * file — so every rule it follows can be pinned here and stays pinned on a
 * machine that has never heard of LibreOffice.
 *
 * **The rule these tests exist for.** A successful LibreOffice conversion
 * writes `Could not find platform independent libraries <prefix>` to stderr
 * every single time. It is a Python-embedding warning and not a failure, so a
 * check that reads stderr as its verdict reports every good run as a bad one.
 * That is the most likely way this whole check ships broken, so the rule is
 * absolute rather than a list of warnings to forgive: **stderr is diagnostic
 * text and never the verdict.** `never lets stderr decide the verdict` below
 * is what fails the day someone softens that.
 */

/** A run that went perfectly, for a test to change one fact of. */
const CLEAN_RUN: ConversionAttempt = {
  command:
    'soffice.com --headless --convert-to docx --outdir /tmp/out /tmp/in/order-intake.docx',
  exitCode: 0,
  stderr: '',
  outputWritten: true,
  timedOut: false,
  timeoutMs: 120_000,
};

/** The line every successful conversion on this machine writes to stderr. */
const PLATFORM_LIBRARIES_WARNING =
  'Could not find platform independent libraries <prefix>';

describe('judging a conversion that worked', () => {
  it('calls a clean exit with a file on disk a conversion', () => {
    expect(judgeConversion(CLEAN_RUN).kind).toBe('converted');
  });

  it('calls it a conversion despite the platform-libraries warning', () => {
    // Finding 6 of this cycle, measured on this machine: this text is on
    // stderr after every successful run.
    const verdict = judgeConversion({ ...CLEAN_RUN, stderr: PLATFORM_LIBRARIES_WARNING });

    expect(verdict.kind).toBe('converted');
  });

  it('never lets stderr decide the verdict', () => {
    // Not a list of warnings to forgive: a run that exited 0 and left a file
    // behind converted, whatever it said on the way. Two of these are text a
    // real failure writes, and they are here on purpose — if stderr is ever
    // read as the verdict, the first one flips this red.
    const said = [
      PLATFORM_LIBRARIES_WARNING,
      'javaldx: Could not find a Java Runtime Environment',
      'Error: source file could not be loaded',
      'warn:vcl.gdi:1:1: no suitable font found',
      'Fatal exception: Signal 11',
    ];

    const verdicts = said.map((stderr) => judgeConversion({ ...CLEAN_RUN, stderr }).kind);

    expect(verdicts).toEqual(said.map(() => 'converted'));
  });

  it('carries what the run said as diagnostics rather than as a verdict', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, stderr: PLATFORM_LIBRARIES_WARNING });

    expect(verdict.diagnostics).toContain(PLATFORM_LIBRARIES_WARNING);
  });
});

describe('judging a conversion that did not work', () => {
  it('fails a run that exited with a code of its own', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, exitCode: 1 });

    expect(verdict.kind).toBe('failed');
    expect(verdict.reason).toContain('1');
  });

  it('fails a run that exited 0 and wrote no file', () => {
    // LibreOffice answers a file it cannot parse with a message and an exit
    // code of 0 — D76's `Error: source file could not be loaded` is exactly
    // that shape. The missing file is the only honest signal, which is why it
    // is one of the three facts.
    const verdict = judgeConversion({ ...CLEAN_RUN, outputWritten: false });

    expect(verdict.kind).toBe('failed');
    expect(verdict.reason).toContain('no file');
  });

  it('says what was run when it failed, so the run can be repeated by hand', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, exitCode: 3 });

    expect(verdict.reason).toContain(CLEAN_RUN.command);
  });

  it('reads a run killed without a code as killed rather than as code null', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, exitCode: null });

    expect(verdict.kind).toBe('failed');
    expect(verdict.reason).not.toContain('null');
  });
});

describe('judging a conversion that never came back', () => {
  it('reports a timeout as a timeout and not as a failure', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, exitCode: null, timedOut: true });

    expect(verdict.kind).toBe('timedOut');
  });

  it('names the command that hung, because that is the whole diagnosis', () => {
    // `--version` hangs forever, and so does `--convert-to` without a profile
    // directory of its own. Both were measured in this cycle. A timeout that
    // does not say what was run leaves the next person to rediscover which.
    const verdict = judgeConversion({ ...CLEAN_RUN, exitCode: null, timedOut: true });

    expect(verdict.reason).toContain(CLEAN_RUN.command);
    expect(verdict.reason).toContain('120');
  });

  it('outranks an exit code that arrived after the clock ran out', () => {
    const verdict = judgeConversion({ ...CLEAN_RUN, timedOut: true });

    expect(verdict.kind).toBe('timedOut');
  });
});
