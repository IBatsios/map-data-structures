# Handoff — Fix: the drawing's on-page label size

**Date:** 2026-09-18
**Branch:** fix/drawing-label-size
**Task file:** none — see "Why this has no task file"
**Round:** 1

## Assignment from Jared

### Why this cycle, and why now

I scheduled this during Task 07, when the PDF's drawing labels were first
measured and found to collapse. I held it rather than running it then, because
Task 08 was about to produce the same drawing in a second format and I wanted to
know whether this was one problem or two. It is one problem. Task 08 measured it
and the two formats agree at matching magnitudes:

| design | nodes | canvas (px) | Word label | PDF label |
|---|---|---|---|---|
| `markup-labels.json` | 4 | 423 × 660 | 10.50 pt | 11.8 pt |
| `order-intake.json` | 7 | 570 × 766 | 10.50 pt | 10.2 pt |
| **`platform-overview.json`** | **15** | **1541 × 1082** | **4.25 pt** | **4.0 pt** |
| `estate-sweep.json` | 40 | 1060 × 6480 | 1.24 pt | 1.2 pt |
| 200-node design | 200 | 17210 × 688 | 0.38 pt | 0.24 pt |

`platform-overview.json` is the fixture built to stand for the owner's own
scale, and it is already unreadable in both formats. That is the whole reason
this runs now rather than after Task 09: every cycle from here adds readers to
these two planners, and the geometry only gets more expensive to change.

Run it **once, across both formats.** Fixing the PDF and rediscovering the same
thing in the Word file is the outcome this cycle exists to avoid.

### What is not wrong, and must stay not wrong

Say this plainly to yourself before you start, because it decides how far the
fix is allowed to reach: **this is a print-fidelity problem, not a data-loss
problem.**

- Both tables carry every node and every edge at full size in every one of the
  cases above, in all four formats. Nothing is dropped today.
- The PDF's drawing is vector (D62), so it stays sharp at any on-screen zoom —
  a reader who zooms in can read a 4 pt label perfectly well.
- The on-screen preview is fine and is **not** in scope.

That is why criterion 2 was honestly judged met on both Task 07 and Task 08.
Preserve all three properties. A fix that makes the drawing readable on paper by
giving up any of them is a worse document than the one we have.

### Why this has no task file

`docs/tasks/` is generated from `docs/intake.md`, so a hand-written numbered file
there would be lost on the next regenerate. The precedent is the `layout.ts`
split (`docs/handoff-items/handoff-chore-split-layout-module.md`): its own
branch, its own handoff doc, and its acceptance criteria written by me.

**This handoff doc is the whole contract.** The acceptance criteria below are
mine, not the intake's.

Task 09's status stays `ready`. It is not started by this cycle; its own branch
comes later, from `main`, after this merges.

### Scope

Make the drawing readable on the page in the two paginated exports — the PDF and
the Word document — by putting a floor under how small the drawing's text is
allowed to be printed, and by giving the drawing however many sheets it needs at
that size instead of crushing it onto one.

The seam is the same two functions in both formats, and they are the same three
lines:

- `src/lib/pdfPlan.ts`, `planDrawing` area (~line 182–214): `const scale =
  Math.min(1, …)`, then `sheet.skip(layout.height * scale + SECTION_GAP)`.
- `src/lib/docxPlan.ts`, `planDrawing` (line 362): `const scale = Math.min(1,
  CONTENT_WIDTH_PX / layout.width, DRAWING_MAX_HEIGHT_PX / layout.height)`.

Both say "whatever it takes to fit one page", with no lower bound. That is the
defect. Everything else follows from removing it.

**Three things constrain the shape of the fix, and they are measured, not
guessed:**

