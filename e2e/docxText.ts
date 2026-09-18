import { inflateRawSync } from 'node:zlib';

/**
 * Reading a Word document the app produced back out of its own bytes.
 *
 * Criterion 2 of Task 08 is that the file shows the same nodes and edges the
 * preview shows, as editable text. That cannot be checked by looking at what
 * went in: a `.docx` is a zip of XML, and the ways it can go wrong are all on
 * the way out. A control character is written through verbatim and the file
 * stops opening; a line break written as a `\n` renders as a space; a table
 * written with percentage widths lays out differently in different readers.
 * So the walk opens the file it produced and reads it, exactly as
 * `e2e/pdfText.ts` does for the PDF (D68).
 *
 * **Why this is a page of code here rather than a package.** It needs three
 * things and no more: the zip's central directory, `inflateRaw`, which Node
 * carries, and enough XML to find `w:t`, `w:br`, `w:tbl` and a handful of
 * attributes. A zip reader for the files one library writes is short enough to
 * read in one sitting, and the gate on this task was deliberate about which
 * packages get added — the one that was added is the product's, not the test
 * suite's. `pdfText.ts` set the precedent and it held.
 *
 * **It is strict on purpose.** It refuses a zip it does not understand rather
 * than returning nothing: a reader that quietly finds no text turns a broken
 * export into a passing test, which is the exact failure shape Task 07 lost
 * two rounds to.
 *
 * It reads what `docx` writes and nothing more: no zip64, no encryption, no
 * data descriptors. If the export ever starts producing those, this fails
 * loudly, which is the right way round.
 */

/** The four-byte signatures a zip is found by. */
const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/** The two compression methods `docx` ever writes: stored, and deflate. */
const STORED = 0;
const DEFLATED = 8;

/** One `<w:p>` … `</w:p>`, which is one paragraph of the document. */
const PARAGRAPH = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gu;

/** One `<w:tbl>` … `</w:tbl>`, which is one real Word table. */
const TABLE = /<w:tbl(?:\s[^>]*)?>([\s\S]*?)<\/w:tbl>/gu;

/** One row and one cell of such a table. */
const TABLE_ROW = /<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/gu;
const TABLE_CELL = /<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/gu;

/** The pieces a run is made of: text, a line break, and a tab. */
const RUN_PIECE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:br\s*\/>|<w:tab\s*\/>/gu;

/** One whole file inside the package, by name. */
export type DocxParts = ReadonlyMap<string, Buffer>;

/** One cell of a table, as the text a reader would see in it. */
export type DocxRow = readonly string[];

/** One table: its rows, headings first, as a reader would read them. */
export type DocxTable = readonly DocxRow[];

/**
 * Every file in the package, by its name inside it.
 *
 * @param bytes - the `.docx` exactly as it was downloaded
 * @returns each part's bytes, keyed by its path inside the package
 * @throws if the bytes are not a zip this reader understands
 *
 * @example
 * ```typescript
 * const parts = docxParts(await readFile(file.path));
 * [...parts.keys()]; // ['[Content_Types].xml', 'word/document.xml', …]
 * ```
 */
export function docxParts(bytes: Buffer): DocxParts {
  const directory = bytes.lastIndexOf(signature(END_OF_DIRECTORY));

  if (directory === -1) {
    throw new Error('These bytes do not end in a zip directory.');
  }

  const count = bytes.readUInt16LE(directory + 10);
  const parts = new Map<string, Buffer>();
  let at = bytes.readUInt32LE(directory + 16);

  for (let entry = 0; entry < count; entry += 1) {
    if (bytes.readUInt32LE(at) !== DIRECTORY_ENTRY) {
      throw new Error(`Zip entry ${entry} is not where the directory said it was.`);
    }

    const nameLength = bytes.readUInt16LE(at + 28);
    const name = bytes.toString('utf8', at + 46, at + 46 + nameLength);

    parts.set(
      name,
      contentsOf(bytes, {
        offset: bytes.readUInt32LE(at + 42),
        method: bytes.readUInt16LE(at + 10),
        compressed: bytes.readUInt32LE(at + 20),
        name,
      }),
    );

    at += 46 + nameLength + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
  }

  return parts;
}

/**
 * One part of the package, as text.
 *
 * @param bytes - the `.docx` exactly as it was downloaded
 * @param name - the path inside it, e.g. `word/document.xml`
 * @returns the part's text
 * @throws if the package has no such part
 */
export function docxPart(bytes: Buffer, name: string): string {
  const part = docxParts(bytes).get(name);

  if (part === undefined) {
    throw new Error(`The document has no ${name}.`);
  }

  return part.toString('utf8');
}

