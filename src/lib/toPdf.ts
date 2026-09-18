/**
 * The design as one PDF: the title, the preview's own drawing as vector, and
 * the same tables of nodes and edges the other two exports write.
 *
 * It opens in any viewer, prints, and attaches to an email or a ticket, which
 * is what the story asks for. The drawing goes in as **vector** rather than as
 * a picture of a drawing, so the text in it stays selectable and searchable and
 * nothing blurs when a reader zooms in on a label.
 *
 * **Two modules, and the split is the point.** `pdfPlan.ts` decides everything
 * about the document — the order, the wrapping, where the page turns, what an
 * empty design says — with nothing but arithmetic, and is unit-tested in
 * `pdfPlan.test.ts`. This module puts ink where the plan says, and every line
 * of it needs a real browser: `renderDrawing` builds DOM elements, and
 * `svg2pdf` reads the styles the page resolved for them. This project's Vitest
 * run has no DOM at all, so this half is asserted in `e2e/export.spec.ts`
 * against a real browser, exactly as D55 settled for Task 06.
 *
 * It takes the **layout**, not the design (D48), and it takes its `Document` as
 * an argument the way `renderDrawing(layout, doc)` and
 * `downloadBlob(blob, name, doc)` do (D52), rather than reaching for a global.
 *
 * **Why the drawing is attached to the page before it is converted.** svg2pdf
 * does not use `getComputedStyle`: it collects `<style>` elements found inside
 * the SVG itself and matches selectors by hand, so the app's CSS Module never
 * reaches it, and `fill: var(--shape-fill)` would reach it unresolved even if
 * it did. So the element is put into the page, inside a holder carrying the
 * same class the preview's drawing carries, the browser is asked what each
 * piece actually resolved to, and those answers are written onto the elements
 * as inline styles — which is the first thing svg2pdf reads. The holder is
 * removed before this function returns.
 *
 * That is why this export needs no second copy of the drawing's palette: the
 * colours in the PDF are the browser's own answer for the preview's own
 * stylesheet, not a duplicate of it kept in step by a test.
 *
 * **Why the PDF carries a font.** jsPDF's built-in faces are Latin-1 only, so a
 * Greek label would come out as accented Latin — a label shown wrong, which is
 * what intake 5.2 rules out. `fonts/robotoRegular.ts` explains the choice and
 * carries the licence; it is imported dynamically, with jsPDF and svg2pdf, so a
 * visitor who never exports a PDF never downloads any of it.
 */

import drawingStyles from '../styles/drawing.module.css';
import type { DesignLayout } from './layout';
import type { PdfDocumentPlan, PdfItem } from './pdfPlan';
import { PAGE_HEIGHT, PAGE_WIDTH, pdfPlan } from './pdfPlan';
import { renderDrawing } from './renderDrawing';

/** What a `.pdf` is, for the browser that is about to save one. */
export const PDF_MEDIA_TYPE = 'application/pdf';

/** The name the embedded font is filed and asked for under. */
const FONT_FILE = 'Roboto-Regular.ttf';
const FONT_FAMILY = 'Roboto';

/**
 * The document's own two colours.
 *
 * These are the page furniture — the text of the tables and the rules under the
 * headings — and not the drawing's palette, which arrives resolved from the
 * preview's own stylesheet and is never written down here. The ink is the same
 * near-black the drawing uses for a label so the two do not read as two
 * documents.
 */
const INK = '#1f2430';
const RULE = '#9aa3b5';

/** How thick a rule is drawn, in points. */
const RULE_WIDTH = 0.5;

/**
 * The style that keeps the drawing off the screen while its styles are read.
 *
 * It has to be in the page — a detached element has no resolved styles — but it
 * must not be seen and must not move anything. `position: fixed` takes it out
 * of the flow, the negative offset puts it outside the viewport without adding
 * anything to scroll, and it is only there for the moment it takes to convert.
 */
const OFFSCREEN = 'position:fixed;left:-10000px;top:0;pointer-events:none;';

/**
 * What each piece of the drawing is asked about before it is converted.
 *
 * Everything the stylesheet says and svg2pdf would otherwise miss. Geometry is
 * not here because `renderDrawing` writes it as attributes, which svg2pdf reads
 * for itself, and the font is not here because it is overridden rather than
 * copied — see `resolveStyles`.
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
  'font-size',
];

/** The drawing, in the page, with the way to take it out again. */
interface OpenDrawing {
  readonly svg: SVGSVGElement;
  readonly close: () => void;
}

/**
 * Renders a laid-out design as a PDF file.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param doc - the document to build and resolve the drawing in; nothing of it
 *   is left behind
 * @returns the whole file, ready for `downloadBlob`
 * @throws if the document has no window to resolve styles with, or if jsPDF or
 *   svg2pdf fails; the page catches it and says so in its own words (D43)
 *
 * @example
 * ```typescript
 * const file = await toPdf(layoutDesign(design), document);
 * downloadBlob(file, fileNameFor(layout.title, 'pdf'), document);
 * ```
 */
