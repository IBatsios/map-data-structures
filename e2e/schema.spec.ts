import { expect, test } from '@playwright/test';

import { SchemaPage, shippedSampleText } from './pages/schemaPage';
import { UploadPage } from './pages/uploadPage';

/**
 * The story this task is about: a person who has never seen this app works out
 * what to send it, and sends it.
 *
 * Everything below is one walk taken in pieces — read the page, copy the
 * sample, upload it, see every node and edge — plus the two things the page
 * offers instead of copying, which are the download and the "Load the sample
 * design" button on the upload page.
 *
 * The sample is read from `public/sample.json`, which is the only copy of it
 * anywhere. Every expectation about its contents is derived from that file
 * rather than written out here, so the day the sample changes this spec is
 * still describing the sample.
 */

/** Every node label the sample names, read out of the sample itself. */
async function sampleLabels(): Promise<{
  nodes: readonly string[];
  edges: readonly string[];
}> {
  const design = JSON.parse(await shippedSampleText()) as {
    nodes: readonly { label: string }[];
    edges: readonly { label: string }[];
  };

  return {
    nodes: design.nodes.map((node) => node.label),
    edges: design.edges.map((edge) => edge.label),
  };
}

test.describe('The published design format', () => {
  test('reads in order, with one heading per thing it explains', async ({ page }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    const headings = await schema.headingTexts();

    // One `h1`, then `h2`s: the page has to be walkable by heading, and a
    // reader jumping between them should find every section this page holds.
    await expect(page.locator('main h1')).toHaveCount(1);
    expect(headings.length).toBeGreaterThanOrEqual(4);
    expect(headings[0]).toBe('The design format');
  });

  test('lists every field with its type and whether it is required', async ({ page }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    const fields = await schema.fields();

    expect(fields.map((field) => field.path)).toEqual([
      'title',
      'nodes',
      'nodes[].id',
      'nodes[].label',
      'nodes[].type',
      'edges',
      'edges[].from',
      'edges[].to',
      'edges[].label',
    ]);
    expect(fields.every((field) => field.type.length > 0)).toBe(true);
    expect(fields.every((field) => field.required === 'Required')).toBe(true);
  });

  test('carries the two rules the schema file cannot state', async ({ page }) => {
    // The generated document says nothing about either, so the page has to —
    // otherwise it publishes a contract looser than the one the app enforces.
    const schema = new SchemaPage(page);
    await schema.goto();

    await expect(schema.rules).toHaveCount(2);
    await expect(schema.rules.first()).toContainText('unique');
    await expect(schema.rules.last()).toContainText('from');
    await expect(page.locator('main')).toContainText('once every field above has passed');
  });

  test('shows the sample exactly as the site serves it', async ({ page }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    expect((await schema.sampleText()).trim()).toBe((await shippedSampleText()).trim());
  });

  test('links the generated schema file itself', async ({ page }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    await expect(schema.schemaFileLink).toHaveAttribute('href', '/design.schema.json');
  });

  test('offers the sample as a download under its own name', async ({ page }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    const saved = await schema.downloadSample();

    expect(saved.name).toBe('sample.json');
    expect(saved.text.trim()).toBe((await shippedSampleText()).trim());
  });
});

test.describe('Copying the sample', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies it, and says so under a name a screen reader can hear', async ({
    page,
  }) => {
    const schema = new SchemaPage(page);
    await schema.goto();

    // The control's name is the words on it, not an attribute nobody can see.
    await expect(schema.copyButton).toHaveText(/copy/i);

    const said = await schema.copySample();

    expect(said.toLowerCase()).toContain('copied');
    expect((await schema.clipboardText()).trim()).toBe(
      (await shippedSampleText()).trim(),
    );
  });

  test('says so when the browser will not let it copy', async ({ page }) => {
    // The Clipboard API can be missing or refused, and a button that silently
    // does nothing is worse than no button: the page has to hand the reader
    // another way through.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new Error('Refused.')),
          readText: () => Promise.resolve(''),
        },
      });
    });

    const schema = new SchemaPage(page);
    await schema.goto();

    const said = await schema.copySample();

    expect(said.toLowerCase()).not.toContain('copied');
    expect(said.toLowerCase()).toContain('download');
  });

  test('draws what it copied, end to end', async ({ page }) => {
    // The whole walk in one test: read the page, copy the sample, take it to
    // the drawing page as a file, and find every node and edge in the picture.
    const schema = new SchemaPage(page);
    await schema.goto();
    await schema.copySample();

    const copied = await schema.clipboardText();

    const upload = new UploadPage(page);
    await upload.goto();
    await upload.chooseMade('sample.json', copied);
    await expect(upload.svg).toBeVisible();

    const labels = await sampleLabels();
    const drawn = await upload.drawnText();

    for (const label of [...labels.nodes, ...labels.edges]) {
      expect(drawn, `"${label}" is missing from the drawing`).toContain(label);
    }
  });
});

test.describe('Loading the shipped sample', () => {
  test('draws every node and edge when the sample is uploaded', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.chooseShippedSample();
    await expect(upload.svg).toBeVisible();

    const labels = await sampleLabels();
    const drawn = await upload.drawnText();

    for (const label of [...labels.nodes, ...labels.edges]) {
      expect(drawn, `"${label}" is missing from the drawing`).toContain(label);
    }

    await expect(upload.nodes()).toHaveCount(labels.nodes.length);
    await expect(upload.edges()).toHaveCount(labels.edges.length);
    await expect(upload.problems).toHaveText('');
  });

  test('draws it from the button too, and names it in the status line', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.loadTheSample();
    await expect(upload.svg).toBeVisible();

    const labels = await sampleLabels();

    await expect(upload.status).toHaveText(
      `sample.json is drawn below: ${labels.nodes.length} nodes, ${labels.edges.length} edges.`,
    );
    await expect(upload.nodes()).toHaveCount(labels.nodes.length);
    await expect(upload.edges()).toHaveCount(labels.edges.length);
  });

  test('turns the export buttons on, exactly as a chosen file does', async ({ page }) => {
    // D53: the page holds what it drew, and the buttons follow it. A sample
    // loaded by a route of its own must not be a design nothing can export.
    const upload = new UploadPage(page);
    await upload.goto();

    await expect(upload.exportMarkdown).toBeDisabled();

    await upload.loadTheSample();
    await expect(upload.svg).toBeVisible();

    for (const button of [
      upload.exportMarkdown,
      upload.exportHtml,
      upload.exportPdf,
      upload.exportWord,
    ]) {
      await expect(button).toBeEnabled();
    }
  });

  test('leaves nothing of the failed file behind it', async ({ page }) => {
    // D41 and intake 5.2: a panel about the last file sitting above a drawing
    // of this one is exactly the quiet wrongness this project rules out.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('dangling-edge.json');
    await expect(upload.problemItems().first()).toBeVisible();

    await upload.loadTheSample();
    await expect(upload.svg).toBeVisible();

    await expect(upload.problems).toHaveText('');
    await expect(upload.problemItems()).toHaveCount(0);
    await expect(upload.status).toContainText('sample.json is drawn below');
  });
});
