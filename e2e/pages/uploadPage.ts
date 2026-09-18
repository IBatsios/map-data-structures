import { fileURLToPath } from 'node:url';

import type { Locator, Page } from '@playwright/test';

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
  readonly status: Locator;
  readonly problems: Locator;
  readonly drawing: Locator;
  readonly svg: Locator;

  constructor(private readonly page: Page) {
    this.fileInput = page.locator('#design-file');
    this.status = page.locator('#upload-status');
    this.problems = page.locator('#upload-problems');
    this.drawing = page.locator('#drawing');
    this.svg = page.locator('#drawing svg');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.fileInput.waitFor({ state: 'visible' });
  }

  /** Chooses a file from `e2e/fixtures`, the way a user picks one off a disk. */
  async choose(fixture: string): Promise<void> {
    await this.fileInput.setInputFiles(fixturePath(fixture));
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

function fixturePath(fixture: string): string {
  return fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url));
}
