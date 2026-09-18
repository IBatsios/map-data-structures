/**
 * The laid-out design, as SVG.
 *
 * This is the only module in the drawing that touches the DOM, and it takes the
 * `Document` as an argument rather than reaching for the global one. That is
 * deliberate: it keeps the impurity in one visible place, it keeps this module
 * out of the page's untestable `<script>`, and it means `astro check` type-checks
 * it like any other file.
 *
 * It decides nothing. Every position, size and shape was settled by
 * `layout.ts`; every colour and every stroke is settled by
 * `src/styles/drawing.module.css`. What is left here is the translation from
 * one to the other, which is why there is no arithmetic in it beyond turning a
 * box into the points of a silhouette.
 *
 * Styling goes through `data-` attributes rather than class names, following
 * D23: the CSS owns the hashed class name on the container, and this module
 * owns nothing but the state. `data-shape` says which silhouette, `data-kind`
 * says which colour band, and `data-part` names the piece.
 *
 * Text is set with `textContent`, never `innerHTML`, so a label that happens to
 * look like markup is drawn as the text it is.
 */

import { describeDrawing } from './describeDrawing';
import type { DesignLayout, LayoutBox, LayoutEdge, LayoutNode } from './layout';
import { LABEL_FONT_SIZE, LINE_HEIGHT, TYPE_FONT_SIZE } from './layout';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Ids the SVG points its own ARIA attributes at. One drawing exists at a time. */
const TITLE_ID = 'drawing-title';
const DESCRIPTION_ID = 'drawing-description';
const ARROWHEAD_ID = 'drawing-arrowhead';

/** Corner radius of a rounded rectangle, in pixels. */
const CORNER_RADIUS = 10;

/** Height of a cylinder's cap, in pixels. */
const CYLINDER_CAP = 9;

/** Size of the corner a `cutCorner` rectangle has taken off it, in pixels. */
const CUT_CORNER = 15;

/** Vertical room the `type` line occupies under the label, in pixels. */
const TYPE_LINE_HEIGHT = 16;

/**
 * Draws a laid-out design.
 *
 * @param layout - the drawing, already placed by `layoutDesign`
 * @param doc - the document to build the elements in
 * @returns an `<svg>` ready to put on the page; the caller owns where it goes
 *
 * @example
 * ```typescript
 * drawing.replaceChildren(renderDrawing(layoutDesign(design), document));
 * ```
 */
export function renderDrawing(layout: DesignLayout, doc: Document): SVGSVGElement {
  const svg = createElement(doc, 'svg', {
    xmlns: SVG_NAMESPACE,
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    width: String(layout.width),
    height: String(layout.height),
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-labelledby': `${TITLE_ID} ${DESCRIPTION_ID}`,
    'data-part': 'drawing',
  }) as SVGSVGElement;

  svg.append(
    withText(createElement(doc, 'title', { id: TITLE_ID }), layout.title),
    withText(createElement(doc, 'desc', { id: DESCRIPTION_ID }), describeDrawing(layout)),
    arrowheadDefinition(doc),
  );

  // Edges first, so a box sits over its lines rather than under them.
  for (const edge of layout.edges) {
    svg.append(renderEdge(edge, doc));
  }

  for (const node of layout.nodes) {
    svg.append(renderNode(node, doc));
  }

  return svg;
}

/** The one arrowhead every edge points with. */
function arrowheadDefinition(doc: Document): SVGElement {
  const marker = createElement(doc, 'marker', {
    id: ARROWHEAD_ID,
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '7',
    markerHeight: '7',
    orient: 'auto-start-reverse',
    markerUnits: 'strokeWidth',
  });

  marker.append(
    createElement(doc, 'path', {
      d: 'M 0 0 L 10 5 L 0 10 z',
      'data-part': 'arrowhead',
    }),
  );

  const defs = createElement(doc, 'defs', {});
  defs.append(marker);

  return defs;
}

/** One node: its silhouette, its label, and the type the file gave it. */
function renderNode(node: LayoutNode, doc: Document): SVGElement {
  const group = createElement(doc, 'g', {
    'data-part': 'node',
    'data-shape': node.shape.name,
    'data-kind': node.shape.kind,
  });

  group.append(...silhouette(node, doc), ...nodeText(node, doc));

  return group;
}

/**
 * The shape itself. Every branch returns something drawable: a type this app
 * has never heard of arrives here as `DEFAULT_SHAPE` and leaves as a rectangle,
 * because a node that does not draw is a node that was dropped.
 */
function silhouette(node: LayoutNode, doc: Document): readonly SVGElement[] {
  switch (node.shape.name) {
    case 'rounded':
      return [box(node, doc, CORNER_RADIUS)];
    case 'stadium':
      return [box(node, doc, node.height / 2)];
    case 'cylinder':
      return cylinder(node, doc);
    case 'cutCorner':
      return cutCorner(node, doc);
    case 'hexagon':
      return [polygon(hexagonPoints(node), doc)];
    case 'diamond':
      return [polygon(diamondPoints(node), doc)];
    default:
      return [box(node, doc, 0)];
  }
}

function box(area: LayoutBox, doc: Document, radius: number): SVGElement {
  return createElement(doc, 'rect', {
    x: String(area.x),
    y: String(area.y),
    width: String(area.width),
    height: String(area.height),
    rx: String(radius),
    'data-part': 'shape',
  });
}

