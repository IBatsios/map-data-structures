import { pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

import { UploadPage } from './pages/uploadPage';

/**
 * Exporting what is on screen: click the button, get a file.
 *
 * This lives in a spec of its own rather than inside `drawing.spec.ts` for two
 * reasons. It is a different story — that one ends when the drawing appears,
 * this one starts there — and Task 06 added the HTML half to it, since HTML is
 * the same walk with a different button. The PDF went into `exportPdf.spec.ts`
 * instead, because a third format took this file past the 800-line ceiling
 * `CLAUDE.md` sets and because reading a PDF back needs a page object's worth
 * of its own machinery; Word should follow that pattern rather than this one. `drawing.spec.ts`
 * keeps one export step of its own, which is the end-to-end walk the acceptance
 * criterion asks for; what is pinned here is the behaviour around it: the name
 * of the file, what is in it, and when the button is offered at all.
 */

/** Every node label in `e2e/fixtures/order-intake.json`, in file order. */
const NODE_LABELS = [
  'Customer',
  'Public API',
  'Order queue',
  'Fulfilment worker',
  'Order store',
  'Payments provider',
  'Ledger feed',
];

/** Every edge label in `e2e/fixtures/order-intake.json`, in file order. */
const EDGE_LABELS = [
  'places order',
  'publishes order',
  'authorises card',
  'delivers order',
  'writes order',
  'emits entry',
];

/** The body rows of one of the exported page's two tables, by its heading. */
function htmlRowsUnder(page: string, heading: string): readonly string[] {
  const table = page.split(`<h2>${heading}</h2>`)[1]?.split('</table>')[0] ?? '';
  const body = table.split('<tbody>')[1] ?? '';

  return [...body.matchAll(/<tr>.*?<\/tr>/gsu)].map(([row]) => row);
}

/** How many times one piece of markup appears in a file. */
function countOf(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** The rows of one of the file's two tables, found by the heading above it. */
function rowsUnder(markdown: string, heading: string): readonly string[] {
  const section = markdown.split(`## ${heading}\n`)[1]?.split('\n## ')[0] ?? '';

  return section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2);
}

test.describe('Exporting the design as Markdown', () => {
  test('offers no export until there is something to export', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    // Present from the first paint so the page does not rearrange itself later,
    // and disabled, because a button that downloads an empty file is worse than
    // one that waits.
    await expect(upload.exportMarkdown).toBeVisible();
    await expect(upload.exportMarkdown).toBeDisabled();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportMarkdown).toBeEnabled();
  });

  test('names the file after the design', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportMarkdown).toBeEnabled();

    const file = await upload.downloadMarkdown();

    expect(file.name).toBe('Order-intake.md');
  });

  test('writes every node and every edge the drawing shows, with the same labels', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();
    const file = await upload.downloadMarkdown();

    // The acceptance criterion, taken literally: what the preview shows is what
    // the file lists, label for label.
    for (const label of drawn) {
      expect(file.text, `"${label}" is missing from the export`).toContain(label);
    }

    expect(file.text.startsWith('# Order intake\n')).toBe(true);
    expect(rowsUnder(file.text, 'Nodes')).toHaveLength(NODE_LABELS.length);
    expect(rowsUnder(file.text, 'Edges')).toHaveLength(EDGE_LABELS.length);
  });

  test('carries the drawing as a fenced mermaid flowchart', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadMarkdown();
    const block = /```mermaid\n(.*?)```/su.exec(file.text)?.[1] ?? '';
    const statements = block.split('\n').filter((line) => line.trim() !== '');

    // One line for the direction, one per node, one per edge: nothing dropped
    // on the way from the picture to the file.
    expect(statements[0]).toBe('flowchart TD');
    expect(statements).toHaveLength(1 + NODE_LABELS.length + EDGE_LABELS.length);
    expect(block).toContain('{{"Customer"}}');
    expect(block).toContain('-->|"places order"|');
  });

  test('exports the design now on screen, not the one before it', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportMarkdown).toBeEnabled();

    await upload.choose('billing-run.json');
    await expect.poll(() => upload.drawingTitle()).toBe('Billing run');

    const file = await upload.downloadMarkdown();

    expect(file.name).toBe('Billing-run.md');
    expect(file.text.startsWith('# Billing run\n')).toBe(true);
    expect(file.text).not.toContain('Order intake');
  });

  test('stops offering the export when the next file fails', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportMarkdown).toBeEnabled();

    await upload.choose('not-a-design.json');
    await expect(upload.problems).toContainText('was not drawn');

    // The trap this pins: the drawing is gone, so the design behind it must be
    // gone too. A button still offering last file's design beside an error
    // panel is exactly the quiet wrongness intake 5.2 rules out.
    await expect(upload.svg).toHaveCount(0);
    await expect(upload.exportMarkdown).toBeDisabled();
  });

  test('exports a design with nothing in it without writing a broken diagram', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    // A design with no nodes and no edges is valid (D19). `empty.json` beside
    // this fixture is a *file* with nothing in it, which is a syntax error;
    // this one is a design with nothing in it, which draws an empty picture.
    await upload.choose('empty-design.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadMarkdown();

    expect(file.name).toBe('Nothing-yet.md');
    expect(file.text).toContain('# Nothing yet');
    expect(file.text).toContain('This design has no nodes, so there is nothing to draw.');
    expect(file.text).not.toContain('```mermaid');
    expect(rowsUnder(file.text, 'Nodes')).toHaveLength(0);
    expect(rowsUnder(file.text, 'Edges')).toHaveLength(0);
  });

  test('is reachable and usable from the keyboard alone', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportMarkdown).toBeEnabled();

    await upload.exportMarkdown.focus();
    await expect(upload.exportMarkdown).toBeFocused();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);

    expect(download.suggestedFilename()).toBe('Order-intake.md');
  });
});