export async function toPdf(layout: DesignLayout, doc: Document): Promise<Blob> {
  const [{ jsPDF }, { svg2pdf }, { ROBOTO_REGULAR_BASE64 }] = await Promise.all([
    import('jspdf'),
    import('svg2pdf.js'),
    import('./fonts/robotoRegular'),
  ]);

  const pdf = new jsPDF({ unit: 'pt', format: [PAGE_WIDTH, PAGE_HEIGHT] });

  pdf.addFileToVFS(FONT_FILE, ROBOTO_REGULAR_BASE64);
  pdf.addFont(FONT_FILE, FONT_FAMILY, 'normal');
  pdf.setFont(FONT_FAMILY, 'normal');
  pdf.setTextColor(INK);

  const plan = pdfPlan(layout, (text, size) => {
    pdf.setFontSize(size);

    return pdf.getTextWidth(text);
  });
  const drawing = layout.nodes.length === 0 ? null : openDrawing(layout, doc);

  try {
    await writePages(pdf, plan, drawing?.svg ?? null, svg2pdf);
  } finally {
    drawing?.close();
  }

  return new Blob([pdf.output('arraybuffer')], { type: PDF_MEDIA_TYPE });
}

/** Every page of the plan, in order, on the pages of the PDF. */
async function writePages(
  pdf: JsPdf,
  plan: PdfDocumentPlan,
  svg: SVGSVGElement | null,
  draw: Svg2Pdf,
): Promise<void> {
  for (const [index, page] of plan.pages.entries()) {
    if (index > 0) {
      pdf.addPage([plan.width, plan.height]);
    }

    // One at a time and in order: svg2pdf draws onto whichever page is current,
    // so the drawing has to be converted while its own page is the one open.
    for (const item of page.items) {
      await writeItem(pdf, item, svg, draw);
    }
  }
}

/** One piece of ink: a line of text, a rule, or the drawing itself. */
async function writeItem(
  pdf: JsPdf,
  item: PdfItem,
  svg: SVGSVGElement | null,
  draw: Svg2Pdf,
): Promise<void> {
  // The colours are set at every use rather than once at the top, because
  // svg2pdf sets its own while it draws and the document's own furniture must
  // not inherit whatever the last thing in the picture happened to be.
  if (item.kind === 'text') {
    pdf.setFont(FONT_FAMILY, 'normal');
    pdf.setTextColor(INK);
    pdf.setFontSize(item.size);
    pdf.text(item.text, item.x, item.y);
    return;
  }

  if (item.kind === 'rule') {
    pdf.setDrawColor(RULE);
    pdf.setLineWidth(RULE_WIDTH);
    pdf.line(item.x, item.y, item.x + item.width, item.y);
    return;
  }

  if (svg === null) {
    // The plan only ever places a drawing when the design has nodes to draw, so
    // this cannot happen — and if it ever does, a PDF with a hole where the
    // picture should be is worse than an export that says it failed.
    throw new Error('The PDF plan asked for a drawing that was never rendered.');
  }

  await draw(svg, pdf, {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  });
}

/**
 * Renders the drawing and puts it where the browser will resolve its styles.
 *
 * The holder carries the preview's own class, so the preview's own stylesheet
 * applies to it and nothing here has to know a single colour. It is hidden from
 * assistive technology while it is there, and the caller always takes it out
 * again.
 */
function openDrawing(layout: DesignLayout, doc: Document): OpenDrawing {
  const view = doc.defaultView;

  if (view === null) {
    throw new Error('The PDF export needs a document with a window to read styles from.');
  }

  const holder = doc.createElement('div');
  const svg = renderDrawing(layout, doc);

  holder.className = drawingStyles.drawing ?? '';
  holder.setAttribute('aria-hidden', 'true');
  holder.setAttribute('style', OFFSCREEN);
  holder.append(svg);
  doc.body.append(holder);

  resolveStyles(svg, view);

  return { svg, close: () => holder.remove() };
}

/**
 * Writes what the stylesheet resolved to onto the elements themselves.
 *
 * svg2pdf reads an element's own `style` before anything else, so this is what
 * carries the preview's colours into the file. It changes only the elements
 * this export just built and is about to throw away; nothing on the page is
 * touched.
 *
 * **The font is overridden rather than copied, weight and all.** The preview
 * draws with whatever face the reader's system offers, and a PDF can only draw
 * with one it carries, so every piece of text is pointed at the embedded one.
 * The weight has to go with it: svg2pdf turns any weight that is not 400 or 700
 * into a style name of its own — a label at `font-weight: 550` is asked for as
 * `550normal` — and jsPDF answers a style it has never heard of by quietly
 * falling back to Times, which is Latin-1. That is how a Greek label came out
 * of an early build of this export as `±Á±³³µ»¯µÂ` while the same label was
 * correct in the table underneath it. Normalising the weight here removes the
 * whole class of that failure rather than the one spelling of it; the cost is
 * that the label's half-step of extra weight is not in the PDF, which is a
 * fair trade for a label that is the text it says.
 */
function resolveStyles(svg: SVGSVGElement, view: Window & typeof globalThis): void {
  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    if (!(element instanceof view.SVGElement)) {
      continue;
    }

    const resolved = view.getComputedStyle(element);

    for (const property of RESOLVED_PROPERTIES) {
      element.style.setProperty(property, resolved.getPropertyValue(property));
    }

    element.style.setProperty('font-family', FONT_FAMILY);
    element.style.setProperty('font-weight', 'normal');
    element.style.setProperty('font-style', 'normal');
  }
}

/** Just enough of jsPDF to write this document, so nothing here says `any`. */
type JsPdf = Awaited<typeof import('jspdf')>['jsPDF']['prototype'];

/** svg2pdf's own signature, named so the two helpers can be handed it. */
type Svg2Pdf = Awaited<typeof import('svg2pdf.js')>['svg2pdf'];
