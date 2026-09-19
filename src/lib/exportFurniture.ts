/**
 * The furniture every export prints: the words the document supplies itself,
 * as opposed to the words the design supplies.
 *
 * Four exports — `.md`, `.html`, `.pdf`, `.docx` — each write a title and two
 * tables from the layout, and each of them also writes a little text of its
 * own that no design ever says. That text was written out once per export,
 * which is four copies of a string that has to be the same string, held
 * together by one Vitest assertion covering two of the four. This is the one
 * place it is written now, and `exportFurniture.test.ts` is what pins it, the
 * same way `exportStyles.test.ts` pins the palette that an exported `.html`
 * cannot link to.
 *
 * **This is a sibling of `exportStyles.ts`, not an extension of it.** That
 * module exists because an export may fetch nothing, so the preview's
 * stylesheet has to travel inside the file; its long doc comment is about why
 * that duplicate is acceptable. This module exists for the opposite reason —
 * there is no duplicate here and there should never have been one. Keep them
 * apart: one is a copy that must be kept honest, the other is the original.
 *
 * **It is not a place to make the wording configurable.** The document's own
 * furniture is English whatever language the design is written in, which is
 * D71's decision and is unchanged by the text moving here. A design titled in
 * Greek still gets an English empty-design sentence, because the sentence is
 * the *app* speaking about the file, not the file speaking about itself.
 */

/**
 * What stands in for the drawing when the design holds nothing to draw (D51).
 *
 * All four exports print exactly this, each in its own container: a paragraph
 * in the HTML, a line of body text in the PDF and the Word file, a bare line
 * in the Markdown where the ` ```mermaid ` block would have gone. Both tables
 * still print their headings underneath it (D60) — the sentence replaces the
 * picture, not the document.
 *
 * @example
 * ```typescript
 * layout.nodes.length === 0 ? NOTHING_TO_DRAW : drawing;
 * ```
 */
export const NOTHING_TO_DRAW = 'This design has no nodes, so there is nothing to draw.';