test.describe('Exporting the design as HTML', () => {
  test('offers no export until there is something to export', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await expect(upload.exportHtml).toBeVisible();
    await expect(upload.exportHtml).toBeDisabled();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();
    await expect(upload.exportHtml).toBeEnabled();
  });

  test('names the file after the design, with the same stem the .md uses', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportHtml).toBeEnabled();

    const file = await upload.downloadHtml();

    expect(file.name).toBe('Order-intake.html');
  });

  test('writes every node and every edge the drawing shows, with the same labels', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();
    const file = await upload.downloadHtml();

    for (const label of drawn) {
      expect(file.text, `"${label}" is missing from the export`).toContain(label);
    }

    expect(file.text).toContain('<h1>Order intake</h1>');
    expect(htmlRowsUnder(file.text, 'Nodes')).toHaveLength(NODE_LABELS.length);
    expect(htmlRowsUnder(file.text, 'Edges')).toHaveLength(EDGE_LABELS.length);
  });

  test('carries the preview’s own drawing, inline, rather than redrawing it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawnRoute = await upload.routePath(0);
    const file = await upload.downloadHtml();

    // The same element, serialised: the route the preview drew is the route in
    // the file, to the pixel. Any second renderer would have to be kept in
    // agreement with this one, and would not be.
    expect(file.text).toContain('<svg');
    expect(file.text).toContain('data-part="drawing"');
    expect(file.text).toContain(drawnRoute);
    expect(countOf(file.text, 'data-part="node"')).toBe(NODE_LABELS.length);
    expect(countOf(file.text, 'data-part="edge"')).toBe(EDGE_LABELS.length);
  });

  test('keeps the drawing’s own title, so the page can be read without seeing it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadHtml();

    expect(file.text).toContain('<title>Order intake</title>');
    expect(file.text).toContain(`<title id="drawing-title">Order intake</title>`);
    expect(file.text).toContain('<h2>Drawing</h2>');
    expect(file.text).toContain('role="img"');
  });

  test('fetches nothing: no stylesheet, script, font or image from anywhere', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadHtml();

    expect(file.text).toContain('<style>');
    expect(file.text).not.toContain('<link');
    expect(file.text).not.toContain('<script');
    expect(file.text).not.toContain('<img');
    expect(file.text).not.toContain('@import');
    // `url(#drawing-arrowhead)` points inside the page; anything else would be
    // a fetch. The one absolute URL left is the SVG namespace, which names a
    // standard rather than asking for a file.
    expect(file.text.match(/url\((?!#)/gu) ?? []).toEqual([]);
    expect([...new Set(file.text.match(/https?:\/\/[^"'\s)]+/gu) ?? [])]).toEqual([
      'http://www.w3.org/2000/svg',
    ]);
  });

  test('opens on its own from another folder, with nothing beside it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    // Step 4 of the task file, as a test: move the file somewhere of its own
    // and open it there. Nothing from the site is within reach of that folder.
    const saved = test.info().outputPath('elsewhere', 'Order-intake.html');
    const file = await upload.downloadHtml(saved);
    const fetched: string[] = [];

    page.on('request', (request) => {
      if (!request.url().startsWith('file:')) {
        fetched.push(request.url());
      }
    });

    await page.goto(pathToFileURL(file.path).href);

    await expect(page.locator('h1')).toHaveText('Order intake');
    await expect(page.locator('svg[data-part="drawing"]')).toBeVisible();
    await expect(page.locator('svg [data-part="node"]')).toHaveCount(NODE_LABELS.length);
    await expect(page.locator('tbody tr')).toHaveCount(
      NODE_LABELS.length + EDGE_LABELS.length,
    );
    expect(fetched).toEqual([]);
  });

  test('draws the boxes in the colours the preview drew them in', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawnFill = await upload.nodeFill(1);
    const file = await upload.downloadHtml(
      test.info().outputPath('coloured', 'Order-intake.html'),
    );

    await page.goto(pathToFileURL(file.path).href);

    // The colours live in a CSS Module the export cannot link, so they are
    // written out a second time. This is the test that says the second copy is
    // the same copy a reader saw.
    const exportedFill = await page
      .locator('svg [data-part="node"]')
      .nth(1)
      .locator('[data-part="shape"]')
      .evaluate((shape) => getComputedStyle(shape).fill);

    expect(exportedFill).toBe(drawnFill);
  });

  test('shows a label that is markup as the text it is, and runs none of it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();
    const file = await upload.downloadHtml(
      test.info().outputPath('markup', 'Labels-that-look-like-markup.html'),
    );
    const dialogs: string[] = [];

    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await page.goto(pathToFileURL(file.path).href);

    // Escaped, not stripped: every label the preview drew is on the page as
    // the text it says. Task 05's Mermaid sanitiser removed these, which is
    // what intake 5.2 rules out, and a `<script>` that ran would be worse.
    for (const label of drawn) {
      expect(
        await page.getByText(label, { exact: true }).count(),
        `"${label}" is not shown as text`,
      ).toBeGreaterThan(0);
    }

    // A label reading `</style><script>` would, unescaped, end the page's own
    // style element and open a real one. There is exactly one `</style>` in
    // the file and it is the one this app wrote.
    expect(file.text).not.toContain('<script');
    expect(file.text).toContain('&lt;/style&gt;&lt;script&gt;');
    expect(countOf(file.text, '</style>')).toBe(1);
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('img')).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test('keeps a label that is not plain ASCII, read straight off the disk', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('markup-labels.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadHtml(
      test.info().outputPath('encoding', 'Labels-that-look-like-markup.html'),
    );

    await page.goto(pathToFileURL(file.path).href);

    // Opened from a folder, there is no header to say how the bytes are
    // encoded: the file's own `<meta charset>` is the only thing standing
    // between a Greek label and a row of question marks.
    await expect(
      page.getByRole('cell', { name: 'Παραγγελίες — naïve café', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'δίνει «σήμα»', exact: true }),
    ).toBeVisible();
    await expect(page.locator('svg text', { hasText: 'naïve café' })).toHaveCount(1);
  });

  test('exports a design with nothing in it without showing an empty canvas', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('empty-design.json');
    await expect(upload.svg).toBeVisible();

    const file = await upload.downloadHtml();

    expect(file.name).toBe('Nothing-yet.html');
    expect(file.text).toContain('<h1>Nothing yet</h1>');
    expect(file.text).toContain('This design has no nodes, so there is nothing to draw.');
    expect(file.text).not.toContain('<svg');
    expect(htmlRowsUnder(file.text, 'Nodes')).toHaveLength(0);
    expect(htmlRowsUnder(file.text, 'Edges')).toHaveLength(0);
  });

  test('stops offering the export when the next file fails', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportHtml).toBeEnabled();

    await upload.choose('not-a-design.json');
    await expect(upload.problems).toContainText('was not drawn');

    await expect(upload.svg).toHaveCount(0);
    await expect(upload.exportHtml).toBeDisabled();
  });

  test('sits in a named group of exports, reachable from the keyboard alone', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.exportHtml).toBeEnabled();

    // The buttons that do one job in several formats, named as the set they
    // are. The count is deliberate rather than incidental: a format added
    // without joining this group would leave a control outside the name a
    // screen reader reads on the way in, and this is what notices.
    await expect(upload.exports).toBeVisible();
    await expect(upload.exports.getByRole('button')).toHaveCount(3);

    await upload.exportMarkdown.focus();
    await page.keyboard.press('Tab');
    await expect(upload.exportHtml).toBeFocused();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press('Enter'),
    ]);

    expect(download.suggestedFilename()).toBe('Order-intake.html');
  });
});
