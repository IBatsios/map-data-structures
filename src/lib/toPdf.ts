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
 * run has no DOM at all, so this half is asserted in `e2e/exportPdf.spec.ts`
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
 * it did. `openDrawing` is that step, and it lives in its own module because
 * the Word export needs it identically — an SVG loaded into an `Image` has no
 * host page and so no stylesheet either (D64). The holder it opens is removed
 * before this function returns.
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
 *
 * **And what the font cannot draw is marked rather than dropped.** No face of a
 * sensible size covers every script, and jsPDF's answer to a character it has
 * no glyph for is to write nothing at all — in the picture and in the tables
 * both, so no copy of it survives and the export still reports success. That
 * reaches ordinary English designs, because the face has no arrow either. So
 * the layout is run through `drawableText.ts` first: every character the font
 * cannot draw becomes one visible mark, and the count comes back with the file
 * for the page to say out loud.
 */

import { drawableLayout } from './drawableText';
import { readFontCoverage } from './fontCoverage';
import type { DesignLayout } from './layout';
import { openDrawing, withDrawingRegion } from './openDrawing';
import type { PdfDocumentPlan, PdfItem } from './pdfPlan';
import { PAGE_HEIGHT, PAGE_WIDTH, pdfPlan } from './pdfPlan';

/** What a `.pdf` is, for the browser that is about to save one. */
export const PDF_MEDIA_TYPE = 'application/pdf';

/**
 * The language the file declares, for a viewer and for a screen reader.
 *
 * The document's own furniture — its headings, its column names and the
 * sentence an empty design gets — is English whatever language the design is
 * written in, and the page that built it says `lang="en"` too. A design in
 * another language is not a reason to claim otherwise for the wrapper around
 * it; a file that declares nothing at all is announced with no language, which
 * is worse than one that names the language of its own words.
 */
const DOCUMENT_LANGUAGE = 'en';

/** One exported file, and what the font could not draw while writing it. */
export interface PdfExport {
  readonly blob: Blob;
  /**
   * How many characters were replaced with `UNDRAWABLE_MARK`, for the page to
   * say so afterwards. Zero means the font drew the whole design.
   */
  readonly undrawable: number;
}

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
 * Renders a laid-out design as a PDF file.
 *
 * @param layout - the design as the preview drew it, from `layoutDesign`
 * @param doc - the document to build and resolve the drawing in; nothing of it
 *   is left behind
 * @returns the whole file, ready for `downloadBlob`, and how many characters
 *   the font could not draw, for the page to say so afterwards
 * @throws if the document has no window to resolve styles with, if the embedded
 *   font cannot be read, or if jsPDF or svg2pdf fails; the page catches it and
 *   says so in its own words (D43)
 *
 * @example
 * ```typescript
 * const file = await toPdf(layoutDesign(design), document);
 * downloadBlob(file.blob, fileNameFor(layout.title, 'pdf'), document);
 * ```
 */
export async function toPdf(layout: DesignLayout, doc: Document): Promise<PdfExport> {
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

  // The title as the file gave it, and not the marked one below: metadata is
  // written into a dictionary rather than drawn with a font, so it carries
  // every character whatever the face can draw. A viewer shows this in its
  // window bar and a screen reader announces it, and a file without it is
  // known to both by its file name alone.
  pdf.setProperties({ title: layout.title });
  pdf.setLanguage(DOCUMENT_LANGUAGE);

  // Everything below draws with the embedded face, so everything below works
  // from the marked layout: what the font cannot draw is replaced with a mark
  // the reader can see, once, before the document is measured or the drawing
  // is built, so the tables wrap around what is actually written.
  const drawable = drawableLayout(layout, readFontCoverage(ROBOTO_REGULAR_BASE64));
  const plan = pdfPlan(drawable.layout, (text, size) => {
    pdf.setFontSize(size);

    return pdf.getTextWidth(text);
  });
  const drawing =
    drawable.layout.nodes.length === 0
      ? null
      : openDrawing(drawable.layout, doc, {
          // The preview draws with whatever face the reader's system offers
          // and a PDF can only draw with one it carries, so every piece of
          // text is pointed at the embedded one, weight and all —
          // `openDrawing` says why the weight matters.
          'font-family': FONT_FAMILY,
          'font-weight': 'normal',
          'font-style': 'normal',
        });

  try {
    await writePages(pdf, plan, drawing?.svg ?? null, svg2pdf);
  } finally {
    drawing?.close();
  }

  return {
    blob: new Blob([pdf.output('arraybuffer')], { type: PDF_MEDIA_TYPE }),
    undrawable: drawable.undrawable,
  };
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

  // One drawing, rendered once, shown a piece at a time. A design small enough
  // for one page asks for the whole canvas here, which is what it always did;
  // a larger one asks for this sheet's piece of it, and the ink stays vector
  // either way (D62) because svg2pdf is reading the same elements.
  await withDrawingRegion(svg, item.region, () =>
    draw(svg, pdf, {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    }),
  );
}

/** Just enough of jsPDF to write this document, so nothing here says `any`. */
type JsPdf = Awaited<typeof import('jspdf')>['jsPDF']['prototype'];

/** svg2pdf's own signature, named so the two helpers can be handed it. */
type Svg2Pdf = Awaited<typeof import('svg2pdf.js')>['svg2pdf'];