/** A body with a curved top and bottom, plus the lid line that reads as a lid. */
function cylinder(area: LayoutBox, doc: Document): readonly SVGElement[] {
  const { x, y, width, height } = area;
  const body = createElement(doc, 'path', {
    d: [
      `M ${x} ${y + CYLINDER_CAP}`,
      `a ${width / 2} ${CYLINDER_CAP} 0 0 1 ${width} 0`,
      `v ${height - CYLINDER_CAP * 2}`,
      `a ${width / 2} ${CYLINDER_CAP} 0 0 1 ${-width} 0`,
      'z',
    ].join(' '),
    'data-part': 'shape',
  });

  const lid = createElement(doc, 'path', {
    d: `M ${x} ${y + CYLINDER_CAP} a ${width / 2} ${CYLINDER_CAP} 0 0 0 ${width} 0`,
    'data-part': 'detail',
  });

  return [body, lid];
}

/** A rectangle with its top-right corner turned down, plus the fold that shows it. */
function cutCorner(area: LayoutBox, doc: Document): readonly SVGElement[] {
  const { x, y, width, height } = area;
  const right = x + width;
  const bottom = y + height;
  const shape = polygon(
    [
      [x, y],
      [right - CUT_CORNER, y],
      [right, y + CUT_CORNER],
      [right, bottom],
      [x, bottom],
    ],
    doc,
  );

  const fold = createElement(doc, 'path', {
    d: `M ${right - CUT_CORNER} ${y} v ${CUT_CORNER} h ${CUT_CORNER}`,
    'data-part': 'detail',
  });

  return [shape, fold];
}

function hexagonPoints(area: LayoutBox): readonly (readonly [number, number])[] {
  const { x, y, width, height } = area;
  const notch = Math.min(22, width / 4);
  const middle = y + height / 2;

  return [
    [x + notch, y],
    [x + width - notch, y],
    [x + width, middle],
    [x + width - notch, y + height],
    [x + notch, y + height],
    [x, middle],
  ];
}

function diamondPoints(area: LayoutBox): readonly (readonly [number, number])[] {
  const { x, y, width, height } = area;

  return [
    [x + width / 2, y],
    [x + width, y + height / 2],
    [x + width / 2, y + height],
    [x, y + height / 2],
  ];
}

function polygon(
  points: readonly (readonly [number, number])[],
  doc: Document,
): SVGElement {
  return createElement(doc, 'polygon', {
    points: points.map(([x, y]) => `${x},${y}`).join(' '),
    'data-part': 'shape',
  });
}

/**
 * The label on its wrapped lines, then the node's own `type` under it.
 *
 * The type is printed, not just used to pick a shape, for two reasons: a reader
 * can see which kind the app understood, and a `type` the vocabulary does not
 * cover is visibly free text rather than silently a plain box. Both strings are
 * drawn exactly as the file gave them.
 */
function nodeText(node: LayoutNode, doc: Document): readonly SVGElement[] {
  const centreX = node.x + node.width / 2;
  const blockHeight = node.labelLines.length * LINE_HEIGHT + TYPE_LINE_HEIGHT;
  const blockTop = node.y + (node.height - blockHeight) / 2;

  const lines = node.labelLines.map((line, index) =>
    withText(
      createElement(doc, 'text', {
        x: String(centreX),
        y: String(blockTop + LINE_HEIGHT * (index + 0.5)),
        'font-size': String(LABEL_FONT_SIZE),
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'data-part': 'label',
      }),
      line,
    ),
  );

  const type = withText(
    createElement(doc, 'text', {
      x: String(centreX),
      y: String(blockTop + blockHeight - TYPE_LINE_HEIGHT / 2),
      'font-size': String(TYPE_FONT_SIZE),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'data-part': 'type',
    }),
    node.type,
  );

  return [...lines, type];
}

/** One edge: the route, the arrowhead at the end of it, and the label on a plate. */
function renderEdge(edge: LayoutEdge, doc: Document): SVGElement {
  const group = createElement(doc, 'g', { 'data-part': 'edge' });

  const line = createElement(doc, 'path', {
    d: edge.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' '),
    'marker-end': `url(#${ARROWHEAD_ID})`,
    'data-part': 'route',
  });

  const plate = createElement(doc, 'rect', {
    x: String(edge.labelBox.x),
    y: String(edge.labelBox.y),
    width: String(edge.labelBox.width),
    height: String(edge.labelBox.height),
    rx: '4',
    'data-part': 'plate',
  });

  const label = withText(
    createElement(doc, 'text', {
      x: String(edge.labelBox.x + edge.labelBox.width / 2),
      y: String(edge.labelBox.y + edge.labelBox.height / 2),
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'data-part': 'edge-label',
    }),
    edge.label,
  );

  group.append(line, plate, label);

  return group;
}

function createElement(
  doc: Document,
  name: string,
  attributes: Readonly<Record<string, string>>,
): SVGElement {
  const element = doc.createElementNS(SVG_NAMESPACE, name);

  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, value);
  }

  return element;
}

/** Sets text the one safe way: as text, never as markup. */
function withText<T extends Element>(element: T, text: string): T {
  element.textContent = text;

  return element;
}
