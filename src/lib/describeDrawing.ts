/**
 * The drawing, said out loud.
 *
 * An SVG with `role="img"` is one object to a screen reader: it gets the
 * accessible name from its `<title>` and nothing else. "Drawing of Order
 * intake" is a true name and a useless one — it tells a non-sighted reader that
 * a picture exists and not one thing that is in it.
 *
 * So the drawing also carries a `<desc>`, and this is what writes it: every
 * node with its kind, and every edge in the direction its arrow points. Intake
 * 5.2 says the drawing must faithfully show every node and edge; this is that
 * promise kept for someone who cannot see the boxes.
 *
 * Like everything else in the drawing, it says what the file said. No trimming,
 * no substituting, no leaving out the node whose label is three spaces.
 */

import type { DesignLayout } from './layout';

/**
 * Describes a laid-out drawing in one paragraph of plain text.
 *
 * @param layout - the drawing, already laid out
 * @returns a sentence per part, safe to set as the `textContent` of a `<desc>`
 *
 * @example
 * ```typescript
 * describeDrawing(layout);
 * // 'Order intake. 2 nodes: Public API, a service; Order queue, a queue.
 * //  1 edge: Public API publishes order Order queue.'
 * ```
 */
export function describeDrawing(layout: DesignLayout): string {
  return [`${layout.title}.`, describeNodes(layout), describeEdges(layout)].join(' ');
}

function describeNodes(layout: DesignLayout): string {
  if (layout.nodes.length === 0) {
    return 'No nodes.';
  }

  const nodes = layout.nodes
    .map((node) => `${node.label}, ${articleFor(node.type)} ${node.type}`)
    .join('; ');

  return `${countOf(layout.nodes.length, 'node')}: ${nodes}.`;
}

function describeEdges(layout: DesignLayout): string {
  if (layout.edges.length === 0) {
    return 'No edges.';
  }

  const labelsById = new Map(layout.nodes.map((node) => [node.id, node.label]));
  const edges = layout.edges
    .map((edge) => {
      // The ids are what the file joined on, so they are the honest fallback if
      // a label is somehow missing: better a readable id than a blank phrase.
      const from = labelsById.get(edge.from) ?? edge.from;
      const to = labelsById.get(edge.to) ?? edge.to;

      return `${from} ${edge.label} ${to}`;
    })
    .join('; ');

  return `${countOf(layout.edges.length, 'edge')}: ${edges}.`;
}

/** A word that opens with a vowel letter, which mostly means a vowel sound. */
const OPENS_WITH_A_VOWEL = /^[aeiou]/;

/**
 * The exceptions: a written vowel that is spoken as a consonant.
 *
 * `user`, `unit`, `utility` — a `u` before a consonant and another vowel is
 * pronounced "you", which takes `a`. So does a leading `eu`, as in `european`.
 * `unknown` and `upload` are not exceptions: nothing sounds like `y` there.
 */
const SOUNDS_LIKE_A_CONSONANT = /^(u[bcdfghjklmnpqrstvwxyz][aeiou]|eu)/;

/**
 * `a` or `an`, agreeing with the type that follows it.
 *
 * The description is the one part of the drawing that is read aloud, so "a
 * external" is not a typo a reader can skim past — it is what they hear. The
 * rule is the spoken one rather than the spelt one: a vowel *sound* takes `an`,
 * which is why `an external` but `a user`.
 *
 * `type` is free text (D14, D18, D19), so this is a heuristic and not a
 * dictionary: it gets every kind in the shape vocabulary and every alias right,
 * and it will get an initialism nobody has thought of wrong. That is the right
 * trade for one word of an accessible description. The type is trimmed to
 * choose the article and printed untouched, the same way `shapes.ts` looks a
 * type up: a lookup key, not an edit.
 */
function articleFor(type: string): string {
  const word = type.trim().toLowerCase();

  if (!OPENS_WITH_A_VOWEL.test(word) || SOUNDS_LIKE_A_CONSONANT.test(word)) {
    return 'a';
  }

  return 'an';
}

/** `1 node`, `2 nodes` — the same plural rule `describeUpload` uses. */
function countOf(total: number, noun: string): string {
  return total === 1 ? `1 ${noun}` : `${total} ${noun}s`;
}
