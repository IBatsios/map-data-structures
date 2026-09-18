/**
 * The one line the page puts in its status region after a file loads.
 *
 * It lives here rather than in the page's script for a plain reason: counting
 * and pluralising are logic, the page's `<script>` is the one place in this
 * project that no test and no type-checker can see into, and a wrong count is
 * exactly the kind of quiet mistake the drawing cannot show you.
 *
 * The wording says where the drawing is as well as what is in it. The status
 * region is the app's only voice on a good file, and "loaded" left a reader who
 * cannot see the page knowing a file was read and not that a picture appeared
 * under it. "Is drawn below" costs four words and answers both.
 *
 * On failure this line is cleared and `describeLoadError`'s panel speaks
 * instead, so the two live regions never talk over each other and a success
 * sentence is never left sitting above a list of errors.
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
 * // 'order-intake.json is drawn below: 2 nodes, 1 edge.'
 * ```
 */
export function describeUpload(fileName: string, design: Design): string {
  const nodes = countOf(design.nodes.length, 'node');
  const edges = countOf(design.edges.length, 'edge');

  return `${fileName} is drawn below: ${nodes}, ${edges}.`;
}

/** `1 node`, `2 nodes`, `0 nodes` — English's only plural rule this app needs. */
function countOf(total: number, noun: string): string {
  return total === 1 ? `1 ${noun}` : `${total} ${noun}s`;
}
