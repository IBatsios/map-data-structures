/**
 * Which characters the font an exported PDF carries can actually draw.
 *
 * **Why this exists.** A PDF is the one format in this project that carries its
 * own font, and no font of a sensible size covers every script. jsPDF's answer
 * to a character its font has no glyph for is to write nothing at all: the
 * character is not drawn in the picture and not written in the tables either,
 * so no copy of it survives anywhere in the file while the export still reports
 * success. `API gateway (東京)` arrives as `API gateway ()`, which reads as a
 * complete label — and that is intake 5.2's "mislabeled" rather than an honest
 * limit. The scope is wider than the scripts: the embedded face has no arrow
 * either, and `Gateway → Queue` is a label a tool for drawing systems will meet
 * every day.
 *
 * Knowing *which* characters those are is the whole of the fix. With that, the
 * export can put a visible mark where each one was (`drawableText.ts`) and the
 * page can say so afterwards, instead of the loss being silent.
 *
 * **The rule here is jsPDF's rule, not the OpenType specification's.** What
 * matters is not what the font could express to a capable renderer but what
 * jsPDF will look up, which its source settles:
 *
 * - it reads the first `cmap` subtable that is platform 3 encoding 1 format 4,
 *   or platform 0 format 4, and no other kind — a format 12 subtable, which is
 *   where a font keeps anything above the basic plane, it never consults;
 * - it looks a character up one UTF-16 code unit at a time, so no character
 *   beyond the basic plane can ever be found;
 * - a code point mapped to glyph 0, `.notdef`, is one it draws nothing for.
 *
 * So this module reads exactly that subtable and reports exactly those code
 * points. Any other reading would be a prediction that disagrees with the file
 * the user gets.
 *
 * **If the font cannot be read, this throws rather than reporting nothing.** An
 * empty coverage would mark every character in the design as undrawable and
 * produce a document of nothing but placeholders; a throw becomes the page's
 * own `EXPORT_FAILED` sentence (D43), which is the honest answer.
 */

/** Every code point the font can draw, as jsPDF will look them up. */
export type FontCoverage = ReadonlySet<number>;

/** How long a table directory entry is, and where the first one starts. */
const DIRECTORY_START = 12;
const DIRECTORY_ENTRY = 16;

/** The one table this module reads. */
const CMAP = 'cmap';

/** The `cmap` subtable formats and platforms jsPDF is willing to look up in. */
const UNICODE_FORMAT = 4;
const WINDOWS_PLATFORM = 3;
const WINDOWS_BMP_ENCODING = 1;
const UNICODE_PLATFORM = 0;

/** The last segment of every format 4 subtable, which maps nothing. */
const LAST_SEGMENT = 0xffff;

/**
 * Reads which characters a font can draw out of the font itself.
 *
 * @param base64Font - the font file, base64-encoded, exactly as it is handed to
 *   jsPDF's virtual file system
 * @returns every code point the font maps to a real glyph
 * @throws if the bytes are not a font this reader understands, or carry no
 *   subtable jsPDF would look a character up in; the page turns that into its
 *   own sentence rather than showing this one (D43)
 *
 * @example
 * ```typescript
 * const coverage = readFontCoverage(ROBOTO_REGULAR_BASE64);
 * coverage.has('Π'.codePointAt(0)!); // true
 * coverage.has('→'.codePointAt(0)!); // false
 * ```
 */
export function readFontCoverage(base64Font: string): FontCoverage {
  try {
    const font = fontBytes(base64Font);
    const cmap = tableAt(font, CMAP);

    return codePointsIn(font, unicodeSubtableIn(font, cmap));
  } catch (cause) {
    throw new Error('The embedded font could not be read.', { cause });
  }
}

/** The file as bytes, ready to be read a field at a time. */
function fontBytes(base64Font: string): DataView {
  const binary = atob(base64Font);
  const bytes = new Uint8Array(binary.length);

  for (let at = 0; at < binary.length; at += 1) {
    bytes[at] = binary.charCodeAt(at);
  }

  return new DataView(bytes.buffer);
}

/**
 * Where one table of the font begins.
 *
 * A font opens with a directory of four-letter tags and the offset of each,
 * which is the only way in: nothing about a table's position is fixed.
 */
function tableAt(font: DataView, tag: string): number {
  const tables = font.getUint16(4);

  for (let index = 0; index < tables; index += 1) {
    const entry = DIRECTORY_START + index * DIRECTORY_ENTRY;

    if (tagAt(font, entry) === tag) {
      return font.getUint32(entry + 8);
    }
  }

  throw new Error(`The font has no ${tag} table.`);
}

/** The four letters a directory entry names its table with. */
function tagAt(font: DataView, entry: number): string {
  return String.fromCharCode(
    font.getUint8(entry),
    font.getUint8(entry + 1),
    font.getUint8(entry + 2),
    font.getUint8(entry + 3),
  );
}

/**
 * The subtable jsPDF would look a character up in.
 *
 * The first match wins, which is jsPDF's own order: it walks the subtables in
 * the order the font lists them and keeps the first Unicode one it sees. A font
 * may well carry others — a Mac Roman subtable maps all 256 of its codes, and
 * reading that one instead would call half the design drawable that is not.
 */
function unicodeSubtableIn(font: DataView, cmap: number): number {
  const subtables = font.getUint16(cmap + 2);

  for (let index = 0; index < subtables; index += 1) {
    const entry = cmap + 4 + index * 8;
    const platform = font.getUint16(entry);
    const encoding = font.getUint16(entry + 2);
    const subtable = cmap + font.getUint32(entry + 4);

    if (font.getUint16(subtable) !== UNICODE_FORMAT) {
      continue;
    }

    if (
      (platform === WINDOWS_PLATFORM && encoding === WINDOWS_BMP_ENCODING) ||
      platform === UNICODE_PLATFORM
    ) {
      return subtable;
    }
  }

  throw new Error('The font carries no Unicode character map.');
}

/**
 * Every code point one format 4 subtable maps to a glyph.
 *
 * The format is segments of code points, each with either a delta to add to the
 * code or an offset into a shared array of glyph numbers. `idRangeOffset` is
 * the awkward half: it is a byte distance measured from its own slot rather
 * than an index, which is why the arithmetic below looks the way it does.
 */
function codePointsIn(font: DataView, subtable: number): FontCoverage {
  const segments = font.getUint16(subtable + 6) / 2;
  const ends = subtable + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const offsets = deltas + segments * 2;
  const covered = new Set<number>();

  for (let index = 0; index < segments; index += 1) {
    const first = font.getUint16(starts + index * 2);
    const last = font.getUint16(ends + index * 2);

    if (first === LAST_SEGMENT) {
      continue;
    }

    for (let point = first; point <= last; point += 1) {
      if (glyphFor(font, { point, first, index, deltas, offsets }) !== 0) {
        covered.add(point);
      }
    }
  }

  return covered;
}

/** Everything one code point's glyph number is worked out from. */
interface GlyphLookup {
  readonly point: number;
  readonly first: number;
  readonly index: number;
  readonly deltas: number;
  readonly offsets: number;
}

/** The glyph one code point maps to, or 0 when the font draws nothing for it. */
function glyphFor(font: DataView, lookup: GlyphLookup): number {
  const { point, first, index, deltas, offsets } = lookup;
  const slot = offsets + index * 2;
  const offset = font.getUint16(slot);
  const delta = font.getUint16(deltas + index * 2);

  if (offset === 0) {
    return (point + delta) & 0xffff;
  }

  const glyph = font.getUint16(slot + offset + (point - first) * 2);

  return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
}
