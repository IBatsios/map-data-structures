import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DEFAULT_SHAPE, KNOWN_SHAPES } from '../lib/shapes';
import { contrastRatio } from './contrastRatio';

/**
 * "Label text has readable contrast against its shape" is an acceptance
 * criterion, and a criterion nobody can run is a criterion that rots. So the
 * stylesheet is read here and its colour bands are measured against WCAG's own
 * formula, which means the next person to add a node kind finds out from a
 * failing test rather than from a user who cannot read their own diagram.
 *
 * The threshold is AA for normal text. The `type` line under a label is 11px,
 * which is nowhere near WCAG's "large text" allowance, so it is held to the
 * same 4.5:1 as the label itself.
 */

/** WCAG 2.1 AA, normal text. */
const MINIMUM_RATIO = 4.5;

const STYLESHEET = readFileSync(new URL('./drawing.module.css', import.meta.url), 'utf8');

interface ColourBand {
  readonly fill: string;
  readonly stroke: string;
  readonly text: string;
}

function declarationsIn(block: string, property: string): string | undefined {
  return new RegExp(`--shape-${property}:\\s*(#[0-9a-f]{6})\\s*;`).exec(block)?.[1];
}

function blockFor(selector: string): string {
  const found = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(STYLESHEET)?.[1];

  if (found === undefined) {
    throw new Error(`drawing.module.css has no "${selector}" rule.`);
  }

  return found;
}

/** The colours a kind ends up with, after the defaults on `.drawing` apply. */
function bandFor(kind: string): ColourBand {
  const defaults = blockFor('\\.drawing');
  const block = blockFor(`\\.drawing \\[data-kind='${kind}'\\]`);

  const pick = (property: string): string => {
    const value = declarationsIn(block, property) ?? declarationsIn(defaults, property);

    if (!value) {
      throw new Error(`No --shape-${property} for the "${kind}" band.`);
    }

    return value;
  };

  return { fill: pick('fill'), stroke: pick('stroke'), text: pick('text') };
}

describe('contrastRatio', () => {
  it('measures black on white as the maximum', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('measures a colour against itself as no contrast at all', () => {
    expect(contrastRatio('#4c56c0', '#4c56c0')).toBeCloseTo(1, 5);
  });
});

describe('the drawing stylesheet', () => {
  const kinds = [...KNOWN_SHAPES, DEFAULT_SHAPE].map((shape) => shape.kind);

  it('gives every kind the drawing can produce a colour band of its own', () => {
    for (const kind of kinds) {
      expect(() => bandFor(kind)).not.toThrow();
    }
  });

  it.each(kinds)('reads a %s label against its own fill', (kind) => {
    const band = bandFor(kind);

    expect(contrastRatio(band.text, band.fill)).toBeGreaterThanOrEqual(MINIMUM_RATIO);
  });

  it.each(kinds)('reads a %s type line against its own fill', (kind) => {
    // The type line is drawn in --shape-stroke, the same colour as the outline.
    const band = bandFor(kind);

    expect(contrastRatio(band.stroke, band.fill)).toBeGreaterThanOrEqual(MINIMUM_RATIO);
  });

  it('reads an edge label against its plate', () => {
    const plate = /\[data-part='plate'\]\s*\{[^}]*fill:\s*(#[0-9a-f]{6})/.exec(
      STYLESHEET,
    )?.[1];
    const label = /\[data-part='edge-label'\]\s*\{[^}]*fill:\s*(#[0-9a-f]{6})/.exec(
      STYLESHEET,
    )?.[1];

    expect(plate).toBeDefined();
    expect(label).toBeDefined();
    expect(contrastRatio(label ?? '#000000', plate ?? '#ffffff')).toBeGreaterThanOrEqual(
      MINIMUM_RATIO,
    );
  });
});
