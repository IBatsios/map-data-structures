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


## Work completed by Amon — round 1

### The library gate, verified at add time

`docx` 9.7.1, MIT, added with `bun add docx`. Checked against the registry and
against the package on disk rather than against the handoff: `npm view docx`
returns `9.7.1` / `MIT`, the package ships `LICENSE` (MIT, "Copyright (c) 2016
Dolan"), `dist/index.d.ts`, and five dependencies — `hash.js`, `jszip`,
`nanoid`, `xml`, `xml-js`. Its ESM entry carries no bare imports at all, so
Astro's build takes it whole; `bun run build` passes. Recorded as **D73**.

Three facts confirmed rather than trusted:

- `Packer.toBlob(file): Promise<Blob>`, and its blob already carries the
  `wordprocessingml.document` media type. **`src/lib/download.ts` is unchanged
  for the fourth time and needed no edit.**
- `IPropertiesOptions` carries `title`, `description` and `creator`; the run
  `language` is set once on the document's default run rather than per run.
- `IImageOptions` types an image as `jpg | png | gif | bmp`, and the SVG
  variant needs a raster fallback regardless — so the Word drawing is a PNG,
  as expected.

### The two silent-failure questions, answered before the plan

**1. Control characters — determined empirically, three ways.**

`docx` 9.7.1 escapes `&`, `<`, `>` and `"` and writes **everything else through
verbatim**. It does not strip, does not escape and does not throw. A `U+0001`
in a label lands raw in `word/document.xml`.

- The produced `document.xml` is then **not well-formed XML**: expat rejects it
  with `not well-formed (invalid token): line 1, column 2399`.
- LibreOffice refuses the file outright: `Error: source file could not be
  loaded`. So the fate is the **loud** one — but loud when the reader opens it,
  not when the export runs, and it fails criterion 1 for any design carrying one.

The two C0 characters XML *does* allow were measured separately in LibreOffice,
because neither is safe either:

| in a label | what a `.docx` does with it, measured | what this export does |
|---|---|---|
| tab `U+0009` | renders as a tab, exactly as `w:tab` does | **kept as itself** |
| line feed `U+000A` | legal XML, renders as a **space** | becomes a real `w:br` |
| carriage return `U+000D` | XML normalises it to a line feed before Word sees it | joins `\r\n` into one break |
| `U+0001`, `U+000B`, `U+000C`, `U+001F`, `U+0000` | file will not open | marked `■`, counted |
| DEL `U+007F`, `U+0085`, `U+200B` | carried through, file opens | **kept as itself** |

Recorded as **D76**.

**2. `fontCoverage.ts` does not apply — verified, not assumed.** The produced
package holds `word/fontTable.xml`, which *names* faces, and no font binary
part at all. So coverage is the reader's machine's question, and marking `→` or
`東京` would turn a character the reader's Word draws perfectly well into a
square. `e2e/exportWord.spec.ts` has a test named for it that asserts
`undrawable-labels.json` comes out of the `.docx` with every arrow, ideograph
and tick intact and **no `■` anywhere**. Recorded as **D77**.

### What was built

An **Export Word** button, fourth in the export row. With a design on screen it
downloads `<design>.docx`: the design's title as a Word title, the drawing as a
picture, and the node and edge tables as **real Word tables** — a reader opens
the file and types in a cell.

The split is D63's: a pure `docxPlan(layout)` decides the page, the metadata,
the title, both tables and their column widths, the size the drawing is placed
at, D51's sentence for an empty design, and the character rule; a thin
`toDocx(layout, doc)` builds the file that plan describes.

The drawing is rendered fresh, given the preview's own resolved styles, and
painted through a canvas at three times the size it is placed at. **D64 applies
to the canvas identically**, so `openDrawing`/`resolveStyles` were *lifted out*
of `toPdf.ts` into `src/lib/openDrawing.ts` and both exports call it; the PDF's
font override now arrives as an argument rather than being hard-coded inside
it. The marking walk was lifted out of `drawableText.ts` into
`src/lib/markLayout.ts` on the same reasoning — the rule differs between the
two exports, the walk does not.

The export row got D59's fuller revisit: four buttons, its name on the page via
`aria-labelledby` rather than only in an `aria-label`, one minimum width across
all four, a press state, and `prefers-reduced-motion` respected.

`src/lib/exportStyles.ts:15-18`'s stale `?raw` comment is corrected to D61's
wording. Bounded to that comment block; nothing else in the module moved.

### Files added or changed

**Product**

| path | what |
|---|---|
| `src/lib/docxPlan.ts` | new. The pure planner: page, metadata, title, tables, drawing size, `safeDocxText`, `describeMarkedControls`. |
| `src/lib/docxPlan.test.ts` | new. 24 unit tests, written first. |
| `src/lib/toDocx.ts` | new. The thin writer over `docx`, dynamically imported. |
| `src/lib/rasteriseDrawing.ts` | new. The named seam that paints the SVG into PNG bytes through a canvas. |
| `src/lib/openDrawing.ts` | new. `openDrawing`/`resolveStyles`, lifted out of `toPdf.ts` and shared. |
| `src/lib/markLayout.ts` | new. The layout-marking walk, lifted out of `drawableText.ts` and shared. |
| `src/lib/toPdf.ts` | now calls `openDrawing`, passing its font override; 338 → 242 lines. |
| `src/lib/drawableText.ts` | now calls `markLayout`; its duplicate walk removed. Behaviour unchanged. |
| `src/lib/exportStyles.ts` | the `?raw` comment corrected to D61 (comment only). |
| `src/pages/index.astro` | the fourth button, its handler, the row's new structure. |
| `src/styles/exports.module.css` | the row's revisit: group label, one minimum width, press state, reduced motion. |
| `package.json`, `bun.lock` | `docx` ^9.7.1. |

**Tests**

| path | what |
|---|---|
| `e2e/docxText.ts` | new. Reads the produced bytes back: zip directory + `inflateRaw` + enough XML for text, tables, metadata, page and media. |
| `e2e/exportWord.spec.ts` | new. 20 steps, Word-only. |
| `e2e/export.spec.ts` | the four-download pass for criterion 4; button count 3 → 4. 511 → 561 lines. |
| `e2e/exportPdf.spec.ts` | button count 3 → 4. |
| `e2e/pages/uploadPage.ts` | `exportWord`, `downloadWord`. |

**Docs**

`docs/DECISIONS.md` (D73–D80, appended), `README.md`, `CLAUDE.md`,
`docs/tasks/08-export-word.md` (status line only — **no box checked**), this
file.

### Tests written

**Unit — `src/lib/docxPlan.test.ts` (24):**

- the page is US Letter portrait in DXA with a 1,440 margin, and is taller than
  it is wide (`docx` defaults to A4, so a file that does not say so is one
  nobody chose the page for)
- the metadata carries the title, a description drawn from the layout, and `en`
- the title is written at the top as its own lines
- both tables list every node and every edge in file order, with the same
  column names the other three exports print
- every column width is a whole number of DXA and they sum to the text column
  exactly (a percentage width is what lays out differently in Google Docs)
- an empty design still prints both headings with no rows under them
- the drawing fits the content box, is never scaled up, and keeps its
  proportions when it shrinks
- the canvas is a fixed multiple of the *placed* size, so it is bounded
  whatever the design
- the picture is described for a reader who cannot see it
- a design with no nodes gets D51's sentence and no drawing
- `safeDocxText` marks each XML-forbidden control character and counts it
- `safeDocxText` keeps a tab, keeps `→ 東京`, keeps DEL
- `safeDocxText` splits `\n`, `\r\n` and a lone `\r` into lines and marks none
- the same character is marked in a label, an id, a type and a title
- the count is per piece of the design's own text, not per drawn line
- the drawing's layout carries the same marked text the tables do
- `describeMarkedControls` names the count, the mark and the two formats that
  keep everything, and says nothing at zero

**Walk — `e2e/exportWord.spec.ts` (20):** the button is offered only with a
design on screen; the file is named `Order-intake.docx` and is a zip with
`[Content_Types].xml`, `word/document.xml` and `docProps/core.xml` in it; every
label the preview draws is in the file; both tables are real tables with a row
per node and per edge and the right cells in the right order; every `w:tcW` is
`dxa` and none is `pct`; there is exactly one PNG, over 2 kB, with alt text
naming a node and an edge; the page is 12,240 × 15,840 portrait; the title,
description and language are in the metadata; Greek, an ampersand and a label
that is markup survive; `undrawable-labels.json` comes out with **no `■` at
all**; `control-labels.json` leaves **zero** XML-illegal characters in
`word/document.xml` and reads `Soh■Charlie` in its table row; the tab, the DEL
and both line breaks are carried; the page says `1 control character`; a clean
export says nothing; an empty design gets the sentence, both one-row tables and
no picture; the export follows the design on screen; the button disables when
the next file fails; the group holds four buttons, shows its name and is
reachable by Tab and Enter; and both timed steps.

**Walk — `e2e/export.spec.ts`:** one new step for criterion 4 — four buttons
clicked one after another on one design, four downloads, four correct names,
and each file checked by the bytes a reader looks at first (`# Order intake`,
`<!doctype html>`, `%PDF-`, `PK`), with all four still enabled afterwards.

### Local results

- `bun run test`: **pass — 21 files, 343 tests** (319 before this task).
- `bun run test:e2e`: **pass — 97 steps** (77 before this task).
- `bun run check`: **pass — 0 errors, 0 warnings, 0 hints** over 65 files.
- `bun run build`: **pass**, 1 page in ~0.8 s.

### Criterion 1, verified by hand as well as by the walk

The criterion says the file must open in **Word and LibreOffice**. LibreOffice
25.x is on this machine and every fixture's export was opened with it and
converted to PDF without a warning: `order-intake`, `markup-labels`,
`platform-overview`, `estate-sweep`, `control-labels`, `empty-design`, and a
200-node design. The drawing's PNG was extracted from `order-intake.docx` and
looked at: every silhouette, colour band, arrowhead and label is there, so
D64's inlining carries through the canvas path as well as through svg2pdf's.

**Word itself is not installed on this machine, so the Word half of criterion 1
is unverified here.** It is the one thing I could not check and Jahmyr should.

### Measurements

**Time (criterion 3).** Measured off the click to the browser holding the file,
in the walk, `--workers=1`:

| design | nodes / edges | first click | warm | `.docx` |
|---|---|---|---|---|
| `markup-labels.json` | 4 / 3 | 298 ms | 143 ms | 165 kB |
| `order-intake.json` | 7 / 6 | 155 ms | 149 ms | 212 kB |
| `platform-overview.json` | 15 / 16 | 159 ms | 155 ms | 195 kB |
| `estate-sweep.json` | 40 / 46 | 183 ms | 187 ms | 140 kB |
| 200 nodes / 260 edges | 200 / 260 | 558 ms | — | 143 kB |
| `empty-design.json` | 0 / 0 | 101 ms | 105 ms | 8.9 kB |

The walk's guard is 15 s, D67's deliberately loose one. Word is the *fastest*
of the four exports — there is no font to fetch and no vector conversion.

**Memory, for the 200-node case Jared asked about.** The page's
`usedJSHeapSize` was 11.9 MB before the export and 11.9 MB after. The canvas is
measured against the *placed* size rather than the drawing's own, so it can
never exceed 624 × 768 × 3 ≈ 4.3 megapixels however large the design is. This
is a deliberate choice recorded in D74; scaling the drawing's own size would
have needed a pixel budget and a canvas-dimension cap.

**The Word drawing's on-page label size — the measurement Jared asked for
specifically.** Read off the `wp:extent` in the produced `word/document.xml`
(the drawing's node label is 14 layout px, placed at 96 px to the inch):

| design | nodes | canvas | Word label | PDF label (Jahmyr's) |
|---|---|---|---|---|
| `markup-labels.json` | 4 | 423 × 660 | **10.50 pt** | 11.8 pt |
| `order-intake.json` | 7 | 570 × 766 | **10.50 pt** | 10.2 pt |
| `platform-overview.json` | 15 | 1541 × 1082 | **4.25 pt** | 4.0 pt |
| `estate-sweep.json` | 40 | 1060 × 6480 | **1.24 pt** | 1.2 pt |
| 200-node design | 200 | 17210 × 688 | **0.38 pt** | 0.24 pt |

**The Word drawing has the same problem as the PDF's, at the same magnitudes.**
The scheduled `fix/…` cycle therefore fixes one principle across both formats,
exactly as Jared hoped. Note the shape of it is not "the page is too small" but
"the canvas grows without bound in whichever direction the graph runs":
`estate-sweep` is 6480 px tall and the 200-node design 17,210 px wide, so
landscape alone does not fix it — tiling across sheets, or a per-node size
floor, is what would.

**Page orientation, chosen deliberately.** Portrait, and the reason is in the
canvas column above: three of the four fixtures are taller than they are wide,
so landscape would shrink the picture in three cases to help it in one. An inch
of margin is Word's own default and the shape an editable document is expected
to have. Recorded as D75.

**Raster scale, chosen deliberately.** Three, giving 288 DPI at the placed
size — a print resolution — and a canvas that is bounded by construction.
Recorded as D74.

### Decisions recorded

Eight rows appended to `docs/DECISIONS.md`:

- **D73** — `docx` 9.7.1, MIT, confirmed with the user and verified at add
  time; why the other four routes were rejected.
- **D74** — `toDocx(layout, doc)` over a pure `docxPlan(layout)`; the drawing is
  a raster PNG at 3× the placed size, and why that bounds the canvas.
- **D75** — US Letter portrait, 1,440 DXA margins; landscape measured and
  rejected.
- **D76** — what a `.docx` cannot carry, measured: the mark set, the tab, the
  line endings, the unpaired surrogate, and why the count differs from the
  PDF's.
- **D77** — `fontCoverage.ts` does not apply to Word, verified both ways.
- **D78** — `openDrawing` and `markLayout` extracted and shared rather than
  copied.
- **D79** — `e2e/docxText.ts` hand-written, and the Word spec in its own file.
- **D80** — the export row's revisit.

### Known gaps

1. **Word itself was not used.** LibreOffice verified every file; Microsoft
   Word is not on this machine. Criterion 1 names both.
2. **The drawing's label size is unreadable past ~15 nodes** in the Word file
   as it is in the PDF. Measured and reported above; not fixed, because the
   handoff says explicitly that it is the next cycle's and must not become this
   one's second round.
3. **`bun run test:e2e` is Chromium only**, as it has been since Task 03
   (`playwright.config.ts` has one project). So "opens the same everywhere" is
   evidenced by the bytes and by LibreOffice, not by Safari or Firefox.
4. **`docx` adds about 23 packages and 4.65 MB unpacked** to the dependency
   tree, of which `jszip` was already arriving transitively with nothing.
   The `.docx` code is dynamically imported, so a visitor who never clicks
   Export Word never downloads it — but the repository carries it.

### Out-of-scope notes for Jared

1. **D51's sentence now exists in four places.** `pdfPlan.ts` exports
   `NOTHING_TO_DRAW`, `toHtml.ts` keeps a private copy, `toMarkdown.ts` has its
   own, and `docxPlan.ts` now has a fourth. I followed the precedent rather
   than inventing a coupling mid-task, but four copies of one sentence is a
   drift risk with no test holding them together — unlike the drawing's
   palette, which `exportStyles.test.ts` does hold. A one-line shared constant
   would close it.
2. **The four exports' column headings are also four copies** — `Id | Label |
   Type` and `From | To | Label` are written out independently in
   `toMarkdown.ts`, `toHtml.ts`, `pdfPlan.ts` and `docxPlan.ts`, and the column
   *shares* in `pdfPlan.ts` and `docxPlan.ts` are the same four numbers twice.
   Same class of risk as (1), same size of fix.
3. **The status region says one thing at a time, and the fourth export makes
   that more visible.** Export PDF and then Export Word on a design carrying
   both an uncoverable glyph and a control character, and the second sentence
   replaces the first — so the user is told about the Word file's marks and the
   PDF's disappear. D41 parked "announcing a finished download" for all four
   exports at once; this is the same parked question growing a second head.
   Not a defect against any criterion.
4. **`e2e/fixtures/empty.json` is still misnamed** beside `empty-design.json`.
   Unchanged, as instructed.
5. **LibreOffice on this machine needed `-env:UserInstallation=…` and a clean
   profile** before `--convert-to` would return; without it the command hangs
   indefinitely. Worth knowing if the Word half of criterion 1 is ever
   automated.


## Test report from Jahmyr — round 1

### Verdict

**Pass.** All six acceptance criteria verified by exercising them, and CI is
green on the pull request. No defects to hand back.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can export the design as a Word document: demonstrated end to end | pass | Drove the built site in a real browser through its own controls — file picker, then the `Export Word` button — for 16 inputs. Eleven produced a `.docx`; five malformed inputs correctly produced none. Every one of the eleven **opened in LibreOffice Writer** and converted both to PDF and back to `.docx` with no warning. Microsoft Word is not installed on this machine either (no `App Paths\winword.exe`, no `Word.Application` class, no `WINWORD.EXE` under either Program Files), so I validated the package against what Word refuses a file for — see *What I did instead of opening Word* below |
| The document shows the same nodes and edges as the preview, and the tables are editable text (5.2) | pass | Read the node labels, node types and edge labels straight off the preview SVG's `data-part` elements, then read the table cells out of the produced `.docx`, and compared: **identical, label for label**, for `order-intake` (7/6), `platform-overview` (15/16) and `undrawable-labels` (5/4). Editable text proven twice: structurally, every one of the 603+783 cells in the 200-node file holds a `w:t` run, with no `w:documentProtection` and no `w:permStart`; and behaviourally, I edited a cell to "Edited by a human", rebuilt the package, and LibreOffice reopened it with the edit in place and the table intact |
| The download finishes within a few seconds for a design the size of the owner's use cases (11.1) | pass | My own click-to-file measurements: `markup-labels` 99 ms, `order-intake` 169 ms, `platform-overview` (the owner's scale) **153 ms**, `estate-sweep` 141 ms, 200 nodes/260 edges 436 ms, 1000 nodes/999 edges 1311 ms, `empty-design` 47 ms |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright walk now clicks all four export buttons and checks all four downloads (14.1) | pass | `bun run test` 343 tests / 21 files and `bun run test:e2e` 97 steps, both green. Read the four-download step at `e2e/export.spec.ts:218` rather than trusting its name: it clicks all four buttons in turn on one design, asserts the four file names, checks each file by its own first bytes (`# Order intake`, `<!doctype html>`, `%PDF-`, `PK`), and asserts all four are still enabled afterwards |
| Every earlier test still passes; CI is green | pass | Whole suite green locally; `bun run check` 0 errors / 0 warnings / 0 hints over 65 files; `bun run build` passes. CI green on PR #17, on both the push run and the pull-request run. The two extractions were checked for regression as well: every `exportPdf.spec.ts` step passes, and I re-exported PDF, HTML and Markdown by hand afterwards — the PDF is a valid 3-page file with an xref and `%%EOF` |
| Any new environment variable is in `.env.example` with a placeholder | pass | Grepped the source for `import.meta.env`, `process.env`, `getenv` and `PUBLIC_`: the only hit anywhere is `process.env.CI` in `playwright.config.ts`, which CI supplies. `.env.example` correctly states there are none. `gitleaks detect --source .` over 23 commits: **no leaks found** |

### Command results

- `bun run test`: **pass** — 343 tests, 21 files, 883 ms
- `bun run test:e2e`: **pass** — 97 steps, 11.2 s
- `bun run check`: **pass** — 0 errors, 0 warnings, 0 hints, 65 files
- `bun run build`: **pass** — 1 page in 692 ms
- `bun run dev`: **pass** — serves, HTTP 200, no errors, stopped cleanly
- Secret scan: **clean** — `gitleaks`, 23 commits, 1.62 MB, no leaks found
- CI: **green** — PR #17, the `test` job passed on both runs

### What I did instead of opening Word, and what it does and does not prove

The criterion as written says "demonstrated end to end", and the task file's own
body says the file "opens in Word **or** LibreOffice". That is demonstrated.
Jared's stricter "both Word and LibreOffice" could not be exercised by either
agent, so here is exactly what stands behind the box.

I validated all sixteen produced packages against the things Word refuses a file
for, rather than assuming:

- **zip integrity** — `testzip()` clean on every file
- **every XML part well-formed** — parsed each `.xml` and `.rels` with expat; all
  parse, all are valid UTF-8, none carries a DTD or entity declaration
- **no XML-illegal character anywhere in any part** — scanned every part for
  U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, unpaired surrogates, U+FFFE and
  U+FFFF. **Zero hits across all sixteen**, including the two fixtures built to
  carry them
- **`[Content_Types].xml` covers every part** — by Default extension or Override
- **every relationship resolves** — walked every `.rels` and confirmed each
  target part exists; and every `r:embed`/`r:id` used in `document.xml` is
  declared in `document.xml.rels`
- **the picture is a real PNG** — signature, chunk structure and the **CRC32 of
  every chunk** verified, IHDR read
- **nothing locks the document** — no `documentProtection`, no `permStart`

Then a second, independent OOXML implementation read them: LibreOffice Writer
opened all eleven, rendered them to PDF, and re-serialised them to `.docx`. I
compared the round trip: same two tables, same row and cell counts, same cell
text, same single drawing. A reader that had merely tolerated the file would not
have reproduced its tables.

**What remains unproven:** Microsoft Word's own renderer. Nothing in the package
violates the spec and a second full implementation reads it correctly, so the
risk is low, but it is not zero and nobody in this cycle has seen Word open one.
If the owner has Word anywhere, opening `order-intake.docx` once closes it.

### What I saw in the file, with my own eyes

- Extracted the drawing from `order-intake.docx` and looked at it: all seven
  silhouettes (hexagon, rounded box, stadium, note, cylinder, dashed box), every
  colour band, every arrowhead, every edge label. D64's inlining carries through
  the canvas path.
- Extracted the one from `undrawable-labels.docx`: `Gateway → Queue`,
  `API gateway (東京)`, `Cache (القاهرة)`, `check ✓ cross ✗`, `keeps ≥ ± € … •`,
  `double arrow ⇒ element ∈`. Every one intact. **D77 confirmed: no `■` anywhere
  in that file** — zero marks in the drawing and zero in the tables.
- Rendered page 1 of `order-intake.docx` and `empty-design.docx` through Writer:
  the title as a heading with the drawing below it; and for the empty design,
  D51's sentence verbatim, both `Nodes` and `Edges` headings, and both
  header-only tables with no empty frame.
- `control-labels.docx`: exactly **one** mark, `Soh■Charlie`, the file opens,
  three literal tabs survive and two `w:br` carry the line endings. Writer's
  round trip turned our literal tab into `<w:tab/>` — it read it as a tab, which
  confirms that row of D76's table from the other side.

### Adversarial pass

Everything I could think of to break "upload JSON, get a drawing back":

| input | result |
|---|---|
| zero-byte file | refused, "That file is empty…", button stays disabled |
| trailing comma | refused, line and column named |
| JSON object missing `nodes`/`edges` | refused, both problems named |
| JSON that is an array | refused, "…but it is a list" |
| JSON that is a bare number | refused, "…but it is a number" |
| a `.png` chosen from the picker | refused without reading a byte |
| U+0000, U+000B, U+FFFE, U+FFFF and a lone surrogate in one file | 7 marked, package valid, opens |
| a 4,000-character label | carried whole, package valid |
| a title of nothing but control characters | 3 marked, name falls back to `design.docx`, package valid |
| a title of nothing but punctuation | name falls back to `design.docx`, package valid |
| five parallel duplicate edges between two nodes | drawn and exported, package valid |
| 200 nodes / 260 edges | 436 ms, package valid |
| 1000 nodes / 999 edges | 1311 ms, package valid |

No crash, no hang, no silently broken file, and no case where the export
reported success over a file a reader would refuse.

### Accessibility, best effort

Audited `src/pages/index.astro` against the project's checklist and found
**nothing** — no image, link, button, form, ARIA, keyboard, semantic or contrast
rule violated. Then checked the live page rather than only the source:

- the row is `role="group"` named "Export the design" through `aria-labelledby`,
  pointing at words that are actually on the page
- all four buttons carry a visible accessible name and `type="button"`, with no
  `tabindex` override and no `aria-hidden`
- the injected drawing has `role="img"` and `aria-label="Order intake"`
- two polite `role="status"` regions, present from first paint
- one `prefers-reduced-motion` block in the delivered stylesheet
- Tab from the file input reaches all four buttons in order, and **Enter on the
  focused Export Word button downloads `Order-intake.docx`**

### Defects for Amon

None. Nothing was handed back this round.

### Fixed in place

Nothing. No typo, wrong import path, misnamed variable, bad assertion or flaky
wait needed correcting.

### One measurement to carry into the scheduled fix cycle

Not a defect, and not this task's — recorded because it sharpens the shape of the
problem Jared already scheduled. The drawing is placed against the page's content
box and the raster is measured from the *placed* size, so at an extreme aspect
ratio the raster itself collapses, not merely the labels on it:

| design | embedded PNG | placed at |
|---|---|---|
| `order-intake` (7) | 1710 × 2298 | 5.94 in × 7.98 in |
| `platform-overview` (15) | 1872 × 1314 | 6.50 in × 4.56 in |
| `estate-sweep` (40) | 377 × 2304 | 1.31 in × 8.00 in |
| 200-node chain | 530 × 2304 | 1.84 in × 8.00 in |
| **1000-node chain** | **3 × 2304** | **0.01 in × 8.00 in** |

At a thousand nodes the picture is a three-pixel hairline. So a per-node size
floor alone will not be enough: whatever the fix cycle does has to stop the
*placed* size from driving the raster, or tile the drawing across sheets. The
tables underneath stay full-size and correct at every one of these, which is what
keeps the export honest in the meantime.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/17 — opened as a draft
against `main`, per D54 and the process note. CI green. **Sam marks it ready and
merges; I did not.**
