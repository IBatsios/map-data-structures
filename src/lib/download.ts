/**
 * Handing a file to the browser, and naming it after the design.
 *
 * This is the shared half of the four exports. Markdown is first (Task 05) and
 * HTML, PDF and Word follow, so both functions here are shaped for all four
 * rather than for the one that needed them:
 *
 * - `downloadBlob` takes a `Blob`, not a string, because two of the four
 *   formats are bytes rather than text. A helper that took text would be
 *   rewritten the moment a PDF needed saving.
 * - `fileNameFor` takes the extension, because `<design>.md`, `<design>.html`,
 *   `<design>.pdf` and `<design>.docx` are the same rule four times and a rule
 *   written four times is a rule that drifts.
 *
 * `downloadBlob` takes its `Document` as an argument, the way
 * `renderDrawing(layout, doc)` does: it keeps the module honest about the one
 * thing it needs from the page, and it keeps the page's own script free of
 * anything worth testing. What that means for tests is that `fileNameFor` is
 * unit-tested in Vitest and the download itself is asserted in Playwright,
 * which is where this project verifies anything that touches a DOM.
 */

/** The name used when nothing of the design's title survives (`***`, say). */
const FALLBACK_NAME = 'design';

/**
 * How long a file name may be before its extension.
 *
 * Common file systems stop at 255 bytes; 80 characters is comfortably inside
 * that even in a script whose characters are four bytes each, and a name longer
 * than that stopped being readable well before it stopped being legal.
 */
const MAX_NAME_LENGTH = 80;

/**
 * Characters no file name should carry: the ones Windows reserves, the path
 * separators, and any run of whitespace. Each run becomes a single dash.
 */
const SEPARATORS = /[<>:"/\\|?*\s]+/gu;

/** Control and format characters, which are stripped rather than replaced. */
const INVISIBLES = /[\p{Cc}\p{Cf}]/gu;

/**
 * How long the browser is given to start the download before the object URL
 * is revoked.
 *
 * Revoking in the same tick as the click has been observed to cancel the
 * download in some browsers, because the URL is read after the click returns;
 * never revoking leaks the whole file for as long as the page is open. A pause
 * costs nothing and settles both.
 */
const REVOKE_DELAY_MS = 60_000;

/**
 * Names the file an export downloads as: the design's title, made safe.
 *
 * This is the one place a title becomes a file name, so `.md`, `.html`, `.pdf`
 * and `.docx` of the same design always agree on the stem.
 *
 * Unlike a label, a title *is* tidied on the way out — trimmed, with whitespace
 * and reserved characters becoming dashes. D39's rule that text keeps its
 * spaces is about what the drawing shows, and a file name is not text the
 * design shows; a name beginning with a space serves nobody.
 *
 * @param title - the design's title, which D39 guarantees is not blank
 * @param extension - the extension without its dot, e.g. `md`
 * @returns a file name safe to put on a download
 *
 * @example
 * ```typescript
 * fileNameFor('Order intake', 'md'); // 'Order-intake.md'
 * fileNameFor('***', 'md');          // 'design.md'
 * ```
 */
export function fileNameFor(title: string, extension: string): string {
  const cleaned = trimEdges(
    title.replace(INVISIBLES, '').replace(SEPARATORS, '-').replace(/-{2,}/gu, '-'),
  );
  const shortened = trimEdges([...cleaned].slice(0, MAX_NAME_LENGTH).join(''));

  return `${shortened === '' ? FALLBACK_NAME : shortened}.${extension}`;
}

/** No name starts or ends in a dash or a dot: neither reads as a name. */
function trimEdges(name: string): string {
  return name.replace(/^[-.]+/u, '').replace(/[-.]+$/u, '');
}

/**
 * Hands a file to the browser as a download.
 *
 * The anchor is built, clicked and removed rather than shown, because there is
 * no page for it to sit on: the export is an action, not a link the user picks
 * out of the document. The object URL it points at is revoked afterwards, so a
 * design exported a dozen times does not hold a dozen copies of itself in
 * memory.
 *
 * @param blob - the file's bytes and its media type; text and binary alike
 * @param fileName - what to call it, from `fileNameFor`
 * @param doc - the document to build the link in, passed in the way
 *   `renderDrawing` takes one
 *
 * @example
 * ```typescript
 * const markdown = toMarkdown(layout);
 * const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
 * downloadBlob(blob, fileNameFor(layout.title, 'md'), document);
 * ```
 */
export function downloadBlob(blob: Blob, fileName: string, doc: Document): void {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';

  doc.body.append(link);
  link.click();
  link.remove();

  revokeLater(url, doc);
}

/** Frees the object URL once the browser has had time to read it. */
function revokeLater(url: string, doc: Document): void {
  const view = doc.defaultView;

  if (view === null) {
    URL.revokeObjectURL(url);
    return;
  }

  view.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}