1. **Landscape alone does not fix it.** The canvas grows without bound in
   whichever direction the graph happens to run — 6,480 px *tall* at 40 nodes,
   17,210 px *wide* at 200. Turning the page helps one fixture and hurts three
   (this is D75's own measurement). Do not reach for it as the answer. You may
   still choose it as part of an answer if you can defend it.

2. **A per-node size floor alone is not enough either.** In the Word file the
   raster is measured from the *placed* size, so at an extreme aspect ratio the
   raster itself collapses, not just the text on it:

   | design | embedded PNG | placed at |
   |---|---|---|
   | `order-intake` (7) | 1710 × 2298 | 5.94 in × 7.98 in |
   | `platform-overview` (15) | 1872 × 1314 | 6.50 in × 4.56 in |
   | `estate-sweep` (40) | 377 × 2304 | 1.31 in × 8.00 in |
   | 200-node chain | 530 × 2304 | 1.84 in × 8.00 in |
   | **1000-node chain** | **3 × 2304** | **0.01 in × 8.00 in** |

   At a thousand nodes the picture in the `.docx` is a three-pixel hairline. The
   fix has to stop the placed size from driving the raster.

3. **The floor binds on the smallest text in the drawing, not the node label.**
   `src/lib/layout.ts` draws at three sizes: `LABEL_FONT_SIZE = 14`,
   `EDGE_LABEL_FONT_SIZE = 12`, `TYPE_FONT_SIZE = 11`. The table above reports
   the 14 px one. The 11 px type text under every node is what actually goes
   illegible first, and at scale 1 it is only 8.25 pt in the Word file already.
   Whatever floor you set, set it against the smallest thing the drawing draws.

**Tiling across sheets is the route I expect this to take** — it is what both
Amon and Jahmyr independently converged on, and it is the only one of the three
that answers all of the above at once, because a tile is bounded by construction
and so is its raster. I am not mandating the mechanism. If you find something
better that meets every criterion below, take it and say why in
`docs/DECISIONS.md`.

**Explicitly out of scope:**

- **The on-screen preview.** It scales to the viewport and the user can zoom. It
  is not broken and this cycle does not touch its sizing.
- **The Markdown and HTML exports.** Mermaid computes its own placement (D47) and
  the HTML embeds vector that scales with the page (D55). Neither is paginated
  and neither has this defect. If printing the exported HTML turns out to have a
  cousin of this problem, note it for me — do not fix it here.
- **D51's empty-design sentence in four copies, and the four exports' duplicated
  column headings and shares.** Both are real and both are mine to schedule. See
  "Two drift risks that are deliberately not riding along" below.
- The loader-wording chore, the dagre `intersectRect` crash, the status region
  saying one thing at a time, `src/lib/text.ts:116`, the `e2e/fixtures/empty.json`
  misnaming, and page styling. All routed elsewhere.
- Task 09's schema page and sample file.

### Acceptance criteria

These are mine, written for this cycle. Every box must be checked in this file
before it goes to Sam, and only Jahmyr's verification earns a check.

- [x] **There is a stated floor on the on-page size of the drawing's text, it is
      applied in both the PDF and the Word document, and it is recorded in
      `docs/DECISIONS.md` with the reasoning for the number chosen.** The floor
      is judged against the smallest text the drawing draws (`TYPE_FONT_SIZE`,
      11 px), not the node label. It must be **no lower than 6 pt**; higher is
      yours to justify against the page count it costs.
- [x] **No design prints the drawing below that floor without the document
      itself saying so.** If a design is large enough that honouring the floor
      would exceed the sheet cap below, the document says what it did, in the
      app's own words, the way D69's marking sentence does.
- [x] **Nothing is dropped and nothing is cut in half (5.2).** Every node box
      with its label and its type text, every edge, and every edge-label plate
      appears **whole on at least one sheet**. A shape straddling a sheet
      boundary is not acceptable as the only copy of itself.
- [x] **A reader can tell which piece of the drawing they are looking at.** Each
      sheet of a tiled drawing identifies itself — its position in the whole, in
      words the app writes.
- [x] **The placed size no longer drives the raster in the Word export.** The
      1000-node chain that produced a 3 × 2304 PNG produces no image with a
      dimension under 200 px, and no design produces a hairline at any node
      count.
- [x] **The number of sheets the drawing takes is bounded**, the bound is
      recorded in `docs/DECISIONS.md`, and reaching it is honest rather than
      silent.
- [x] **The total raster work is bounded too.** D74's "the canvas is bounded
      because the placed size is capped at one page" argument does not survive
      this change — it is exactly the "pixel budget and canvas-dimension cap" D74
      said the other route would have needed. Set one, record it, and produce and
      release tiles one at a time rather than holding them all.
- [x] **Neither format loses what it already had.** The PDF's drawing stays
      vector (D62) and its embedded-font behaviour is unchanged (D65, D69, D70,
      D72). The Word drawing stays a raster at print resolution (D74) and its
      character rule is unchanged (D76, D77). The empty-design sentence still
      stands in for the drawing in both (D51, D60, D66).
- [x] **One fix, one seam, both formats.** The floor and the sheet arithmetic
      live in a shared module that both planners read, on D78's precedent — not
      two copies that agree today.
- [x] **The export still finishes within a few seconds for a design the size of
      the owner's use cases (11.1).** Re-measure `platform-overview.json` and
      `estate-sweep.json` in both formats and put the real numbers in this doc,
      as D67 requires. The walk's 15-second guard stays loose.
- [x] **The measurement that opened this cycle is reproduced.** The five designs
      above, both formats, smallest-text size on the page and sheet count,
      measured off the produced bytes with `e2e/pdfText.ts` and
      `e2e/docxText.ts` — not computed from the plan.
- [x] **Unit tests hold the new arithmetic.** The floor, the sheet count, the
      tile geometry and the bound are decided in pure functions and pinned in
      Vitest, on D63 and D74's precedent. Everything needing a browser is proven
      in `e2e/exportPdf.spec.ts` and `e2e/exportWord.spec.ts`.
- [x] **Every earlier test still passes.** `bun run test` is green (343 Vitest
      today), `bun run test:e2e` is green (97 steps today), `bun run check` is
      clean, `bun run build` passes, and CI is green on the pull request.
- [x] **The documents tell the truth afterwards.** `README.md` currently states
      the label-size limit at ~15 nodes and `CLAUDE.md` carries the "known limit,
      now in two formats" note; both must be corrected rather than left. Every
      decision this cycle makes is a new row in `docs/DECISIONS.md`, and D66,
      D74 and D75 are amended by reference the way D61 amended D57 — do not edit
      their rows.

### Files expected to change

A guide, not a cage.

| File | Why |
|---|---|
| a new `src/lib/` module — `drawingSheets.ts` or your name for it | the floor and the sheet arithmetic, shared by both planners (D78) |
| `src/lib/pdfPlan.ts` | `planDrawing`, and how the drawing cooperates with the existing paginator (`sheet.reserve`, `sheet.skip`, `MIN_DRAWING_HEIGHT`) |
| `src/lib/docxPlan.ts` | `planDrawing`, `RASTER_SCALE`'s bounding argument, `DRAWING_MAX_HEIGHT_PX` |
| `src/lib/toPdf.ts` | putting vector ink on more than one sheet |
| `src/lib/toDocx.ts` | more than one `ImageRun`, produced and released one at a time |
| `src/lib/rasteriseDrawing.ts` | painting a region of the drawing rather than all of it |
| `src/lib/openDrawing.ts` | possibly — both exports reach the drawing through it (D64, D78) |
| `src/lib/pdfPlan.test.ts`, `src/lib/docxPlan.test.ts`, a test for the new module | the arithmetic |
| `e2e/exportPdf.spec.ts`, `e2e/exportWord.spec.ts` | the measurements, read back out of the bytes |
| `e2e/pdfText.ts`, `e2e/docxText.ts` | possibly — they may need to report per-sheet |
| `README.md`, `CLAUDE.md`, `docs/DECISIONS.md` | the truth afterwards |

`src/lib/layout.ts` and the preview's renderer should **not** need to change. If
you find yourself editing the layout engine, stop and say why — that is a bigger
change than this cycle is scoped for and I want to see it before it lands.

### Skills to load

From `CLAUDE.md`'s list and the Task 08 handoff's suggestion:

- `coding-standards` — before the first file, as always.
- `tdd-workflow` — the arithmetic is pure and testable; write the test first.
- `anthropic-skills:pdf` — the PDF half.
- `anthropic-skills:docx` — the Word half.
- `e2e-testing` — the walk carries the measurements that prove this.
- `make-interfaces-feel-better` — a readable drawing at scale is the entire
  point of the cycle; spacing and labelling of the sheets is the interface here.
- `front-review` — before the pull request; this changes what two exports look
  like.
- `front-comments` — the new shared module is read by both planners, which is
  the condition `CLAUDE.md` names for this one.
- `front-refactor` — `pdfPlan.ts` is 518 lines and `docxPlan.ts` 429 against the
  800 ceiling; if either passes it, split rather than squeeze.

### Watch out for

**Decisions that constrain you.** Read the rows, not my summary of them:

- **D62** — the PDF is vector on purpose, and that is what keeps it honest at
  4 pt today. Do not solve this by rasterising the PDF.
- **D66** — "the drawing is scaled to fit the page rather than tiled across
  several" is stated there as a deliberate choice, with "vector is what saves
  it" as its defence. **This cycle is overturning the first half of that.** That
  is allowed — it was made before the Word measurements existed and before the
  1000-node hairline was known — but it must be overturned *on the record*, in a
  new row that names D66 and says what changed. This is the one place you are
  reopening something settled, and it is settled in your favour only because I
  am saying so here.
- **D74 and D75** — same treatment. D74's canvas bound depends on the one-page
  cap you are removing. D75's landscape rejection is measurement you should
  re-read rather than repeat.
- **D69, D72, D76** — the marking of characters a format cannot carry runs
  **before** the document is measured, so that the tables wrap around what is
  actually written. Tiling must not get in front of that ordering.
- **D51, D60** — the empty-design sentence. A design with no nodes still gets the
  sentence and no picture, in both formats, byte-for-byte the same string.
- **D26, D35, D43** — wrap, never truncate, for anything that is the user's own
  text; bound anything that is not.
- **D67** — the timing guard stays deliberately loose, and the real numbers live
  in the handoff rather than in an assertion.
- **D68, D79** — read it back out of the produced bytes. A measurement taken from
  the plan proves the plan, not the file, and this cycle is about the file.

**Traps I can see from here:**

- **Memory.** Sixteen tiles at Word's current 4.3-megapixel ceiling each is
  68 megapixels of canvas if they are held at once. Produce, encode, release.
- **The PDF paginator.** `pdfPlan` already has a sheet abstraction with
  `reserve`/`skip` and a `MIN_DRAWING_HEIGHT` that turns the page rather than
  printing a stamp. Tiles should go through it, not around it.
- **Alt text and metadata.** The Word drawing carries `altText` from
  `describeDrawing`, and the PDF carries `/Title` and `/Lang` (D71). Decide what
  a *tile* is called to a screen reader — repeating the whole description sixteen
  times is worse than naming the tile and describing the whole once. Best-effort
  accessibility is this project's standard; make a choice and record it.
- **Sheet boundaries through shapes.** This is the criterion most likely to be
  quietly missed. An overlap between tiles is the usual answer and is cheap here,
  because the widest thing the layout draws is a label plate around 230 px (D35)
  against a tile of 624 px — but check it rather than assume it, including a
  self-loop stack (D37), which reaches furthest sideways.
- **`platform-overview.json` is the fixture that matters.** It is the one built
  to stand for the owner's scale. Whatever the fix costs in sheets, it should
  cost the fewest there.

### Process notes

Two of these are corrections I am reproducing by hand each cycle, because the
agent config they belong in is a proposal still sitting with the user. Do not
edit agent config.

1. **Amon: do not push this branch and do not open the pull request.** Both are
   Jahmyr's, after verification. Commit to `fix/drawing-label-size` locally and
   hand back.
2. **Sam: the documentation refresh at the end of this cycle routes through its
   own `chore/…` branch and its own pull request**, not a direct commit to
   `main`.
3. `bun run test` runs Vitest. Plain `bun test` runs Bun's own runner and is
   wrong. Write `bun run test` every time, and correct it wherever you see it
   written otherwise.
4. There is no task file to mark `done`; D54's rule applies to this doc's
   checkboxes instead.

### Two drift risks that are deliberately not riding along

Both were reported by Amon out of Task 08 and both are real:

- D51's empty-design sentence in four places — `pdfPlan.ts` (exported),
  `toHtml.ts` (private), `toMarkdown.ts`, `docxPlan.ts` — with nothing holding
  them together the way `exportStyles.test.ts` holds the palette.
- The four exports' column headings as four copies, and the column *shares*
  written out twice in `pdfPlan.ts` and `docxPlan.ts`.

I considered letting the first ride along, since this cycle opens two of its four
files. I am not, for two reasons. Closing two of four copies is worse than
closing none — it leaves a coupling that looks held and is not. And this cycle is
the largest geometry change since the layout split; it has to stay reviewable as
one idea. The column shares in particular may move as a *result* of the tiling
work, so extracting them now risks extracting the wrong thing.

Both go to the small-fixes cycle that pairs the loader-wording chore with the
dagre `intersectRect` crash, after this one. If you touch any of those four
literals incidentally, leave a comment pointing at its siblings — do not unify
them here.

### Definition of done for this cycle

Every acceptance criterion above is checked in this document, `bun run test`
passes, `bun run test:e2e` passes, `bun run check` is clean, and CI is green on
the pull request.
---

## Work completed by Amon — round 1

### What was built

A stated floor under the on-page size of the drawing's smallest text, applied in
both paginated exports from one shared module, and sheets enough to honour it.

- **`src/lib/drawingSheets.ts`** is the seam. It takes a `DesignLayout` and the
  room one format has, both in points, and returns the scale, every sheet with
  the piece of the drawing on it, and the sentences the document says about
  them. Both planners read it; neither decides any of it any more.
- **The floor is 6 pt, judged against `TYPE_FONT_SIZE` (11 px)**, which is the
  smallest of the three sizes `layout.ts` draws at. `SMALLEST_TEXT_PX` is
  imported from `layout.ts` rather than written down again, so the drawing's
  typography and the floor cannot drift apart.
- **A drawing that already printed at 6 pt or better is untouched.** Same place
  in the document, same size, no caption, nothing said. `markup-labels.json` and
  `order-intake.json` land here.
- **A larger one takes a page per sheet**, captioned with its place in the whole,
  with the count said before the sheets start. The PDF's sheets are a `viewBox`
  on one rendered drawing, so the ink stays vector (D62); the Word file's are one
  `ImageRun` each, painted, encoded and released one at a time.
- **The Word raster has a floor of its own**, 200 px on the short side, raised on
  both sides together so nothing is stretched. The 1000-node chain that produced
  a 3 × 2304 PNG now produces 200 × 10,549.
- **Both bounds D74 said the other route would need are built**: 16 sheets, one
  content area at `RASTER_SCALE` per sheet, and their product as the total.
- **Past the cap the document says so**, in its own words, rather than printing a
  picture nobody can read and leaving the reader to work it out.

### Files added or changed

| File | What changed |
|---|---|
| `src/lib/drawingSheets.ts` | new — the floor, the sheet arithmetic, the cuts, and the three sentences |
| `src/lib/drawingSheets.test.ts` | new — 20 test blocks over the floor, the cuts, the cap, the spacing and the coverage |
| `src/lib/pdfPlan.ts` | `addDrawing` reads the seam; `PdfDrawingItem` gains `region`; `PdfTextItem` gains `quiet`; `Sheet.turn` is `reserve`'s page break named and made callable |
| `src/lib/pdfPlan.test.ts` | the tiling block; the column-heading test narrowed to the pages a table runs onto |
| `src/lib/toPdf.ts` | draws each item's region through `withDrawingRegion`; sets a quiet caption in the rules' grey |
| `src/lib/docxPlan.ts` | `planDrawing` reads the seam and converts into DXA and image pixels; `MIN_RASTER_SIDE`, `MAX_SHEET_RASTER_PIXELS`, `MAX_RASTER_PIXELS`; a pointer comment on D51's sentence |
| `src/lib/docxPlan.test.ts` | the drawing block rewritten around `sheets`; the hairline and budget tests |
| `src/lib/toDocx.ts` | one `ImageRun` per sheet with a page break and a caption, painted sequentially |
| `src/lib/openDrawing.ts` | `withDrawingRegion`, which both exports use to show one piece of the drawing |
| `src/lib/rasteriseDrawing.ts` | comment only — says why the region moves the `viewBox` rather than cropping with a source rectangle |
| `e2e/pdfText.ts` | `pdfDrawnText` (effective font sizes, through `q`/`Q`/`cm`/`Tm`) and `pdfPageCount` |
| `e2e/docxText.ts` | `docxPictures` (PNG dimensions beside placed extent), `docxImageAltTexts`, `docxPageBreaks` |
| `e2e/exportPdf.spec.ts` | the measurement block; the local page counter replaced by `pdfText.ts`'s |
| `e2e/exportWord.spec.ts` | the measurement block |
| `e2e/pages/uploadPage.ts` | `chooseMade`, so a 400- or 1000-node design needs no generated fixture |
| `README.md` | the "past about fifteen nodes its labels get too small to read" paragraph corrected |
| `docs/DECISIONS.md` | D81–D88 appended |

`src/lib/layout.ts` and the preview's renderer are unchanged, as the assignment
asked.

One note on the commits, so the diff does not surprise you: the last one is
titled `docs:` but also carries two source changes that were finished at the
same time — the quiet caption in `pdfPlan.ts`/`toPdf.ts` and the readability
pass over `drawingSheets.ts` that `front-review` asked for (`laidOut` split,
`describeSheet` taking a named place and grid, one magic number named). Both are
covered by tests in the same commit. I did not amend the message, because
rewriting a commit is not mine to do.

### Tests written

**`src/lib/drawingSheets.test.ts`** — the arithmetic, all of it pure:

- the floor is judged against `TYPE_FONT_SIZE` and is at least 6 pt;
- it holds for a design too wide for a sheet, and for one too tall;
- a drawing that already fits keeps one sheet, the whole canvas, no caption and
  nothing said, and is never scaled up — at 1 for a PDF and 0.75 for a `.docx`;
- a tiled drawing leaves no part of itself off every sheet (sampled on a grid);
- it cuts no node box, plate or route in half without leaving a whole copy
  somewhere, checked against `drawingElements` itself rather than a second list;
- its sheets are evenly spaced rather than two stacked on one strip;
- every sheet is captioned, numbered left to right then top to bottom, inside
  the room it was given and inside the drawing;
- past the cap it never exceeds 16 sheets, prints below the floor, says so with
  the floor and the cap in the sentence, and still covers the whole drawing;
- the cap holds for 40, 200 and 600 nodes, both formats, both aspect ratios.

**`src/lib/pdfPlan.test.ts`** — a drawing too large for one page is tiled, never
prints its type line below 6 pt, shows a different piece on each sheet, covers
the whole drawing, gets a page per sheet, says the count on the title page,
captions each sheet, sets those captions quieter than the document's own words
and nothing else quiet, still prints both tables after the drawing, and keeps
every tile inside the margins and in the shape it was cut. Plus: the cap is
never exceeded and the document says when it bound, and a drawing that already
printed large enough is left exactly where it was.

**`src/lib/docxPlan.test.ts`** — one sheet for a small design with the whole
region, no caption and no page break; proportions kept on every sheet; the floor
held; the raster a fixed multiple of the placed size; **no hairline** at 600
nodes with no distortion; the raster work bounded per sheet and over the file
for three shapes of design; the first sheet described and later sheets named;
every sheet on a page of its own.

**`e2e/exportPdf.spec.ts`** — the four reference designs measured off the bytes
and held above the floor while their labels stay in the tables; a 400-node chain
printing below the floor with the document saying so; every sheet named.

**`e2e/exportWord.spec.ts`** — the same four measured off the bytes with no
hairline on any sheet; the 1000-node chain that produced the hairline; each
sheet named and page-broken with the first described and the rest not; every
label still in the tables for `estate-sweep.json`.

### The measurement that opened this cycle, reproduced

Read off the produced bytes, not computed from the plan. Smallest text is the
11 px type line — the opening table's PDF column was in fact the 12 px edge
label, see "Out-of-scope notes" below.

| design | canvas | PDF before | PDF now | sheets | Word before | Word now | sheets |
|---|---|---|---|---|---|---|---|
| `markup-labels.json` | 423 × 660 | 10.85 pt | **10.85 pt** | 1 | 8.25 pt | **8.25 pt** | 1 |
| `order-intake.json` | 570 × 766 | 9.35 pt | **9.35 pt** | 1 | 8.25 pt | **8.25 pt** | 1 |
| `platform-overview.json` | 1541 × 1082 | 3.68 pt | **6.00 pt** | 3 | 3.34 pt | **6.00 pt** | 3 |
| `estate-sweep.json` | 1060 × 6480 | 1.11 pt | **6.00 pt** | 12 | 0.98 pt | **6.00 pt** | 14 |
| 400-node chain | 188 × 63,160 | — | 1.87 pt, said | 16 | — | said | 16 |
| 1000-node chain | 188 × 157,960 | — | 0.75 pt, said | 16 | — | said | 16 |

The Word figure for `estate-sweep.json` reads back as "at least 4.86 pt" rather
than 6.00, because it is the one design cut along both axes and a raster carries
no font size — see "Known gaps". The PDF measures the same design at 6.00 pt
exactly, and the unit tests hold the arithmetic for both.

Embedded PNGs, the criterion-5 figures:

| design | before | now |
|---|---|---|
| `order-intake` | 1710 × 2298 | 1710 × 2298 |
| `platform-overview` | 1872 × 1314 | 1872 × 2361 ×3 |
| `estate-sweep` | 377 × 2304 | 1872 × 2496 ×14 |
| 200-node chain | 530 × 2304 | 233 × 2496 ×16 |
| **1000-node chain** | **3 × 2304** | **200 × 10,549 ×16** |

### Local results

`bun run test`: **pass, 382 tests in 22 files** (343 before this cycle).
`bun run test:e2e`: **pass, 110 steps** (97 before).
`bun run check`: **clean — 0 errors, 0 warnings, 0 hints** over 67 files.
`bun run build`: **pass**, 1 page in ~700 ms.

Timing (criterion 11.1), on the build machine — Windows 11, bun 1.4.2, Chromium
via Playwright, `dist/` served from localhost, first click including the library
and font fetch:

| design | PDF | Word |
|---|---|---|
| `platform-overview.json` (15 nodes, 16 edges) | **412 ms** | **593 ms** |
| `estate-sweep.json` (40 nodes, 46 edges) | **998 ms** | **1,684 ms** |

Against D67's 15-second guard, which stays loose. The two extreme cases are
slower and still inside it: the 400-node chain's PDF takes 8.8 s and the
1000-node chain's Word file 9.4 s, both dominated by dagre laying the design out
rather than by the export.

### Decisions recorded

Eight rows appended to `docs/DECISIONS.md`, none of them edits to an existing
row:

- **D81** — overturns the first half of D66, on the record, naming it, in D61's
  style. D66's second half (vector, and the tables at full size) stands.
- **D82** — the floor is 6 pt against `TYPE_FONT_SIZE`, with the measured cost of
  6.5 and 7 that rules them out.
- **D83** — one shared module, working in points, with `naturalScale` per format.
- **D84** — how the cuts are chosen: greedy pull-back, then even spacing.
- **D85** — amends D74: its bounded-canvas argument, both replacement bounds, and
  the raster's own floor.
- **D86** — amends D75: landscape re-read rather than repeated, and why the two
  formats now differ in sheet count.
- **D87** — what a sheet is called to a screen reader, and the quiet caption.
- **D88** — how the measurement is taken off the bytes, and its one limit.

### Known gaps

1. **`estate-sweep.json`'s Word figure is a bound, not the number.** A `.docx`
   drawing is a raster and carries no font size, so the size on the page has to
   be recovered from the placed size against the piece of the drawing the
   picture holds — and the file does not name that piece. It is recoverable
   exactly along any axis the drawing was *not* cut along, because a cut axis
   always fills the sheet; `estate-sweep.json` is the one reference design cut
   both ways, so it reads back as "at least 4.86 pt" against a true 6.00. The
   PDF measures the same design at 6.00 pt exactly and `docxPlan.test.ts` holds
   the arithmetic, so the fact is covered twice — but it is covered in two
   places rather than one, and you should know that before you read the
   annotation. Making it exact would mean writing the region into the file,
   which I did not think worth changing a document for.

2. **An edge whose route is longer than a sheet is drawn across the sheets it
   crosses.** `estate-sweep.json` has one 3,532 px tall against a 1,241 px
   sheet. Nothing is dropped — its ink appears on every sheet it runs through,
   and both its ends are whole on the sheets that hold their nodes — but it is
   not "whole on at least one sheet" in the literal sense criterion 3 uses for a
   node box or a plate, because no sheet could hold it. Four of `estate-sweep.json`'s 132 shapes are in this
   class in the PDF and five in the Word file, every one of them a route, none
   of them a box or a plate; `platform-overview.json` has none at all. `pdfPlan.writeRow` has the same shape of answer for a table row too
   tall for any page, so there is precedent in the module next door, but it is a
   judgement you should make rather than inherit from me.

3. **`CLAUDE.md` still carries the "known limit, now in two formats" note.**
   Criterion 14 asks for it to be corrected and I have not touched it: my own
   operating instructions say no agent message can authorise me to change
   `CLAUDE.md`, and that rule outranks this doc. `README.md`'s paragraph *is*
   corrected. The `CLAUDE.md` line needs whoever is authorised to make it — most
   naturally Sam's documentation refresh, which process note 2 already routes
   through its own `chore/…` branch.

4. **The two formats take different numbers of sheets for the same design** —
   twelve against fourteen for `estate-sweep.json` — because each is cut against
   its own content box, and D66 and D75 chose two different margins on purpose.
   They agree on `platform-overview.json` (three each, 6.00 pt each). Recorded in
   D86 as honest rather than hidden, but flagging it because it will look like a
   bug in a side-by-side read.

5. **Two spec files are near the ceiling.** `e2e/exportWord.spec.ts` is 731 lines
   and `e2e/exportPdf.spec.ts` 682, against `CLAUDE.md`'s 800. Neither passed it,
   so I did not split them, but the next thing added to either will. `pdfPlan.ts`
   (633) and `docxPlan.ts` (585) are comfortable.

6. **`front-comments` was used for its substance, not its form.** Its house style
   is emoji section dividers and a JSDoc block per import, which would read as a
   different project beside `pdfPlan.ts` and `openDrawing.ts`. I took what it
   asks for — a file header that says what and why, JSDoc on every exported
   symbol with `@param`, `@returns` and an `@example`, and an inline comment at
   every non-obvious rule — and wrote it in this repository's own voice.

### Out-of-scope notes for Jared

1. **The opening table's PDF column is the 12 px edge label, not the 14 px node
   label.** Your handoff says "every measurement in both handoffs reports the
   14 px node label", and that is true of the Word column — your own arithmetic
   for `platform-overview.json` reproduces 4.25 pt exactly. The PDF column does
   not: 12 × the fit scale reproduces all four of its figures to two decimals
   (11.84, 10.20, 4.02, 1.21) and 14 × reproduces none of them. It does not
   change the fix — you were right that the floor binds on the 11 px type line,
   and it was *smaller* than the table said in both formats — but the PDF's true
   "before" numbers for the type line are 10.85, 9.35, 3.68 and 1.11 pt, and the
   200-node row should be read the same way. Worth correcting wherever that table is quoted.

2. **`playwright.config.ts` reuses a running server, so `bun run test:e2e`
   silently tests a stale `dist/` when one is already up.** `reuseExistingServer:
   !process.env.CI` means the `bun run build` in the `webServer` command is
   skipped, and I spent a confused ten minutes reading an export that did not
   have my change in it. CI is unaffected. A `bun run build` before the walk, or
   dropping the reuse locally, would close it. Not touched — it is config, not
   this cycle's scope.

3. **`describeDrawing` is called twice per Word export**: once by `docxPlan` for
   the metadata and once inside `renderDrawing` for the SVG's own `<desc>`. It
   was true before this cycle too. Harmless at any size we have measured, and it
   belongs with the small-fixes cycle rather than here.

4. **The exported HTML has a cousin of this problem when printed**, as you
   guessed it might. `toHtml` embeds the drawing as vector sized to the page, so
   a browser printing it scales it onto one sheet exactly the way the PDF used
   to. Noted, not fixed — you ruled it out of scope and I agree it should not
   ride along.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass**, with one criterion left unchecked that is not Amon's to close.

Thirteen of the fourteen criteria are verified by exercising them. Criterion 14
is unmet only on its `CLAUDE.md` clause, which Amon is correctly barred from
touching; it routes to Sam's documentation refresh along with one imprecise
clause in D84 that I found and describe below.

Every number in Amon's measurement table reproduces exactly against my own
independent read of the produced bytes.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| 1. Stated floor, both formats, recorded with reasoning | pass | `MIN_TEXT_POINTS = 6`; `SMALLEST_TEXT_PX` imported from `layout.ts`, not restated. D82 records the number with the measured cost of 6.5 and 7 pt. Measured on the bytes: `platform-overview` 6.00 pt in both formats |
| 2. Nothing prints below the floor without the document saying so | pass | 400-node PDF: 1.87 pt and "too large to print at 6 pt" read out of the content stream. 1000-node Word: the same sentence read out of `document.xml` |
| 3. Nothing dropped, nothing cut in half | pass (judged — see below) | Across 8 design x format combinations: every node box and every edge-label plate whole, zero exceptions. Only edge *routes* are ever not whole — 4 in PDF `estate-sweep`, 5 in Word — and `platform-overview` has none in either format |
| 4. Each sheet identifies itself | pass | PDF: 3 captions for 3 sheets, 12 for 12, "Drawing, sheet N of M", with "The drawing follows on …" before them. Word: 14 alt texts and 14 page breaks for 14 sheets |
| 5. Placed size no longer drives the raster | pass | 1000-node chain: shortest PNG side **200** across all 16 sheets; first sheet **200 x 10,549** against the old 3 x 2304. Reference designs: 1269 / 1710 / 1872 / 1872 |
| 6. Sheet count bounded, recorded, honest | pass | `MAX_DRAWING_SHEETS = 16`, recorded in D85. The 400-node PDF hits exactly 16 and says so; the 1000-node Word file hits 16 and says so |
| 7. Total raster work bounded, tiles released one at a time | pass | Worst sheet 4.67M px against `MAX_SHEET_RASTER_PIXELS` 4.85M; worst file 65.42M against `MAX_RASTER_PIXELS` 77.6M. `paintDrawing` is a sequential loop that keeps only encoded bytes |
| 8. Neither format loses what it had | pass | PDF: **0** image XObjects, 0 `/DCTDecode`, 333 path ops, `/Title` and `/Lang` intact, font embedded — still vector (D62). Word: raster at `RASTER_SCALE` 3 confirmed by the PNG-to-placed ratio; character-marking tests still green. D51's sentence byte-identical in both |
| 9. One fix, one seam, both formats | pass | `src/lib/drawingSheets.ts`; both planners import `planDrawingSheets`, and the old unbounded `Math.min` is gone from both |
| 10. Finishes within a few seconds, re-measured | pass | My own run: PDF 334 ms / 803 ms, Word 545 ms / 1,343 ms for `platform-overview` / `estate-sweep`. Well inside D67's 15 s guard |
| 11. The opening measurement reproduced off the bytes | pass | All four reference designs in both formats, plus both chains — table below |
| 12. Unit tests hold the arithmetic | pass | 81 tests across `drawingSheets.test.ts`, `pdfPlan.test.ts` and `docxPlan.test.ts`; browser work proven in the two e2e specs |
| 13. Every earlier test passes, CI green | pass | 382 Vitest / 110 Playwright / check clean / build passes / **CI green** on PR #19, both jobs |
| 14. The documents tell the truth afterwards | **unverifiable — not Amon's** | `README.md` corrected. D81–D88 appended, `docs/DECISIONS.md` strictly append-only (8 added, 0 deleted), so D66/D74/D75 are amended by reference and not edited. **`CLAUDE.md:69–74` still carries the stale note** |

### My measurement, read off the produced bytes

Taken independently, with my own probes rather than the specs' assertions.

| design | canvas | PDF now | sheets | Word now | sheets |
|---|---|---|---|---|---|
| `markup-labels.json` | 423 x 660 | 10.85 pt | 1 | 8.25 pt | 1 |
| `order-intake.json` | 570 x 766 | 9.35 pt | 1 | 8.25 pt | 1 |
| `platform-overview.json` | 1541 x 1082 | **6.00 pt** | 3 | **6.00 pt** exact | 3 |
| `estate-sweep.json` | 1060 x 6480 | **6.00 pt** | 12 | **>= 4.86 pt** bound | 14 |
| 400-node chain | 188 x 63,160 | 1.87 pt, said | 16 | — | — |
| 1000-node chain | 188 x 157,960 | — | — | said, 200 x 10,549 | 16 |

Every figure matches Amon's table. On the Word `platform-overview` row I first
read 3.34 pt and thought I had found a defect; that was my own probe dividing by
the whole canvas width when the drawing is cut into three **columns**. Recovering
along the axis the drawing was *not* cut along — D88's own rule — gives 6.00 pt
exactly. Amon's number is right, and his disclosure of the `estate-sweep` bound
is accurate.

### On criterion 3, which Amon asked me to judge rather than inherit

I measured every shape against every sheet region, for all four reference
designs in both formats, classifying anything not whole:

| design / format | shapes | not whole | too big for any sheet | fits but still cut |
|---|---|---|---|---|
| `platform-overview`, PDF and Word | 47 | **0** | 0 | 0 |
| `estate-sweep`, PDF | 132 | 4 | 4 routes | 0 |
| `estate-sweep`, Word | 132 | 5 | 4 routes | **1 route** |
| the two small designs, both formats | 10 / 19 | 0 | 0 | 0 |

**I judge this criterion met.** Every shape that carries text — every node box
with its label and its type line, every edge-label plate — is whole on a sheet in
every case, without exception. The only shapes ever split are edge *routes*, and
a route is a line rather than a container of text: continued across a sheet
boundary it loses nothing, which is what every large-format map does, whereas a
bisected box or plate would. Nothing is dropped — a route's ink is drawn on every
sheet it crosses, both its endpoints' boxes are whole, and both tables carry
every edge at full size. The criterion's own gloss, "not acceptable as the only
copy of itself", is about loss, and there is none. `pdfPlan.writeRow` answers an
over-tall table row the same way.

One correction to the record, which is where my finding differs from Amon's. He
reports all five Word exceptions as being in the "larger than a sheet" class.
Four are. **The fifth is not** — a route at x 306.3–470.5, y 2366.4–3298.1, so
164 x 932 px against an 858 x 1144 px sheet, which would fit. I chased the cause:
it is *not* the even-spacing tie-break, as I first assumed. I re-implemented both
passes and they agree, 127 of 132 whole either way:

```
greedy (7 rows) [0, 1061.5, 2126,   2698,   3674,   4758,   5336]
spread (7 rows) [0,  889.3, 1778.7, 2668,   3557.3, 4446.7, 5336]
target route held by greedy? false    held by spread? false
```

The greedy pass *wants* to pull the cut back to 2366.4 to keep the route whole,
but that is only 240 px of advance from 2126, under `MIN_SHEET_ADVANCE`'s half
sheet (572 px), so it is forced forward to 2698 — past the route's start. The
shape is given up to the bound that keeps the sheet count finite, which is the
same bound that protects the 16-sheet cap, which is what protects the 6 pt floor.
That is a defensible trade and I am not asking for it to change.

What I am asking is that the record say so. **`docs/DECISIONS.md`, D84** states
that "four of its 132 shapes in the PDF and five in the Word file are in that
class", where "that class" reads as shapes larger than a sheet. One of the five
is not. This is a one-clause documentation correction, not a behaviour change.

### Command results

```
bun run test      382 passed, 22 files (343 before this cycle)
bun run test:e2e  110 passed (97 before), against a freshly built dist/
bun run check     0 errors, 0 warnings, 0 hints over 67 files
bun run build     pass, 1 page in ~700 ms
gitleaks detect   no leaks found, 29 commits, 1.77 MB scanned
CI                green — both jobs on PR #19
```

Adversarial pass, beyond the checklist: empty file, malformed JSON, `[]`, `null`,
a file that parses with no nodes, and duplicate ids. All refused with a specific
message or handled correctly, and **no uncaught page error in any case**. The
no-nodes design exports both formats carrying D51's sentence, byte-identical in
the PDF and the `.docx`.

### Defects for Amon

None blocking. One item for the record, routed to documentation rather than back
to Amon, since it travels with the `CLAUDE.md` correction that has to go through
Sam anyway:

1. **`docs/DECISIONS.md`, D84** — the clause "four of its 132 shapes in the PDF
   and five in the Word file are in that class" describes all five Word
   exceptions as shapes larger than a sheet. Four are; the fifth (164 x 932 px
   against an 858 x 1144 px sheet) fits a sheet and is cut because
   `MIN_SHEET_ADVANCE` forces the cut past it. Expected: the row distinguishes
   the two reasons. Actual: it gives one reason for both.

### Two things I got wrong before I got them right

Recorded so nobody repeats them:

- My first Word scale recovery divided by the whole canvas width and reported
  `platform-overview` at 3.34 pt. With three **columns** every sheet shares a
  placed width, so "all placed widths equal" does not mean "one column".
  Recovering along the uncut axis gives 6.00 pt.
- My first guess at the cause of the fits-but-cut route blamed the even-spacing
  tie-break. Re-implementing both passes disproved it; the cause is
  `MIN_SHEET_ADVANCE`.

### Fixed in place

None. I wrote temporary probes for this verification and removed all of them; the
working tree is exactly Amon's eight commits plus this report and the checkboxes.

### Process notes confirmed

- **Amon's `playwright.config.ts` warning is real and it bit me too.** A leftover
  `e2e/staticServer.ts` was holding port 4321 when I started (PID 8076), and
  `reuseExistingServer: !process.env.CI` would have had me measuring a stale
  `dist/`. I killed it before measuring anything; every number above is against a
  build made during the run. Worth closing, and CI is unaffected.
- Commit `5d6bb76` is titled `docs:` but carries two source changes. Both are
  covered by tests in the same commit. Not amending it was the right call, and it
  is now pushed.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/19 — draft, base `main`,
CI green. Sam marks it ready and merges; I did not.

### For Sam's documentation refresh

Two items, one branch:

1. `CLAUDE.md:69–74`, the "Known limit, now in two formats" note — now false.
2. `docs/DECISIONS.md` D84's clause above.

---

## Verification and merge by Sam

### Document audit

| Document | State | Action taken |
|---|---|---|
| This handoff doc | Jared's assignment, Amon's work, Jahmyr's report all present and legible | Checked criterion 14's box now that both its items are closed |
| `CLAUDE.md:69–78` | "Known limit, now in two formats" note was false — described the pre-fix behaviour | Rewrote the paragraph: 6pt floor on the 11px type line in both formats, tiling to 16 captioned sheets, honest overflow past the cap, pointer to `drawingSheets.ts` and this handoff doc |
| `README.md` | Already correct — Amon's round-1 edit states the 6pt floor and tiling, matches `CLAUDE.md`, uses `bun run test` throughout | None needed |
| `docs/DECISIONS.md` | D84's clause described all five Word exceptions as shapes too large for a sheet; one is not | Appended **D89**, amending D84 by reference — the append-only convention D81-D88 already used for D66/D74/D75. No existing row edited |
| `.env.example` | Still no variables; code still reads none | None needed |
| `docs/tasks/09-schema-and-sample.md` | `**Status:** ready`, unchanged | Confirmed correct — this cycle does not touch Task 09 |
| No `docs/tasks/` file for this fix | Deliberate — this handoff doc is the whole contract, per "Why this has no task file" above | Nothing to mark `done`; all 14 acceptance-criteria boxes in this file are now checked |

Not touched, per the gate's own rule: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/intake.md`. None of them were found to be wrong by this audit.

### Gates

`bun run test`: pass, 382 tests, 22 files.
CI: green on both jobs, PR #19 (re-confirmed independently, not taken on Jahmyr's word).
Secret scan: `gitleaks detect --source . --no-banner` — no leaks found, 30 commits, 1.79 MB scanned.

### Merge

Squashed into `main`. Branch `fix/drawing-label-size` deleted. PR https://github.com/IBatsios/map-data-structures/pull/19. Squash commit SHA is in the post-merge refresh, `docs/handoff-items/handoff-next-phase.md`.

The two documentation fixes above (`CLAUDE.md`, `docs/DECISIONS.md` D89) and this section were committed to `fix/drawing-label-size` before the merge, so CI re-ran green against them prior to squashing.

### Left for a person

Carried forward from Amon's and Jahmyr's reports, unchanged by this gate:

- Microsoft Word is not installed on any machine that has touched this project. Word's own renderer is unverified against the `.docx`; opening `order-intake.docx` once closes it.
- `playwright.config.ts`'s `reuseExistingServer: !process.env.CI` lets `bun run test:e2e` silently test a stale `dist/` locally. CI is unaffected. Left as config by both Amon and Jahmyr; worth a fix in the small-fixes cycle.
- The exported HTML has the printing cousin of this cycle's problem — noted, not fixed.
- `estate-sweep`'s Word figure is a bound (>= 4.86pt), not the exact number, because a `.docx` drawing is a raster with no font size. The PDF measures the same design at 6.00pt exactly.
