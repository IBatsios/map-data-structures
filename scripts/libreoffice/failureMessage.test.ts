import { describe, expect, it } from 'vitest';

import type { ConversionFailure } from './failureMessage';
import { describeFailure } from './failureMessage';

/**
 * The sentence a red run prints, which is the only part of this check anyone
 * ever reads.
 *
 * A passing run says five words and is forgotten. The failure message is read
 * exactly once, by someone who does not yet know what is wrong, and everything
 * it leaves out is an afternoon of rediscovery — which is the opposite of what
 * this whole check was built for. So it is pinned here rather than left to the
 * spec, where nothing could reach it: `docxRoundTrip.spec.ts` imports
 * `@playwright/test` and needs an office suite to run, and the message needs
 * neither.
 *
 * **The rule these tests exist for: both streams, always.** LibreOffice says
 * why it refused a document on **stderr**, and says nothing at all on stdout
 * while it does it. Measured on this machine against a malformed `.docx`:
 * stdout was `""` and stderr carried `Error: source file could not be loaded`
 * — the exact refusal D76 exists to prevent and the reason `control-labels` is
 * a fixture. A message built from stdout alone reports that failure as
 * "LibreOffice printed nothing", with the diagnosis collected and thrown away.
 *
 * `verdict.ts` promises stderr "goes straight to `diagnostics` where a human
 * can read it". These tests are what makes that true, because a human can only
 * read what something prints.
 */

/**
 * The refusal this check exists to catch, as it was measured.
 *
 * Note what is and is not here: the reason names an exit code, stdout is
 * empty, and the one sentence explaining the refusal is on stderr underneath
 * a warning that has nothing to do with it.
 */
const REFUSED: ConversionFailure = {
  fixture: 'control-labels.json',
  room: 'C:\\Users\\dev\\AppData\\Local\\Temp\\mapds-libreoffice-a1b2c3',
  reason:
    'LibreOffice exited with code 1. The command was: soffice.com -env:UserInstallation=file:///tmp/profile --headless --convert-to docx --outdir /tmp/out /tmp/in/control-labels.docx',
  stdout: '',
  diagnostics:
    'Could not find platform independent libraries <prefix>\nError: source file could not be loaded',
};

describe('the message a refused document prints', () => {
  it('carries what LibreOffice said on stderr, which is where a refusal is explained', () => {
    const message = describeFailure(REFUSED);

    expect(message).toContain('Error: source file could not be loaded');
  });

  it('says which stream the diagnosis came from', () => {
    // Without the label the reader cannot tell a refusal from the warning
    // every successful run writes, since both arrive on the same stream.
    const message = describeFailure(REFUSED);

    expect(message).toContain('stderr');
  });

  it('names the fixture and the room, so the files can be opened', () => {
    const message = describeFailure(REFUSED);

    expect(message).toContain('control-labels.json');
    expect(message).toContain(REFUSED.room);
  });

  it('says what was run, so the failure can be repeated by hand', () => {
    const message = describeFailure(REFUSED);

    expect(message).toContain(REFUSED.reason);
  });
});

describe('reading both of the streams a run writes to', () => {
  it('quotes stdout when that is where the run spoke', () => {
    const message = describeFailure({
      ...REFUSED,
      stdout:
        'convert /tmp/in/order-intake.docx -> /tmp/out/order-intake.docx using filter',
      diagnostics: '',
    });

    expect(message).toContain('using filter');
    expect(message).toContain('stdout');
  });

  it('reads both streams when both of them spoke', () => {
    const message = describeFailure({
      ...REFUSED,
      stdout: 'convert /tmp/in/order-intake.docx',
      diagnostics: 'Error: source file could not be loaded',
    });

    expect(message).toContain('convert /tmp/in/order-intake.docx');
    expect(message).toContain('Error: source file could not be loaded');
  });

  it('says so plainly when neither stream said anything', () => {
    // Silence is a finding too, and it is a different one from a stream that
    // was never read. Saying it of both streams is what tells them apart.
    const message = describeFailure({ ...REFUSED, stdout: '', diagnostics: '' });

    expect(message).toContain('nothing on stdout');
    expect(message).toContain('nothing on stderr');
  });

  it('treats a stream of whitespace as one that said nothing', () => {
    const message = describeFailure({ ...REFUSED, stdout: '\n  \n', diagnostics: '   ' });

    expect(message).toContain('nothing on stdout');
    expect(message).toContain('nothing on stderr');
  });
});

describe('a binary that never started', () => {
  it('carries the spawn error, so a start that failed is not read as a kill', () => {
    // `MAPDS_SOFFICE` pointing at a directory makes `spawn` emit `error`, and
    // the run comes back with no exit code at all — which the verdict can only
    // read as a process that was killed, because from outside it looks the
    // same. The one thing that says otherwise is the spawn error's own text,
    // and it arrives on stderr.
    const message = describeFailure({
      ...REFUSED,
      reason:
        'LibreOffice was killed before it finished. The command was: "C:\\Program Files\\LibreOffice" --headless',
      stdout: '',
      diagnostics: 'spawn C:\\Program Files\\LibreOffice EACCES',
    });

    expect(message).toContain('EACCES');
  });
});
