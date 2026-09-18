/**
 * Painting the drawing into a picture, for the one export that needs one.
 *
 * The PDF keeps its drawing as vector (D62) and that is what keeps its labels
 * sharp. The Word file cannot: `docx` types an image as `jpg`, `png`, `gif` or
 * `bmp`, and even its SVG option demands a raster fallback of one of those,
 * because Word's own SVG support varies by version. So a PNG is produced
 * either way, and this is where.
 *
 * **Why it is its own module.** Every line here needs a real browser — an
 * `Image`, a `canvas`, a `2d` context — and this project's Vitest run has no
 * DOM at all, so this is proven in `e2e/exportWord.spec.ts` against a real
 * browser rather than in a unit test. Keeping it behind one named seam is what
 * keeps `toDocx` readable and keeps the seam obvious to whoever changes it.
 *
 * **The styles have to be inline before this runs.** An SVG handed to an
 * `Image` is parsed as a document of its own: it has no host page, so the
 * app's CSS Module never applies to it and every `var(--shape-*)` in it
 * resolves to nothing. `openDrawing` is the step that fixes that (D64), and
 * this takes the element it opened.
 */

/** What an SVG is, for the browser about to parse one back. */
const SVG_MEDIA_TYPE = 'image/svg+xml;charset=utf-8';

/** What comes out: the one raster type every reader of a `.docx` draws. */
const PNG_MEDIA_TYPE = 'image/png';

/**
 * What the picture sits on.
 *
 * A canvas starts transparent, and a transparent PNG shows whatever is behind
 * it — which in a Word document a reader has themed is not necessarily white.
 * The preview is drawn on a white page and the export's promise is that it
 * shows what the preview shows, so the paper is painted first.
 */
const PAGE_BACKGROUND = '#ffffff';

/** How big to paint, in raster pixels, from `docxPlan`'s drawing plan. */
export interface RasterSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Paints a drawing that is already in the page into PNG bytes.
 *
 * @param svg - the drawing, with the preview's styles already written onto it
 *   by `openDrawing`; it is read, never changed
 * @param doc - the document to build the canvas in; nothing is left behind
 * @param size - the canvas to paint into, from `docxPlan`'s drawing plan
 * @returns the PNG, ready for `docx`'s `ImageRun`
 * @throws if the document has no window, if the drawing cannot be read back as
 *   an image, if the canvas has no 2d context, or if the browser declines to
 *   encode it; the page catches it and says so in its own words (D43)
 *
 * @example
 * ```typescript
 * const drawing = openDrawing(plan.drawing.layout, doc);
 * try {
 *   const png = await rasteriseDrawing(drawing.svg, doc, {
 *     width: plan.drawing.rasterWidth,
 *     height: plan.drawing.rasterHeight,
 *   });
 * } finally {
 *   drawing.close();
 * }
 * ```
 */
export async function rasteriseDrawing(
  svg: SVGSVGElement,
  doc: Document,
  size: RasterSize,
): Promise<Uint8Array> {
  const view = doc.defaultView;

  if (view === null) {
    throw new Error('Rasterising the drawing needs a document with a window.');
  }

  const markup = new view.XMLSerializer().serializeToString(svg);
  // A blob URL rather than a data URL: a 40-node drawing serialises to tens of
  // kilobytes, and percent-encoding all of it into a URL is work and memory
  // for nothing. It is same-origin, so it does not taint the canvas.
  const url = URL.createObjectURL(new Blob([markup], { type: SVG_MEDIA_TYPE }));

  try {
    return await paint(await loadImage(url, view), doc, size);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The serialised drawing, loaded back as an image.
 *
 * `onerror` says nothing about what went wrong — the browser does not report
 * it — so the message names the one thing that reliably causes it: markup the
 * SVG parser refused. That is why `docxPlan` marks the characters XML has no
 * room for before anything reaches here.
 */
function loadImage(
  url: string,
  view: Window & typeof globalThis,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new view.Image();

    image.addEventListener('load', () => {
      resolve(image);
    });
    image.addEventListener('error', () => {
      reject(new Error('The drawing could not be read back as an image.'));
    });

    image.src = url;
  });
}

/** The image, drawn onto a canvas of the asked-for size, as PNG bytes. */
async function paint(
  image: HTMLImageElement,
  doc: Document,
  size: RasterSize,
): Promise<Uint8Array> {
  const canvas = doc.createElement('canvas');

  // At least one pixel each way: a canvas with a zero side encodes to nothing,
  // and `docxPlan` never asks for one, but a picture of nothing would be worse
  // than a loud failure if it ever did.
  canvas.width = Math.max(1, Math.round(size.width));
  canvas.height = Math.max(1, Math.round(size.height));

  const context = canvas.getContext('2d');

  if (context === null) {
    throw new Error('This browser gave the drawing no canvas to be painted on.');
  }

  context.fillStyle = PAGE_BACKGROUND;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Uint8Array(await (await encode(canvas)).arrayBuffer());
}

/** The canvas as a PNG, with the browser's silent failure made loud. */
function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('The drawing could not be encoded as a picture.'));
        return;
      }

      resolve(blob);
    }, PNG_MEDIA_TYPE);
  });
}
