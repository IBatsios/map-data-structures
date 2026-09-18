/**
 * What a laid-out drawing is made of: a point, a box, a placed node, a routed
 * edge, and the whole canvas they sit on.
 *
 * These types are the vocabulary `layout.ts` and the modules it delegates to
 * all speak, which is why they live here rather than in any one of them. It is
 * the same reasoning D15 used for `design.types.ts`: a type that three modules
 * share is a type none of them should own, and a shared definition is what
 * stops two of them drifting apart. `layout.ts` re-exports every public name
 * below, so nothing outside this folder ever imports from here — `./layout`
 * stays the one door.
 *
 * Everything here is plain data: numbers, strings and arrays, readonly and
 * serialisable, with no method on any of them. That is load-bearing rather than
 * stylistic — an exporter hands a `DesignLayout` across a boundary, and a
 * boundary only carries data.
 */

import type { DesignEdge } from './design.types';
import type { NodeShape } from './shapes';

/** One position in the drawing, in pixels from the top-left of the canvas. */
export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

/** One rectangle in the drawing, given by its top-left corner and its size. */
export interface LayoutBox extends LayoutPoint {
  readonly width: number;
  readonly height: number;
}

/** One node, placed: where its box is, what to draw it as, and what it says. */
export interface LayoutNode extends LayoutBox {
  readonly id: string;
  /** The label exactly as the file gave it. */
  readonly label: string;
  /** The label split into the lines it is drawn on. */
  readonly labelLines: readonly string[];
  /** The type exactly as the file gave it, printed under the label. */
  readonly type: string;
  readonly shape: NodeShape;
}

/** One edge, routed: the line to draw and where its label sits on it. */
export interface LayoutEdge {
  readonly from: string;
  readonly to: string;
  /** The label exactly as the file gave it. */
  readonly label: string;
  /** The label split into the lines its plate is drawn with. */
  readonly labelLines: readonly string[];
  /** The route, in order, from the source's border to the target's. */
  readonly points: readonly LayoutPoint[];
  /** Where the label's plate sits, sized to hold the label. */
  readonly labelBox: LayoutBox;
}

/** A whole design, placed: the canvas and everything on it. */
export interface DesignLayout {
  /** The design's title, for the SVG's own `<title>`. */
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNode[];
  readonly edges: readonly LayoutEdge[];
}

/** An edge label's plate: the lines it is drawn on, and the room they need. */
export interface EdgeLabelPlate {
  readonly lines: readonly string[];
  readonly width: number;
  readonly height: number;
}

/**
 * One edge with the plate its label needs, ready to be routed.
 *
 * This is the one thing that crosses between routing an ordinary edge and
 * routing a loop: `layout.ts` builds the list, and `selfLoops.ts` reads the
 * self-edges out of it. It sits here so that crossing runs through the shared
 * vocabulary rather than making either module import the other.
 */
export interface PreparedEdge {
  readonly edge: DesignEdge;
  /** Its place in the file, which is also the key its route is stored under. */
  readonly index: number;
  readonly plate: EdgeLabelPlate;
}