/**
 * Every paragraph the document holds, in the order a reader meets them.
 *
 * A line break inside a paragraph comes back as a `\n` and a tab as a `\t`, so
 * a label written on two lines reads as two lines here — which is the whole
 * point, because a line feed written into the XML instead of a break would
 * come back as a space and this would say so.
 *
 * @param bytes - the `.docx` exactly as it was downloaded
 * @returns one string per paragraph, table cells included
 *
 * @example
 * ```typescript
 * expect(docxText(bytes)).toContain('Order intake');
 * ```
 */
export function docxText(bytes: Buffer): readonly string[] {
  return paragraphsIn(docxPart(bytes, 'word/document.xml'));
}

/**
 * Every real Word table in the document, as rows of cell text.
 *
 * "Editable text" is criterion 2's phrase, and a table is how it is kept: a
 * picture of a table would come back from here as nothing at all.
 *
 * @param bytes - the `.docx` exactly as it was downloaded
 * @returns each table, each row, each cell's text
 */
export function docxTables(bytes: Buffer): readonly DocxTable[] {
  const document = docxPart(bytes, 'word/document.xml');

  return [...document.matchAll(TABLE)].map(([, table]) =>
    [...(table ?? '').matchAll(TABLE_ROW)].map(([, row]) =>
      [...(row ?? '').matchAll(TABLE_CELL)].map(([, cell]) =>
        paragraphsIn(cell ?? '').join('\n'),
      ),
    ),
  );
}

/**
 * The title the file declares about itself, rather than the one it prints.
 *
 * Without it a reader's window bar shows the file name and a screen reader has
 * no document title to announce (D71). It is metadata rather than ink, so it
 * is not drawn by any font.
 */
export function docxTitle(bytes: Buffer): string {
  return firstMatch(
    docxPart(bytes, 'docProps/core.xml'),
    /<dc:title>([\s\S]*?)<\/dc:title>/u,
  );
}

/** The description the file declares, which is the drawing's own words (D28). */
export function docxDescription(bytes: Buffer): string {
  return firstMatch(
    docxPart(bytes, 'docProps/core.xml'),
    /<dc:description>([\s\S]*?)<\/dc:description>/u,
  );
}

/** The language every run declares, for a reader's spell-checker and voice. */
export function docxLanguage(bytes: Buffer): string {
  const match = /<w:lang\s[^>]*w:val="([^"]*)"/u.exec(docxPart(bytes, 'word/styles.xml'));

  return match?.[1] ?? '';
}

/** The page the document is written on, in DXA, as the section declares it. */
export function docxPageSize(bytes: Buffer): {
  readonly width: number;
  readonly height: number;
  readonly orientation: string;
} {
  const size =
    /<w:pgSz\s([^>]*)\/>/u.exec(docxPart(bytes, 'word/document.xml'))?.[1] ?? '';

  return {
    width: Number(/w:w="(\d+)"/u.exec(size)?.[1] ?? 0),
    height: Number(/w:h="(\d+)"/u.exec(size)?.[1] ?? 0),
    // Word leaves the attribute off when the page is portrait, which is what a
    // missing one means rather than an unknown.
    orientation: /w:orient="(\w+)"/u.exec(size)?.[1] ?? 'portrait',
  };
}

/**
 * Every picture the package carries, by the name it is filed under.
 *
 * A zip lists its folders as entries of their own, so `word/media/` is in the
 * directory beside the file inside it; a name ending in a slash is a folder
 * and not a picture.
 */
export function docxImages(bytes: Buffer): readonly string[] {
  return [...docxParts(bytes).keys()].filter(
    (name) => name.startsWith('word/media/') && !name.endsWith('/'),
  );
}

/** The alt text written on the first picture, for a reader who cannot see it. */
export function docxImageAltText(bytes: Buffer): string {
  return docxImageAltTexts(bytes)[0] ?? '';
}

/** The alt text of every picture, in the order the document places them. */
export function docxImageAltTexts(bytes: Buffer): readonly string[] {
  return [
    ...docxPart(bytes, 'word/document.xml').matchAll(/<wp:docPr\s([^>]*?)\/?>/gu),
  ].map(([, properties]) =>
    unescapeXml(/descr="([^"]*)"/u.exec(properties ?? '')?.[1] ?? ''),
  );
}

/** How many EMU make one inch, which is how OOXML places a picture. */
const EMU_PER_INCH = 914_400;

