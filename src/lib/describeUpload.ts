/**
 * The one line the page puts in its status region after a file loads.
 *
 * It lives here rather than in the page's script for a plain reason: counting
 * and pluralising are logic, the page's `<script>` is the one place in this
 * project that no test and no type-checker can see into, and a wrong count is
 * exactly the kind of quiet mistake the drawing cannot show you.
 *
 * The wording is deliberately plain. Task 04 owns how success and failure are
 * said; this is the fact it will say.
 */

import type { Design } from './design.types';

/**
 * Describes a design that has just loaded: its file name and what it holds.
 *
 * The count is of what the design holds, not of what is distinct in it, because
 * this line is the user's only check that nothing was dropped on the way in.
 *
 * @param fileName - the name of the file the user chose, used as given
 * @param design - the design that file turned into
 * @returns one sentence, safe to set as `textContent`
 *
 * @example
 * ```typescript
 * describeUpload('order-intake.json', design);
 * // 'Loaded order-intake.json: 2 nodes, 1 edge.'
 * ```
 */
export function describeUpload(fileName: string, design: Design): string {
  const nodes = countOf(design.nodes.length, 'node');
  const edges = countOf(design.edges.length, 'edge');

  return `Loaded ${fileName}: ${nodes}, ${edges}.`;
}

/** `1 node`, `2 nodes`, `0 nodes` — English's only plural rule this app needs. */
function countOf(total: number, noun: string): string {
  return total === 1 ? `1 ${noun}` : `${total} ${noun}s`;
}
