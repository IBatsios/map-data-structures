import { expect, test } from '@playwright/test';

import { UploadPage } from './pages/uploadPage';

/**
 * The other half of the story the PRD is about: choose a file that is wrong,
 * and find out where.
 *
 * Every fixture here is a file a person could plausibly have written and picked
 * by mistake — one fault each, named after the fault. The unit suite proves the
 * sentences; this proves a real browser puts them on the screen, clears them
 * when the file is fixed, and never leaves a drawing behind that nothing is
 * describing any more.
 */

test.describe('Validation errors', () => {
  test('has both live regions on the page before anything is chosen', async ({
    page,
  }) => {
    // A live region announces changes to itself, not its own arrival, so a
    // panel that is created on failure may be announced as nothing at all.
    const upload = new UploadPage(page);
    await upload.goto();

    await expect(upload.problems).toHaveAttribute('role', 'status');
    await expect(upload.status).toHaveAttribute('role', 'status');
    await expect(upload.problems).toHaveText('');
    await expect(upload.problemItems()).toHaveCount(0);
  });

  test('names the line and column when the JSON is malformed', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('trailing-comma.json');

    await expect(upload.problemItems()).toHaveCount(1);
    expect(await upload.problemMessages()).toEqual([
      'That file is not valid JSON. Line 8, column 1: Expected double-quoted property name.',
    ]);
    expect(await upload.problemSummary()).toBe('trailing-comma.json was not drawn:');
  });

  test('admits it does not know where, rather than inventing a line', async ({
    page,
  }) => {
    // `JSON.parse` names no position for a file that ends early, on this engine
    // or any other. The one thing the panel may not do is guess.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('cut-short.json');

    const [message] = await upload.problemMessages();

    expect(message).toContain('did not say where');
    expect(message).not.toMatch(/line \d/i);
    expect(message).not.toMatch(/column \d/i);
  });

  test('names no line for a file whose own text says “position”', async ({ page }) => {
    // The round 1 defect, in the browser that found it. `gantry.json` is a YAML
    // config saved with a `.json` name; V8 quotes its first ten characters back
    // inside its own message, so the `900` on line 1 used to be scraped out of
    // that quotation and printed as "Line 1, column 10". The real fault is line
    // 1, column 1, and the engine never said so.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('gantry.json');

    const [message] = await upload.problemMessages();

    expect(await upload.problemSummary()).toBe('gantry.json was not drawn:');
    expect(message).toContain('did not say where');
    expect(message).not.toMatch(/line \d/i);
    expect(message).not.toMatch(/column \d/i);
  });

  test('says an empty file is empty', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('empty.json');

    const [message] = await upload.problemMessages();

    expect(message).toContain('That file is empty.');
    expect(message).not.toMatch(/line \d/i);
  });

  test('names the lists a file left out', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('not-a-design.json');

    expect(await upload.problemMessages()).toEqual([
      'nodes is missing. It has to be a list.',
      'edges is missing. It has to be a list.',
    ]);
    expect(await upload.problemSummary()).toBe(
      'not-a-design.json was not drawn. This pass found 2 problems in it:',
    );
  });

  test('names the node and the field when a node has no label', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('node-without-label.json');

    expect(await upload.problemMessages()).toEqual([
      'nodes[0].label is missing. It has to be text.',
    ]);
  });

  test('refuses a label that is nothing but spaces', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('blank-label.json');

    expect(await upload.problemMessages()).toEqual([
      'nodes[0].label holds only whitespace. It has to say something.',
    ]);
  });

  test('names the end of an edge that points at a node nobody defined', async ({
    page,
  }) => {
    // Caught here so the drawing never has to defend against a dangling edge.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('dangling-edge.json');

    expect(await upload.problemMessages()).toEqual([
      'edges[0].to: This edge\'s "to" is "ghost", which no node defines.',
    ]);
  });

  test('names the second of two nodes that share an id', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('duplicate-ids.json');

    expect(await upload.problemMessages()).toEqual([
      'nodes[1].id: Two nodes share the id "api". Every node id has to be unique.',
    ]);
  });

  test('caps a long list of problems and counts the rest', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('many-problems.json');

    await expect(upload.problemItems()).toHaveCount(10);
    expect(await upload.problemSummary()).toContain('15 problems');
    expect(await upload.problemNote()).toBe(
      '5 more problems are not listed. Fix these and load the file again to see the rest.',
    );
  });

  test('refuses an image chosen from the picker without reading a byte of it', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('logo.png');

    expect(await upload.problemSummary()).toBe('logo.png was not drawn:');
    expect(await upload.problemMessages()).toEqual([
      'That file is not JSON. Choose a file whose name ends in .json, or rename it if you know it holds JSON.',
    ]);
  });

  test('says a binary file named .json is binary, and shows none of it', async ({
    page,
  }) => {
    // The kind check passes this one: the name says JSON. What must not happen
    // is the engine's message putting the file's own bytes on the screen.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('renamed-image.json');

    const [message] = await upload.problemMessages();

    expect(message).toContain('not text at all');
    expect(message).not.toContain('IHDR');
    expect(message).not.toContain('PNG');
  });

  test('leaves no drawing behind, and no sentence describing one', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('order-intake.json');
    await expect(upload.svg).toBeVisible();

    await upload.choose('dangling-edge.json');
    await expect(upload.problemItems()).toHaveCount(1);

    // The drawing is gone, and the status line is not still claiming one is
    // below: on a failure the panel is the only voice.
    await expect(upload.svg).toHaveCount(0);
    await expect(upload.status).toHaveText('');
  });

  test('reads the message, fixes the file, and gets the drawing', async ({ page }) => {
    // The walk the task is written around: `node-without-label.json` and
    // `order-intake.json` are the same design, one of them repaired.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.choose('node-without-label.json');

    expect(await upload.problemMessages()).toEqual([
      'nodes[0].label is missing. It has to be text.',
    ]);
    await expect(upload.svg).toHaveCount(0);

    await upload.choose('order-intake.json');

    await expect(upload.svg).toBeVisible();
    await expect(upload.problems).toHaveText('');
    await expect(upload.problemItems()).toHaveCount(0);
    await expect(upload.status).toHaveText(
      'order-intake.json is drawn below: 7 nodes, 6 edges.',
    );
  });
});

