import { describe, expect, it } from 'vitest';

import { readFontCoverage } from './fontCoverage';
import { ROBOTO_REGULAR_BASE64 } from './fonts/robotoRegular';

/**
 * Which characters the font the PDF export carries can actually draw.
 *
 * This is the half of Task 07's round-two defect a unit test can reach, and it
 * is arithmetic over bytes with no DOM anywhere near it, so it belongs here
 * rather than in the walk. Two kinds of test sit below. The first reads the
 * real embedded face and pins facts about it — that it covers Greek and
 * Cyrillic, and that it does not cover the arrows an architecture diagram is
 * full of — because those facts are what the export's behaviour turns on. The
 * second reads made-up fonts of a few dozen bytes each, because only a font
 * built on purpose can put a `.notdef` glyph in the middle of a mapped range or
 * offer a subtable that is not Unicode at all.
 *
 * The rule being matched is jsPDF's own, read out of its source: a character is
 * drawn when the font's Unicode `cmap` maps it to a glyph that is not glyph 0,
 * where "Unicode" means platform 3 encoding 1 format 4, or platform 0 format 4,
 * and nothing else — jsPDF understands no other subtable. Anything it cannot
 * map it writes into the file as nothing at all.
 */

/** One run of code points in a made-up font, and the glyphs they map to. */
interface Segment {
  readonly from: number;
  readonly to: number;
  readonly glyphs: readonly number[];
}

/** One `cmap` subtable of a made-up font; `segments` makes it a format 4. */
interface Subtable {
  readonly platform: number;
  readonly encoding: number;
  readonly segments?: readonly Segment[];
}

function covers(font: string, text: string): boolean {
  return readFontCoverage(font).has(text.codePointAt(0) ?? 0);
}

describe('the face the export embeds', () => {
  const coverage = readFontCoverage(ROBOTO_REGULAR_BASE64);

  function has(text: string): boolean {
    return coverage.has(text.codePointAt(0) ?? 0);
  }

  it('covers the scripts the export promises: Latin, Greek and Cyrillic', () => {
    for (const character of ['A', 'z', '9', 'é', 'ß', 'Π', 'ω', 'Д', 'я']) {
      expect(has(character), `${character} should be drawable`).toBe(true);
    }
  });

  it('covers the punctuation and signs a design is written with', () => {
    for (const character of ['—', '«', '»', '≥', '±', '§', '°', '€', '…', '•', '×']) {
      expect(has(character), `${character} should be drawable`).toBe(true);
    }
  });

  it('does not cover the arrows and marks a diagram is full of', () => {
    // The round-one defect, stated as a fact about the font rather than as a
    // report about the file: `Gateway → Queue` is an ordinary label in a tool
    // for drawing systems, and the arrow in it has no glyph here.
    for (const character of ['→', '←', '↔', '⇒', '✓', '✗', '∈']) {
      expect(has(character), `${character} should not be drawable`).toBe(false);
    }
  });

  it('does not cover the scripts no face this size covers', () => {
    for (const character of ['東', '京', 'ا', 'א', 'अ']) {
      expect(has(character), `${character} should not be drawable`).toBe(false);
    }
  });

  it('covers nothing above the basic plane, which jsPDF cannot look up at all', () => {
    // jsPDF walks a string one UTF-16 code unit at a time, so a character from
    // beyond the basic plane arrives as two halves of a surrogate pair, and
    // neither half is ever in a `cmap`.
    expect([...coverage].every((point) => point <= 0xffff)).toBe(true);
    expect(has('😀')).toBe(false);
  });
});

