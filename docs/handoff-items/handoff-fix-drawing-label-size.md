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

- [ ] **There is a stated floor on the on-page size of the drawing's text, it is
      applied in both the PDF and the Word document, and it is recorded in
      `docs/DECISIONS.md` with the reasoning for the number chosen.** The floor
      is judged against the smallest text the drawing draws (`TYPE_FONT_SIZE`,
      11 px), not the node label. It must be **no lower than 6 pt**; higher is
      yours to justify against the page count it costs.
- [ ] **No design prints the drawing below that floor without the document
      itself saying so.** If a design is large enough that honouring the floor
      would exceed the sheet cap below, the document says what it did, in the
      app's own words, the way D69's marking sentence does.
- [ ] **Nothing is dropped and nothing is cut in half (5.2).** Every node box
      with its label and its type text, every edge, and every edge-label plate
      appears **whole on at least one sheet**. A shape straddling a sheet
      boundary is not acceptable as the only copy of itself.
- [ ] **A reader can tell which piece of the drawing they are looking at.** Each
      sheet of a tiled drawing identifies itself — its position in the whole, in
      words the app writes.
- [ ] **The placed size no longer drives the raster in the Word export.** The
      1000-node chain that produced a 3 × 2304 PNG produces no image with a
      dimension under 200 px, and no design produces a hairline at any node
      count.
- [ ] **The number of sheets the drawing takes is bounded**, the bound is
      recorded in `docs/DECISIONS.md`, and reaching it is honest rather than
      silent.
- [ ] **The total raster work is bounded too.** D74's "the canvas is bounded
      because the placed size is capped at one page" argument does not survive
      this change — it is exactly the "pixel budget and canvas-dimension cap" D74
      said the other route would have needed. Set one, record it, and produce and
      release tiles one at a time rather than holding them all.
- [ ] **Neither format loses what it already had.** The PDF's drawing stays
      vector (D62) and its embedded-font behaviour is unchanged (D65, D69, D70,
      D72). The Word drawing stays a raster at print resolution (D74) and its
      character rule is unchanged (D76, D77). The empty-design sentence still
      stands in for the drawing in both (D51, D60, D66).
- [ ] **One fix, one seam, both formats.** The floor and the sheet arithmetic
      live in a shared module that both planners read, on D78's precedent — not
      two copies that agree today.
- [ ] **The export still finishes within a few seconds for a design the size of
      the owner's use cases (11.1).** Re-measure `platform-overview.json` and
      `estate-sweep.json` in both formats and put the real numbers in this doc,
      as D67 requires. The walk's 15-second guard stays loose.
- [ ] **The measurement that opened this cycle is reproduced.** The five designs
      above, both formats, smallest-text size on the page and sheet count,
      measured off the produced bytes with `e2e/pdfText.ts` and
      `e2e/docxText.ts` — not computed from the plan.
- [ ] **Unit tests hold the new arithmetic.** The floor, the sheet count, the
      tile geometry and the bound are decided in pure functions and pinned in
      Vitest, on D63 and D74's precedent. Everything needing a browser is proven
      in `e2e/exportPdf.spec.ts` and `e2e/exportWord.spec.ts`.
- [ ] **Every earlier test still passes.** `bun run test` is green (343 Vitest
      today), `bun run test:e2e` is green (97 steps today), `bun run check` is
      clean, `bun run build` passes, and CI is green on the pull request.
- [ ] **The documents tell the truth afterwards.** `README.md` currently states
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
