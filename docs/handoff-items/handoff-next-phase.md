# Handoff — after Task 07

**Date:** 2026-09-18
**Phase finished:** Task 07: Export as PDF
**Next phase:** Task 08: Export as a Word document

## Where things stand

`main` has Tasks 01 to 07, Task 07 squashed as `4bfcd7a`, PR #15. `bun
install`, `bun run dev`, `bun run test`, `bun run test:e2e`, `bun run check`,
and `bun run build` all work as `README.md` and `CLAUDE.md` describe. CI
(`.github/workflows/ci.yml`) is green: 319 Vitest (up from 265), 76
Playwright (up from 53), typecheck clean. `gitleaks detect` finds nothing.

Choose a JSON file, with the picker or by dropping it on the page: validated
against `src/lib/design.schema.ts`, syntax and schema errors explained beside
the upload control, a loaded design laid out with `@dagrejs/dagre` and drawn
as an SVG.

**New this cycle: Export PDF.** A third button in the export row downloads
`<design>.pdf`: the title, the preview's own drawing as vector (`svg2pdf.js`
2.8.1 on `jspdf` 4.2.1, both MIT, D62), and the same node and edge tables the
other two exports write, running onto as many pages as the design needs. The
file carries its own embedded font — Roboto Regular, SIL Open Font License
1.1, licence text at `src/lib/fonts/Roboto-LICENSE.txt` — so it opens the
same everywhere and a Greek or Cyrillic label survives (D65). Three rounds
were needed to close criterion 2 ("every label readable"): round 1 found an
uncovered glyph (an arrow, a check mark, a CJK/Arabic/Hebrew/Indic character)
was silently dropped from both the drawing and the tables; round 2 found the
same silence for a tab or other control character in a label; both are now
fixed the same way — a character the embedded face cannot draw is replaced
one-for-one with a visible `■`, in the drawing and in both tables, never
dropped, and the page names the count after a lossy export (D69–D72).

**Carried forward, and worth reading before scheduling the next few tasks:
the PDF drawing's on-page label size degrades much earlier than anyone
assumed.** The drawing is scaled to fit one page. Measured off the actual
produced bytes: `order-intake` (7 nodes) 10.2pt, **`platform-overview` (15
nodes) 4.0pt**, `estate-sweep` (40 nodes) 1.2pt, a 200-node design 0.24pt.
4pt is below the smallest type anyone sets in print, and it starts at
`platform-overview.json` — the fixture built for this task and labelled *a
design at the owner's scale*. The tables still carry every label at full
size regardless of the drawing's scale, and the drawing is vector so it
stays sharp at any zoom on screen, which is why criterion 2 was judged met —
but a 15-node design printed on paper needs a magnifier. **This wants its
own task**: landscape pages, or a readable floor on the label size with the
drawing tiled across sheets. It is not scheduled as a numbered task yet;
whoever picks up task scheduling next should add one. Full measurements in
`docs/handoff-items/handoff-task-07-export-pdf.md`.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Start Task 08** (`docs/tasks/08-export-word.md`) from `main`, on a
   branch named `feature/export-word`. Unblocked — 01, 03, and 05 are all
   done.
   - **The library gate has to be opened with the user again.** jsPDF and
     svg2pdf are no help for a `.docx`; the task file suggests the `docx`
     npm package but it still needs confirming with the user before
     `bun add`, the same gate Task 07 went through for its own route (D62).
   - **The shape carries over, not the library.** A pure module that decides
     the document's structure plus a thin module that writes the bytes —
     `pdfPlan.ts` beside `toPdf.ts` is the precedent (D63) — and
     `downloadBlob` / `fileNameFor` should need no changes, the same way
     they didn't for Tasks 05, 06 or 07.
   - **Ask the new library the same two questions Task 07 had to ask jsPDF,
     because they turned out to be different failures with different
     shapes:** what does it do with a character its font cannot draw (an
     uncovered glyph wrote nothing and left the line standing in jsPDF), and
     what does it do with a control character in a string (jsPDF truncates
     the rest of the line). Both need an answer and, if the library is
     silent about either, the same `■`-and-count treatment D69–D72 built.
   - **Take the `/Title` and `/Lang` metadata habit** (D71) — a `.docx` has
     both too.
   - The task file's own criterion 14.1 is new: the Playwright walk now
     clicks all four export buttons and checks all four downloads in one
     pass. D59 already flagged that the export row's fuller revisit (going
     from a two- or three-button group to a four-button one) belongs to this
     task.
   - `e2e/exportPdf.spec.ts` is the pattern for a separate spec file rather
     than growing `e2e/export.spec.ts` past `CLAUDE.md`'s 800-line ceiling
     again (D68).
2. **Carried forward, not blocking Task 08 but worth scheduling: the PDF
   drawing's on-page label size degrades from 15 nodes.** See above. Its
   natural home is wherever page/print layout work lands, which may be
   before or alongside Task 09 (schema and sample page) rather than waiting
   for a dedicated task number — Jared's call.
3. **Carried forward, not blocking: a valid design can make `layoutDesign`
   throw.** Dagre's own `intersectRect` throws "Not possible to find
   intersection inside of the rectangle" when two boxes it is routing
   between share a centre, reached from inside `assignNodeIntersects` during
   `dagre.layout()`. It needs *both* a two-cycle and a parallel duplicate of
   the same edge in one design — a two-cycle alone, a parallel pair alone,
   and a three-cycle are all fine. Two independent fuzzers hit it at similar
   low rates (2/2000, 7/400), and an exhaustive sweep of every 2- and 3-node
   multigraph with up to 4 edges found zero crashes, so it is not reachable
   by a small design. It fails safely today — the panel shows an error, the
   page stays intact, no stale drawing — but the message is dagre's own
   words rather than the app's, which is what D43 otherwise prevents for
   every other failure. Its natural neighbour is the loader-wording chore
   below; both live in the error-message region of the app.
4. **The deferred loader chore is now gated: it runs before Task 10.** If it
   is still open when Task 10 is picked, it becomes blocking rather than
   schedulable. It covers `describeLoadError.ts:191`/`:193` (the
   Firefox/SpiderMonkey wording fault), `loadDesign.ts`'s lagging doc
   comment, and `loadDesign.test.ts:146`'s conditional assertion.
5. **`src/lib/exportStyles.ts` still carries D57's stale comment about
   `?raw`/`?inline`.** D61 corrected the recorded fact three tasks ago
   (`?raw` does not come back empty; it comes back as the CSS-Modules proxy
   stub) but no task since has opened that file to fix the comment itself.
   Small, one comment block, worth just doing the next time anyone is in
   that file — or its own tiny chore if nobody is.
6. **A literal NUL character in a label is dropped on reopen of an exported
   HTML file**, and is now marked `■` rather than dropped in a PDF. Recorded
   as a known limit for the HTML case, not a defect to fix: U+0000 has no
   valid HTML representation, and the only remedy would be loader-side
   tidying, which D39 and D56 rule out.
7. `e2e/fixtures/empty.json` is still misnamed next to
   `e2e/fixtures/empty-design.json` — one is the zero-byte file case, the
   other a valid empty design. Still its own small chore, not blocking.
8. Page styling outside the drawing is still parked to Task 09.
9. Update `README.md` or `CLAUDE.md` if a command changes.
10. When Task 08 ends, write the next handoff doc here, in this shape, and
    append its own detail to a new `docs/handoff-items/handoff-task-08-*.md`.

## Suggested skills for the next session

From Task 08's file (`docs/tasks/08-export-word.md`):

- `anthropic-skills:docx`: document structure, tables, and image embedding.
- `tdd-workflow`: unzip the bytes in the test and assert on `document.xml`
  before the button exists.
- `e2e-testing`: the final four-download walk.
