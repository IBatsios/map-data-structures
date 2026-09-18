/**
 * Rendering the drawing where the browser will tell you what it looks like.
 *
 * D64 recorded this for the PDF and the Word export needs it identically, so
 * it lives here and both call it rather than keeping a copy each.
 *
 * **The problem it solves.** `renderDrawing` builds an SVG that the preview's
 * CSS Module styles through `data-part`, `data-shape` and `data-kind` (D23,
 * D27), and every colour in that stylesheet is a `var(--shape-*)`. Nothing
 * outside the page ever sees it:
 *
 * - svg2pdf does not use `getComputedStyle` at all — it collects `<style>`
 *   elements found *inside* the SVG and matches selectors by hand, so the
 *   app's stylesheet never reaches it.
 * - An SVG handed to an `Image` as a blob or data URL, which is how the Word
 *   export rasterises one, is parsed as a document of its own. It has no host
 *   page, so it has no stylesheet either, and a custom property that resolves
 *   to nothing takes its colour with it.
 *
 * Both are the same missing step. So the element is put into the page inside a
 * holder carrying the preview's own class, the browser is asked what each
 * piece actually resolved to, and those answers are written onto the elements
 * as inline styles — which is the first thing either reader looks at. The
 * holder is off-screen while it is there and the caller always takes it out
 * again.
 *
 * That is why neither export needs a second copy of the drawing's palette: the
 * colours in the file are the browser's own answer for the preview's own
 * stylesheet, not a duplicate of it kept in step by a test.
 *
 * Every line here needs a real browser, so it is asserted in
 * `e2e/exportPdf.spec.ts` and `e2e/exportWord.spec.ts` rather than in Vitest,
 * which this project runs with no DOM at all.
 */

import drawingStyles from '../styles/drawing.module.css';
import type { DesignLayout } from './layout';
import { renderDrawing } from './renderDrawing';

/**
 * The style that keeps the drawing off the screen while its styles are read.
 *
 * It has to be in the page — a detached element has no resolved styles — but
 * it must not be seen and must not move anything. `position: fixed` takes it
 * out of the flow, the negative offset puts it outside the viewport without
 * adding anything to scroll, and it is only there for the moment it takes to
 * convert.
 */
const OFFSCREEN = 'position:fixed;left:-10000px;top:0;pointer-events:none;';

/**
 * What each piece of the drawing is asked about before it leaves the page.
 *
 * Everything the stylesheet says and a reader outside the page would
 * otherwise miss. Geometry is not here because `renderDrawing` writes it as
 * attributes, which both readers understand for themselves.
 */
const RESOLVED_PROPERTIES: readonly string[] = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
];

/** The drawing, in the page, with the way to take it out again. */
export interface OpenDrawing {
  readonly svg: SVGSVGElement;
  readonly close: () => void;
}

/**
 * Renders the drawing and puts it where the browser will resolve its styles.
 *
 * The holder carries the preview's own class, so the preview's own stylesheet
 * applies to it and nothing here has to know a single colour. It is hidden
 * from assistive technology while it is there, and the caller always takes it
 * out again — a `try`/`finally` around whatever reads the SVG.
 *
 * @param layout - the design to draw, already marked if the export marks text
 * @param doc - the document to build and resolve it in; nothing is left behind
 * @param overrides - styles to write on top of what the page resolved, for an
 *   export that cannot honour one. The PDF points every piece of text at the
 *   one face it embeds this way; the Word export overrides nothing, because
 *   its picture is painted by the same browser that resolved the styles.
 * @returns the SVG, in the page, and the way to take it out
 * @throws if the document has no window to resolve styles with
 *
 * @example
 * ```typescript
 * const drawing = openDrawing(layout, document);
 * try {
 *   await paint(drawing.svg);
 * } finally {
 *   drawing.close();
 * }
 * ```
 */
export function openDrawing(
  layout: DesignLayout,
  doc: Document,
  overrides: Readonly<Record<string, string>> = {},
): OpenDrawing {
  const view = doc.defaultView;

  if (view === null) {
    throw new Error('This export needs a document with a window to read styles from.');
  }

  const holder = doc.createElement('div');
  const svg = renderDrawing(layout, doc);

  holder.className = drawingStyles.drawing ?? '';
  holder.setAttribute('aria-hidden', 'true');
  holder.setAttribute('style', OFFSCREEN);
  holder.append(svg);
  doc.body.append(holder);

  resolveStyles(svg, view, overrides);

  return { svg, close: () => holder.remove() };
}

/**
 * Writes what the stylesheet resolved to onto the elements themselves.
 *
 * It changes only the elements this export just built and is about to throw
 * away; nothing on the page is touched.
 *
 * **Why the overrides exist**, in the PDF's words. The preview draws with
 * whatever face the reader's system offers, and a PDF can only draw with one
 * it carries, so every piece of text is pointed at the embedded one. The
 * weight has to go with it: svg2pdf turns any weight that is not 400 or 700
 * into a style name of its own — a label at `font-weight: 550` is asked for as
 * `550normal` — and jsPDF answers a style it has never heard of by quietly
 * falling back to Times, which is Latin-1. That is how a Greek label came out
 * of an early build of that export as `±Á±³³µ»¯µÂ` while the same label was
 * correct in the table underneath it.
 */
function resolveStyles(
  svg: SVGSVGElement,
  view: Window & typeof globalThis,
  overrides: Readonly<Record<string, string>>,
): void {
  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    if (!(element instanceof view.SVGElement)) {
      continue;
    }

    const resolved = view.getComputedStyle(element);

    for (const property of RESOLVED_PROPERTIES) {
      element.style.setProperty(property, resolved.getPropertyValue(property));
    }

    for (const [property, value] of Object.entries(overrides)) {
      element.style.setProperty(property, value);
    }
  }
}
