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

  test('refuses a dropped image without reading a byte of it', async ({ page }) => {
    // `accept="application/json,.json"` filters the picker and nothing else, so
    // a file dropped on the page reaches the same code path this does.
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
