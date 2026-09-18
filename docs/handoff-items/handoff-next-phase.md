# Handoff — after Task 08

**Date:** 2026-09-18
**Phase finished:** Task 08: Export as a Word document
**Next phase:** an unnumbered `fix/…` cycle for the drawing's on-page label size (scheduled by Jared, before Task 09), then Task 09: Schema and sample file

## Where things stand

`main` has Tasks 01 to 08, Task 08 squashed as `4192fbb`, PR #17. `bun
install`, `bun run dev`, `bun run test`, `bun run test:e2e`, `bun run check`,
and `bun run build` all work as `README.md` and `CLAUDE.md` describe. CI is
green (both the push and pull-request runs on PR #17): 343 Vitest (up from
319), 97 Playwright steps (up from 77), typecheck clean over 65 files.
`gitleaks detect --source .` finds nothing, checked independently by Sam at
the release gate.

**All four export formats now exist.** With a design on screen, the export
row (`role="group"`, named on the page) offers Markdown, HTML, PDF and now
**Word**: `<design>.docx` downloads the title, the drawing as a PNG painted
through a canvas at three times its placed size, and the same node and edge
tables the other exports write, as real Word tables a reader can type into.
Built with `docx` 9.7.1 (MIT, D73), dynamically imported so a visitor who
never exports Word never downloads it. It opens in LibreOffice, verified
structurally (zip integrity, every XML part well-formed, zero XML-illegal
characters in any of sixteen files tested, every relationship resolved, PNG
chunk CRCs verified) and by a second independent OOXML implementation
(LibreOffice Writer opened all eleven non-malformed test files and
reproduced their tables on round trip).

**One caveat to hand a person, not to hide: Microsoft Word itself is not
installed on any machine that has touched this task.** Both Amon and Jahmyr
verified the `.docx` output against everything Word is known to refuse a
file for, and against LibreOffice as a second reader, but neither could open
one in Word itself. The task's own acceptance wording ("opens in Word **or**
LibreOffice") is satisfied, so the box is checked — but if the owner has
Word anywhere, **opening `order-intake.docx` once is a one-minute action
that closes the one thing nobody in this project has yet verified.**

**Carried forward from Task 07, now confirmed to also affect Word, at
matching magnitudes:** the drawing's on-page label size collapses well
before the sizes the owner actually uses. Measured off the produced bytes,
Word / PDF:

| design | nodes | Word label | PDF label |
|---|---|---|---|
| `markup-labels.json` | 4 | 10.50 pt | 11.8 pt |
| `order-intake.json` | 7 | 10.50 pt | 10.2 pt |
| `platform-overview.json` | 15 | **4.25 pt** | 4.0 pt |
| `estate-sweep.json` | 40 | 1.24 pt | 1.2 pt |
| 200-node design | 200 | 0.38 pt | 0.24 pt |

`platform-overview.json` is the fixture built to represent the owner's own
scale, and it is already below readable size in both formats. This is one
problem in two places, not two separate problems, and Jared has already
scheduled the fix cycle for immediately after Task 08 and before Task 09 —
see *What to do next* below. The tables stay full-size and correct
regardless in every format; only the drawing degrades.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **The scheduled `fix/…` cycle for the drawing's label size comes before
   Task 09.** It is unnumbered on purpose — `docs/tasks/` is generated from
   `docs/intake.md` and a numbered file would be lost on regenerate; follow
   the precedent of the `layout.ts` split chore, with its own branch and its
   own `docs/handoff-items/handoff-chore-*.md`. Two shape notes for whoever
   picks it up, from the people who measured it:
   - **The canvas grows without bound in whichever direction the graph
     runs** — 6,480 px tall at 40 nodes, 17,210 px wide at 200 nodes — so
     **landscape alone will not fix it**. Tiling the drawing across sheets,
     or a per-node size floor, would.
   - **Sharper still: because the raster is measured from the *placed*
     size, at an extreme aspect ratio the raster itself collapses, not just
     the labels on it.** At 1,000 nodes the embedded PNG is placed at
     0.01 in × 8.00 in — a three-pixel hairline. A per-node size floor alone
     will not be enough; the fix has to stop the placed size from driving
     the raster, or tile across sheets. Fix it once, for both PDF and Word,
     rather than fixing one format and rediscovering the same problem in
     the other.
2. **Then Task 09** (`docs/tasks/09-schema-and-sample.md`) from `main`, on a
   branch named `feature/schema-and-sample`. Unblocked — 01, 02, and 04 are
   all done. Generate the JSON Schema from the Zod schema rather than
   writing it twice, and confirm the generation method with the user first,
   since it depends on the Zod version.
3. **Two small drift risks, low cost to close, worth doing opportunistically
   rather than as their own cycle:**
   - **D51's empty-design sentence now exists in four copies** —
     `pdfPlan.ts` (exported), `toHtml.ts` (private), `toMarkdown.ts`, and
     `docxPlan.ts` — with nothing holding them together the way
     `exportStyles.test.ts` holds the shared palette. A one-line shared
     constant closes it.
   - **The four exports' column headings are also four copies**
     (`Id | Label | Type`, `From | To | Label`), and the column *shares* are
     the same two numbers written out twice, in `pdfPlan.ts` and
     `docxPlan.ts`. Same class of fix.
4. **The status region says one thing at a time, and a fourth export makes
   it more visible:** export PDF then Word on a design with both an
   uncoverable glyph and a control character, and the second sentence
   replaces the first. This is D41's parked question ("announcing a
   finished download") growing a second head. No criterion fails; worth
   folding into whichever task next touches the status region.
5. **The loader chore is gated: it runs before Task 10 and becomes blocking
   rather than schedulable if still open when Task 10 is picked.** Task 10
   is now two tasks away rather than three. Covers
   `describeLoadError.ts:191`/`:193` (Firefox/SpiderMonkey wording),
   `loadDesign.ts`'s lagging doc comment, and `loadDesign.test.ts:146`'s
   conditional assertion.
6. **The dagre `intersectRect` crash on a valid design still wants its own
   cycle**, and it pairs naturally with the loader chore since both live in
   the app's error-message region. Needs both a two-cycle and a parallel
   duplicate edge in one design; fails safely today but surfaces dagre's own
   words rather than the app's.
7. `src/lib/text.ts:116` — a tab inside a label long enough to wrap is lost
   before marking, because `splitIntoFittingWords` rejoins on a single
   space. Not a failure today (the preview does the same); belongs to
   whoever next touches the drawing's wrapping.
8. `e2e/fixtures/empty.json` is still misnamed beside
   `e2e/fixtures/empty-design.json`. Still its own small chore.
9. Page styling outside the drawing is still parked to Task 09.
10. Update `README.md` or `CLAUDE.md` if a command changes.
11. When the next phase ends, write the next handoff doc here, in this
    shape, and append its own detail to a new
    `docs/handoff-items/handoff-task-<NN>-*.md` or
    `docs/handoff-items/handoff-chore-*.md`.

## Suggested skills for the next session

For the label-size fix cycle: `front-review` (it touches the exported page
layout in two formats), `make-interfaces-feel-better` (a readable drawing at
scale is the whole point).

From Task 09's file (`docs/tasks/09-schema-and-sample.md`), for afterward:

- `front-review`: review the schema page and the copy control.
- `frontend-design-direction`: the schema page is documentation; make it
  read like the product, not a dump.
- `front-a11y`: headings and the copy button.
- `front-comments`: document the schema module, since the page and the
  validator both depend on it.
