/**
 * The furniture every export prints: the words the document supplies itself,
 * as opposed to the words the design supplies.
 *
 * Four exports — `.md`, `.html`, `.pdf`, `.docx` — each write a title and two
 * tables from the layout, and each of them also writes a little text of its
 * own that no design ever says: the names at the top of each table's columns,
 * and the sentence a design with nothing in it gets instead of a drawing. All
 * of it was written out once per export, which is four copies of strings that
 * have to be the same strings, held together by one Vitest assertion covering
 * two of the four. This is the one place they are written now, and
 * `exportFurniture.test.ts` is what pins them, the same way
 * `exportStyles.test.ts` pins the palette that an exported `.html` cannot link
 * to.
 *
 * **A column's name and its width are one fact, so they are one declaration.**
 * The two planners size their tables and the two text formats only name them,
 * so it would be easy to keep the names in one place and the widths in
 * another — which is how `pdfPlan.ts` and `docxPlan.ts` came to hold identical
 * `Column` interfaces and identical shares, six numbers apiece that had to
 * agree and were checked by nothing. Both come from here now, and `toHtml` and
 * `toMarkdown` take their headings off the same list rather than re-typing the
 * words. What each export *does* with a share is still its own: points in the
 * PDF, DXA in Word, and nothing at all in the two that let the reader's
 * renderer decide.
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
 * Greek still gets an English empty-design sentence and an `Id | Label | Type`
 * table, because this is the *app* speaking about the file, not the file
 * speaking about itself. Nothing here takes a locale and nothing here should
 * grow one without that decision being reopened first.
 */

/** One column of a table: what it is called and how much of the width it takes. */
export interface Column {
  readonly heading: string;
  readonly share: number;
}

/**
 * The headings of a list of columns, still a tuple as long as the list was.
 *
 * `columns.map((column) => column.heading)` on its own comes back as a plain
 * `string[]`, which is a wider type than the `as const` tuples `toHtml` and
 * `toMarkdown` used to declare by hand. Mapping over `keyof C` keeps both the
 * length and the literal words, so deriving a heading list gives up nothing
 * that re-typing it gave.
 */
type HeadingsOf<C extends readonly Column[]> = {
  readonly [K in keyof C]: C[K]['heading'];
};

/**
 * The headings of a list of columns, in the order the columns are printed.
 *
 * The assertion is the one thing `.map` cannot express: it returns an array
 * where the caller is owed a tuple, and every element of it has just been
 * read off a column, so the length and the words are right by construction.
 */
function headingsOf<C extends readonly Column[]>(columns: C): HeadingsOf<C> {
  return columns.map((column) => column.heading) as unknown as HeadingsOf<C>;
}

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

/**
 * The table of nodes: one row per node, in the order the file listed them.
 *
 * The shares are of the text column, and they are meant to add up to it: the
 * label is the cell that holds a sentence, so it gets the room, and the id and
 * the type get what is left. `exportFurniture.test.ts` holds them to summing
 * to a whole table.
 */
export const NODE_COLUMNS = [
  { heading: 'Id', share: 0.26 },
  { heading: 'Label', share: 0.46 },
  { heading: 'Type', share: 0.28 },
] as const satisfies readonly Column[];

/** The table of edges, likewise, with the room going to its own label. */
export const EDGE_COLUMNS = [
  { heading: 'From', share: 0.26 },
  { heading: 'To', share: 0.26 },
  { heading: 'Label', share: 0.48 },
] as const satisfies readonly Column[];

/** `Id | Label | Type`, for the two exports that name columns without sizing them. */
export const NODE_HEADINGS = headingsOf(NODE_COLUMNS);

/** `From | To | Label`, likewise. */
export const EDGE_HEADINGS = headingsOf(EDGE_COLUMNS);
