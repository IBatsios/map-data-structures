import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ConversionRequest } from './convert';
import { conversionArguments } from './convert';

/**
 * The command line every conversion is run with, pinned without running one.
 *
 * Three of this cycle's findings live in these arguments rather than in any
 * branch, so this is where they are held:
 *
 * - `-env:UserInstallation=` pointing at a profile directory the run owns is
 *   not optional. Without it `--convert-to` hangs indefinitely — measured
 *   twice, and the reason an earlier hand-run of this check had to be killed.
 * - The profile is a `file://` URL, because that is the only form LibreOffice
 *   reads it in.
 * - `--version` is never passed. It hangs even with the profile flag, so it is
 *   useless as a presence check and no invocation here reaches for it.
 */

/** A request with real paths, so the file URL is a real one on any platform. */
const REQUEST: ConversionRequest = {
  soffice: join(tmpdir(), 'soffice.com'),
  source: join(tmpdir(), 'mapds-in', 'order-intake.docx'),
  outDir: join(tmpdir(), 'mapds-out'),
  profileDir: join(tmpdir(), 'mapds-profile'),
  timeoutMs: 120_000,
};

describe('the command line a conversion is run with', () => {
  it('always points LibreOffice at a profile directory of its own', () => {
    const profile = conversionArguments(REQUEST).filter((argument) =>
      argument.startsWith('-env:UserInstallation='),
    );

    expect(profile).toHaveLength(1);
  });

  it('gives the profile as a file URL, which is the only form it reads', () => {
    const [profile = ''] = conversionArguments(REQUEST).filter((argument) =>
      argument.startsWith('-env:UserInstallation='),
    );

    expect(profile).toContain('-env:UserInstallation=file://');
  });

  it('asks for a headless conversion to docx, into a directory of its own', () => {
    const argued = conversionArguments(REQUEST);

    expect(argued).toContain('--headless');
    expect(argued.join(' ')).toContain('--convert-to docx');
    expect(argued).toContain(REQUEST.outDir);
    expect(argued).toContain(REQUEST.source);
  });

  it('writes its answer somewhere other than where it read from', () => {
    // Told to write a `.docx` back into the folder it read one from,
    // LibreOffice is being asked to overwrite its own input, and what comes
    // back can no longer be compared with what went in.
    expect(REQUEST.outDir).not.toBe(REQUEST.source);
    expect(conversionArguments(REQUEST)).not.toContain('--version');
  });
});
