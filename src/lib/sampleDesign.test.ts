import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { loadDesign } from './loadDesign';
import { SAMPLE_FILE_NAME, SAMPLE_URL } from './sampleDesign';
import { KNOWN_SHAPES, shapeForType } from './shapes';

/**
 * The shipped sample is the app's own example of its format, so it is held to
 * everything the app asks of a file a user wrote — and to two things more,
 * because people copy an example rather than read it.
 *
 * It exists once, at `public/sample.json`. The site serves it, the "Load the
 * sample design" button fetches it, the `/schema` page prints it, and the
 * Playwright walk chooses it off disk. Four uses, one file: two files with the
 * same bytes is the kind of duplicate this project already has enough of.
 *
 * Read off disk with `node:fs` rather than imported, so the test measures the
 * bytes the browser is served rather than something a bundler made from them.
 */

const SAMPLE = readFileSync(
  new URL(`../../public/${SAMPLE_FILE_NAME}`, import.meta.url),
  'utf8',
);

describe('the sample design the site ships', () => {
  it('loads, as any file a user chose would have to', () => {
    // Act / Assert — `loadDesign` throws rather than returning a failure, so a
    // sample that stopped being valid fails here rather than on the page.
    expect(() => loadDesign(SAMPLE)).not.toThrow();
  });

  it('draws at least one node of every kind the app has a silhouette for', () => {
    // Arrange
    const design = loadDesign(SAMPLE);

    // Act
    const drawnKinds = new Set(design.nodes.map((node) => shapeForType(node.type).kind));

    // Assert
    for (const shape of KNOWN_SHAPES) {
      expect(drawnKinds, `the sample draws no ${shape.kind}`).toContain(shape.kind);
    }
  });

  it('teaches no type the app does not recognise', () => {
    // The sample is an example people copy, so every `type` in it is one the
    // app draws a silhouette for. The grey dashed fallback is real and matters,
    // but `e2e/fixtures/order-intake.json` is where it is exercised: a sample
    // that demonstrated it would be teaching a reader to write a word that gets
    // them a box with nothing claimed.
    for (const node of loadDesign(SAMPLE).nodes) {
      expect(shapeForType(node.type).isDefault, `"${node.type}" is not drawn`).toBe(
        false,
      );
    }
  });

  it('labels every edge, which is the thing an unlabelled line cannot say', () => {
    const design = loadDesign(SAMPLE);

    expect(design.edges.length).toBeGreaterThan(0);

    for (const edge of design.edges) {
      expect(edge.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('is served from the path the page fetches it from', () => {
    // One file with two names would be the same drift as one file copied twice.
    expect(SAMPLE_URL).toBe(`/${SAMPLE_FILE_NAME}`);
  });
});
