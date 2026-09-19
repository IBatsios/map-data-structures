/**
 * Serves `dist/` for the end-to-end walk.
 *
 * Why this exists rather than `astro preview`: on the installed Astro (7.3.3)
 * `astro preview` detaches whether or not `--background` is passed. Started
 * with no flags at all it prints its URL, returns exit 0 within a few seconds,
 * and leaves a background process holding a lock file — `astro preview status`
 * reports it as "(background)". Playwright's `webServer` watches the process it
 * spawned, so it sees that exit and gives up with "Process from config.webServer
 * exited early", and the server it orphaned then collides with the next run.
 * `astro dev` behaves the same way. Neither can be a `webServer` command.
 *
 * So the drawing is tested against exactly what Netlify serves — the built
 * files in `dist/` — from a server that stays in the foreground, holds no lock,
 * and dies with the process that started it. That is what `astro build` plus a
 * preview was meant to give us, without the detachment.
 *
 * It is deliberately strict rather than convenient: a path it cannot resolve
 * inside `dist/` is a 404, not a fallback to `index.html`, because a test that
 * silently gets the home page for a broken URL is a test that proves nothing.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Astro's own default port, and the one `playwright.config.ts` points `baseURL`
 * at. It is a constant rather than an environment variable on purpose: nothing
 * in this project reads the environment, `.env.example` holds no variables, and
 * a knob no one asked for is not worth making that sentence false for.
 */
const PORT = 4321;

/** The built site. `astro build` writes here; Netlify serves the same thing. */
const ROOT = fileURLToPath(new URL('../dist', import.meta.url));

/** Only the types this site actually ships. Anything else is served as bytes. */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer((request, response) => {
  void respond(request.url ?? '/', response);
});

async function respond(
  url: string,
  response: import('node:http').ServerResponse,
): Promise<void> {
  const file = resolveWithin(url);

  if (!file) {
    return send(response, 404, 'Not found');
  }

  try {
    // `astro build` writes `/schema` as `dist/schema/index.html`, and a host
    // serving static files answers `/schema` with it, so this does too. That
    // is a directory's own index, not the single-page fallback the comment
    // above refuses: a URL naming nothing is still a 404, because the `stat`
    // of a missing `index.html` throws straight into the catch below.
    const found = await stat(file);
    const target = found.isFile() ? file : join(file, 'index.html');
    const served = found.isFile() ? found : await stat(target);

    if (!served.isFile()) {
      return send(response, 404, 'Not found');
    }

    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream',
      'content-length': served.size,
    });
    createReadStream(target).pipe(response);
  } catch {
    // A missing file is the ordinary case here, not an incident: the test asked
    // for a URL the build did not produce, and 404 is the honest answer.
    send(response, 404, 'Not found');
  }
}

/**
 * The file a URL names, or `undefined` if it names something outside `dist/`.
 *
 * The containment check is not ceremony. `decodeURIComponent` turns `%2e%2e%2f`
 * back into `../`, so a request can ask for a path above the root, and a server
 * that joins blindly will hand it over. This one resolves first and then
 * refuses anything that did not land inside the root.
 */
function resolveWithin(url: string): string | undefined {
  let pathname: string;

  try {
    pathname = decodeURIComponent(new URL(url, `http://localhost:${PORT}`).pathname);
  } catch {
    return undefined;
  }

  const file = resolve(
    join(ROOT, pathname.endsWith('/') ? `${pathname}index.html` : pathname),
  );
  const inside = relative(ROOT, file);

  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    return undefined;
  }

  return file;
}

function send(
  response: import('node:http').ServerResponse,
  status: number,
  body: string,
): void {
  response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
}

server.listen(PORT, () => {
  // The one line this file prints, so a failing CI run says which port it had.
  process.stdout.write(`Serving dist/ on http://localhost:${PORT}\n`);
});
