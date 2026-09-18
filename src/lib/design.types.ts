/**
 * The data model of the design core, as `docs/ARCHITECTURE.md` describes it:
 * a Design has a title and two lists, a Node is a labelled box of some type,
 * and an Edge connects two Nodes by id and carries a label.
 *
 * These types are the contract between the parts of the app that never see
 * each other: the loader that reads a file, the layout that places the boxes,
 * and the four exporters that have to show what the preview shows. They are
 * written by hand rather than inferred from `design.schema.ts`, so that the
 * contract stays readable, stays read-only, and costs a reader nothing to
 * understand; `design.schema.ts` is what guarantees an uploaded file really has
 * this shape, and `loadDesign` is the one place the two meet.
 *
 * `Node` and `Edge` are prefixed because `Node` is already a DOM global, and a
 * page module that imported both would silently get the wrong one.
 */

/**
 * One box in the drawing.
 *
 * `type` stays free text (D14, D18, D19) and always will: the app does not get
 * to tell a user which kinds of thing exist in their system. What Task 03 added
 * is meaning without narrowing — `src/lib/shapes.ts` recognises a set of kinds
 * and draws each as its own silhouette, and answers for every other string with
 * a plain rectangle. A type nobody has heard of still draws, still carries its
 * label, and shows its own type text on the face of the box.
 */
export interface DesignNode {
  readonly id: string;
  readonly label: string;
  readonly type: string;
}

/** One line in the drawing, from one node's id to another's. */
export interface DesignEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

/** One uploaded JSON file, parsed. */
export interface Design {
  readonly title: string;
  readonly nodes: readonly DesignNode[];
  readonly edges: readonly DesignEdge[];
}
