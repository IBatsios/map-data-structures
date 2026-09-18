/**
 * The one definition of what an uploaded file is allowed to be.
 *
 * `design.types.ts` says what a Design *is* once it is in memory; this module
 * says which JSON files are allowed to become one. The page validates against
 * it through `loadDesign`, and Task 09's schema page publishes it, so it is
 * written to be read as much as to run.
 *
 * Three rules are worth knowing before reading the code:
 *
 * 1. **Every field is required and no string may be empty.** A node without a
 *    label is a blank box and an edge without a label is an unexplained line,
 *    and neither is worth drawing. An empty `id` is worse: an edge could not
 *    name it.
 * 2. **A property the schema does not name is ignored, not rejected.** A file
 *    exported from somewhere else may carry its own extra keys; dropping them
 *    is friendlier than refusing the file, and Zod strips them for us.
 * 3. **Two rules span more than one field, so they live in a refinement:** node
 *    ids must be unique, and every edge must name nodes the file defines.
 *    Neither can be expressed on a field, and both are silent corruption of the
 *    drawing rather than an obvious error — see the comments on each below.
 *
 * Failures come back as Zod issues, each carrying the `path` of the field at
 * fault. Task 04 turns those paths into messages; nothing here does.
 */

import { z } from 'zod';

/**
 * A string the design cannot do without: present, a string, and not empty.
 * Whitespace is left alone rather than trimmed, because trimming would edit the
 * user's labels on the way through and the drawing must show what the file says.
 */
const requiredText = z.string().min(1);

/** One box in the drawing: something with an identity, a name and a kind. */
export const designNodeSchema = z.object({
  id: requiredText,
  label: requiredText,
  type: requiredText,
});

/**
 * One line in the drawing. `from` and `to` are node ids, not labels, and the
 * refinement below is what makes sure they name nodes that exist.
 */
export const designEdgeSchema = z.object({
  from: requiredText,
  to: requiredText,
  label: requiredText,
});

/**
 * The file's own shape, before the cross-field rules. A design with no nodes
 * and no edges is valid: an empty system is a legitimate thing to describe, and
 * it draws as an empty picture rather than as a failure.
 */
const designObjectSchema = z.object({
  title: requiredText,
  nodes: z.array(designNodeSchema),
  edges: z.array(designEdgeSchema),
});

/** What the schema calls a design while the refinements are checking it. */
type DesignCandidate = z.infer<typeof designObjectSchema>;

/**
 * The published schema: the shape above, plus the two rules that need to see
 * the whole file at once.
 */
export const designSchema = designObjectSchema.superRefine((design, ctx) => {
  rejectRepeatedNodeIds(design, ctx);
  rejectEdgesNamingUndefinedNodes(design, ctx);
});

/**
 * Two nodes may not share an id.
 *
 * Without this rule both nodes draw a box, but every edge touching that id
 * resolves to whichever box came last — a drawing that is quietly wrong instead
 * of visibly broken, which is the one outcome the PRD rules out.
 *
 * The issue is reported against the repeat, not the first use, because the
 * repeat is the line the author has to change.
 */
function rejectRepeatedNodeIds(
  design: DesignCandidate,
  ctx: z.RefinementCtx<DesignCandidate>,
): void {
  const seenIds = new Set<string>();

  for (const [index, node] of design.nodes.entries()) {
    if (!seenIds.has(node.id)) {
      seenIds.add(node.id);
      continue;
    }

    ctx.addIssue({
      code: 'custom',
      path: ['nodes', index, 'id'],
      message: `Two nodes share the id "${node.id}". Every node id has to be unique.`,
    });
  }
}

/**
 * An edge may only name nodes the file defines.
 *
 * Without this rule the failure surfaces from inside the drawing code, far from
 * the file and without a field to point at. Catching it here means the layout
 * never has to defend against a dangling edge, and the issue path names the end
 * of the edge that is wrong.
 */
function rejectEdgesNamingUndefinedNodes(
  design: DesignCandidate,
  ctx: z.RefinementCtx<DesignCandidate>,
): void {
  const definedIds = new Set(design.nodes.map((node) => node.id));
  const ends = ['from', 'to'] as const;

  for (const [index, edge] of design.edges.entries()) {
    for (const end of ends) {
      if (definedIds.has(edge[end])) {
        continue;
      }

      ctx.addIssue({
        code: 'custom',
        path: ['edges', index, end],
        message: `This edge's "${end}" is "${edge[end]}", which no node defines.`,
      });
    }
  }
}
