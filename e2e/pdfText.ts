/**
 * Reading the text back out of a PDF the app produced.
 *
 * Criterion 2 of Task 07 is that every label is readable, and the trap it hides
 * is that a PDF carries its own font: jsPDF's built-in faces are Latin-1, so a
 * Greek label can come out of the file as accented Latin, or as nothing at all,
 * while the export looks like it worked. That cannot be checked by eye and it
 * cannot be checked by looking at what went in. It has to be read back out.
 *
 * **Why this is thirty lines here rather than a package.** Reading these files
 * needs two things and no more: the `BT … ET` blocks a page's content stream is
 * made of, and the `/ToUnicode` CMap that says which glyph is which character.
 * jsPDF writes both uncompressed and plainly, so a parser that handles what
 * jsPDF writes is short enough to read in one sitting. A PDF library would be a
 * third-party dependency added for the test suite alone, and the gate on this
 * task was deliberate about which packages get added.
 *
 * **It is a test oracle, so it was checked against one.** Its output for the
 * fixtures was compared against `pdftotext` (xpdf 4.06) while it was being
 * written, and the two agree. The suite carries this one rather than shelling
 * out, because a system binary that is on one machine and not on the CI runner
 * is a test that passes locally and fails in CI.
 *
 * It reads what jsPDF writes and nothing more: no compressed streams, no
 * encryption, no object streams. If the export ever starts compressing its
 * output, this stops finding text and the tests that use it fail loudly, which
 * is the right way round.
 */

/** One text-drawing block of a content stream. */
const TEXT_BLOCK = /BT\b([\s\S]*?)\bET\b/gu;

/** A hex string being drawn: `<0034005000…> Tj`. */
const HEX_SHOWN = /<([0-9a-fA-F\s]*)>/gu;

/** A literal string being drawn: `(Order intake) Tj`, for a built-in font. */
const LITERAL_SHOWN = /\((?:\\.|[^\\()])*\)/gu;

/** A font being selected inside a text block: `/F15 14 Tf`. */
const FONT_SELECTED = /\/(F\d+)\s+[\d.]+\s+Tf/gu;

/** The page's font resources: `/F15 25 0 R`. */
const FONT_RESOURCE = /\/(F\d+)\s+(\d+)\s+0\s+R/gu;

/** One indirect object, so the face behind a resource can be looked up. */
const OBJECT = /(\d+)\s+0\s+obj([\s\S]*?)endobj/gu;

/** One `beginbfchar` … `endbfchar` section of a `/ToUnicode` CMap. */
const BF_CHARS = /beginbfchar([\s\S]*?)endbfchar/gu;

/** One `beginbfrange` … `endbfrange` section of the same. */
const BF_RANGES = /beginbfrange([\s\S]*?)endbfrange/gu;

/**
 * Every piece of text the PDF draws, in the order it draws it.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns one string per run of text drawn, which for this app's exports is
 *   one per line of a table, one per label in the drawing, and one per heading
 *
 * @example
 * ```typescript
 * const drawn = pdfText(await readFile(file.path));
 * expect(drawn).toContain('Παραγγελίες — naïve café');
 * ```
 */
export function pdfText(bytes: Buffer): readonly string[] {
  const raw = bytes.toString('latin1');
  const glyphs = unicodeMap(raw);

  return [...raw.matchAll(TEXT_BLOCK)].flatMap(([, block]) =>
    runsIn(block ?? '', glyphs),
  );
}

/**
 * Every face the PDF actually draws text with, without repeats.
 *
 * This is the guard on the trap the font question hides. jsPDF answers a style
 * it has not been given — `550normal`, say, which is what svg2pdf asks for when
 * a label is styled `font-weight: 550` — by quietly falling back to one of the
 * standard Latin-1 faces, and the export still produces a file. Reading the
 * text back out does not catch it on its own either, because the tables can be
 * right while the drawing beside them is wrong. What catches it is asking which
 * faces were used at all: there should only ever be the one this app embeds.
 *
 * A PDF lists far more fonts than it uses — jsPDF registers all fourteen
 * standard ones whether or not they are drawn with — so this reads the `Tf`
 * operators rather than the font list.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns the `BaseFont` name of every face a piece of text is drawn with
 *
 * @example
 * ```typescript
 * expect(pdfFonts(await readFile(file.path))).toEqual(['Roboto']);
 * ```
 */
