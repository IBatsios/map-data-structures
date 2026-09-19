import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { Download, JSHandle, Locator, Page } from '@playwright/test';

import { shippedSamplePath } from './schemaPage';

/** One position in the drawing, as the browser reports it. */
export interface DrawnPoint {
  readonly x: number;
  readonly y: number;
}

/** One rectangle in the drawing, as the browser reports it. */
export interface DrawnBox extends DrawnPoint {
  readonly width: number;
  readonly height: number;
}

/** A file the page handed to the browser: what it was called and where it is. */
export interface SavedFile {
  readonly name: string;
  /** Where it now sits on disk, which is nowhere near the design it came from. */
  readonly path: string;
}

/** The same, for a format whose bytes are text a test can read straight off. */
export interface DownloadedFile extends SavedFile {
  readonly text: string;
}

/**
 * The upload page, as the end-to-end tests talk to it.
 *
 * Everything the specs need to touch is named once here, so a change to a
 * selector is one edit rather than one per test. The selectors are the page's
 * own ids and the drawing's `data-part` attributes — both are contracts the
 * page keeps on purpose, unlike the hashed CSS Module class names, which change
 * whenever the stylesheet does.
 */
export class UploadPage {
  readonly fileInput: Locator;
  readonly loadSample: Locator;
  readonly dropZone: Locator;
  readonly status: Locator;
  readonly problems: Locator;
  readonly drawing: Locator;
  readonly svg: Locator;
  readonly exports: Locator;
  readonly exportMarkdown: Locator;
  readonly exportHtml: Locator;
  readonly exportPdf: Locator;
  readonly exportWord: Locator;

  constructor(private readonly page: Page) {
    this.fileInput = page.locator('#design-file');
    this.loadSample = page.locator('#load-sample');
    this.dropZone = page.locator('#drop-zone');
    this.status = page.locator('#upload-status');
    this.problems = page.locator('#upload-problems');
    this.drawing = page.locator('#drawing');
    this.svg = page.locator('#drawing svg');
    // By its accessible name, because the group's name is the thing under test:
    // four buttons that do the same job in four formats read as a set. Since
    // Task 08 the name is a heading on the page rather than an `aria-label`,
    // so this finds the same group by the same words a sighted reader sees.
    this.exports = page.getByRole('group', { name: 'Export the design' });
    this.exportMarkdown = page.locator('#export-markdown');
    this.exportHtml = page.locator('#export-html');
    this.exportPdf = page.locator('#export-pdf');
    this.exportWord = page.locator('#export-word');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.fileInput.waitFor({ state: 'visible' });
  }

  /** Chooses a file from `e2e/fixtures`, the way a user picks one off a disk. */
  async choose(fixture: string): Promise<void> {
    await this.fileInput.setInputFiles(fixturePath(fixture));
  }

  /**
   * Chooses the sample the site ships, the way a user who downloaded it would.
   *
   * It comes from `public/` rather than from `e2e/fixtures/`, because that is
   * the only place it exists: the same file is the download the schema page
   * offers, the asset "Load the sample design" fetches, and this.
   */
  async chooseShippedSample(): Promise<void> {
    await this.fileInput.setInputFiles(shippedSamplePath());
  }

  /** Asks the page for the design the site ships, without choosing a file. */
  async loadTheSample(): Promise<void> {
    await this.loadSample.click();
  }

  /**
   * Chooses a file the test made up, rather than one on disk.
   *
   * A design large enough to reach the sheet cap is four hundred nodes and
   * more, and a fixture that size would be a hundred kilobytes of JSON checked
   * in to be read once. The browser is handed the same bytes either way, so
   * the path under test is the same path.
   *
   * @param name - what the file is called, which the export's file name uses
   * @param json - the whole file, as text
   */
  async chooseMade(name: string, json: string): Promise<void> {
    await this.fileInput.setInputFiles({
      name,
      mimeType: 'application/json',
      buffer: Buffer.from(json, 'utf8'),
    });
  }

  /**
   * Drops a file on the page, the way a user drags one off their desktop.
   *
   * `setInputFiles` cannot reach this path at all: it drives the file input,
   * and the drop listeners are on `document`. That is the whole reason the
   * path needs its own way in — the input's `accept` filters the picker and
   * nothing else, so a dropped file is the one that arrives unfiltered, and
   * `looksLikeJsonFile` exists for it.
   *
   * The file is rebuilt inside the page from the bytes on disk, so a PNG
   * dropped here is the PNG in `e2e/fixtures` and not a description of one.
   *
   * @returns whether the page cancelled the browser's default, which for a drop
   * is navigating away to the dropped file
   */
  async drop(fixture: string): Promise<boolean> {
    return this.dispatchWithFile('drop', fixture);
  }

