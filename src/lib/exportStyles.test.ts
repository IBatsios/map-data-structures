import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { EXPORT_STYLES } from './exportStyles';
import { DEFAULT_SHAPE, KNOWN_SHAPES } from './shapes';

/**
 * The stylesheet an exported file carries inside itself.
 *
 * An exported `.html` may fetch nothing, so it cannot link the app's own
 * `drawing.module.css` — and a CSS Module's class names are hashed at build
 * time besides. So the colours are written out a second time, here, and this
 * test is the thing that stops the two copies drifting: it reads the real
 * stylesheet off disk, exactly as `drawing.module.test.ts` does, and fails the
 * day a band is re-tuned in one file and not the other.
 *
 * That is the whole reason a duplicate is acceptable. Without this test it
 * would be a colour the exported page gets wrong six months from now, quietly.
 */

const APP_STYLESHEET = readFileSync(
  new URL('../styles/drawing.module.css', import.meta.url),
  'utf8',
);

/** Every `--shape-*` declaration one kind's rule sets, in the app stylesheet. */
function appBandFor(kind: string): ReadonlyMap<string, string> {
  const block = new RegExp(`\\.drawing \\[data-kind='${kind}'\\]\\s*\\{([^}]*)\\}`).exec(
    APP_STYLESHEET,
  )?.[1];

  if (block === undefined) {
    throw new Error(`drawing.module.css has no band for the "${kind}" kind.`);
  }

  return new Map(
    [...block.matchAll(/--shape-([a-z]+):\s*([^;]+);/gu)].map(([, name, value]) => [
      name ?? '',
      (value ?? '').trim(),
    ]),
  );
}

/** The same, read out of the stylesheet the export carries. */
function exportBandFor(kind: string): ReadonlyMap<string, string> {
  const block = new RegExp(`\\[data-kind='${kind}'\\]\\s*\\{([^}]*)\\}`).exec(
    EXPORT_STYLES,
  )?.[1];

  if (block === undefined) {
    throw new Error(`The export stylesheet has no band for the "${kind}" kind.`);
  }

  return new Map(
    [...block.matchAll(/--shape-([a-z]+):\s*([^;]+);/gu)].map(([, name, value]) => [
      name ?? '',
      (value ?? '').trim(),
    ]),
  );
}

describe('the stylesheet an export carries', () => {
  const kinds = [...KNOWN_SHAPES, DEFAULT_SHAPE].map((shape) => shape.kind);

  it.each(kinds)('gives a %s node the same colours the preview drew it in', (kind) => {
    expect(Object.fromEntries(exportBandFor(kind))).toEqual(
      Object.fromEntries(appBandFor(kind)),
    );
  });

  it('draws the route, the arrowhead and the label plate in the app’s own colours', () => {
    for (const part of ['route', 'arrowhead', 'plate', 'edge-label']) {
      const appColours = /(#[0-9a-f]{6})/gu;
      const appBlock =
        new RegExp(`\\[data-part='${part}'\\]\\s*\\{([^}]*)\\}`).exec(
          APP_STYLESHEET,
        )?.[1] ?? '';
      const exportBlock =
        new RegExp(`\\[data-part='${part}'\\]\\s*\\{([^}]*)\\}`).exec(
          EXPORT_STYLES,
        )?.[1] ?? '';

      expect(exportBlock, `the export has no "${part}" rule`).not.toBe('');
      expect(exportBlock.match(appColours) ?? [], `"${part}" changed colour`).toEqual(
        appBlock.match(appColours) ?? [],
      );
    }
  });

  it('fetches nothing: no import, no hosted font, no background image', () => {
    expect(EXPORT_STYLES).not.toContain('@import');
    expect(EXPORT_STYLES).not.toContain('url(');
    expect(EXPORT_STYLES).not.toMatch(/https?:\/\//u);
  });

  it('cannot end the style element it is written into', () => {
    expect(EXPORT_STYLES.toLowerCase()).not.toContain('</style');
  });
});
