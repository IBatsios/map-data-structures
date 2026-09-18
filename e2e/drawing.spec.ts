import { expect, test } from '@playwright/test';

import type { DrawnBox } from './pages/uploadPage';
import { UploadPage } from './pages/uploadPage';

/**
 * The walk the PRD is about: choose a JSON file, get a drawing back.
 *
 * This is the only test in the project that exercises the page's `<script>`, so
 * it is the only one that can tell you the wiring works. The unit suite proves
 * the layout puts boxes in the right places; this proves a real browser turns a
 * real file into a real drawing with nothing lost on the way.
 *
 * `order-intake.json` is a design the size of the owner's own use cases: seven
 * nodes, six edges, five kinds of node, and one `type` the app has never heard
 * of.
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

test.describe('Previewing the generated drawing', () => {
  test('draws every node and every edge the file named', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();

    for (const label of [...NODE_LABELS, ...EDGE_LABELS]) {
      expect(drawn, `"${label}" is missing from the drawing`).toContain(label);
    }

    await expect(upload.nodes()).toHaveCount(NODE_LABELS.length);
    await expect(upload.edges()).toHaveCount(EDGE_LABELS.length);
  });

  test('shows the drawing within a second of choosing the file', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');

    // The acceptance criterion, asserted rather than assumed: one second, on a
    // design the size of the owner's use cases.
    await expect(upload.svg).toBeVisible({ timeout: 1000 });
  });

  test('titles the drawing with the name of the design', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    expect(await upload.drawingTitle()).toBe('Order intake');
    await expect(upload.svg).toHaveAttribute('role', 'img');
  });

  test('describes every node and edge for a reader who cannot see it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    const description = await upload.drawingDescription();

    for (const label of [...NODE_LABELS, ...EDGE_LABELS]) {
      expect(description, `"${label}" is missing from the description`).toContain(label);
    }
  });

  test('gives each node the shape its type implies, and draws an unknown type', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    // `worker` is an alias of service and `db` of database; `widget-factory` is
    // a type this app has never heard of and must still be drawn.
    expect(await upload.drawnKinds()).toEqual([
      'user',
      'service',
      'queue',
      'service',
      'database',
      'external',
      'unknown',
    ]);
  });

  test('loops a self-edge against the node it points at', async ({ page }) => {
    // An edge from a node to itself is a file the schema accepts, and the one
    // input that used to draw wrong: dagre parks a stub beside the node rather
    // than routing a loop, and the stub reached the page as a line and an
    // arrowhead in empty space, touching neither end.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('retry-loop.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();

    for (const label of ['Delivery worker', 'Outbox', 'retries on failure']) {
      expect(drawn, `"${label}" is missing from the drawing`).toContain(label);
    }

    await expect(upload.edges()).toHaveCount(3);

    // The third edge in the file is the loop. Both of its ends have to land on
    // the box the browser actually drew for the node it loops on.
    const worker = await upload.nodeBox(0);
    const loop = await upload.routePoints(2);
    const first = loop[0];
    const last = loop.at(-1);

    expect(loop.length).toBeGreaterThanOrEqual(2);
    expect(first?.x).toBeCloseTo(worker.x + worker.width, 0);
    expect(last?.x).toBeCloseTo(worker.x + worker.width, 0);

    for (const point of [first, last]) {
      expect(point?.y).toBeGreaterThanOrEqual(worker.y);
      expect(point?.y).toBeLessThanOrEqual(worker.y + worker.height);
    }

    // And it reaches out past the box in between, so it reads as a loop.
    expect(Math.max(...loop.map((point) => point.x))).toBeGreaterThan(
      worker.x + worker.width,
    );
  });

  test('draws two self-edges on one node as two loops a reader can tell apart', async ({
    page,
  }) => {
    // A node may loop on itself twice, and the file that says so is valid. Both
    // loops were drawn on the same four points with their plates on top of each
    // other, so the opaque upper plate hid the lower label: three edges in the
    // file, two on screen. What a reader has to get back is two loops and two
    // labels.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('two-loops.json');
    await expect(upload.svg).toBeVisible();

    const drawn = await upload.drawnText();

    for (const label of [
      'Delivery worker',
      'Outbox',
      'retries on failure',
      'escalates after five',
      'reads batch',
    ]) {
      expect(drawn, `"${label}" is missing from the drawing`).toContain(label);
    }

    await expect(upload.edges()).toHaveCount(3);

    // The first two edges in the file are the loops, and they are two different
    // paths — byte-identical `d` attributes are one loop drawn twice.
    const worker = await upload.nodeBox(0);
    const firstPath = await upload.routePath(0);
    const secondPath = await upload.routePath(1);

    expect(secondPath).not.toBe(firstPath);

    for (const index of [0, 1]) {
      const loop = await upload.routePoints(index);
      const start = loop[0];
      const end = loop.at(-1);

      expect(start?.x).toBeCloseTo(worker.x + worker.width, 0);
      expect(end?.x).toBeCloseTo(worker.x + worker.width, 0);

      for (const point of [start, end]) {
        expect(point?.y).toBeGreaterThanOrEqual(worker.y);
        expect(point?.y).toBeLessThanOrEqual(worker.y + worker.height);
      }
    }

    // And neither label plate covers the other, which is what makes both
    // labels readable rather than one of them a rectangle over the other.
    const firstPlate = await upload.plateBox(0);
    const secondPlate = await upload.plateBox(1);

    expect(
      overlaps(firstPlate, secondPlate),
      'one label plate is drawn over the other',
    ).toBe(false);
  });

  test('says what loaded in the status region', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');

    await expect(upload.status).toHaveAttribute('role', 'status');
    await expect(upload.status).toHaveText(
      'order-intake.json is drawn below: 7 nodes, 6 edges.',
    );
  });

  test('redraws when a second, different file is chosen', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.choose('billing-run.json');

    await expect.poll(() => upload.drawingTitle()).toBe('Billing run');
    await expect(upload.nodes()).toHaveCount(2);
    await expect(upload.edges()).toHaveCount(1);
    expect(await upload.drawnText()).not.toContain('Customer');
  });

  test('redraws when the same file is chosen a second time', async ({ page }) => {
    // Re-picking an identical file fires no `change` event unless the input's
    // value is cleared after each read. Without that, a user who edits their
    // JSON and picks the same path again is shown the previous drawing and the
    // previous status line, both still claiming to describe the new file.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.choose('billing-run.json');
    await expect.poll(() => upload.drawingTitle()).toBe('Billing run');

    await upload.choose('order-intake.json');

    await expect.poll(() => upload.drawingTitle()).toBe('Order intake');
    await expect(upload.status).toHaveText(
      'order-intake.json is drawn below: 7 nodes, 6 edges.',
    );
  });

  test('clears the drawing and says so when the file is not a design', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.choose('not-a-design.json');

    // What this pins is that the failure is never silent and never leaves a
    // drawing on screen that nothing is describing any more. The messages
    // themselves belong to `validation.spec.ts`, which is where the wording is
    // pinned; there is one voice for this outcome and it is the panel's.
    await expect(upload.svg).toHaveCount(0);
    await expect(upload.problems).toContainText('was not drawn');
    await expect(upload.status).toHaveText('');
  });
});

/** Whether two drawn rectangles share any pixel, which is a hidden label. */
function overlaps(a: DrawnBox, b: DrawnBox): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}
