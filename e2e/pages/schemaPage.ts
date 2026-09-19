import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { Locator, Page } from '@playwright/test';

/** One row of the field table, as the page renders it. */
export interface PublishedField {
  readonly path: string;
  readonly type: string;
  readonly required: string;
}

/**
 * The page that publishes the format, as the end-to-end tests talk to it.
 *
 * Same rule as `UploadPage`: the selectors are the page's own ids and its
 * `data-` attributes, both of which the page keeps on purpose, and never the
 * hashed CSS Module class names, which change whenever a stylesheet does.
 */
export class SchemaPage {
  readonly headings: Locator;
  readonly fieldRows: Locator;
  readonly rules: Locator;
  readonly sample: Locator;
  readonly copyButton: Locator;
  readonly copyStatus: Locator;
  readonly downloadLink: Locator;
  readonly schemaFileLink: Locator;

  constructor(private readonly page: Page) {
    this.headings = page.locator('main h1, main h2');
    this.fieldRows = page.locator('[data-part="field"]');
    this.rules = page.locator('[data-part="rule"]');
    this.sample = page.locator('#sample-json');
    this.copyButton = page.locator('#copy-sample');
    this.copyStatus = page.locator('#copy-status');
    this.downloadLink = page.locator('#download-sample');
    this.schemaFileLink = page.locator('#schema-file-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/schema');
    await this.sample.waitFor({ state: 'visible' });
  }

  /** Every heading on the page, in the order a reader meets them. */
  async headingTexts(): Promise<readonly string[]> {
    return this.headings.allTextContents();
  }

  /** Every field the page lists, with the two facts the schema decided. */
  async fields(): Promise<readonly PublishedField[]> {
    return this.fieldRows.evaluateAll((rows) =>
      rows.map((row) => ({
        path: row.querySelector('[data-part="path"]')?.textContent?.trim() ?? '',
        type: row.querySelector('[data-part="type"]')?.textContent?.trim() ?? '',
        required: row.querySelector('[data-part="required"]')?.textContent?.trim() ?? '',
      })),
    );
  }

  /** The sample exactly as the page shows it. */
  async sampleText(): Promise<string> {
    return (await this.sample.textContent()) ?? '';
  }

  /** Clicks the copy control and waits for the page to say what happened. */
  async copySample(): Promise<string> {
    await this.copyButton.click();
    await this.copyStatus.locator('text=/\\S/').first().waitFor();

    return (await this.copyStatus.textContent())?.trim() ?? '';
  }

  /**
   * What is on the clipboard now, read back through the browser's own API.
   *
   * Line endings are normalised because the platform clipboard owns them: the
   * page writes the `\n` it was shown, and Windows hands back `\r\n`. That is
   * the operating system giving a pasting application what it expects, not
   * something this app did, so the walk compares the text and not the newlines.
   */
  async clipboardText(): Promise<string> {
    const copied = await this.page.evaluate(() => navigator.clipboard.readText());

    return copied.replace(/\r\n/gu, '\n');
  }

  /** Clicks the download link and waits for the file the browser saves. */
  async downloadSample(): Promise<{ name: string; text: string }> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.downloadLink.click(),
    ]);
    const path = await download.path();

    return {
      name: download.suggestedFilename(),
      text: await readFile(path, 'utf8'),
    };
  }
}

/**
 * The sample the site ships, read from the one place it exists.
 *
 * `public/sample.json`, not a copy of it under `e2e/fixtures/`: the file is the
 * page's asset, the upload page's fetch and this walk's fixture all at once, and
 * a second file with the same bytes is the duplicate this project keeps paying
 * for elsewhere.
 */
export function shippedSamplePath(): string {
  return fileURLToPath(new URL('../../public/sample.json', import.meta.url));
}

/** The same file, as text. */
export async function shippedSampleText(): Promise<string> {
  return readFile(shippedSamplePath(), 'utf8');
}
