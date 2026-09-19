import { describe, expect, it } from 'vitest';

import type { SofficeSearch } from './soffice';
import { SOFFICE_OVERRIDE, describeMissingSoffice, findSoffice } from './soffice';

/**
 * Finding LibreOffice, tested on a machine that may not have one.
 *
 * The search is a pure function of three things — the environment, the platform
 * and whether a given path exists — so every rule in it can be pinned here by
 * handing it a filesystem that says yes to whatever the test wants. That is
 * what makes the absent case checkable in CI rather than only on the one
 * machine that happens to have an office suite installed.
 *
 * Three of these tests exist because of something measured in this cycle rather
 * than because of something imagined:
 *
 * - On Windows the binary to run is `soffice.com`. `soffice.exe` is a GUI
 *   binary with no console attached, so anything it prints goes nowhere.
 * - `C:\Program Files (x86)\LibreOffice Maintenance Service\` exists on this
 *   machine and is not the application. A search that matched on the name
 *   "LibreOffice" would find it and then try to run an updater.
 * - An override pointing at nothing must come back not-found, not quietly fall
 *   back to an install that happens to be there — otherwise there is no way to
 *   rehearse the absent case on a machine that has LibreOffice.
 */

/** A Windows machine with LibreOffice where this one keeps it. */
const WINDOWS: SofficeSearch = {
  env: {
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
  },
  platform: 'win32',
  exists: (path) => path === 'C:\\Program Files\\LibreOffice\\program\\soffice.com',
};

/** A machine where nothing at all is installed. */
const BARE: SofficeSearch = { ...WINDOWS, exists: () => false };

describe('finding the LibreOffice to run', () => {
  it('takes the override ahead of any install it would have found', () => {
    const found = findSoffice({
      ...WINDOWS,
      env: { ...WINDOWS.env, [SOFFICE_OVERRIDE]: 'D:\\portable\\soffice.com' },
      exists: () => true,
    });

    expect(found.path).toBe('D:\\portable\\soffice.com');
  });

  it('reports an override that points nowhere instead of falling back', () => {
    // This is how the absent case is rehearsed on a machine that has
    // LibreOffice: point the override at a path that does not exist. Falling
    // back to the real install would make that impossible to demonstrate.
    const found = findSoffice({
      ...WINDOWS,
      env: { ...WINDOWS.env, [SOFFICE_OVERRIDE]: 'D:\\nowhere\\soffice.com' },
    });

    expect(found.path).toBeNull();
    expect(found.searched).toEqual(['D:\\nowhere\\soffice.com']);
  });

  it('resolves the .com on Windows and never the .exe', () => {
    const found = findSoffice(WINDOWS);

    expect(found.path).toBe('C:\\Program Files\\LibreOffice\\program\\soffice.com');
    expect(found.searched.filter((path) => path.endsWith('.exe'))).toEqual([]);
  });

  it('never looks in the LibreOffice Maintenance Service directory', () => {
    const looked = findSoffice(BARE).searched.join('\n');

    expect(looked).not.toContain('Maintenance Service');
  });

  it('looks inside the application bundle on macOS', () => {
    const found = findSoffice({
      env: {},
      platform: 'darwin',
      exists: (path) => path === '/Applications/LibreOffice.app/Contents/MacOS/soffice',
    });

    expect(found.path).toBe('/Applications/LibreOffice.app/Contents/MacOS/soffice');
  });

  it('looks in the usual places on Linux, so a teammate there is not locked out', () => {
    const found = findSoffice({
      env: {},
      platform: 'linux',
      exists: (path) => path === '/usr/bin/soffice',
    });

    expect(found.path).toBe('/usr/bin/soffice');
  });

  it('says where it looked when it found nothing', () => {
    const found = findSoffice(BARE);

    expect(found.path).toBeNull();
    expect(found.searched).toContain(
      'C:\\Program Files\\LibreOffice\\program\\soffice.com',
    );
  });
});

describe('the line a machine without LibreOffice gets', () => {
  it('is one line, and says what was not found, where, and what to set', () => {
    const line = describeMissingSoffice(findSoffice(BARE));

    expect(line).not.toContain('\n');
    expect(line).toContain('LibreOffice');
    expect(line).toContain('C:\\Program Files\\LibreOffice\\program\\soffice.com');
    expect(line).toContain(SOFFICE_OVERRIDE);
  });

  it('blames the override when the override is what pointed nowhere', () => {
    const line = describeMissingSoffice(
      findSoffice({
        ...BARE,
        env: { ...BARE.env, [SOFFICE_OVERRIDE]: 'D:\\nowhere\\soffice.com' },
      }),
    );

    expect(line).toContain('D:\\nowhere\\soffice.com');
    expect(line).toContain(SOFFICE_OVERRIDE);
  });
});
