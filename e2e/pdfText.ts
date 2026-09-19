/**
 * Reading the text back out of a PDF the app produced.
 *
 * Criterion 2 of Task 07 is that every label is readable, and the trap it hides
 * is that a PDF carries its own font: jsPDF's built-in faces are Latin-1, so a
 * Greek label can come out of the file as accented Latin, or as nothing at all,
 * while the export looks like it worked. That cannot be checked by eye and it
 * cannot be checked by looking at what went in. It has to be read back out.
 *
 * **Why this is a page of code here rather than a package.** Reading these
 * files needs three things and no more: the `BT … ET` blocks a page's content
 * stream is made of, the `/ToUnicode` CMap that says which glyph is which
 * character, and the two literal strings the file carries as metadata — its
 * title and its language. jsPDF writes them all uncompressed and plainly, so a
 * parser that handles what
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

/**
 * The title the file carries as metadata, rather than as ink on page 1.
 *
 * This is what a viewer puts in its window bar and what a screen reader
 * announces the document as, and it is written in the Info dictionary rather
 * than drawn, so no font is involved: a title jsPDF cannot spell in Latin-1 it
 * writes as UTF-16 with a byte-order mark instead, which is what the decoding
 * below is for.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns the title, or an empty string when the file carries none
 *
 * @example
 * ```typescript
 * expect(pdfTitle(await readFile(file.path))).toBe('Order intake');
 * ```
 */
export function pdfTitle(bytes: Buffer): string {
  const literal = literalAfter(bytes.toString('latin1'), '/Title');

  return literal === null ? '' : fromPdfString(literal);
}

/**
 * The language the file declares, which is the `/Lang` entry of its catalog.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns the language tag, or an empty string when the file declares none
 */
export function pdfLanguage(bytes: Buffer): string {
  return literalAfter(bytes.toString('latin1'), '/Lang') ?? '';
}

/**
 * The literal string that follows one key, with its escapes left in place.
 *
 * It is read a character at a time rather than with one expression, because a
 * `)` inside the string is escaped and a regular expression that stops at the
 * first one would cut a title in half.
 */
function literalAfter(raw: string, key: string): string | null {
  const opens = raw.indexOf(`${key} (`);

  if (opens === -1) {
    return null;
  }

  let text = '';

  for (let at = opens + key.length + 2; at < raw.length; at += 1) {
    const character = raw[at] ?? '';

    if (character === '\\') {
      text += raw[at + 1] ?? '';
      at += 1;
      continue;
    }

    if (character === ')') {
      break;
    }

    text += character;
  }

  return text;
}

