# Handoff — Task 08: Export as a Word document

**Date:** 2026-09-18
**Branch:** feature/export-word
**Task file:** docs/tasks/08-export-word.md
**Round:** 1

## Assignment from Jared

### Scope

Add a fourth export. With a design on screen, **Export Word** downloads
`<design>.docx`: the title, the drawing, and the same node and edge tables the
other three exports already write — as **real Word tables**, so a non-developer
can open the file and edit a cell. The file must open in both Word and
LibreOffice.

This is the fourth time the project has walked this path, and the shape is
settled: a **pure planner** that decides the document's structure, plus a
**thin writer** that turns that plan into bytes. `pdfPlan.ts` beside `toPdf.ts`
is the precedent (D63), and it exists because this project's Vitest run has no
DOM environment — everything DOM-shaped or library-shaped has to be proven in
the Playwright walk instead, so the more of the document that is decided in a
pure function, the more of it a unit test can hold. Keep that seam.

The export row goes from three buttons to four. D59 already named this task as
the row's fuller revisit, so the row is in scope: its grouping, its labels, its
spacing, and its disabled behaviour with four controls rather than three.

**Explicitly out of scope:**

- Any change to the Markdown, HTML or PDF exports' output. The four-download
  walk reads them; it does not rewrite them.
- The PDF drawing's label-size problem. It is real and it is scheduled — see
  *Scheduling decisions* below — but it is not this task. This task **measures**
  its own equivalent and reports the number; it does not fix either format.
- Page styling outside the export row. Still parked to Task 09.
- The dagre `intersectRect` crash and the loader-wording chore. Both are routed
  to their own cycle below.
- Deployment. Task 10.

### Acceptance criteria

Copied verbatim from `docs/tasks/08-export-word.md`. These are the contract.

- [ ] As a user, I can export the design as a Word document: demonstrated end to end.
- [ ] The document shows the same nodes and edges as the preview, and the tables are editable text (5.2).
- [ ] The download finishes within a few seconds for a design the size of the owner's use cases (11.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk now clicks all four export buttons and checks all four downloads (14.1).
- [ ] Every earlier test still passes; CI is green.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

### The library gate — do not `bun add` anything until the user answers

jsPDF and svg2pdf are no help here; a `.docx` is a different format with a
different toolchain. This is the same gate Task 03 went through for the layout
engine and Task 07 went through for the PDF route (D62), and it opens the same
way: options, verified facts, trade-offs, and the user's answer before anything
is installed.

**I checked every fact below against the npm registry and the published
typings today, 2026-09-18.** They are not remembered numbers. Weekly download
counts are from `api.npmjs.org/downloads/point/last-week`. Nothing was installed
to obtain them; the `docx` type definitions were read from the published `9.7.1`
package via CDN into scratch space, not into the project.

#### Option A — `docx` (dolanmiu/docx) — my recommendation

| Fact | Value |
|---|---|
| Latest | 9.7.1, published 2026-05-27 |
| Licence | MIT (satisfies D7) |
| Downloads | ~5,289,000 / week |
| Dependencies | `hash.js`, `jszip ^3.10.1`, `nanoid ^5.1.3`, `xml ^1.0.1`, `xml-js ^1.6.8` |
| Unpacked | 4.65 MB |
| Types | ships its own `index.d.ts`; ESM + CJS export map |
| Browser | README states "Works for Node and on the Browser" and carries browser examples |

Verified in the published typings:

- `Packer.toBlob(file): Promise<Blob>` — **this is the one that matters.** It
  hands back exactly the `Blob` that `downloadBlob(blob, fileName, doc)` takes,
  so the shared helper should need no change for a fourth time.
- `IPropertiesOptions` carries `title`, `subject`, `creator`, `keywords`,
  `description` — so D71's metadata habit has somewhere to go. Run properties
  carry `language?: ILanguageOptions`.
- `PageOrientation.PORTRAIT | LANDSCAPE` exists.
- `Table` / `TableRow` / `TableCell` build real Word tables — which is what
  criterion 2's "editable text" asks for.
