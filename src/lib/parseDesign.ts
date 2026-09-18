import type { Design, DesignEdge, DesignNode } from './design.types';

/**
 * The shape `parseDesign` assumes it was handed. It is an assumption and not a
 * guarantee: this function does no validation, so a file that does not look
 * like this throws rather than returning something half-built. Task 02 turns
 * the assumption into a Zod schema behind `loadDesign`, and Task 04 turns the
 * failures into messages a person can act on.
 */
interface RawDesign {
  readonly title: string;
  readonly nodes: readonly DesignNode[];
  readonly edges: readonly DesignEdge[];
}

/**
 * Turns an already-parsed JSON object into a Design.
 *
 * Pure: it reads its argument and builds new objects, so the caller's parsed
 * JSON is never touched and the result can be handed to the layout and the
 * exporters without any of them reaching back into the file.
 *
 * @param json - the result of `JSON.parse` on an uploaded file
 * @returns the design's title with every node and edge, in file order
 * @throws {TypeError} if the object does not carry `nodes` and `edges` arrays
 */
export function parseDesign(json: unknown): Design {
  const raw = json as RawDesign;

  return {
    title: raw.title,
    nodes: raw.nodes.map(toDesignNode),
    edges: raw.edges.map(toDesignEdge),
  };
}

function toDesignNode(raw: DesignNode): DesignNode {
  return { id: raw.id, label: raw.label, type: raw.type };
}

function toDesignEdge(raw: DesignEdge): DesignEdge {
  return { from: raw.from, to: raw.to, label: raw.label };
}
