/**
 * The stylesheet an exported file carries inside itself.
 *
 * Criterion 3 of Task 06 is absolute: an exported `.html` fetches no
 * stylesheet, script, font or image from anywhere. So the styles travel in the
 * file, in a `<style>` element, and this is the one place they are written.
 * Tasks 07 and 08 inherit it rather than growing a second copy.
 *
 * **Why this is a string and not an import.** The drawing's colours live in
 * `src/styles/drawing.module.css`, and three things stop that file being
 * reused directly:
 *
 * 1. It is a CSS Module, so its class names are hashed at build time and the
 *    name the export would have to write is not knowable from here.
 * 2. Every way of pulling its text in at build time — `?raw`, `?inline` — is a
 *    Vite feature this project's Vitest run does not carry, though not in the
 *    same way (D61). `?inline` comes back as an empty string under
 *    `css: false`; `?raw` comes back as the CSS-Modules proxy stub, where
 *    `typeof` reads `object`, `String()` throws `Cannot convert a Symbol value
 *    to a string`, and `.length` reads back an invented class name
 *    (`_length_f9673f`). Either way the built file would be the only place the
 *    truth lived — and the `?raw` half makes the case stronger rather than
 *    weaker, because a test written against it would have thrown rather than
 *    quietly passed on nothing.
 * 3. An ordinary `import` of it is rewritten by Astro to a URL, which is
 *    exactly the fetch the criterion forbids.
 *
 * So the colours are written out a second time. The duplicate is only
 * acceptable because `exportStyles.test.ts` reads the real stylesheet off disk
 * and fails the day one is re-tuned and the other is not — the same way
 * `drawing.module.test.ts` already holds the contrast criterion.
 *
 * The selectors are the same `data-` attributes the preview styles through
 * (D23), because the export embeds the preview's own SVG rather than redrawing
 * it. What changes is the container: the app's hashed `.drawing` class becomes
 * a plain one, since the exported document has no other stylesheet to collide
 * with.
 *
 * Nothing here holds user text, so nothing here needs escaping; the test pins
 * that it can never close the `<style>` element it is written into.
 */

/**
 * The whole stylesheet, as it goes into the exported page.
 *
 * @example
 * ```typescript
 * `<style>${EXPORT_STYLES}</style>`;
 * ```
 */
export const EXPORT_STYLES = `
:root {
  color-scheme: light;
  --ink: #1f2430;
  --ink-quiet: #55607a;
  --rule: #dfe3ec;
  --surface: #ffffff;
  --surface-quiet: #f2f4f7;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 2.5rem 1.5rem 4rem;
  background-color: var(--surface);
  color: var(--ink);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  font-size: 16px;
  line-height: 1.55;
}

main {
  max-width: 64rem;
  margin: 0 auto;
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 2rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

h2 {
  margin: 2.5rem 0 0.75rem;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--rule);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink-quiet);
}

.empty {
  margin: 0;
  padding: 1.25rem;
  border: 1px dashed var(--rule);
  border-radius: 8px;
  color: var(--ink-quiet);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

caption {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

th,
td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--rule);
  text-align: left;
  vertical-align: top;
}

th {
  background-color: var(--surface-quiet);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-quiet);
}

/*
 * A label keeps every space the file gave it (D39), and HTML would otherwise
 * collapse them: without \`pre-wrap\` a cell reading "  Public API  " shows as
 * "Public API" and the export quietly says something the design did not.
 * \`anywhere\` is what stops one long id from widening the table off the page.
 */
td {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

tbody tr:last-child th,
tbody tr:last-child td {
  border-bottom: none;
}

.drawing {
  --shape-fill: #f2f4f7;
  --shape-stroke: #55607a;
  --shape-text: #1f2430;
  --shape-dash: none;

  overflow-x: auto;
}

.drawing [data-part='drawing'] {
  max-width: 100%;
  height: auto;
  font-family: inherit;
}

.drawing [data-kind='service'] {
  --shape-fill: #eef1fe;
  --shape-stroke: #4c56c0;
  --shape-text: #1e2160;
}

.drawing [data-kind='database'] {
  --shape-fill: #fdf3e3;
  --shape-stroke: #9a6414;
  --shape-text: #4a2f06;
}

.drawing [data-kind='queue'] {
  --shape-fill: #e6f6f2;
  --shape-stroke: #0f766e;
  --shape-text: #0a3b37;
}

.drawing [data-kind='external'] {
  --shape-fill: #eef1f6;
  --shape-stroke: #526175;
  --shape-text: #1b2432;
}

.drawing [data-kind='user'] {
  --shape-fill: #fdeef3;
  --shape-stroke: #ab2f51;
  --shape-text: #5a1128;
}

.drawing [data-kind='decision'] {
  --shape-fill: #f4eefc;
  --shape-stroke: #6d34c4;
  --shape-text: #2f1160;
}

.drawing [data-kind='unknown'] {
  --shape-fill: #f2f4f7;
  --shape-stroke: #55607a;
  --shape-text: #1f2430;
  --shape-dash: 5 4;
}

.drawing [data-part='shape'] {
  fill: var(--shape-fill);
  stroke: var(--shape-stroke);
  stroke-width: 1.5;
  stroke-dasharray: var(--shape-dash);
}

.drawing [data-part='detail'] {
  fill: none;
  stroke: var(--shape-stroke);
  stroke-width: 1.5;
}

.drawing [data-part='label'] {
  fill: var(--shape-text);
  font-weight: 550;
}

.drawing [data-part='type'] {
  fill: var(--shape-stroke);
  font-weight: 500;
  letter-spacing: 0.04em;
}

.drawing [data-part='route'] {
  fill: none;
  stroke: #46516a;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.drawing [data-part='arrowhead'] {
  fill: #46516a;
}

.drawing [data-part='plate'] {
  fill: #ffffff;
  stroke: #dfe3ec;
  stroke-width: 1;
}

.drawing [data-part='edge-label'] {
  fill: #2b3346;
  font-size: 12px;
}

/*
 * Printable, because the task's own note asks for it: Task 07 may turn this
 * page into the PDF. The colour bands are what a reader tells the kinds apart
 * by, so they are printed rather than dropped to save ink, and no row or
 * drawing is allowed to break across two sheets.
 */
@media print {
  body {
    padding: 0;
    font-size: 12pt;
  }

  .drawing,
  tr {
    break-inside: avoid;
  }

  .drawing [data-part='drawing'] {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  h2 {
    break-after: avoid;
  }
}
`.trim();