- Images: `IImageOptions = (RegularImageOptions | SvgMediaOptions) &
  CoreImageOptions`, where `RegularImageOptions.type` is `"jpg" | "png" | "gif"
  | "bmp"`. **An SVG image is supported but requires a raster `fallback` of one
  of those types**, so a PNG has to be produced either way. `CoreImageOptions`
  carries `altText`, which is worth using.

The cost, stated plainly: **the Word drawing is a raster image.** Task 07 bought
vector with D62 and that is what kept its labels sharp; no equivalent is on offer
here, because Word's own SVG rendering varies by version and `docx` demands the
PNG fallback regardless. That re-raises the label-size question, which is why
this task measures it.

#### Option B — `html-docx-js`

| Fact | Value |
|---|---|
| Latest | 0.3.1, published **2016-05-17** |
| Licence | MIT |
| Downloads | ~34,000 / week |
| Dependencies | `jszip ^2.3.0` (jszip 2.x), `lodash.escape ^3`, `lodash.merge ^3` |
| Types | none published |

The appeal is obvious and it is a trap worth naming, because Task 06 already
produces a complete standalone HTML page and this looks like near-zero work.
It converts HTML using Word's `altChunk` mechanism, which does not build a
document — it embeds the HTML and asks the reader to convert it on open.
LibreOffice's `altChunk` support is materially weaker than Word's, and criterion
1 wants both. Our exported page's drawing is an inline `<svg>`, which that path
will not render. Unmaintained for over ten years, on jszip 2.x, with no types.
I do not recommend it.

#### Option C — `docx-templates`

4.15.0, published 2025-12-03, MIT, ~95,600/week, depends on `jszip` and `sax`.
It fills a pre-made `.docx` template with data, which means committing a binary
template to the repository and driving it with template commands. Our document's
structure is dynamic — N nodes, M edges, a drawing that may or may not exist —
so the template is the wrong shape for it. Maintained and legitimate; just not
for this job.

#### Option D — `officegen`

0.6.5, published 2021-03-06, MIT, ~15,600/week. Depends on `archiver`,
`readable-stream`, `lodash`, `setimmediate` — it is stream- and
filesystem-oriented and targets Node, which contradicts the project's
"everything runs in the browser, the site ships as static files" (D1). I would
rule it out.

#### Option E — write the OOXML by hand over a zip writer

`fflate` 0.8.3 (MIT, **zero dependencies**, 797 KB unpacked, published
2026-05-16) or `jszip` 3.10.2 (dual `MIT OR GPL-3.0-or-later`, published
2026-09-08 — the MIT arm is selectable so D7 is satisfied; note `docx` pulls
jszip in transitively anyway).

There is a real precedent for this: `e2e/pdfText.ts` was hand-written rather than
adding a PDF library, and it worked well enough that both agents trusted it. But
that was a **test-side reader** of a format jsPDF writes plainly. This would be
the **product-side writer** of a format where `[Content_Types].xml`, the `_rels`
parts, `document.xml`, styles, numbering and media relationships all have to be
right at once, and where Word's failure mode on any malformed part is to refuse
to open the file. That is a lot of specification surface standing between us and
criteria 1 and 3. I do not recommend it, but it is a legitimate answer if the
user would rather carry zero format dependencies.

#### The question, as I would put it to the user

> Task 08 needs a library to build the `.docx`. My recommendation is **`docx`
> 9.7.1** — MIT, about 5.3 million downloads a week, last published May 2026,
> builds real editable Word tables in the browser, and hands back a `Blob` that
> our existing download helper already takes unchanged.
>
> The trade-off to know about: the drawing inside the Word file will be a
> **raster image** rather than vector, because Word's SVG support varies by
> version and this library requires a PNG fallback regardless. The PDF kept its
> drawing vector; the Word file cannot.
>
> The alternatives are `html-docx-js` (would reuse our existing HTML export, but
> it was last published in 2016, its output is unreliable in LibreOffice, and it
> would not show the drawing at all), `docx-templates` (needs a binary Word
> template committed to the repo), `officegen` (Node-only, does not run in the
> browser), or hand-writing the Word XML ourselves with no format library (full
> control, but Word refuses to open a file if any one part is malformed).
>
> **May we `bun add docx`? Or would you rather a different route?**

Until there is an answer: plan, write the failing tests for the pure parts, and
install nothing.