describe('reading a font that was built to be read', () => {
  it('covers a code point the Unicode subtable maps to a glyph', () => {
    const font = fontOf([
      {
        platform: 3,
        encoding: 1,
        segments: [{ from: 0x41, to: 0x43, glyphs: [5, 6, 7] }],
      },
    ]);

    expect(covers(font, 'A')).toBe(true);
    expect(covers(font, 'C')).toBe(true);
    expect(covers(font, 'D')).toBe(false);
  });

  it('treats a code point mapped to glyph 0 as one the font cannot draw', () => {
    // `.notdef` is how a font says "not this one" in the middle of a range that
    // otherwise maps, and jsPDF reads it as nothing to draw.
    const font = fontOf([
      {
        platform: 3,
        encoding: 1,
        segments: [{ from: 0x41, to: 0x43, glyphs: [5, 0, 7] }],
      },
    ]);

    expect(covers(font, 'A')).toBe(true);
    expect(covers(font, 'B')).toBe(false);
    expect(covers(font, 'C')).toBe(true);
  });

  it('reads the Unicode subtable and not the one beside it', () => {
    // A Mac Roman subtable maps all 256 of its codes, so a reader that took the
    // first subtable it found would call every low code point drawable.
    const font = fontOf([
      { platform: 1, encoding: 0 },
      { platform: 3, encoding: 1, segments: [{ from: 0x41, to: 0x41, glyphs: [5] }] },
    ]);

    expect(covers(font, 'A')).toBe(true);
    expect(covers(font, 'B')).toBe(false);
  });

  it('refuses a font with no Unicode subtable rather than reporting nothing', () => {
    // An empty coverage would mark every character in the design as undrawable
    // and quietly produce a document of nothing but placeholders, which is a
    // worse answer than an export that says it failed.
    expect(() => readFontCoverage(fontOf([{ platform: 1, encoding: 0 }]))).toThrow(
      /embedded font/iu,
    );
  });

  it('refuses bytes that are not a font at all', () => {
    expect(() => readFontCoverage('bm90IGEgZm9udA==')).toThrow(/embedded font/iu);
  });

  it('refuses a string that is not base64', () => {
    expect(() => readFontCoverage('not base64 either')).toThrow(/embedded font/iu);
  });
});

/** A whole font, as base64, holding nothing but the `cmap` under test. */
function fontOf(subtables: readonly Subtable[]): string {
  const bodies = subtables.map((subtable) =>
    subtable.segments === undefined ? macRoman() : format4(subtable.segments),
  );
  const offsets = startsOf(bodies, 4 + subtables.length * 8);
  const cmap = [
    ...u16(0),
    ...u16(subtables.length),
    ...subtables.flatMap((subtable, index) => [
      ...u16(subtable.platform),
      ...u16(subtable.encoding),
      ...u32(offsets[index] ?? 0),
    ]),
    ...bodies.flat(),
  ];

  return base64Of([
    ...u32(0x0001_0000),
    ...u16(1),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...[...'cmap'].map((letter) => letter.charCodeAt(0)),
    ...u32(0),
    ...u32(12 + 16),
    ...u32(cmap.length),
    ...cmap,
  ]);
}

/** Where each subtable lands, once the ones before it have been laid down. */
function startsOf(
  bodies: readonly (readonly number[])[],
  first: number,
): readonly number[] {
  const starts: number[] = [];
  let next = first;

  for (const body of bodies) {
    starts.push(next);
    next += body.length;
  }

  return starts;
}

/**
 * One format 4 subtable, with every segment reached through the glyph array.
 *
 * `idRangeOffset` is the awkward half of the format — a byte distance measured
 * from its own slot rather than an index — so the made-up fonts go through it
 * throughout, and the plain `idDelta` path is left to the closing segment every
 * format 4 has to end with.
 */
function format4(segments: readonly Segment[]): readonly number[] {
  const count = segments.length + 1;
  const glyphs: number[] = [];
  const rangeOffsets: number[] = [];

  for (const [index, segment] of segments.entries()) {
    rangeOffsets.push((count - index) * 2 + glyphs.length * 2);
    glyphs.push(...segment.glyphs);
  }

  const body = [
    ...u16(count * 2),
    ...u16(0),
    ...u16(0),
    ...u16(0),
    ...segments.flatMap((segment) => u16(segment.to)),
    ...u16(0xffff),
    ...u16(0),
    ...segments.flatMap((segment) => u16(segment.from)),
    ...u16(0xffff),
    ...segments.flatMap(() => u16(0)),
    ...u16(1),
    ...rangeOffsets.flatMap((offset) => u16(offset)),
    ...u16(0),
    ...glyphs.flatMap((glyph) => u16(glyph)),
  ];

  return [...u16(4), ...u16(body.length + 6), ...u16(0), ...body];
}

/** A subtable that is not Unicode: 256 codes, every one of them mapped. */
function macRoman(): readonly number[] {
  return [...u16(0), ...u16(262), ...u16(0), ...Array.from({ length: 256 }, () => 1)];
}

function u16(value: number): readonly number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function u32(value: number): readonly number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function base64Of(bytes: readonly number[]): string {
  return btoa(bytes.map((byte) => String.fromCharCode(byte)).join(''));
}
