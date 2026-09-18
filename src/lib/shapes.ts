/**
 * What each kind of node looks like.
 *
 * `type` in the schema is free text and stays free text (D14, D18, D19): the
 * app does not get to tell a user which kinds of thing exist in their system.
 * So this module is a *vocabulary*, not a validator. It recognises the kinds
 * that turn up in the owner's own draw.io designs and gives each one a
 * silhouette a reader already knows, and it answers for every other string too
 * — with a plain rectangle and nothing claimed.
 *
 * The one rule that matters here: `shapeForType` never returns nothing and
 * never throws. A node whose type this module has never heard of still gets a
 * shape, still gets drawn, and still carries its own type text on the face of
 * the box. Intake 5.2 is the reason — nothing dropped, nothing mislabeled.
 *
 * Matching is done on a lowercased, trimmed copy of the type. That is a lookup
 * key, not an edit: the string the drawing prints is the one the file gave,
 * untouched. Looking `Database` and `database` up in the same place costs
 * nothing and saves a reader from a diagram that changed shape over a capital.
 */

/** The silhouettes the drawing knows how to draw. */
export type NodeShapeName =
  'rectangle' | 'rounded' | 'cylinder' | 'stadium' | 'cutCorner' | 'hexagon' | 'diamond';

/** How much room a silhouette needs around its text, in pixels. */
export interface ShapePadding {
  readonly x: number;
  readonly y: number;
}

/** One kind of node: what to draw, what to call it, and how much room it wants. */
export interface NodeShape {
  /** Which silhouette to draw. */
  readonly name: NodeShapeName;
  /** The canonical kind this shape stands for, after aliases are resolved. */
  readonly kind: string;
  /** True only for the shape used when the type was not recognised. */
  readonly isDefault: boolean;
  /**
   * Room between the text and the edge of the silhouette. A cylinder spends
   * vertical room on its caps and a diamond spends horizontal room on its
   * points, so this is per shape rather than one constant for the drawing.
   */
  readonly padding: ShapePadding;
}

/** The type strings, canonical first, that each shape answers to. */
interface ShapeVocabularyEntry {
  readonly shape: NodeShape;
  readonly names: readonly string[];
}

function shape(
  name: NodeShapeName,
  kind: string,
  padding: ShapePadding,
  isDefault = false,
): NodeShape {
  return { name, kind, isDefault, padding };
}

/**
 * The shape for a type this vocabulary does not cover.
 *
 * A plain square-cornered rectangle in a neutral colour is the deliberate
 * choice: it is visibly a box and it claims nothing about what the box is. A
 * node that fell through to this is still drawn, still labelled, and still
 * shows its own type text, so the reader can see the app did not recognise the
 * word rather than wondering what happened to their node.
 */
export const DEFAULT_SHAPE: NodeShape = shape(
  'rectangle',
  'unknown',
  { x: 18, y: 14 },
  true,
);

/**
 * The vocabulary, in reading order. Aliases are the words the owner's existing
 * designs and the PRD's own examples use for the same thing; they resolve to
 * the canonical `kind` so the drawing stays consistent across files that spell
 * a concept differently.
 */
const VOCABULARY: readonly ShapeVocabularyEntry[] = [
  {
    shape: shape('rounded', 'service', { x: 18, y: 14 }),
    names: ['service', 'api', 'app', 'application', 'component', 'process', 'worker'],
  },
  {
    shape: shape('cylinder', 'database', { x: 18, y: 22 }),
    names: ['database', 'db', 'datastore', 'store', 'cache', 'bucket'],
  },
  {
    shape: shape('stadium', 'queue', { x: 26, y: 14 }),
    names: ['queue', 'topic', 'stream', 'bus', 'broker'],
  },
  {
    shape: shape('cutCorner', 'external', { x: 20, y: 14 }),
    names: ['external', 'external-system', 'third-party', 'thirdparty', 'saas'],
  },
  {
    shape: shape('hexagon', 'user', { x: 30, y: 14 }),
    names: ['user', 'actor', 'person', 'client', 'customer'],
  },
  {
    shape: shape('diamond', 'decision', { x: 44, y: 26 }),
    names: ['decision', 'choice', 'gateway', 'router'],
  },
];

/** Every shape this drawing knows by name, excluding the default. */
export const KNOWN_SHAPES: readonly NodeShape[] = VOCABULARY.map((entry) => entry.shape);

/** Every recognised spelling, pointing at the shape it stands for. */
const SHAPES_BY_NAME: ReadonlyMap<string, NodeShape> = new Map(
  VOCABULARY.flatMap((entry) => entry.names.map((name) => [name, entry.shape] as const)),
);

/**
 * The shape to draw a node of this type as.
 *
 * @param type - the node's `type`, exactly as the file gave it
 * @returns the shape for that kind, or `DEFAULT_SHAPE` if the kind is unknown;
 *   never `undefined`, and never a throw, whatever the string is
 *
 * @example
 * ```typescript
 * shapeForType('db').kind;            // 'database'
 * shapeForType('widget-factory').name; // 'rectangle'
 * ```
 */
export function shapeForType(type: string): NodeShape {
  return SHAPES_BY_NAME.get(type.trim().toLowerCase()) ?? DEFAULT_SHAPE;
}
