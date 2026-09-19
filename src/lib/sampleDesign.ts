/**
 * Where the shipped sample design lives, said once.
 *
 * The sample itself is `public/sample.json`, and it is the only copy of itself
 * in the repository. Four things need it and each needs it differently: the
 * site serves it as a static asset, the upload page fetches it when someone
 * asks for "Load the sample design", the `/schema` page prints its text, and
 * the Playwright walk chooses it off disk the way a user picks a file. The
 * lazy answer is a second copy under `e2e/fixtures/`, and two files with the
 * same bytes is exactly the kind of duplicate this project is trying to stop
 * accumulating — so the file stays in one place and everything that wants it
 * comes here for its name.
 *
 * There is no module that *holds* the design: it is data, not code, and
 * parsing it at build time would mean the page shows something other than the
 * bytes the browser downloads.
 */

/** What the sample is called, in the status line and as a download. */
export const SAMPLE_FILE_NAME = 'sample.json';

/**
 * Where the site serves it from.
 *
 * Root-relative because `public/` is served at the root and this app is one
 * origin with no base path; the same string is the download link's `href` and
 * the URL the upload page fetches.
 */
export const SAMPLE_URL = `/${SAMPLE_FILE_NAME}`;
