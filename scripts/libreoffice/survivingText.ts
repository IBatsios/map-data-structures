/**
 * What a `.docx` has to still say once LibreOffice has rewritten it.
 *
 * A conversion that returns exit 0 and loses the document is a failure, and
 * exit codes cannot see that. So the check reads the converted file back and
 * asks for the design's own words: its title, every node label, every edge
 * label, and the sentence a design with nothing in it gets (D51).
 *
 * **The list comes from the design's JSON, not from the export's plan.** That
 * is the difference between a check and a mirror: asking `docxPlan` what it
 * meant to write and then confirming the file says that would pass a build
 * that dropped every label, as long as it dropped it consistently. The file
 * the user wrote is the only source that is not downstream of the bug.
 *
 * One transformation sits between the two and it is not optional: D76's
 * marking of the characters XML 1.0 has no room for. A raw U+0001 makes
 * `word/document.xml` ill-formed and LibreOffice answers the file with
 * "source file could not be loaded", so the export replaces it, and asking for
 * the raw character back would be asking the export to undo its own fix. That
 * marking is applied here through `safeDocxText` — the export's own function,
 * pinned by `docxPlan.test.ts` — rather than reimplemented.
 *
 * Text is asked for line by line, because a label written on two lines is
 * written with a real `w:br` and a reader that re-flowed it into two
 * paragraphs would still be carrying every word. Line by line passes both
 * shapes and fails a line that went missing.
 */

import { safeDocxText } from '../../src/lib/docxPlan';
import { NOTHING_TO_DRAW } from '../../src/lib/exportFurniture';
import { loadDesign } from '../../src/lib/loadDesign';

/**
 * Every string the converted document still has to carry, from the design's
 * own JSON.
 *
 * @param designJson - one fixture, exactly as the browser was handed it
 * @returns each line of text that must survive, once each, none of them empty
 * @throws {DesignLoadError} if the JSON is not a design — a check whose
 *   expectations quietly came back empty would pass every document
 *
 * @example
 * ```typescript
 * textThatMustSurvive(await readFile(fixture, 'utf8'));
 * // ['Order intake', 'Customer', 'Public API', 'places order', …]
 * ```
 */
export function textThatMustSurvive(designJson: string): readonly string[] {
  const design = loadDesign(designJson);
  const written = [
    design.title,
    ...design.nodes.map((node) => node.label),
    ...design.edges.map((edge) => edge.label),
  ].flatMap((text) => safeDocxText(text).lines);

  // The sentence stands in for the drawing when there is nothing to draw, so
  // for those designs it is most of the document's body: without it
  // `empty-design` would be checked for its title alone.
  const body = design.nodes.length === 0 ? [...written, NOTHING_TO_DRAW] : written;

  // A blank line is dropped rather than asked for. The schema refuses a label
  // that is entirely blank, but a label with an empty line in the middle of it
  // is a valid design and splitting on line endings makes an empty string out
  // of it — and every document on earth contains an empty string, so asking
  // for one would be an assertion that cannot fail.
  return [...new Set(body.filter((text) => text.trim() !== ''))];
}

/**
 * The strings a document no longer carries.
 *
 * @param document - the converted file's text, paragraphs and all
 * @param wanted - what `textThatMustSurvive` asked for
 * @returns what is missing, in the order it was asked for; empty when the
 *   document survived whole
 */
export function missingFrom(
  document: string,
  wanted: readonly string[],
): readonly string[] {
  return wanted.filter((text) => !document.includes(text));
}