export function pdfFonts(bytes: Buffer): readonly string[] {
  const raw = bytes.toString('latin1');
  const faces = facesByResource(raw);
  const used = [...raw.matchAll(TEXT_BLOCK)].flatMap(([, block]) =>
    [...(block ?? '').matchAll(FONT_SELECTED)].map(([, name]) => faces.get(name ?? '')),
  );

  return [...new Set(used.map((face) => face ?? 'unknown'))].sort();
}

/** Each `/F…` resource on the page, pointing at the face behind it. */
function facesByResource(raw: string): ReadonlyMap<string, string> {
  const objects = new Map(
    [...raw.matchAll(OBJECT)].map(([, id, body]) => [id ?? '', body ?? '']),
  );
  const faces = new Map<string, string>();

  for (const [, name, id] of raw.matchAll(FONT_RESOURCE)) {
    const face = /\/BaseFont\s*\/([^\s/>]+)/u.exec(objects.get(id ?? '') ?? '')?.[1];

    if (face !== undefined) {
      faces.set(name ?? '', face);
    }
  }

  return faces;
}

/** Every run of text in one `BT … ET` block. */
function runsIn(block: string, glyphs: ReadonlyMap<number, string>): readonly string[] {
  const hex = [...block.matchAll(HEX_SHOWN)].map(([, digits]) =>
    decodeHex(digits ?? '', glyphs),
  );
  const literal = [...block.matchAll(LITERAL_SHOWN)].map(([text]) => decodeLiteral(text));

  return [...hex, ...literal].filter((run) => run !== '');
}

/**
 * One hex string, turned back into the characters it stands for.
 *
 * The codes are two bytes each because the embedded font is written with
 * `Identity-H` encoding, where a code is a glyph number and the CMap is the
 * only way back to a character.
 */
function decodeHex(digits: string, glyphs: ReadonlyMap<number, string>): string {
  const clean = digits.replace(/\s+/gu, '');
  let text = '';

  for (let at = 0; at + 3 < clean.length; at += 4) {
    const code = Number.parseInt(clean.slice(at, at + 4), 16);

    // A code with no entry in the CMap is a glyph the file cannot say the
    // meaning of. It is kept as a replacement character rather than dropped, so
    // a test can tell "this came out wrong" from "this was never written".
    text += glyphs.get(code) ?? '�';
  }

  return text;
}

/** One literal string, which a built-in font would be drawn with. */
function decodeLiteral(text: string): string {
  return text.slice(1, -1).replace(/\\(.)/gu, '$1');
}

/** Every glyph code in the file, pointing at the text it stands for. */
function unicodeMap(raw: string): ReadonlyMap<number, string> {
  const glyphs = new Map<number, string>();

  for (const [, section] of raw.matchAll(BF_CHARS)) {
    addChars(glyphs, section ?? '');
  }

  for (const [, section] of raw.matchAll(BF_RANGES)) {
    addRanges(glyphs, section ?? '');
  }

  return glyphs;
}

/** The `<code> <text>` pairs of a `beginbfchar` section. */
function addChars(glyphs: Map<number, string>, section: string): void {
  for (const [, code, text] of section.matchAll(
    /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/gu,
  )) {
    glyphs.set(Number.parseInt(code ?? '0', 16), fromUtf16(text ?? ''));
  }
}

/** The `<from> <to> <text>` runs of a `beginbfrange` section. */
function addRanges(glyphs: Map<number, string>, section: string): void {
  for (const [, from, to, text] of section.matchAll(
    /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/gu,
  )) {
    const start = Number.parseInt(from ?? '0', 16);
    const end = Number.parseInt(to ?? '0', 16);
    const first = Number.parseInt(text ?? '0', 16);

    for (let code = start; code <= end; code += 1) {
      glyphs.set(code, String.fromCodePoint(first + (code - start)));
    }
  }
}

/** A run of UTF-16 code units, written as hex, as the string it spells. */
function fromUtf16(hex: string): string {
  const units: number[] = [];

  for (let at = 0; at + 3 < hex.length; at += 4) {
    units.push(Number.parseInt(hex.slice(at, at + 4), 16));
  }

  return String.fromCharCode(...units);
}