/** One picture: the pixels it holds, and the size it is placed at. */
export interface DocxPicture {
  /** The PNG's own dimensions, read out of its header. */
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  /** Where it is placed on the page, in inches. */
  readonly placedInches: { readonly width: number; readonly height: number };
}

/**
 * Every picture in the package, with its own size and its placed size.
 *
 * The two are separate questions and the defect that opened this cycle lived
 * in the gap between them: a picture placed a hundredth of an inch wide was
 * painted three pixels wide to match, so the placed size was driving the
 * raster. Reading both off the bytes is the only way to see that they have
 * stopped agreeing on purpose.
 *
 * The pixel size comes from the PNG's own IHDR, which is the first chunk of
 * every PNG and holds the width and height as two big-endian 32-bit integers
 * at a fixed offset. The placed size comes from the `wp:extent` the document
 * puts the picture in, in EMU.
 *
 * @param bytes - the file exactly as it was downloaded
 * @returns one entry per picture, in the order the document places them
 *
 * @example
 * ```typescript
 * for (const picture of docxPictures(bytes)) {
 *   expect(Math.min(picture.pixelWidth, picture.pixelHeight)).toBeGreaterThanOrEqual(200);
 * }
 * ```
 */
export function docxPictures(bytes: Buffer): readonly DocxPicture[] {
  const parts = docxParts(bytes);
  const extents = [
    ...docxPart(bytes, 'word/document.xml').matchAll(
      /<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"/gu,
    ),
  ];

  return docxImages(bytes).map((name, index) => {
    const png = parts.get(name) ?? Buffer.alloc(0);
    const extent = extents[index];

    return {
      // A PNG's IHDR is always the first chunk: an 8-byte signature, a 4-byte
      // length, a 4-byte type, then the width and height.
      pixelWidth: png.length >= 24 ? png.readUInt32BE(16) : 0,
      pixelHeight: png.length >= 24 ? png.readUInt32BE(20) : 0,
      placedInches: {
        width: Number(extent?.[1] ?? 0) / EMU_PER_INCH,
        height: Number(extent?.[2] ?? 0) / EMU_PER_INCH,
      },
    };
  });
}

/** How many pages the document forces, by counting the breaks it writes. */
export function docxPageBreaks(bytes: Buffer): number {
  return [...docxPart(bytes, 'word/document.xml').matchAll(/<w:pageBreakBefore\s*\/>/gu)]
    .length;
}

/** Every paragraph inside one piece of the document's XML. */
function paragraphsIn(xml: string): readonly string[] {
  return [...xml.matchAll(PARAGRAPH)].map(([, body]) => runsIn(body ?? ''));
}

/** One paragraph's text, with its breaks and tabs as the characters they are. */
function runsIn(xml: string): string {
  let text = '';

  for (const [piece, run] of xml.matchAll(RUN_PIECE)) {
    if (run !== undefined) {
      text += unescapeXml(run);
      continue;
    }

    text += piece.startsWith('<w:br') ? '\n' : '\t';
  }

  return text;
}

/** One capture of one pattern, or an empty string when it does not match. */
function firstMatch(xml: string, pattern: RegExp): string {
  return unescapeXml(pattern.exec(xml)?.[1] ?? '');
}

/** The five named entities XML has, and any numeric reference beside them. */
function unescapeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/gu, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/gu, (_, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, 10)),
    )
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&');
}

/** One entry's bytes, found through its local header and decompressed. */
function contentsOf(
  bytes: Buffer,
  entry: {
    readonly offset: number;
    readonly method: number;
    readonly compressed: number;
    readonly name: string;
  },
): Buffer {
  if (bytes.readUInt32LE(entry.offset) !== LOCAL_HEADER) {
    throw new Error(`${entry.name} is not where its directory entry said it was.`);
  }

  // The local header repeats the name and extra fields at its own lengths,
  // which are not always the directory's, so the data is found from these.
  const start =
    entry.offset +
    30 +
    bytes.readUInt16LE(entry.offset + 26) +
    bytes.readUInt16LE(entry.offset + 28);
  const raw = bytes.subarray(start, start + entry.compressed);

  if (entry.method === STORED) {
    return Buffer.from(raw);
  }

  if (entry.method === DEFLATED) {
    return inflateRawSync(raw);
  }

  throw new Error(`${entry.name} is compressed a way this reader does not know.`);
}

/** One little-endian signature, for finding a record in the bytes. */
function signature(value: number): Buffer {
  const bytes = Buffer.alloc(4);

  bytes.writeUInt32LE(value);

  return bytes;
}
