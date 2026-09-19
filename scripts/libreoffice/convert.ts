/**
 * Running one LibreOffice conversion, bounded by a clock.
 *
 * This is the impure half: it spawns a process, waits for it, and kills it if
 * it stops answering. What the result *means* is next door in `verdict.ts`,
 * which is a pure function and is unit-tested on machines that have no
 * LibreOffice at all. The command line is built here but is pure too, and
 * `convert.test.ts` pins it, because two of this cycle's findings are carried
 * by the arguments rather than by any branch.
 *
 * **The profile directory is what makes this terminate.** Without
 * `-env:UserInstallation=` pointing at a directory of its own, `--convert-to`
 * hangs indefinitely: LibreOffice wants a user profile, finds the one the
 * desktop session is already holding, and waits for it. Measured twice in this
 * cycle and once in Task 08 before that. Every invocation here passes one, and
 * the caller owns it — it is made under the system temporary directory, so no
 * profile can ever land in the working tree.
 *
 * **Nothing here probes with `--version`.** It hangs even with the profile
 * flag, so presence is answered by `soffice.ts` looking for the file instead.
 *
 * **Every invocation is bounded.** A conversion that stops answering is killed
 * and reported as a timeout naming the command, which is a different thing
 * from a document that will not convert and wants something different done
 * about it.
 */

import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ConversionVerdict } from './verdict';
import { judgeConversion } from './verdict';

/** One file to put through LibreOffice, and the room to do it in. */
export interface ConversionRequest {
  /** The binary, from `findSoffice`. */
  readonly soffice: string;
  /** The `.docx` the browser produced. */
  readonly source: string;
  /** Where LibreOffice writes its answer. Never the source's own folder. */
  readonly outDir: string;
  /** A LibreOffice profile this run owns, outside the repository. */
  readonly profileDir: string;
  /** How long the run is given before it is killed, in milliseconds. */
  readonly timeoutMs: number;
}

/** What came of it: the verdict, the file, and everything it printed. */
export interface Conversion {
  readonly verdict: ConversionVerdict;
  /** Where the converted file is, whether or not one arrived. */
  readonly output: string;
  /** What the run said on stdout, for a failure message to quote. */
  readonly stdout: string;
}

/**
 * The arguments one conversion is run with.
 *
 * Split out from the running so it can be read and tested on its own: the
 * profile flag is the difference between a check and a hang, and a test is a
 * better guarantee of its presence than a comment.
 *
 * @param request - the binary, the file, and the two directories
 * @returns the argument list, profile flag first
 */
export function conversionArguments(request: ConversionRequest): readonly string[] {
  return [
    `-env:UserInstallation=${pathToFileURL(request.profileDir).href}`,
    '--headless',
    '--convert-to',
    'docx',
    '--outdir',
    request.outDir,
    request.source,
  ];
}

/**
 * Where LibreOffice will put its answer, which is the source's name in the
 * output directory.
 *
 * @param request - the same request the conversion is run with
 * @returns the full path of the file to look for afterwards
 */
export function conversionOutput(request: ConversionRequest): string {
  const name = basename(request.source, extname(request.source));

  return join(request.outDir, `${name}.docx`);
}

/**
 * Converts one `.docx` with LibreOffice and says what happened.
 *
 * @param request - the binary, the file, and the two directories
 * @returns the verdict, where the file should be, and what the run printed
 *
 * @example
 * ```typescript
 * const { verdict } = await convertToDocx(request);
 * verdict.kind; // 'converted' | 'failed' | 'timedOut'
 * ```
 */
export async function convertToDocx(request: ConversionRequest): Promise<Conversion> {
  const argued = conversionArguments(request);
  const output = conversionOutput(request);
  const run = await runBounded(request.soffice, argued, request.timeoutMs);

  return {
    verdict: judgeConversion({
      command: [request.soffice, ...argued].join(' '),
      exitCode: run.exitCode,
      stderr: run.stderr,
      outputWritten: isFileWithBytes(output),
      timedOut: run.timedOut,
      timeoutMs: request.timeoutMs,
    }),
    output,
    stdout: run.stdout,
  };
}

/** What one bounded run left behind, before anything is made of it. */
interface BoundedRun {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

/**
 * Runs a command, collects what it says, and kills it if the clock runs out.
 *
 * It resolves rather than rejects on a failure to start, because a binary that
 * will not launch is one more thing to report rather than an exception to
 * unwind through: the message goes into stderr and the verdict reads it as the
 * failure it is.
 */
function runBounded(
  command: string,
  argued: readonly string[],
  timeoutMs: number,
): Promise<BoundedRun> {
  return new Promise((resolve) => {
    // Detached off Windows so the child leads its own process group and the
    // whole group can be signalled; on Windows `taskkill /T` does that job and
    // detaching would only open a console window.
    const child = spawn(command, [...argued], {
      windowsHide: true,
      detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const clock = setTimeout(() => {
      timedOut = true;
      stderr += killTree(child.pid);
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error: Error) => {
      clearTimeout(clock);
      resolve({
        exitCode: null,
        stdout,
        stderr: `${stderr}\n${error.message}`,
        timedOut,
      });
    });

    child.on('close', (exitCode) => {
      clearTimeout(clock);
      resolve({ exitCode, stdout, stderr, timedOut });
    });
  });
}

/**
 * Ends a process and whatever it started.
 *
 * `soffice.com` is a launcher: it starts `soffice.bin` and waits for it, so
 * killing only the process that was spawned leaves the office suite running
 * and holding the profile. On Windows that needs `taskkill /T`, which has no
 * equivalent in Node's own `kill`.
 *
 * A kill that does not work is said out loud rather than swallowed — the run
 * has already been judged a timeout by then, and stderr never decides a
 * verdict, so the note can be added where a reader will see it without
 * changing what the check reports.
 *
 * @param pid - the process to end, and its children with it
 * @returns text to add to the run's stderr, empty when the kill went through
 */
function killTree(pid: number | undefined): string {
  if (pid === undefined) {
    return '\nThe run timed out before it had a process id to kill.';
  }

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      }).unref();
      return '';
    }

    process.kill(-pid, 'SIGKILL');
    return '';
  } catch (error) {
    return `\nThe run timed out and could not be killed: ${messageOf(error)}`;
  }
}

/** Whatever a thrown value has to say for itself, without assuming it is an `Error`. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Whether a file is there and is not the empty one a half-write leaves. */
function isFileWithBytes(path: string): boolean {
  return existsSync(path) && statSync(path).size > 0;
}
