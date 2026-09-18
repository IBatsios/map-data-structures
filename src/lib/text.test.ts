import { describe, expect, it } from 'vitest';

import { AVERAGE_GLYPH_ADVANCE, estimateTextWidth, wrapText } from './text';

describe('estimateTextWidth', () => {
  it('measures nothing as nothing', () => {
    expect(estimateTextWidth('', 14)).toBe(0);
  });

  it('measures a string as its length times the average glyph advance', () => {
    expect(estimateTextWidth('abcd', 10)).toBeCloseTo(4 * 10 * AVERAGE_GLYPH_ADVANCE);
  });

  it('measures a longer string as wider than a shorter one at the same size', () => {
    expect(estimateTextWidth('Order queue', 14)).toBeGreaterThan(
      estimateTextWidth('Queue', 14),
    );
  });

  it('measures the same string as wider at a larger size', () => {
    expect(estimateTextWidth('Public API', 18)).toBeGreaterThan(
      estimateTextWidth('Public API', 12),
    );
  });

  it('counts whitespace, because a label made of spaces still takes room', () => {
    expect(estimateTextWidth('   ', 14)).toBeGreaterThan(0);
  });
});

describe('wrapText', () => {
  const FONT_SIZE = 14;

  it('returns one empty line for empty text, so a blank label still has a line', () => {
    expect(wrapText('', 200, FONT_SIZE)).toEqual(['']);
  });

  it('returns text that already fits as one line, unchanged', () => {
    expect(wrapText('Public API', 200, FONT_SIZE)).toEqual(['Public API']);
  });

  it('returns whitespace-only text verbatim rather than trimming it away', () => {
    // The schema lets "   " through today (Task 04 owns whether it should).
    // Until then the drawing has to show what the file said, spaces and all.
    expect(wrapText('   ', 200, FONT_SIZE)).toEqual(['   ']);
  });

  it('breaks between words once the text is wider than the limit', () => {
    const lines = wrapText('alpha beta gamma delta epsilon', 90, FONT_SIZE);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line).not.toMatch(/^\s|\s$/);
    }
  });

  it('breaks inside a word that is too wide on its own rather than overflowing', () => {
    const lines = wrapText('supercalifragilisticexpialidocious', 90, FONT_SIZE);

    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('supercalifragilisticexpialidocious');
  });

  it('keeps every line within the limit', () => {
    const lines = wrapText('alpha beta gamma delta epsilon zeta', 90, FONT_SIZE);

    for (const line of lines) {
      const fits = estimateTextWidth(line, FONT_SIZE) <= 90;
      expect(fits || line.length === 1).toBe(true);
    }
  });

  it('loses no character: the wrapped lines still spell the original text', () => {
    const text = 'publishes order to the downstream fulfilment queue';
    const lines = wrapText(text, 120, FONT_SIZE);

    expect(lines.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
  });
});
