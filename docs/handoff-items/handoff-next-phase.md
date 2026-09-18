# Handoff — after Task 05

**Date:** 2026-09-18
**Phase finished:** Task 05: Export as Markdown
**Next phase:** Task 06: Export as HTML

## Where things stand

`main` has Tasks 01 to 05, squashed as `e3416b3`, PR #11. `bun install`, `bun
run dev`, `bun run test`, `bun run test:e2e`, `bun run check`, and `bun run
build` all work as `README.md` and `CLAUDE.md` describe. CI
(`.github/workflows/ci.yml`) is green: 240 Vitest (up from 206), 40 Playwright
(up from 31), typecheck clean. `gitleaks detect` finds nothing.

Choose a JSON file, with the picker or by dropping it on the page: validated
against `src/lib/design.schema.ts`, syntax and schema errors explained beside
the upload control, a loaded design laid out with `@dagrejs/dagre` and drawn
as an SVG.

**New this cycle: Export Markdown.** With a design on screen, a button above
the preview downloads `<design>.md` — the title as a heading, a table of
every node, a table of every edge, and the drawing as a fenced ` ```mermaid `
`flowchart TD` block keyed off `shapes.ts` so it never disagrees with the
preview. The block was verified against real Mermaid 10 and 11 and against
GitHub's own Markdown pipeline, not just unit-tested.

**The durable piece: `src/lib/download.ts`.** `downloadBlob(blob, fileName,
doc)` takes a `Blob` (so Task 07's PDF bytes and Task 08's `.docx` bytes both
fit with no rewrite) and its `Document` as a parameter (no DOM in this
project's Vitest run — pure logic in Vitest, DOM work in Playwright).
`fileNameFor(title, extension)` is the one place a title becomes a file
stem; Tasks 06-08 call it with their own extension. The page now holds the
layout it drew, through one function (`holdDrawing`), and the export button
is present-and-disabled until there is something to export, and disabled
again the instant a file fails — so it can never export the design before
last.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Start Task 06** (`docs/tasks/06-export-html.md`) from `main`, on a
   branch named `feature/export-html`. Unblocked — 01, 03, and 05 are all
   done. Build `toHtml(design, layout)`: a complete standalone page with the
   title, the inline SVG drawing (reuse Task 03's `renderDrawing` output
   verbatim — the notes call this "the cheapest way to keep the export
   identical to the preview"), and the node/edge tables from Task 05, styles
   inline, no external assets. Wire the button through the existing
   `downloadBlob` / `fileNameFor` helpers — no changes to `download.ts`
   should be needed, since it was built for this.
2. **`straightLine` at `src/lib/layout.ts:329` is now this task's**, not
   parked further. It falls back to dagre's *centres* while every other
   route runs border to border, so an arrowhead drawn on that path would
   land inside a box. Task 06 is the first exporter to embed the SVG itself
   (Task 05's Mermaid block computes its own layout and never reads
   `LayoutEdge.points`), so this is where the exposure, if any, first
   reaches an export. Unreachable across the 19 designs tried so far,
   including a 300-node one — check whether HTML export's own inputs can
   reach it before deciding whether it needs fixing here or stays parked
   again with a fresh reason.
3. **A node label that is literally HTML needs a decision.** Mermaid's
   `strict` security level sanitized a label like
   `<script>alert(1)</script>` away in Task 05's block, so that box rendered
   with no visible text — the node table still listed the label, so
   criterion 5.2 held there. HTML export has no such sanitizer in front of
   it by default; decide how labels are escaped into the page (this is
   almost certainly the same escaping question raised by embedding user text
   in an SVG `<title>`/`<desc>` and in the node/edge tables) and record the
   choice in `docs/DECISIONS.md`.
4. **The export row wants a name or a group once HTML's button joins
   Markdown's.** Two buttons in a row read better as a labelled group (a
   `<fieldset>`/`<legend>` or an `aria-label` on a wrapper) than as two
   unrelated controls — worth deciding once here rather than piecemeal
   across Tasks 07 and 08.
5. **Carried forward, not blocking Task 06:**
   - `e2e/fixtures/empty.json` (zero-byte file, the empty-*file* case) sits
     beside `e2e/fixtures/empty-design.json` (a valid empty design) and the
     two names read confusingly alike. A rename touches
     `e2e/validation.spec.ts`, so it belongs in its own chore, not a task.
   - Nothing on the page confirms a download happened beyond the browser's
     own UI. This is a live-region question (D41, Task 04's), not an
     exporter question — if the answer becomes "yes, announce it," all four
     exporters should do it the same way. Worth deciding once, not per task.
   - A `disabled` button is out of the tab order by definition (Task 05's
     Export Markdown button). Revisit once the export row has four buttons,
     which starts with this task's second button.
   - Still queued for its own small cycle, overdue by one task now: the
     Firefox/SpiderMonkey wording fault (`describeLoadError.ts:191`, `:193`),
     `loadDesign.ts`'s lagging doc comment, and `loadDesign.test.ts:146`'s
     conditional assertion.
   - Page styling outside the drawing is still parked to Task 09.
6. Update `README.md` or `CLAUDE.md` if a command changes.
7. When Task 06 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-06-*.md`.

## Suggested skills for the next session

From Task 06's file (`docs/tasks/06-export-html.md`):

- `front-review`: review the exported page's markup as you would a component.
- `front-a11y`: check the standalone page — title, headings, the SVG title
  from Task 03.
- `tdd-workflow`: the renderer test before the renderer.
- `e2e-testing`: the download assertion, extending the same walk Task 05
  added to.