/**
 * The other way a file gets into this app, and the one the picker cannot stand
 * in for.
 *
 * `accept="application/json,.json"` filters the file picker and nothing else,
 * so a file dragged off a desktop arrives unfiltered — which is why
 * `looksLikeJsonFile` exists (D40) and why the page prevents the browser's own
 * default of navigating away to the dropped file. None of that is reachable
 * through `setInputFiles`, so every test here dispatches a real `drop` carrying
 * a real `DataTransfer` built from the fixture's own bytes.
 */
test.describe('Files dropped on the page', () => {
  test('shows the drop cue while a file is over the page, and drops it again', async ({
    page,
  }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    expect(await upload.isDragCueShowing()).toBe(false);

    await upload.dragOver('order-intake.json');

    expect(await upload.isDragCueShowing()).toBe(true);

    await upload.drop('order-intake.json');

    expect(await upload.isDragCueShowing()).toBe(false);
  });

  test('refuses a dropped image without reading a byte of it', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.drop('logo.png');

    // The name is the page's own evidence that the dropped file is what it
    // answered: the picker was never touched.
    expect(await upload.problemSummary()).toBe('logo.png was not drawn:');
    expect(await upload.problemMessages()).toEqual([
      'That file is not JSON. Choose a file whose name ends in .json, or rename it if you know it holds JSON.',
    ]);
    await expect(upload.svg).toHaveCount(0);
  });

  test('describes a dropped binary named .json and shows none of it', async ({
    page,
  }) => {
    // This one gets past the kind check, because its name and its media type
    // both say JSON. What must never happen is the engine's message putting the
    // file's own bytes on the screen.
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.drop('renamed-image.json');

    const [message] = await upload.problemMessages();

    expect(await upload.problemSummary()).toBe('renamed-image.json was not drawn:');
    expect(message).toContain('not text at all');
    expect(await upload.problems.innerHTML()).not.toMatch(/PNG|IHDR/u);
  });

  test('draws a good file that was dropped rather than chosen', async ({ page }) => {
    const upload = new UploadPage(page);
    await upload.goto();

    await upload.drop('order-intake.json');

    await expect(upload.svg).toBeVisible();
    await expect(upload.status).toHaveText(
      'order-intake.json is drawn below: 7 nodes, 6 edges.',
    );
    await expect(upload.problems).toHaveText('');
  });

  test('cancels the browser’s own handling of both drag events', async ({ page }) => {
    // Without `preventDefault` on `dragover` *and* `drop` the browser opens the
    // dropped file itself, which throws this page away and with it the promise
    // that the file never leaves the browser. A dispatched event cannot make a
    // real browser navigate, so what is asserted here is the cancellation
    // itself: `dispatchEvent` is false exactly when a listener prevented the
    // default.
    const upload = new UploadPage(page);
    await upload.goto();

    expect(await upload.dragOver('order-intake.json')).toBe(true);
    expect(await upload.drop('order-intake.json')).toBe(true);
  });
});
