/**
 * The data model of the design core, as `docs/ARCHITECTURE.md` describes it:
 * a Design has a title and two lists, a Node is a labelled box of some type,
 * and an Edge connects two Nodes by id and carries a label.
 *
 * These types are the contract between the parts of the app that never see
 * each other: the loader that reads a file, the layout that places the boxes,
 * and the four exporters that have to show what the preview shows. Task 02
 * adds the Zod schema that guarantees an uploaded file really has this shape.
 *
 * `Node` and `Edge` are prefixed because `Node` is already a DOM global, and a
 * page module that imported both would silently get the wrong one.
 */

/** One box in the drawing. `type` is free text until Task 03 gives it meaning. */
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
