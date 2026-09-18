/**
 * How wide a piece of text will be, worked out without a browser.
 *
 * The layout has to be pure — `docs/tasks/03-preview-drawing.md` asks for it,
 * and Tasks 05 to 08 need it, because an exporter running in a worker or a test
 * running in Vitest has no `canvas` to measure against and no laid-out DOM to
 * ask. So the drawing estimates instead of measuring: a glyph is assumed to be
 * a fixed fraction of the font size wide.
 *
 * That is an approximation, and it is deliberately an over-estimate. A box that
 * comes out slightly too wide looks airy; one that comes out too narrow clips
 * its own label, and a clipped label is a mislabeled node, which is the one
 * thing intake 5.2 rules out. When in doubt this module rounds towards roomy.
 *
 * Nothing here trims, collapses or substitutes. Whitespace counts as width, and
 * text that fits on a line comes back as it went in: the drawing's job is to
 * show what the file said. Wrapping is the one exception, because it breaks
 * between words — see `wrapText`.
 */

/**
 * Average glyph advance as a fraction of the font size, for the UI sans-serif
 * stack the drawing uses.
 *
 * Measured against a mixed-case English sample rather than a lowercase one, and
 * rounded up: 0.5 is about right for lowercase Helvetica-like faces, 0.6 for
 * mixed case, and the extra hundredth is the margin that keeps capitals and
 * digits inside their box.
 */
export const AVERAGE_GLYPH_ADVANCE = 0.62;

/**
 * Estimates how many pixels of horizontal space a string needs.
 *
 * @param text - the text as the file gave it, whitespace included
 * @param fontSize - the rendered font size in pixels
 * @returns an over-estimate of the rendered width, in pixels; 0 for empty text
 *
 * @example
 * ```typescript
 * estimateTextWidth('Public API', 14); // about 86.8
 * ```
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return [...text].length * fontSize * AVERAGE_GLYPH_ADVANCE;
}

/**
 * Breaks text into lines that each fit inside a given width.
 *
 * Breaks between words first. A single word too wide to fit on a line of its
 * own is broken between characters rather than allowed to overflow, because a
 * word running out of its box is a label the reader cannot trust. Nothing is
 * ever dropped or shortened: text that does not fit makes more lines, and the
 * caller grows the box to suit.
 *
 * Text that already fits comes back as one line, character for character —
 * which is what keeps a whitespace-only label visible as the blank box it is.
 * Text long enough to wrap is rebuilt from its words, so the whitespace that
 * separated them becomes the line break rather than text of its own: eighty
 * consecutive spaces come back as `['']`. Blank is blank either way and no
 * reader can tell, but a caller comparing lines against the original should
 * know it.
 *
 * @param text - the text as the file gave it
 * @param maxWidth - the widest a line may be, in pixels
 * @param fontSize - the rendered font size in pixels
 * @returns one or more lines, never empty; `['']` for empty text
 *
 * @example
 * ```typescript
 * wrapText('Order fulfilment service', 120, 14);
 * // ['Order fulfilment', 'service']
 * ```
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
): readonly string[] {
  if (estimateTextWidth(text, fontSize) <= maxWidth) {
    return [text];
  }

  const lines: string[] = [];
  let current = '';

  for (const word of splitIntoFittingWords(text, maxWidth, fontSize)) {
    const candidate = current === '' ? word : `${current} ${word}`;

    if (current !== '' && estimateTextWidth(candidate, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
      continue;
    }

    current = candidate;
  }

  lines.push(current);

  return lines;
}

/**
 * The text as words, with any word too wide for a line of its own already cut
 * into pieces that do fit. Doing it here means the wrapping loop above only
 * ever has to decide where a line ends, never whether a word can fit at all.
 */
function splitIntoFittingWords(
  text: string,
  maxWidth: number,
  fontSize: number,
): readonly string[] {
  return text
    .split(/\s+/)
    .filter((word) => word !== '')
    .flatMap((word) => cutToWidth(word, maxWidth, fontSize));
}

/** One word as one or more pieces, each no wider than `maxWidth` if it can be. */
function cutToWidth(word: string, maxWidth: number, fontSize: number): readonly string[] {
  if (estimateTextWidth(word, fontSize) <= maxWidth) {
    return [word];
  }

  // At least one character per piece, so a width too narrow for any glyph still
  // terminates instead of looping forever on a zero-length slice.
  const perLine = Math.max(1, Math.floor(maxWidth / (fontSize * AVERAGE_GLYPH_ADVANCE)));
  const characters = [...word];
  const pieces: string[] = [];

  for (let start = 0; start < characters.length; start += perLine) {
    pieces.push(characters.slice(start, start + perLine).join(''));
  }

  return pieces;
}