  /** Drags a file over the page without letting go of it yet. */
  async dragOver(fixture: string): Promise<boolean> {
    return this.dispatchWithFile('dragover', fixture);
  }

  /** Whether the drop zone is showing its "let go here" cue. */
  async isDragCueShowing(): Promise<boolean> {
    return (await this.dropZone.getAttribute('data-dragging')) === 'true';
  }

  /**
   * One drag event carrying one real file, dispatched at the drop zone.
   *
   * The event is built and dispatched by hand rather than through Playwright's
   * `dispatchEvent` so that `dispatchEvent`'s own return value is readable: it
   * is false exactly when a listener called `preventDefault`, which is the only
   * way to observe that the page cancelled the browser's default. A synthetic
   * drop never navigates on its own, so asserting the page is still here would
   * assert nothing at all.
   */
  private async dispatchWithFile(eventType: string, fixture: string): Promise<boolean> {
    const transfer = await this.fileTransfer(fixture);

    try {
      return await this.page.evaluate(
        ({ type, dataTransfer }) => {
          const zone = document.querySelector('#drop-zone');

          if (!(zone instanceof HTMLElement)) {
            throw new Error('The drop zone is not on the page.');
          }

          const event = new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer,
          });

          return !zone.dispatchEvent(event);
        },
        { type: eventType, dataTransfer: transfer },
      );
    } finally {
      await transfer.dispose();
    }
  }

  /** A `DataTransfer` holding one fixture, built inside the page. */
  private async fileTransfer(fixture: string): Promise<JSHandle<DataTransfer>> {
    const contents = [...(await readFile(fixturePath(fixture)))];

    return this.page.evaluateHandle(
      ({ name, mediaType, bytes }) => {
        const transfer = new DataTransfer();

        transfer.items.add(new File([new Uint8Array(bytes)], name, { type: mediaType }));

        return transfer;
      },
      { name: fixture, mediaType: mediaTypeOf(fixture), bytes: contents },
    );
  }

  /** Clicks Export Markdown and waits for the file the browser saves. */
  async downloadMarkdown(): Promise<DownloadedFile> {
    return withText(await this.exportUsing(this.exportMarkdown));
  }

  /**
   * Clicks Export HTML and waits for the file the browser saves.
   *
   * @param saveAs - where to put it, for a test that then opens it from there;
   *   left out, it stays where Playwright put it
   */
  async downloadHtml(saveAs?: string): Promise<DownloadedFile> {
    return withText(await this.exportUsing(this.exportHtml, saveAs));
  }

  /**
   * Clicks Export PDF and waits for the file the browser saves.
   *
   * It comes back as a name and a path and not as text, because a PDF is bytes:
   * reading it as a string is what `e2e/pdfText.ts` is for.
   *
   * @param saveAs - where to put it, for a test that then opens it from there;
   *   left out, it stays where Playwright put it
   */
  async downloadPdf(saveAs?: string): Promise<SavedFile> {
    return this.exportUsing(this.exportPdf, saveAs);
  }

  /**
   * Clicks Export Word and waits for the file the browser saves.
   *
   * It comes back as a name and a path and not as text, because a `.docx` is a
   * zip of XML: reading it is `e2e/docxText.ts`'s job.
   *
   * @param saveAs - where to put it, for a test that then opens it from there;
   *   left out, it stays where Playwright put it
   */
  async downloadWord(saveAs?: string): Promise<SavedFile> {
    return this.exportUsing(this.exportWord, saveAs);
  }

  /**
   * One export button, clicked, and the file that came back.
   *
   * The wait is armed before the click, because the download begins inside it:
   * clicking first and listening afterwards is the race that makes a download
   * test flaky. Nothing is written to the repo — Playwright keeps the file in
   * its own temporary place unless a test asks for it somewhere else, which is
   * how "open it from another folder" is tested.
   */
  private async exportUsing(button: Locator, saveAs?: string): Promise<SavedFile> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      button.click(),
    ]);

    return { name: download.suggestedFilename(), path: await pathOf(download, saveAs) };
  }

  /** Every message the validation panel lists, in the order it lists them. */
  problemItems(): Locator {
    return this.problems.locator('[data-part="problem"]');
  }

  /** The panel's heading: which file, and what this pass found in it. */
  async problemSummary(): Promise<string> {
    const summary = this.problems.locator('[data-part="summary"]');

    return (await summary.count()) === 0 ? '' : ((await summary.textContent()) ?? '');
  }

  /** The messages themselves, as text. */
  async problemMessages(): Promise<readonly string[]> {
    return this.problemItems().allTextContents();
  }

  /** The line about problems the panel left out, when there is one. */
  async problemNote(): Promise<string> {
    const note = this.problems.locator('[data-part="more"]');

    return (await note.count()) === 0 ? '' : ((await note.textContent()) ?? '');
  }

  /** The drawing's own `<title>`: the design's title, for a screen reader. */
  async drawingTitle(): Promise<string> {
    return (await this.svg.locator('title').textContent()) ?? '';
  }

  /** The `<desc>` the drawing carries, which is what `role="img"` exposes. */
  async drawingDescription(): Promise<string> {
    return (await this.svg.locator('desc').textContent()) ?? '';
  }

  /** Every piece of text in the drawing, node labels and edge labels alike. */
  async drawnText(): Promise<readonly string[]> {
    return this.svg.locator('text').allTextContents();
  }

  /**
   * The colour one node's silhouette was filled with, as the browser resolved
   * it — the stylesheet's answer rather than the stylesheet's text, which is
   * what lets an export be compared against the preview colour for colour.
   */
  async nodeFill(index: number): Promise<string> {
    return this.nodes()
      .nth(index)
      .locator('[data-part="shape"]')
      .evaluate((shape) => getComputedStyle(shape).fill);
  }

  /** The kind each node was drawn as, in the order the file listed them. */
  async drawnKinds(): Promise<readonly (string | null)[]> {
    return this.svg
      .locator('[data-part="node"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-kind')));
  }

  /**
   * The box one node was drawn in, in the drawing's own coordinates.
   *
   * `getBBox` is the browser's own answer rather than the layout's, so a test
   * using it is comparing what was drawn against what the reader sees.
   */
  async nodeBox(index: number): Promise<DrawnBox> {
    return this.nodes()
      .nth(index)
      .evaluate((node) => {
        const { x, y, width, height } = (node as SVGGElement).getBBox();

        return { x, y, width, height };
      });
  }

  /** The `d` one edge's route was drawn with, exactly as the renderer wrote it. */
  async routePath(index: number): Promise<string> {
    const path = await this.edges()
      .nth(index)
      .locator('[data-part="route"]')
      .getAttribute('d');

    return path ?? '';
  }

  /** The corners of one edge's route, read back off the path it was drawn as. */
  async routePoints(index: number): Promise<readonly DrawnPoint[]> {
    return pointsOf(await this.routePath(index));
  }

  /** The plate one edge's label was drawn on, as the browser laid it out. */
  async plateBox(index: number): Promise<DrawnBox> {
    return this.edges()
      .nth(index)
      .locator('[data-part="plate"]')
      .evaluate((plate) => {
        const { x, y, width, height } = (plate as SVGRectElement).getBBox();

        return { x, y, width, height };
      });
  }

  /** How many edges were routed. */
  edges(): Locator {
    return this.svg.locator('[data-part="edge"]');
  }

  /** How many nodes were placed. */
  nodes(): Locator {
    return this.svg.locator('[data-part="node"]');
  }
}

/**
 * The points of a route's `d`, which the renderer writes as `M x y L x y …`.
 *
 * Reading the numbers back is enough here and keeps the page object free of a
 * path parser: the drawing only ever emits straight segments.
 */
function pointsOf(path: string): readonly DrawnPoint[] {
  const numbers = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: DrawnPoint[] = [];

  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 });
  }

  return points;
}

/** Where a download ended up. */
async function pathOf(download: Download, saveAs?: string): Promise<string> {
  if (saveAs !== undefined) {
    await download.saveAs(saveAs);
  }

  return saveAs ?? (await download.path());
}

/** The same file, with its text read off disk, for the formats that are text. */
async function withText(file: SavedFile): Promise<DownloadedFile> {
  return { ...file, text: await readFile(file.path, 'utf8') };
}

function fixturePath(fixture: string): string {
  return fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url));
}

/**
 * The media type a browser puts on a dropped file, which the operating system
 * reads off its name and never off its contents.
 *
 * That is why `renamed-image.json` arrives claiming to be JSON however much PNG
 * is inside it: the case D40's check is meant to let through and the parser is
 * meant to catch.
 */
function mediaTypeOf(fixture: string): string {
  return fixture.endsWith('.png') ? 'image/png' : 'application/json';
}