### The two questions to ask the library up front

Task 07 turned on these twice, in rounds 2 and 3, and both times the failure was
**silent** — a label dropped or a line truncated while the export reported
success. Ask them before writing the plan, not after Jahmyr finds them.

**1. What happens to a control character in a label?** A `.docx` is XML, and
XML 1.0 forbids most C0 control characters outright — U+0000–U+0008, U+000B,
U+000C, U+000E–U+001F — including as numeric character references. So there are
three possible fates and you need to know which one you have: the library escapes
it and writes a file Word refuses to open (loud, and honestly the least bad), it
strips it silently (Task 07's failure shape, and unacceptable), or it throws.
`e2e/fixtures/control-labels.json` already exists for exactly this class.
Determine it empirically and record it as a decision.

**2. Do not reflexively port the `■` treatment.** D69/D70 mark a character the
embedded font cannot draw, and they exist because jsPDF embeds a subset font and
writes nothing at all for a glyph outside it. **A `.docx` does not embed a font —
it names one, and the reader's machine substitutes.** So font coverage is the
reader's question, not the file's, and marking a character `■` that the reader's
Word would render perfectly well would be a *loss* of fidelity, not a gain. My
expectation is that `fontCoverage.ts` does not apply here at all. Verify that
rather than assuming it either way, and record the reasoning as a decision
whichever way it lands. Question 1 still needs its own answer regardless.

### Files expected to change

A guide, not a cage.

- `package.json`, `bun.lock` — **only after the user answers the gate.**
- `src/lib/docxPlan.ts` and `src/lib/docxPlan.test.ts` — the pure planner. The
  unit tests live here.
- `src/lib/toDocx.ts` — the thin writer. `toPdf.ts` is the model, including its
  returning a small result object rather than a bare `Blob` if there is anything
  to report alongside the bytes.
- Something to rasterise the drawing — `src/lib/renderDrawing.ts` produces the
  SVG element, and turning it into a PNG is DOM work, so it belongs behind a
  named seam and is proven in the walk, not in Vitest.
- `src/pages/index.astro` and `src/styles/exports.module.css` — the fourth button
  and the export row's revisit.
- `e2e/exportWord.spec.ts` — **new file.** See the ceiling note below.
- `e2e/docxText.ts` — the `e2e/pdfText.ts` analogue: unzip the produced bytes and
  read `document.xml`, so the walk asserts on the file that was actually produced
  rather than on what went in.
- `e2e/export.spec.ts` — the four-download pass for criterion 4.
- `README.md`, `CLAUDE.md` — the fourth export, and any command that changed.
- `docs/DECISIONS.md` — append; do not rewrite existing rows.
- `src/lib/exportStyles.ts` — see *One two-line fix to carry* below.
- `docs/tasks/08-export-word.md` — the `**Status:**` line is already set to
  `in progress`. **Do not check any acceptance-criteria box.** Only Jahmyr's
  verification earns a check.

**The 800-line ceiling, concretely.** `CLAUDE.md` caps a file at 800 lines and
calls 200–400 typical. Today `e2e/export.spec.ts` is 511 lines and
`e2e/exportPdf.spec.ts` is 540 — the PDF walk moved out precisely because the old
file would have hit 829 (D68). Do the same: Word-specific assertions go in
`e2e/exportWord.spec.ts`. The single four-download pass is the *export row's*
story rather than Word's, so it can stay in `e2e/export.spec.ts` while that file
remains comfortably under the ceiling; if it would not, it moves to the new file
instead. Check the number, do not estimate it.

### Skills to load

From the task file:

- `anthropic-skills:docx` — document structure, tables, and image embedding.
  `CLAUDE.md` names it for this task specifically.
- `tdd-workflow` — every task writes its test before its function. The task
  file's own note is the lever here: a `.docx` is a zip of XML, so a test can
  open the bytes and look for the title and the node labels with no Word
  installed.
- `e2e-testing` — the four-download walk.

From `CLAUDE.md`, for this task's shape:

- `coding-standards` — before the first file.
- `front-review` — before the pull request; this changes an exported page.
- `front-a11y` — best effort, on the four-button row.
- `make-interfaces-feel-better` — the row's spacing and labels once it works.
- `front-refactor` — only if a module grows past a screen.

### Watch out for

**Decisions that already constrain this task.** Read them rather than
rediscovering them.

- **D48, D55, D63 — the signature.** The task file sketches
  `toDocx(design, layout)`. That is superseded. D48 settled that the exporters
  take the **layout alone**, and said so for Tasks 06 to 08; D55 added the
  `Document` where DOM work is unavoidable; D63 put the whole structural decision
  in a pure planner. So `toDocx(layout, doc)` with a pure `docxPlan(layout, …)`
  beside it is the shape to follow. If you conclude otherwise, that is a decision
  to record and justify, not a detail to change quietly.
- **D52 — `downloadBlob` is unchanged for a fourth time.** It takes
  `(blob, fileName, doc)` and `fileNameFor(title, extension)` builds the name.
  `Packer.toBlob()` returns exactly that `Blob`. **If you find yourself needing to
  change `download.ts`, stop and report it** — that is a finding about the
  helper's design, not a licence to edit it.
- **D53 and D59 — the export row.** The button is in the page from first paint,
  disabled until there is a layout, and disabled again the moment a file fails;
  all buttons switch together via `holdDrawing`. The row is a `role="group"`
  labelled `aria-label="Export the design"`. D59 named this task as the point
  where a three-button row becomes a four-button one and gets its fuller look.
- **D51 and D60 — the empty design.** A design with no nodes is valid and must
  export something. The other exports write the sentence "This design has no
  nodes, so there is nothing to draw." rather than an empty drawing. Match it.
- **D64 — the styles have to be inlined before anything outside the page reads
  the SVG.** svg2pdf never saw the app's CSS Module, so Task 07 renders the
  drawing fresh into an off-screen holder carrying the preview's class, asks what
  the styles resolved to, and writes them on as inline styles. **A canvas
  rasterisation has this problem identically** — an SVG loaded into an `Image`
  from a blob or data URL gets no CSS from the host page, and every colour in
  `drawing.module.css` is a `var(--shape-*)` that would resolve to nothing. The
  machinery already exists in `toPdf.ts` (`openDrawing`, `resolveStyles`).
  **Share it; do not copy-paste it.** A second copy is a second thing to drift.
- **D66 — the PDF's page decisions are the PDF's.** Letter, 612 × 792 pt, 48 pt
  margin. The Word document should make its own deliberate choice and record it
  rather than inherit by reflex; OOXML measures in twips and EMUs, not points.
- **D71 — the metadata habit.** Task 07 round 1 produced a PDF whose only
  metadata was `Producer: jsPDF`, so a viewer showed the file name in its title
  bar and a screen reader had no document title or language. A `.docx` has both —
  `title` on `IPropertiesOptions`, and a `language`. Set them. The title comes
  from the layout.
- **D7 and D8** — open-source libraries only, no paid services.
- **D54** — `done` means the criteria are verified in the cycle, not that the
  branch merged.

**Criterion 3, and how Task 07 held its equivalent.** D67 is the precedent: a
hard wall-clock assertion tight enough to be interesting is also tight enough to
go red on a busy runner, so the walk carries a deliberately loose guard (15
seconds) and the **real numbers go in the handoff**. Do the same. Rasterisation
is the new cost here and it is not free — record the timings for
`order-intake.json` (7 nodes), `platform-overview.json` (15, the fixture built to
represent the owner's own scale) and `estate-sweep.json` (40), first click and
warm. A 200-node design is worth a look for memory as well as time, since a
raster at a high scale factor can get very large very quickly.

**One measurement I am asking for specifically.** See *Scheduling decisions*
below: report the on-page label size of the Word drawing for those same fixtures,
the way Jahmyr measured the PDF's. Measuring is a finding, not a fix, and it does
not widen this task — but it decides how the next cycle is written.

**Choose the raster scale and the page orientation deliberately.** This is in
scope, because "rasterize the preview SVG to PNG through a canvas" is step 2 of
the task file and the scale factor is part of doing it. It is cheap at the moment
you write it and expensive later. It is **not** an acceptance criterion, so it
must not become the reason for a third round — make a considered choice, record
it, report the number, and move on.

### Scheduling decisions I am making, so you do not have to

**The PDF drawing's label size gets its own cycle, immediately after Task 08 and
before Task 09.** Jahmyr measured it off the produced bytes: `markup-labels`
(4 nodes) 11.8 pt, `order-intake` (7) 10.2 pt, **`platform-overview` (15) 4.0 pt**,
`estate-sweep` (40) 1.2 pt, a 200-node design 0.24 pt. Sam flagged it in three
places so it could not be missed. My decision:

- **Not folded into Task 08.** Different output format, and one task per cycle.
- **Not a new numbered task file.** `docs/tasks/` is generated from
  `docs/intake.md` and edits to generated files are lost on regenerate. The
  project already has a precedent for unnumbered work — the `layout.ts` split,
  with its own branch and its own
  `docs/handoff-items/handoff-chore-split-layout-module.md`. It will be a `fix/…`
  cycle in that shape.
- **Not deferred past Task 09.** Task 09 is the schema page and page styling,
  which is unrelated; the longer a known-unreadable output sits, the more it
  reads as accepted rather than carried.
- **Task 08 feeds it.** Hence the measurement above. If the Word drawing has the
  same problem, the next cycle fixes one principle across both formats instead of
  fixing the PDF and rediscovering it in Word.

**The other open items, routed:**

- **The loader chore is gated: it runs before Task 10, and becomes blocking
  rather than schedulable if still open when Task 10 is picked.** Task 10 is two
  tasks away. It covers `describeLoadError.ts:191` and `:193`, `loadDesign.ts`'s
  lagging doc comment, and `loadDesign.test.ts:146`'s conditional assertion. Not
  this cycle.
- **The dagre `intersectRect` crash on a valid design** — thrown from
  `assignNodeIntersects` inside `dagre.layout()` when two box centres coincide,
  needing both a two-cycle and a parallel duplicate of the same edge; confirmed
  independently by both agents at 7/400 and 2/2000, and unreachable by a small
  design. It fails safely, but the user hears dagre's words rather than the
  app's, which D43 otherwise prevents everywhere else. It wants its own cycle and
  it pairs naturally with the loader chore, since both live in the app's
  error-message region. Not this cycle.
- `src/lib/text.ts:116` — `splitIntoFittingWords` splits on `/\s+/` and rejoins
  with a single space, so a tab inside a label long enough to wrap is gone before
  marking. Not a failure — the preview does the same — and it belongs to whoever
  takes the drawing's wrapping next. Not this cycle.
- `e2e/fixtures/empty.json` is still misnamed beside `empty-design.json`. Its own
  small chore. Not this cycle.
- Page styling outside the drawing is still parked to Task 09.

### One two-line fix to carry

`src/lib/exportStyles.ts:15-18` still states D57's superseded claim that both
`?raw` and `?inline` "come back empty under `css: false`". **D61 corrected that
three tasks ago:** `?inline` does come back empty, but `?raw` does **not** — it
comes back as the CSS-Modules proxy stub, where `typeof` reads `object`,
`String()` throws `Cannot convert a Symbol value to a string`, and `.length`
reads back an invented class name. D57's conclusion still holds and is stronger
for it; only the recorded fact was wrong.

Four cycles have now passed this file without opening it, and Sam correctly
declined because source is not his remit. **Fix the comment in this cycle.** It
is a comment block, no behaviour changes, and the correct wording is already in
D61. Bounded to that comment: do not refactor the module around it.

### Two process fixes to apply by hand

These are known gaps in the agent configuration. **The configuration is not being
edited** — that proposal is still with the user — so reproduce them manually, as
Task 07 did:

1. **Pushing the branch and opening the pull request is Jahmyr's step, not
   Amon's. Amon:** commit on `feature/export-word` and hand back. Do not push and
   do not open the PR.
2. **Sam's documentation refresh routes through its own `chore/…` branch and its
   own pull request**, not a direct commit to `main`.

### Commands

`bun run test` runs Vitest. Plain `bun test` runs Bun's own runner and is the
wrong command; always include `run`. `bun run test:e2e` is the Playwright walk
and stays out of `bun run test` deliberately, because the pre-commit hook runs
the latter. `bun run check` is `astro check`. Correct `bun test` wherever you see
it written.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.