/** One PDF text string as the characters it stands for. */
function fromPdfString(literal: string): string {
  if (!literal.startsWith('þÿ')) {
    return literal;
  }

  let text = '';

  for (let at = 2; at + 1 < literal.length; at += 2) {
    text += String.fromCharCode(
      (literal.charCodeAt(at) << 8) + literal.charCodeAt(at + 1),
    );
  }

  return text;
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

/**
 * One run of text the PDF draws, and how large it really prints.
 *
 * `nominal` is what the `Tf` operator asked for and `points` is what the
 * reader sees, and for the drawing they are not the same number: svg2pdf draws
 * a label at the size the SVG says — 14, 12 or 11 — and puts the scale into the
 * text matrix, so a 6 pt type line is written into the file as `/F15 11 Tf`
 * with a matrix of 0.545. Reading only the operand would report the drawing as
 * printing at its own pixel sizes whatever it had been shrunk to, which is the
 * measurement this cycle exists to stop trusting.
 */
export interface PdfDrawnText {
  /** Which page it is drawn on, counted from one. */
  readonly page: number;
  /** The size the `Tf` operator asked for, before any matrix. */
  readonly nominal: number;
  /** How large it actually prints on the page, in points. */
  readonly points: number;
}

/** The content-stream operators this reads, and nothing else. */
const CONTENT_TOKEN =
  /<[0-9a-fA-F\s]*>|\((?:\.|[^\()])*\)|[-+]?[\d.]+|\/[^\s/[\]<>()]+|[A-Za-z'"*]+/gu;

/** A page and the object its content stream lives in: `/Contents 4 0 R`. */
const PAGE_CONTENTS = /\/Type\s*\/Page[^s][\s\S]{0,400}?\/Contents\s+(\d+)\s+0\s+R/gu;

/** The two matrices that decide how large a piece of text prints. */
type Matrix = readonly [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/**
 * Every piece of text the PDF draws, with the size it prints at.
 *
 * **This is the measurement the whole cycle turns on**, so it is taken off the
 * bytes rather than off the plan (D68, D79): a plan that says 6 pt and a file
 * that draws 3.5 pt is exactly the failure that went unnoticed for two tasks.
 * The size a reader sees is the `Tf` operand scaled by the text matrix and the
 * current transformation matrix together, so all three are tracked — `q` and
 * `Q` for the graphics-state stack, `cm` for the transformation, `Tm` for the
 * text matrix, which `BT` resets.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns one entry per run of text drawn, in page order
 *
 * @example
 * ```typescript
 * const drawing = pdfDrawnText(bytes).filter((run) => run.nominal === 11);
 * expect(Math.min(...drawing.map((run) => run.points))).toBeGreaterThanOrEqual(6);
 * ```
 */
export function pdfDrawnText(bytes: Buffer): readonly PdfDrawnText[] {
  const raw = bytes.toString('latin1');

  return pageStreams(raw).flatMap((stream, index) => runsDrawnIn(stream, index + 1));
}

/**
 * How many pages the file has.
 *
 * Counted from the page objects rather than from the plan, for D68's reason.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns the number of pages
 */
export function pdfPageCount(bytes: Buffer): number {
  return pageStreams(bytes.toString('latin1')).length;
}

/** Each page's content stream, in page order. */
function pageStreams(raw: string): readonly string[] {
  const streams = new Map<string, string>();

  for (const [, id, body] of raw.matchAll(
    /(\d+)\s+0\s+obj\s*<<[^>]*>>\s*stream\r?\n([\s\S]*?)endstream/gu,
  )) {
    streams.set(id ?? '', body ?? '');
  }

  return [...raw.matchAll(PAGE_CONTENTS)].map(
    ([, contents]) => streams.get(contents ?? '') ?? '',
  );
}

/**
 * One content stream, walked operator by operator.
 *
 * Strings are matched before numbers so that a hex glyph run or a literal
 * label cannot be read as an operand, and the operand list is kept whole
 * rather than cleared, because a PDF operator takes the operands immediately
 * before it and nothing further back.
 */
function runsDrawnIn(stream: string, page: number): readonly PdfDrawnText[] {
  const drawn: PdfDrawnText[] = [];
  const saved: Matrix[] = [];
  const numbers: number[] = [];
  let transform = IDENTITY;
  let text = IDENTITY;
  let nominal = 0;

  for (const [token] of stream.matchAll(CONTENT_TOKEN)) {
    if (/^[-+]?[\d.]+$/u.test(token)) {
      numbers.push(Number.parseFloat(token));
      continue;
    }

    if (token === 'q') {
      saved.push(transform);
    } else if (token === 'Q') {
      transform = saved.pop() ?? IDENTITY;
    } else if (token === 'cm') {
      transform = times(lastSix(numbers), transform);
    } else if (token === 'BT') {
      text = IDENTITY;
    } else if (token === 'Tm') {
      text = lastSix(numbers);
    } else if (token === 'Tf') {
      nominal = numbers[numbers.length - 1] ?? 0;
    } else if (token === 'Tj' || token === 'TJ' || token === "'" || token === '"') {
      drawn.push({
        page,
        nominal,
        points: nominal * scaleOf(text) * scaleOf(transform),
      });
    }

    if (!token.startsWith('<') && !token.startsWith('(') && !token.startsWith('/')) {
      numbers.length = 0;
    }
  }

  return drawn;
}

/** The last six numbers seen, which is what a matrix operator takes. */
function lastSix(numbers: readonly number[]): Matrix {
  const six = numbers.slice(-6);

  return six.length === 6 ? (six as unknown as Matrix) : IDENTITY;
}

/** One matrix concatenated into another, in PDF's own order. */
function times(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

/**
 * How much a matrix scales by, whatever it also rotates or flips.
 *
 * The square root of the determinant's magnitude, which is the factor a length
 * is multiplied by when the matrix scales both axes alike — and svg2pdf's do,
 * because a drawing is never stretched out of its own proportions.
 */
function scaleOf(matrix: Matrix): number {
  return Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
}
