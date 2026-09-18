# Handoff — after Task 06

**Date:** 2026-09-18
**Phase finished:** Task 06: Export as HTML
**Next phase:** Task 07: Export as PDF

## Where things stand

`main` has Tasks 01 to 06, squashed as `87fbf33`, PR #13. `bun install`, `bun
run dev`, `bun run test`, `bun run test:e2e`, `bun run check`, and `bun run
build` all work as `README.md` and `CLAUDE.md` describe. CI
(`.github/workflows/ci.yml`) is green: 265 Vitest (up from 240), 53 Playwright
(up from 40), typecheck clean. `gitleaks detect` finds nothing.

Choose a JSON file, with the picker or by dropping it on the page: validated
against `src/lib/design.schema.ts`, syntax and schema errors explained beside
the upload control, a loaded design laid out with `@dagrejs/dagre` and drawn
as an SVG.

**New this cycle: Export HTML.** With a design on screen, a second button in
the export row (now a named `role="group"`, `aria-label="Export the design"`)
downloads `<design>.html` — one standalone page holding the preview's own
inline SVG, the same node/edge tables as the Markdown export, and every style
carried inline in a `<style>` block. It opens from any folder, offline, with
nothing fetched — verified with a Playwright walk that reopens the saved file
over `file://` and asserts zero non-document requests. User text, including a
label that is literally markup, is escaped into the page rather than run or
stripped; the SVG half is made safe by serialising the preview's own DOM
element rather than rebuilding it from a string, so there is only one SVG
renderer in the project.

**`straightLine` (`src/lib/layout.ts`) reached a verdict.** It is proven
unreachable — dagre's own `assignNodeIntersects` guarantees every edge comes
back with at least two border-to-border points, self-edges never reach it,
and the lookup that feeds it never misses. Kept in place as a guard rather
than deleted, so a future dagre change fails visibly instead of drawing an
edge with an empty path.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Start Task 07** (`docs/tasks/07-export-pdf.md`) from `main`, on a branch
   named `feature/export-pdf`. Unblocked — 01, 03, and 05 are all done (06 is
   also done, though the task file does not require it).
   - **Confirm the PDF route with the user before adding a library.** The
     task file names two open-source options and asks that the choice be
     confirmed rather than assumed: vector output via `svg2pdf.js` on
     `jsPDF` (text stays selectable and the file stays small) or rasterizing
     the SVG and placing it with `pdf-lib` (simpler, blurs when zoomed).
     Record the choice and its trade-off in `docs/DECISIONS.md`.
   - **The task file's `toPdf(design, layout)` sketch is stale**, the same
     way Task 06's `toHtml(design, layout)` sketch was — D48 already settled
     that exporters take the layout alone. Do not reopen it; a new decision
     recording the PDF module's actual signature (design half already
     settled, whatever the byte-producing half needs) is still worth adding,
     the way D55 did for `toHtml`.
   - **Criterion 11.1 is a real one to test, not just assert**: the download
     has to finish within a few seconds for a design the size of the owner's
     use cases. Time it against a design at that scale as part of the
     Playwright walk, not just the smallest fixture.
   - Wire the button through the existing `downloadBlob` / `fileNameFor`
     helpers — no change to `src/lib/download.ts` should be needed, exactly
     as Tasks 05 and 06 found.
   - The export row is already a named group of two; Task 07 adds a third
     button to it and nothing else structural, per D59.
2. **Carried forward, not blocking Task 07 but worth its own cycle: a valid
   design can make `layoutDesign` throw.** Dagre's own `intersectRect` throws
   "Not possible to find intersection inside of the rectangle" when two boxes
   it is routing between share a centre, reached from inside
   `assignNodeIntersects` during `dagre.layout()`. It needs *both* a
   two-cycle and a parallel duplicate of the same edge in one design — a
   two-cycle alone, a parallel pair alone, and a three-cycle are all fine.
   Two independent fuzzers hit it at similar low rates (2/2000, 7/400), and
   an exhaustive sweep of every 2- and 3-node multigraph with up to 4 edges
   found zero crashes, so it is not reachable by a small design. It fails
   safely today — the panel shows an error, the page stays intact, no stale
   drawing — but the message is dagre's own words rather than the app's,
   which is what D43 otherwise prevents for every other failure. Its natural
   neighbour is the deferred loader-wording chore below; both live in the
   error-message region of the app.
3. **The deferred loader chore is now gated: it runs before Task 10.** If it
   is still open when Task 10 is picked, it becomes blocking rather than
   schedulable. It covers `describeLoadError.ts:191`/`:193` (the
   Firefox/SpiderMonkey wording fault), `loadDesign.ts`'s lagging doc
   comment, and `loadDesign.test.ts:146`'s conditional assertion — read and
   found not to be a vacuous test, since Vitest runs on Node and the V8
   message always matches.
4. **A literal NUL character in a label is dropped on reopen of an exported
   file.** The preview keeps it; the HTML parser drops it when the file is
   reopened. Every other exotic character tried survives. This is recorded
   as a known limit, not a defect to fix: U+0000 has no valid HTML
   representation, and the only remedy would be loader-side tidying, which
   D39 and D56 rule out.
5. `e2e/fixtures/empty.json` is still misnamed next to
   `e2e/fixtures/empty-design.json` — one is the zero-byte file case, the
   other a valid empty design. Still its own small chore, not blocking.
6. Page styling outside the drawing is still parked to Task 09.
7. Update `README.md` or `CLAUDE.md` if a command changes.
8. When Task 07 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-07-*.md`.

## Suggested skills for the next session

From Task 07's file (`docs/tasks/07-export-pdf.md`):

- `anthropic-skills:pdf`: PDF structure and pitfalls while choosing the
  route.
- `tdd-workflow`: test the bytes for the page count and the text before the
  button exists.
- `e2e-testing`: the download assertion.
