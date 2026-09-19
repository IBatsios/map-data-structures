import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  RULES_THE_FILE_CANNOT_STATE,
  TWO_PASS_NOTE,
  designFields,
  publishedDesignSchema,
} from './publishedSchema';

/**
 * The published schema is a promise about what this app takes, so it is held to
 * the same standard as the app: generated from the one Zod schema rather than
 * written a second time, and measured by a test rather than by care.
 *
 * Three things are being pinned here, and they are different things.
 *
 * 1. **What the generator emits.** It has to agree with the app, field for
 *    field and rule for rule — and where it cannot, the gap has to be a fact
 *    this file records rather than a surprise someone finds later.
 * 2. **What the page says.** `designFields` is what `/schema` renders, and it
 *    is derived from the generated document so the page cannot describe a field
 *    the schema does not have. Only the prose is hand-written, and the prose is
 *    checked against the derived list.
 * 3. **What is on disk.** `public/design.schema.json` is a second copy of the
 *    generated document, because a published schema has to be a file at a URL.
 *    The last block below is what stops the two drifting, exactly as
 *    `exportStyles.test.ts` does for the drawing's colours (D57). It reads the
 *    file with `node:fs` rather than importing it, for D61's reason.
 */

/** Every field of a design, in the order `/schema` lists them. */
const EVERY_FIELD = [
  'title',
  'nodes',
  'nodes[].id',
  'nodes[].label',
  'nodes[].type',
  'edges',
  'edges[].from',
  'edges[].to',
  'edges[].label',
];

/** Every string field, which is every field the blank-string rule applies to. */
const EVERY_STRING_FIELD = EVERY_FIELD.filter(
  (path) => path !== 'nodes' && path !== 'edges',
);

const ARTIFACT = new URL('../../public/design.schema.json', import.meta.url);

describe('the generated JSON Schema', () => {
  it('is a draft 2020-12 document describing an object', () => {
    // Arrange / Act
    const schema = publishedDesignSchema();

    // Assert
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.type).toBe('object');
  });

  it('requires the title and both lists', () => {
    expect(publishedDesignSchema().required).toEqual(['title', 'nodes', 'edges']);
  });

  it('carries the blank-string rule into the published file', () => {
    // D39: a string has to hold at least one character that is not a space, and
    // both halves of that survive generation as `minLength` and `pattern`.
    for (const field of designFields()) {
      if (field.type !== 'string') {
        continue;
      }

      expect(field.rule, `${field.path} states no rule`).toContain('space');
    }
  });

  it('does not refuse a key the schema does not name, anywhere in the document', () => {
    // D19: an unnamed property is ignored, not rejected, and that is what the
    // app really does. Zod's default output says `additionalProperties: false`,
    // which would publish a promise this app does not keep and would make an
    // external validator refuse files this app loads.
    expect(JSON.stringify(publishedDesignSchema())).not.toContain('additionalProperties');
  });

  it('says nothing about the two rules that span more than one field', () => {
    // The honest gap, recorded as a fact rather than discovered later: neither
    // `superRefine` rule survives generation, in any form. That is why the page
    // carries both in prose beside the file.
    const serialised = JSON.stringify(publishedDesignSchema()).toLowerCase();

    expect(serialised).not.toContain('unique');
    expect(serialised).not.toContain('$ref');
    expect(serialised).not.toContain('allof');
  });
});

describe('the field list the page renders', () => {
  it('lists every field of a design, in reading order', () => {
    expect(designFields().map((field) => field.path)).toEqual(EVERY_FIELD);
  });

  it('marks every field required, because every field is', () => {
    // D19, still true and now published: there is no optional field.
    expect(designFields().every((field) => field.isRequired)).toBe(true);
  });

  it.each(EVERY_STRING_FIELD)('gives %s the type the schema gave it', (path) => {
    expect(designFields().find((field) => field.path === path)?.type).toBe('string');
  });

  it.each(['nodes', 'edges'])('gives %s the type the schema gave it', (path) => {
    expect(designFields().find((field) => field.path === path)?.type).toBe(
      'array of objects',
    );
  });

  it('says what every field means, in words the schema file has no room for', () => {
    for (const field of designFields()) {
      expect(field.meaning.length, `${field.path} has no meaning`).toBeGreaterThan(0);
    }
  });
});

describe('the rules the published file cannot state', () => {
  it('carries both of them, named and explained', () => {
    expect(RULES_THE_FILE_CANNOT_STATE).toHaveLength(2);

    for (const rule of RULES_THE_FILE_CANNOT_STATE) {
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.detail.length).toBeGreaterThan(0);
    }
  });

  it('says the two are reached only once every field has passed', () => {
    // D20 and D42: the app already promises this in its error panel, and a
    // published page that left it out would be less honest than the app.
    expect(TWO_PASS_NOTE).toContain('passed');
  });
});

describe('the published schema file on disk', () => {
  it('is exactly what the current Zod schema generates', () => {
    // The whole point of step 2: the file is a second copy, so it is compared
    // rather than trusted. Parsed rather than compared as text, because the
    // formatter owns the whitespace and the whitespace is not the promise.
    const onDisk: unknown = JSON.parse(readFileSync(ARTIFACT, 'utf8'));

    expect(
      onDisk,
      'public/design.schema.json is stale. Run `bun run schema` to write it again.',
    ).toEqual(publishedDesignSchema());
  });
});
