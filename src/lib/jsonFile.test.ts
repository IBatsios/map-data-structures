import { describe, expect, it } from 'vitest';

import { looksLikeJsonFile } from './jsonFile';

/**
 * The check that runs while the `File` is still in hand, before a byte of it is
 * read. Everything here is a name and a media type, because that is all a
 * browser knows about a file it has not opened.
 */

describe('looksLikeJsonFile', () => {
  it('accepts the ordinary case: a .json name and a JSON media type', () => {
    // Act, Assert
    expect(looksLikeJsonFile('design.json', 'application/json')).toBe(true);
  });

  it('accepts a .json name when the system offered no media type', () => {
    // Dropping a file often hands over an empty type, and on some systems a
    // .json file arrives as text/plain or as nothing at all.
    // Act, Assert
    expect(looksLikeJsonFile('design.json', '')).toBe(true);
    expect(looksLikeJsonFile('design.json', 'text/plain')).toBe(true);
  });

  it('ignores the case of the extension', () => {
    // Act, Assert
    expect(looksLikeJsonFile('DESIGN.JSON', '')).toBe(true);
  });

  it('accepts a JSON media type even when the name has no extension', () => {
    // Act, Assert
    expect(looksLikeJsonFile('export', 'application/json')).toBe(true);
    expect(looksLikeJsonFile('export', 'text/json')).toBe(true);
    expect(looksLikeJsonFile('export', 'application/vnd.api+json')).toBe(true);
  });

  it('reads a media type that carries parameters', () => {
    // Act, Assert
    expect(looksLikeJsonFile('export', 'application/json; charset=utf-8')).toBe(true);
    expect(looksLikeJsonFile('export', 'APPLICATION/JSON')).toBe(true);
  });

  it('refuses a dropped image, which the picker’s accept never sees', () => {
    // `accept="application/json,.json"` filters the file picker and nothing
    // else: a file dropped on the page bypasses it entirely.
    // Act, Assert
    expect(looksLikeJsonFile('logo.png', 'image/png')).toBe(false);
  });

  it('refuses a file whose real extension is not .json', () => {
    // Act, Assert
    expect(looksLikeJsonFile('design.json.png', 'image/png')).toBe(false);
    expect(looksLikeJsonFile('notes.txt', 'text/plain')).toBe(false);
    expect(looksLikeJsonFile('archive.zip', '')).toBe(false);
  });

  it('refuses a file with neither a name nor a type to go on', () => {
    // Act, Assert
    expect(looksLikeJsonFile('', '')).toBe(false);
  });

  it('accepts an image renamed .json, because the parser is the next check', () => {
    // This check only reads a name and a type, so a binary file called
    // design.json passes it. That is why nothing downstream trusts it.
    // Act, Assert
    expect(looksLikeJsonFile('design.json', 'image/png')).toBe(true);
  });
});
