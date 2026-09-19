/**
 * Where LibreOffice is, and what to say when it is nowhere.
 *
 * An override first, then the places each platform installs it. The override
 * is what keeps a teammate on macOS or Linux — or on a Windows machine that
 * put it somewhere else — from being locked out by a list written on one
 * developer's computer, and it is also how the absent case is rehearsed on a
 * machine that *has* LibreOffice: point it at a path that is not there.
 *
 * Which is why an override that points nowhere is an answer rather than a
 * fallback. Searching on after it would make the absent case impossible to
 * demonstrate anywhere except a machine with no office suite at all.
 *
 * **Three things measured on Windows, none of them guessable.**
 *
 * - The binary to run is `soffice.com`, not `soffice.exe`. The `.exe` is the
 *   GUI binary and has no console attached, so everything it prints goes
 *   nowhere and a script waiting to read it waits forever.
 * - LibreOffice is not on `PATH`. `command -v soffice` and `command -v
 *   libreoffice` both find nothing, so the install has to be looked for by
 *   path rather than resolved by name.
 * - `C:\Program Files (x86)\LibreOffice Maintenance Service\` exists beside
 *   the real install and is not the application. Every candidate below is a
 *   full path to a binary for that reason: a search that walked directories
 *   matching "LibreOffice" would find the updater and try to run it.
 *
 * Nothing here touches the filesystem itself — `exists` is passed in — so the
 * whole search is a pure function and its rules are unit-tested in
 * `soffice.test.ts` on any machine, installed or not.
 */

/** The environment variable that names the binary, ahead of any search. */
export const SOFFICE_OVERRIDE = 'MAPDS_SOFFICE';

/** What the search is allowed to know: the environment, the OS, and a disk. */
export interface SofficeSearch {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly platform: NodeJS.Platform;
  /** Whether a path is a file that is there. Passed in so this stays pure. */
  readonly exists: (path: string) => boolean;
}

/** What the search found, and everywhere it looked on the way. */
export interface SofficeLocation {
  /** The binary to run, or `null` when none of the candidates was there. */
  readonly path: string | null;
  /** Every candidate, in the order it was tried, for the message to name. */
  readonly searched: readonly string[];
  /** What the override said, or `null` when it was not set. */
  readonly override: string | null;
}

/** Windows' own names for its two program directories, with sane fallbacks. */
const WINDOWS_PROGRAM_DIRECTORIES = ['ProgramFiles', 'ProgramFiles(x86)'] as const;
const WINDOWS_PROGRAM_FALLBACKS = ['C:\\Program Files', 'C:\\Program Files (x86)'];

/** Where a Mac keeps it: inside the application bundle, never on `PATH`. */
const MACOS_CANDIDATES = ['/Applications/LibreOffice.app/Contents/MacOS/soffice'];

/** The four places a Linux package or a tarball tends to leave it. */
const LINUX_CANDIDATES = [
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
  '/opt/libreoffice/program/soffice',
  '/snap/bin/soffice',
];

/**
 * Finds the LibreOffice binary to run, or reports that there is none.
 *
 * @param search - the environment, the platform, and a way to test a path
 * @returns the binary, everywhere that was tried, and what the override said
 *
 * @example
 * ```typescript
 * const found = findSoffice({ env: process.env, platform: process.platform, exists });
 * found.path ?? describeMissingSoffice(found);
 * ```
 */
export function findSoffice(search: SofficeSearch): SofficeLocation {
  const override = search.env[SOFFICE_OVERRIDE]?.trim() ?? '';
  const searched = override === '' ? candidatesFor(search) : [override];

  return {
    path: searched.find((candidate) => search.exists(candidate)) ?? null,
    searched,
    override: override === '' ? null : override,
  };
}

/**
 * The one line a run without LibreOffice prints before exiting green.
 *
 * One line rather than a report, because not having LibreOffice is not a
 * problem: this check is opt-in and everything else in the repository runs
 * without it. It still has to say all three of what was not found, where it
 * was looked for, and how to point it at an install — a line saying only
 * "LibreOffice not found" leaves the reader to guess whether it is a broken
 * check or a missing program.
 *
 * @param location - what `findSoffice` came back with
 * @returns one line, with no newline in it
 */
export function describeMissingSoffice(location: SofficeLocation): string {
  const howToSet = `Set ${SOFFICE_OVERRIDE} to the full path of the soffice binary — on Windows the .com, not the .exe — and run it again.`;

  if (location.override !== null) {
    return `${SOFFICE_OVERRIDE} points at ${location.override}, which is not there, so the LibreOffice .docx check did not run and nothing failed. Unset it to search the usual install locations, or set it to a binary that exists.`;
  }

  return `LibreOffice was not found, so the .docx check did not run and nothing failed. Looked at: ${location.searched.join('; ')}. ${howToSet}`;
}

/** Every full path worth trying on this platform, in the order to try them. */
function candidatesFor(search: SofficeSearch): readonly string[] {
  if (search.platform === 'win32') {
    return WINDOWS_PROGRAM_DIRECTORIES.map(
      (name, index) =>
        `${search.env[name] ?? WINDOWS_PROGRAM_FALLBACKS[index]}\\LibreOffice\\program\\soffice.com`,
    );
  }

  return search.platform === 'darwin' ? MACOS_CANDIDATES : LINUX_CANDIDATES;
}
