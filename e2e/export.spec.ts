import { expect, test } from '@playwright/test';

import { UploadPage } from './pages/uploadPage';

/**
 * Exporting what is on screen: click the button, get a file.
 *
 * This lives in a spec of its own rather than inside `drawing.spec.ts` for two
 * reasons. It is a different story — that one ends when the drawing appears,
 * this one starts there — and it is the file Tasks 06, 07 and 08 add to, since
 * HTML, PDF and Word are the same walk with a different button. `drawing.spec.ts`
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
