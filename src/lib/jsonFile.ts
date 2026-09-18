/**
 * Whether a file is worth opening at all.
 *
 * This is the only check in the app that runs on a file rather than on its
 * contents, which is why it is its own module: it takes a name and a media
 * type, not text, so it cannot live inside `loadDesign`.
 *
 * It exists because `accept="application/json,.json"` on the file input filters
 * the picker and nothing else. A file dragged onto the page bypasses it, so a
 * dropped PNG used to be read as text and have its first bytes handed to
 * `JSON.parse`, which put them straight into its own error message. Asking the
 * name and the type first means the app can say *that is not JSON* instead of
 * failing halfway through a parse.
 *
 * The rule is deliberately the same one the picker's `accept` states: a name
 * ending in `.json`, or a media type that is JSON. Either signal is enough,
 * because a browser's idea of a media type varies by operating system and a
 * `.json` file arrives as `text/plain`, or as nothing at all, often enough to
 * matter. The cost of that choice is a file full of JSON called `notes.txt`,
 * which is refused with a message saying to rename it — the picker would have
 * hidden it too, so at least the two agree.
 *
 * This is a first gate and never a guarantee: a binary file named `design.json`
 * passes it and goes on to the parser, which is why nothing downstream trusts
 * the result.
 */

/** The extension the app, and the file input's `accept`, both name. */
const JSON_EXTENSION = '.json';

/** The media types that mean JSON, before any `; charset=…` parameters. */
const JSON_MEDIA_TYPES: readonly string[] = ['application/json', 'text/json'];

/** The suffix a media type uses to say "this is JSON underneath". */
const JSON_MEDIA_SUFFIX = '+json';

/**
 * Whether a file is plausibly JSON, judged before it is read.
 *
 * @param fileName - the name the browser reports, as given
 * @param mediaType - the type the browser reports, often empty
 * @returns true if the app should try to read it
 *
 * @example
 * ```typescript
 * looksLikeJsonFile('design.json', ''); // true
 * looksLikeJsonFile('logo.png', 'image/png'); // false
 * ```
 */
export function looksLikeJsonFile(fileName: string, mediaType: string): boolean {
  return hasJsonName(fileName) || hasJsonMediaType(mediaType);
}

function hasJsonName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(JSON_EXTENSION);
}

function hasJsonMediaType(mediaType: string): boolean {
  // `type` may carry parameters — `application/json; charset=utf-8` — and the
  // part before the first semicolon is the type itself.
  const type = (mediaType.split(';')[0] ?? '').trim().toLowerCase();

  return JSON_MEDIA_TYPES.includes(type) || type.endsWith(JSON_MEDIA_SUFFIX);
}
