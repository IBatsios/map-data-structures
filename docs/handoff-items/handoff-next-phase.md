# Handoff — after the drawing's label-size fix

**Date:** 2026-09-18
**Phase finished:** `fix/drawing-label-size` — put a floor under the drawing's
on-page label size, and tile it across sheets (unnumbered; no task file by
design — see the handoff doc below)
**Next phase:** Task 09: Schema and sample file

## Where things stand

`main` has Tasks 01–08 plus this fix, squashed as `7524cc4`, PR #19 (round 1,
no changes requested). CI is green on both jobs, re-confirmed independently
by Sam at the release gate rather than taken on report. `bun run test`: 382
Vitest tests, 22 files. `gitleaks detect --source . --no-banner`: no leaks
found, 30 commits scanned. `bun install`, `bun run dev`, `bun run test`,
`bun run test:e2e`, `bun run check`, and `bun run build` all work as
`README.md` and `CLAUDE.md` describe.

**The drawing's on-page text now has a floor, in both paginated formats.**
The smallest text the drawing draws — the 11px type line under every node —
never prints below 6pt in either the PDF or the Word export. A design too
large to hold at 6pt on one page is tiled across up to 16 captioned sheets
instead of shrinking further; past that cap the document says so in its own
words rather than shrinking silently. `platform-overview.json` (the fixture
built to stand for the owner's own scale) now prints at 6.00pt across 3
sheets in both formats, against 3.68pt/3.34pt on one crushed page before.
The seam is one new shared module, `src/lib/drawingSheets.ts`, that both
planners read — the old unbounded `Math.min(1, …)` is gone from both.
`README.md` and `CLAUDE.md` were both corrected to describe this rather than
the old ~15-node collapse; `docs/DECISIONS.md` gained D81–D89 (append-only —
nothing edited). Full detail, measurements, and both agents' work are in
`docs/handoff-items/handoff-fix-drawing-label-size.md`.

**A trap for every future cycle, worth repeating until it's fixed:**
`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so
`bun run test:e2e` can silently test a stale `dist/` if a server is already
listening on the port — it cost Amon ten minutes and nearly caught Jahmyr
during this cycle's verification (a leftover `e2e/staticServer.ts` was
holding the port). CI is unaffected; this only bites a local run. Left
untouched as config by everyone who has hit it so far.

**Still open for a person:** Microsoft Word is not installed on any machine
that has touched this project. Word's own renderer is unverified against the
`.docx` this app produces — everything short of that has been checked
(structural validation, LibreOffice as a second reader, and now the label-size
arithmetic). Opening `order-intake.docx` once, in real Word, closes it.

**Two known, accepted gaps, not defects:**
- `estate-sweep.json`'s Word label size is reported as a bound (≥4.86pt)
  rather than an exact number, because a `.docx` drawing is a raster and
  carries no font size, and this is the one reference design cut along both
  axes. The PDF measures the same design at 6.00pt exactly, and the unit
  tests hold the arithmetic — the fact is covered twice, in two places.
- The exported HTML has the printing cousin of this cycle's problem (a
  browser printing it scales the vector drawing onto one page, the way the
  PDF used to). Noted, not fixed — out of scope for this cycle by design.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Task 09** (`docs/tasks/09-schema-and-sample.md`), branch
   `feature/schema-and-sample`, from `main`. Unblocked — 01, 02, and 04 are
   all done. Generate the JSON Schema from the Zod schema rather than writing
   it twice, and confirm the generation method with the user first, since it
   depends on the Zod version. The sample doubles as the fixture for the
   Playwright walk in Tasks 03–08.
2. **Then the paired small-fixes cycle**, which Jared has already scheduled
   for immediately after Task 09 and before Task 10:
   - The loader-wording chore — `describeLoadError.ts:191`/`:193`
     (Firefox/SpiderMonkey wording), `loadDesign.ts`'s lagging doc comment,
     and `loadDesign.test.ts:146`'s conditional assertion.
   - The dagre `intersectRect` crash on a valid design — needs a two-cycle
     and a parallel duplicate edge in one design to trigger; fails safely
     today but surfaces dagre's own words rather than the app's.
   - **D51's empty-design sentence, still in four copies** —
     `pdfPlan.ts` (exported), `toHtml.ts` (private), `toMarkdown.ts`, and
     `docxPlan.ts` — with nothing holding them together the way
     `exportStyles.test.ts` holds the shared palette.
   - **The four exports' column headings, still four copies**
     (`Id | Label | Type`, `From | To | Label`), and the column *shares*
     written out twice, in `pdfPlan.ts` and `docxPlan.ts`. The label-size fix
     touched two of the four files these live in but deliberately left them
     alone, to keep that cycle reviewable as one idea.
3. **The loader chore is gated: it must run before Task 10 or it becomes
   blocking**, per item 2 above. Task 10 is now two tasks away.
4. **The status region says one thing at a time**, and a fourth export makes
   it more visible: export PDF then Word on a design with both an
   uncoverable glyph and a control character, and the second sentence
   replaces the first. D41's parked question ("announcing a finished
   download") growing a second head. No criterion fails; fold into whichever
   task next touches the status region.
5. `src/lib/text.ts:116` — a tab inside a label long enough to wrap is lost
   before marking, because `splitIntoFittingWords` rejoins on a single space.
   Not a failure today (the preview does the same); belongs to whoever next
   touches the drawing's wrapping.
6. `e2e/fixtures/empty.json` is still misnamed beside
   `e2e/fixtures/empty-design.json`. Still its own small chore.
7. Page styling outside the drawing is still parked to Task 09.
8. **The `playwright.config.ts` reuse-existing-server trap above** — worth
   closing opportunistically; either a `bun run build` before the local
   walk, or dropping `reuseExistingServer` for local runs.
9. Update `README.md` or `CLAUDE.md` if a command changes.
10. When the next phase ends, write the next handoff doc here, in this
    shape, and append its own detail to a new
    `docs/handoff-items/handoff-task-<NN>-*.md` or
    `docs/handoff-items/handoff-chore-*.md`/`handoff-fix-*.md`.

## Suggested skills for the next session

From Task 09's file (`docs/tasks/09-schema-and-sample.md`):

- `front-review`: review the schema page and the copy control.
- `frontend-design-direction`: the schema page is documentation; make it
  read like the product, not a dump.
- `front-a11y`: headings and the copy button.
- `front-comments`: document the schema module, since the page and the
  validator both depend on it.
