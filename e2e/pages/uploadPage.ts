import { fileURLToPath } from 'node:url';

import type { Locator, Page } from '@playwright/test';

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
  readonly drawing: Locator;
  readonly svg: Locator;

  constructor(private readonly page: Page) {
    this.fileInput = page.locator('#design-file');
    this.status = page.locator('#upload-status');
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

  /** How many edges were routed. */
  edges(): Locator {
    return this.svg.locator('[data-part="edge"]');
  }

  /** How many nodes were placed. */
  nodes(): Locator {
    return this.svg.locator('[data-part="node"]');
  }
}

function fixturePath(fixture: string): string {
  return fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url));
}
