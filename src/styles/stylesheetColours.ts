/**
 * Reading a colour back out of a stylesheet's own text.
 *
 * Three stylesheets are now measured rather than eyeballed — the drawing's
 * colour bands (D27), the validation panel's text, and the page's own surface
 * and ink — and two of those tests want the same three lines of regular
 * expression. One copy of it lives here, for the same reason `contrastRatio`
 * lives beside it: a published formula and a file format are both worth
 * implementing once.
 *
 * Nothing the site ships imports this. It exists so that "the text is readable"
 * stays a claim something can check.
 */

/**
 * One `--name: #rrggbb;` declaration, wherever in the stylesheet it is set.
 *
 * @param stylesheet - the text of a stylesheet, read off disk
 * @param name - the custom property's name, without its leading dashes
 * @returns the six-digit hex colour it is set to
 * @throws {Error} if the stylesheet declares no such colour, which is a
 *   renamed token rather than a failed measurement and should say so
 *
 * @example
 * ```typescript
 * declaredColour(readFileSync(sheet, 'utf8'), 'page-ink'); // '#1f2430'
 * ```
 */
export function declaredColour(stylesheet: string, name: string): string {
  const found = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\s*;`).exec(stylesheet)?.[1];

  if (found === undefined) {
    throw new Error(`No --${name} is declared in that stylesheet.`);
  }

  return found;
}
