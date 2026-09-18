# Handoff — Task 07: Export as PDF

**Date:** 2026-09-18
**Branch:** feature/export-pdf
**Task file:** docs/tasks/07-export-pdf.md
**Round:** 1

## Assignment from Jared

### Scope

Build the third of the four exports: a button that turns the design on screen
into a `.pdf` the user can attach to an email or a ticket. It opens in any
viewer and shows the drawing and the node and edge tables, with every label
readable.

Tasks 05 and 06 are the template — a builder in `src/lib/` with its test written
first, a button wired through the helpers that already exist, the walk extended.
Two things are genuinely new and both are named below: **the PDF route is a gate
the user opens, not a choice you make**, and **criterion 11.1 is the first
criterion in this project that has to be measured with a clock** rather than
argued.

**In scope**

- The PDF builder in `src/lib/`, with its test written before it. Name and
  signature are yours to settle (see "Watch out for", items 1 and 2).
- An "Export PDF" button joining the existing export row in
  `src/pages/index.astro`, wired through `downloadBlob` / `fileNameFor`.
- Extending `e2e/export.spec.ts` with the PDF download, alongside Markdown's and
  HTML's, and `e2e/pages/uploadPage.ts` with the handle it needs.
- **A timed measurement for criterion 11.1**, against a design at the owner's
  scale, with the number recorded in this document.
- Decision rows in `docs/DECISIONS.md` for the route chosen and its trade-off
  (the task file asks for this by name), and for the module's signature and
  where each half of it is tested.
- Whatever fixture the timing and the walk need. There is no fixture at the
  owner's scale today; the largest valid one is `order-intake.json` at 7 nodes
  and 6 edges.

**Out of scope**

- **Word.** Task 08, its own cycle. Build nothing for it, but if the route you
  pick has a bearing on it, say so in your handback rather than building ahead.
- **Page styling outside the drawing.** Still parked to Task 09.
- **Any change to `src/lib/download.ts`.** See item 6.
- **The `layoutDesign` crash on a valid design** (the dagre `intersectRect`
  throw). Carried, has its own cycle coming, and needs both a two-cycle and a
  parallel duplicate edge to reach — not reachable from anything this task
  builds. Do not open it here.
- **The loader-wording chore** (`describeLoadError.ts:191`/`:193`,
  `loadDesign.ts`'s doc comment, `loadDesign.test.ts:146`). Still its own cycle,
  now gated to run before Task 10. Do not open those files.
- **Renaming `e2e/fixtures/empty.json`.** Still its own small chore.
- **`straightLine` (`src/lib/layout.ts`).** Settled in Task 06 as proven
  unreachable and deliberately kept as a guard (D58). Do not reopen it.
- **Announcing a finished download on the page.** Still a D41 live-region
  question that belongs to all four exporters at once.

### Acceptance criteria

Copied verbatim from `docs/tasks/07-export-pdf.md`. These are the contract.

- [ ] As a user, I can export the design as PDF: demonstrated end to end.
- [ ] The PDF shows the same nodes and edges as the preview, with every label readable (5.2).
- [ ] The download finishes within a few seconds for a design the size of the owner's use cases (11.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download.
- [ ] Every earlier test still passes; CI is green.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one has been vacuously true for six tasks running: this project reads
nothing from the environment and `.env.example` holds no variables. Confirm it
rather than assume it, and say which way you confirmed it.

### Files expected to change

A guide, not a cage.

- `src/lib/toPdf.ts` — new (or whatever the route names it). The builder.
- `src/lib/toPdf.test.ts` — new, and written first.
- `src/pages/index.astro` — the third button, its listener, and the one line in
  `holdDrawing` that switches it with the other two.
- `e2e/export.spec.ts` — the PDF download beside Markdown's and HTML's, and the
  timing assertion for 11.1.
- `e2e/pages/uploadPage.ts` — the new button's handle; `exportUsing` already
  takes a `Locator`, so this should be small.
- `e2e/fixtures/` — a design at the owner's scale, for the timing.
- `package.json` / `bun.lock` — only after the user has confirmed the route.
- `src/lib/exportStyles.ts` — only for the stale comment in item 7, and only if
  the route makes you read that file anyway.
- `docs/DECISIONS.md` — append; never rewrite an existing row.
- `README.md` / `CLAUDE.md` — only if a command changes. None should.

### Skills to load

From the task file's "Suggested skills" and `CLAUDE.md`:

- `anthropic-skills:pdf` — PDF structure and its pitfalls, while choosing the
  route and while reading the bytes back in a test. `CLAUDE.md` lists it for
  exactly this task.
- `tdd-workflow` — the builder's test before the builder. Every task does this.
- `coding-standards` — before the first file, for naming and structure.
- `e2e-testing` — the download assertion and the timing, extending the walk
  Tasks 05 and 06 built.
- `error-handling` — the export's failure path, which already exists on the page
  as `EXPORT_FAILED` and D43.
- `front-a11y` — Task 07 has no accessibility criterion of its own, unlike Task
  06, but the third button lands in a group a screen reader already names (D59);
  keep it as reachable as the two beside it.

### Watch out for

**1. The PDF route is a gate, not a choice you make alone.** The task file says
it plainly: *"Confirm the route and the library with the user before adding
either."* That is the same gate Task 03 had for the layout engine, and it was
honoured there. **Do not `bun add` anything until the user has confirmed which
route**, and if no answer comes back, stop and report rather than picking one
quietly. D24 is the precedent for how to close it: the library's version,
licence, publish date, dependencies and whether it ships its own types were all
verified at the moment it was added, not taken from a handoff.

To make the question answerable, here is the shape of it as I read it. All three
satisfy D7 (open-source only) and D8 (no paid services), and D1 keeps every one
of them inside the browser — no backend, no headless renderer on a server, no
hosted conversion service, for any route.

- **Vector — `svg2pdf.js` on `jsPDF`.** The task file's first suggestion. Draws
  the SVG into the PDF as vector, so text stays selectable and searchable, the
  file stays small, and it does not blur at any zoom. Registry facts as of
  today: `jspdf` 4.2.1, MIT, last published 2026-03-17, ships its own types,
  three runtime dependencies; `svg2pdf.js` 2.8.1, MIT, last published
  2026-08-31, ships its own types, peer `jspdf ^4.0.0 || ^3.0.0 || ^2.0.0`, so
  the pair is currently compatible. Cost: two packages rather than one, and the
  font question in item 3 lands hardest here.
- **Raster — canvas plus `pdf-lib`.** The task file's second suggestion. Simpler
  to reason about and immune to the SVG-feature-coverage question, but the text
  becomes pixels: not selectable, not searchable, and blurred when zoomed, which
  is a direct pull against "every label readable". **Check `pdf-lib`'s health
  before proposing it**: `pdf-lib` 1.17.1 is MIT and ships types, but its last
  publish is 2022-05-12, which is over four years of no releases. That is a real
  mark against it and the user should hear it as part of the question.
- **Print the page Task 06 already built.** The task file's own note says Task
  07 may print the HTML page, and Amon laid that page out for print on purpose
  (D57's last clause: colour bands printed rather than dropped, no row or
  drawing broken across two sheets). No new dependency at all, which is the
  cheapest thing in this list. **But read criterion 1 and criterion 4 carefully
  before proposing it**: the task file's user-facing sentence is *"an 'Export
  PDF' button **downloads** a `.pdf`"*, and criterion 4 says the Playwright walk
  checks **this download**. A browser print dialog is the user saving a file,
  not the app downloading one, and Playwright's `waitForEvent('download')` will
  never fire for it. I am naming this route so it is evaluated rather than
  dismissed — if you think it can meet both criteria as written, that is a
  finding to put to the user alongside the other two, not a call to take alone.

Whichever route the user picks, record it in `docs/DECISIONS.md` **with its
trade-off**, which the task file's Notes section asks for by name.

**2. `toPdf(design, layout)` in the task file is stale — the same way Task 06's
sketch was.** D48 settled the design half for Tasks 06 to 08: an exporter takes
the **layout alone**, because the layout already carries the title, both lists
in file order, every label exactly as the file gave it, and each node's resolved
`shape.kind`. Two sources for the same fields is one more way for the file and
the picture to disagree, and the export's whole promise is that they do not. Do
not reopen it. The task files are generated from the intake and are not to be
edited, so the conflict is resolved here, in the assignment, exactly as it was
for Task 06.

What is still open is the second half of the signature, and D55 is the pattern:

- If the route needs a DOM — and the vector and raster routes both do, since
  `renderDrawing(layout, doc)` returns an `SVGSVGElement` and a canvas is a DOM
  object — then it takes its `Document` as an argument rather than reaching for
  a global. `downloadBlob(blob, fileName, doc)` and `renderDrawing(layout, doc)`
  both set that precedent and D52 spells out why.
- **This project's Vitest run has no DOM anywhere in `src/`.** The standing
  split is pure logic in Vitest, DOM-shaped work in Playwright, and D55 states
  it: `toHtml` got a pure `htmlPage(layout, drawing)` beside it so the choice
  was unit-testable at all. Look for the same seam here — whatever part of
  building the PDF is pure (the tables' text, the page count, the ordering, the
  empty-design sentence) belongs in Vitest, and the part that needs a browser
  belongs in the walk. Say in the decision where each half is tested, so Jahmyr
  is not guessing.
- Do not hand-write a second SVG renderer to dodge the `Document`. D55 rejected
  that for Task 06 and the reason is unchanged: two renderers to keep in
  agreement is the failure intake 5.2 forbids.

**3. Fonts and non-Latin text are this task's 5.2 trap.** Criterion 2 is "every
label readable", and a PDF is the first format in this project that does not
hand its text to something else to render — it carries its own fonts. jsPDF's
built-in fonts are the PDF standard set and are Latin-1 only; a label with a
character outside that range comes out as the wrong glyph or as nothing, and a
label that comes out as nothing is a dropped label, which is the one outcome
intake 5.2 rules out. The raster route dodges the encoding question and trades
it for legibility at zoom. Whatever the route:

- **Test a label that is not plain ASCII**, and test it the way the user meets
  it — read the text back out of the produced PDF, or assert on the rendered
  page, rather than trusting that what went in came out.
- If a font has to be embedded, its licence is a D7 question and its bytes are a
  bundle question. Raise it rather than embedding one quietly.
- The project already knows its exotic-character corners: D43 bounds what
  untrusted text reaches the screen, D56 escapes rather than strips, and a
  literal NUL in a label is a recorded known limit that is **not** to be fixed. A
  new format meeting those same characters is worth a deliberate pass.

**4. Criterion 11.1 has to be measured, not asserted.** "The download finishes
within a few seconds for a design the size of the owner's use cases" is the only
criterion in this task that cannot be satisfied by reading the code. Sam flagged
it and he is right.

- **There is no fixture at the owner's scale.** The largest valid design in
  `e2e/fixtures/` is `order-intake.json` at 7 nodes and 6 edges;
  `many-problems.json` has 15 nodes but is a failure fixture and never draws.
  The owner's use cases are hand-drawn system diagrams — the PRD says "at least
  three use cases" and `order-intake.json` is the shipped example of that shape.
  Time that, and time a deliberately larger one too — a few dozen nodes — so the
  recorded number shows headroom rather than only the easy case.
- **Record the actual numbers in your section of this document**, machine and
  browser included. A criterion nobody can re-run is a criterion that rots; D27
  is the precedent for turning one into something a test holds.
- **Be careful what you assert in CI.** A hard wall-clock assertion on a shared
  runner is how a suite becomes flaky, and a flaky test is worse than none.
  Choose a threshold with real margin over what you measure, or hold the
  criterion with a measurement recorded here and a looser guard in the walk —
  either is defensible, but say which you chose and why.

**5. The empty design, and consistency with the other two formats.** A design
with no nodes is valid (D19). D51 gave the `.md` a sentence — "This design has
no nodes, so there is nothing to draw." — instead of an empty diagram, and D60
carried the same sentence into the `.html` for the same reason, with both tables
still printing their headings. Decide the PDF's equivalent and keep the three
formats saying the same thing. An empty page in a document someone was sent
reads as a file that failed.

**6. `src/lib/download.ts` should not need a single line changed, and this is
its third caller.** `downloadBlob(blob, fileName, doc)` takes a `Blob` precisely
so PDF bytes fit — its own header comment says so — and `fileNameFor(title,
'pdf')` already yields the name from the same rule that yields `.md` and `.html`
(D52). It survived Tasks 05 and 06 unchanged. If you find it genuinely needs
changing, **stop and report that as a finding** rather than editing it quietly:
a helper that turns out wrong at the caller it was designed for is worth
everyone knowing about.

**7. A stale comment in `src/lib/exportStyles.ts`, bounded.** Lines 15-17 repeat
D57's claim that both `?raw` and `?inline` come back empty under this project's
Vitest. **D61 corrects that**: `?inline` does come back empty, but `?raw` comes
back as the CSS-Modules proxy stub — `typeof` reads `object`, `String()` throws
`Cannot convert a Symbol value to a string`, and `.length` reads back an
invented class name. D57's reasoning survives and is stronger for it; only the
recorded fact was wrong. Sam found it and correctly left it alone, because
source is not his remit. So: **if the route you pick makes you read or change
`exportStyles.ts` anyway, correct the comment in the same PR** — it is
documentation of a fact D61 has already settled, not a behaviour change and not
a new decision. If the route never touches that file, leave it and say so in
your handback, and it carries forward to whoever does touch it next.

**8. Prior decisions that bind this task.** Read them before deciding anything
they cover, and do not reopen a settled one:

- **D1** — everything runs in the browser. No backend, no service, no server.
- **D7 / D8** — open-source libraries only, no paid services. This binds the
  library and any embedded font.
- **D48** — exporters take the layout, not the design. Covered in item 2.
- **D52** — the download helper's shape, and why it takes a `Document`.
- **D55** — `toHtml(layout, doc)` with a pure `htmlPage(layout, drawing)` beside
  it, and the Vitest/Playwright split that made it testable. The closest
  precedent you have.
- **D53** — the page holds the layout it drew, through `holdDrawing`, and every
  export button is present-and-disabled until there is something to export, and
  disabled again the instant a file fails. The third button joins that same
  loop. A button left enabled while an error panel shows is exactly the quiet
  wrongness D53 exists to prevent.
- **D59** — the export row is already a `role="group"` named "Export the
  design", decided once so that Tasks 07 and 08 add a button and nothing else
  structural. Add the button; do not restructure the row. The fuller revisit was
  flagged for when it holds four, which is Task 08.
- **D43** — nothing the app did not write reaches the screen unbounded, and a
  failure speaks in the app's words rather than a library's. If a PDF library
  throws, the user should hear `EXPORT_FAILED`, not the library.
- **D50 / D25** — node silhouettes key off the resolved `shape.kind`, never
  re-derived from the `type` string. Reusing the preview's SVG inherits this for
  free; do not add a second vocabulary.
- **D58** — `straightLine` is proven unreachable and kept as a guard. Settled.
- **D54** — `**Status:** done` means the acceptance criteria are verified in the
  build cycle, not that the branch has merged. Merging is Sam's separate gate.

**9. Commands.** `bun run test` runs Vitest. Plain `bun test` runs Bun's own
runner and is wrong; write `bun run test` every time, and correct it if you see
it written wrong anywhere. `bun run test:e2e` is Playwright, `bun run check` is
`astro check`.

### Two process fixes to apply by hand

These are known gaps in the agent configuration. The configuration is not being
edited — that proposal is still with the user — so reproduce them manually:

1. **Pushing the branch and opening the pull request is Jahmyr's step, not
   Amon's.** Amon: commit on `feature/export-pdf` and hand back. Do not push and
   do not open the PR.
2. **Sam's documentation refresh routes through its own `chore/…` branch and its
   own pull request**, not a direct commit to `main`.

### Carried items, for the record

Not this cycle's work, listed so nobody rediscovers them:

- **A valid design can make `layoutDesign` throw.** Dagre's `intersectRect`,
  from `assignNodeIntersects` inside `dagre.layout()`, when two box centres
  coincide. Needs both a two-cycle and a parallel duplicate of the same edge;
  two fuzzers hit it at 7/400 and 2/2000, and an exhaustive sweep of every 2-
  and 3-node multigraph with up to 4 edges found zero, so a small design cannot
  reach it. It fails safely, but the user hears dagre's words rather than the
  app's, which D43 otherwise prevents. Wants its own cycle and pairs with the
  loader chore.
- **The loader chore is gated: it runs before Task 10**, and becomes blocking
  rather than schedulable if still open when Task 10 is picked.
- **A literal NUL in a label is dropped when an exported file is reopened.**
  Recorded as a known limit and deliberately not to be fixed: U+0000 has no
  valid HTML representation and the only remedy is loader-side tidying, which
  D39 and D56 rule out.
- `e2e/fixtures/empty.json` is misnamed — it is the zero-byte syntax case, not
  an empty design. Its own small chore.
- Page styling outside the drawing is parked to Task 09.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.

## Work completed by Amon — round 1

### What was built

An **Export PDF** button joins Export Markdown and Export HTML in the same
`role="group"` (D59, no restructuring), disabled and enabled with them by the
same `holdDrawing` call (D53). Clicking it downloads `<design>.pdf`: the design's
title, the drawing exactly as the preview drew it, and the same tables of nodes
and edges the other two exports write, running onto as many pages as the design
needs.

The drawing goes in as **vector**, so its labels stay selectable, searchable and
sharp at any zoom. Its colours are not a second copy of anything: the drawing is
rendered fresh, put into the page off-screen inside a holder carrying the
preview's own class, asked what the browser resolved for it, and those answers
are frozen onto the elements before svg2pdf reads them. That was forced rather
than chosen — svg2pdf does not use `getComputedStyle`, it matches selectors
itself against `<style>` elements found inside the SVG, so the app's CSS Module
never reaches it and `fill: var(--shape-fill)` would reach it unresolved.

The file **carries its own font**, Roboto Regular under the SIL Open Font
License 1.1. That is the item flagged as this task's 5.2 trap and it was real:
with jsPDF's built-in Latin-1 faces the project's own Greek fixture label comes
out of the file as `±Á±³³µ»¯µÂ`. The font, jsPDF and svg2pdf are all imported
dynamically, so a visitor who never exports a PDF downloads none of them.

`src/lib/download.ts` needed no change, as expected: `downloadBlob` takes a
`Blob` and `fileNameFor(title, 'pdf')` already yields the name. Nothing in it
was touched.

**A defect found and fixed mid-build, because it is the kind that hides.** The
first working build produced a PDF whose *tables* held `Παραγγελίες — naïve
café` correctly while the *drawing* above them held `± Á ± ³ ³ µ » ¯ µ Â`.
svg2pdf turns any font weight that is not 400 or 700 into a style name of its
own, so the drawing's `font-weight: 550` labels were asked for as `550normal`;
jsPDF answers a style it has never been given by silently falling back to
Times-Roman, which is Latin-1 again. Reading the text back out did not catch it
on its own, because the tables were right. What catches it now is a second
oracle: `pdfFonts` reads the `Tf` operators out of the file and the walk asserts
that the only face any text is drawn with is the one the app embeds. The fix is
to normalise weight and style along with the family when the drawing's styles
are frozen, which removes the class of failure rather than that one spelling of
it.

### Files added or changed

- `src/lib/pdfPlan.ts` — new. The pure half: every page and every piece of ink
  on it, from the layout and a measuring function. No DOM, no library.
- `src/lib/pdfPlan.test.ts` — new, written first. 18 Vitest tests.
- `src/lib/toPdf.ts` — new. `toPdf(layout, doc): Promise<Blob>`: opens jsPDF,
  registers the font, renders and resolves the drawing, and puts ink where the
  plan says.
- `src/lib/fonts/robotoRegular.ts` — new, **generated**. Roboto Regular as
  base64, with its provenance and sha256 in the header.
- `src/lib/fonts/Roboto-LICENSE.txt` — new. The OFL 1.1 text, copied verbatim
  from the source package.
- `src/pages/index.astro` — the third button, its listener, its element, and one
  line in `holdDrawing`. `exportDesign` is now `async` and takes a builder that
  returns a `Blob`, because the PDF cannot be built in one tick; it takes the
  held design into a local first, so a file chosen mid-export cannot leave the
  last design's picture under this design's name.
- `e2e/exportPdf.spec.ts` — new. The PDF walk, 14 tests.
- `e2e/pdfText.ts` — new. Reads the text, and the faces used, back out of a PDF.
- `e2e/pages/uploadPage.ts` — `exportPdf` locator and `downloadPdf(saveAs?)`.
  `exportUsing` now returns a name and a path; the two text formats add the text
  through a small `withText` wrapper, so nothing about them changed.
- `e2e/export.spec.ts` — two edits only: the group's button count is now 3, and
  the doc comment says where the PDF walk went.
- `e2e/fixtures/platform-overview.json` — new. 15 nodes, 16 edges: a design at
  the owner's scale, since none existed.
- `e2e/fixtures/estate-sweep.json` — new. 40 nodes, 46 edges: deliberately
  larger, for headroom.
- `package.json` / `bun.lock` — `jspdf` 4.2.1 and `svg2pdf.js` 2.8.1.
- `.prettierignore` — `src/lib/fonts/`, which is generated base64 on one line.
- `README.md` — the Export PDF paragraph, the "still to come" line, the layout
  list, and a licence note naming the embedded font. Commands are unchanged and
  still match `CLAUDE.md`.
- `docs/DECISIONS.md` — D62 to D68 appended.

### Tests written

**Vitest, `src/lib/pdfPlan.test.ts` (18):** the title heads the first page; the
drawing keeps the preview's proportions; a small drawing is never blown up; a
drawing wider than the page is shrunk inside the margins; every node is listed in
file order with id, label and type; every edge likewise with both ends and its
label; each table is headed; a design with no nodes gets the sentence and no
drawing, with both tables still printing their headings; **the sentence is
byte-for-byte the one `toMarkdown` writes**, so a third copy cannot drift; a
small design is one page; a long one turns the page and repeats the column
headings on every page after the first; every one of 80 nodes is on some page; a
label too wide for its column wraps and every word survives; an unbroken
300-character word is broken across lines and joins back to itself exactly; a
label's own line break is drawn as one; a label's leading and trailing spaces
survive (D39); nothing is placed outside the margins; no page is left empty.

**Playwright, `e2e/exportPdf.spec.ts` (14):** the button is present and disabled
before there is anything to export and enabled after; the file is
`Order-intake.pdf` and begins `%PDF-`; every piece of text the preview draws is
in the file, read back out of the bytes; both tables carry a row per node and per
edge, checked by the ids, which only the tables hold; a Greek label, a
guillemetted Greek edge label and a quoted ampersand all survive, and the Greek
node label appears **twice** — once in the drawing and once in the table, which
is the assertion the `550normal` defect would fail; every face used anywhere in
the file is the embedded one; the drawing is text and lines rather than an image;
an empty design is one page with the sentence; a 40-node design runs to more than
one page with nothing falling off the end; the export is of the design now on
screen and not the one before it; the button goes back to disabled when the next
file fails; the group holds three buttons and Tab moves from Export HTML to
Export PDF, which downloads on Enter; and the two timed tests below.

### Local results

`bun run test`: **pass, 283 tests in 18 files** (265 before this task).
`bun run test:e2e`: **pass, 67 tests** (53 before this task).
`bun run check`: pass, 0 errors.
`bun run build`: pass.

**Criterion 11.1, measured.** Machine: Windows 11 Pro, bun 1.4.2, Node 24.15,
Chromium via Playwright 1.63, `dist/` served from localhost by
`e2e/staticServer.ts`. The clock runs from the click to the browser having the
file. Five clicks per fixture; the first pays for fetching the library and the
font, the rest are warm.

| Fixture | Nodes / edges | First click | Warm | File |
|---|---|---|---|---|
| `empty-design.json` | 0 / 0 | 68 ms | 42-48 ms | 24 KB |
| `markup-labels.json` | 4 / 3 | 97 ms | 44-54 ms | 38 KB |
| `order-intake.json` | 7 / 6 | 105 ms | 41-61 ms | 41 KB |
| `platform-overview.json` | 15 / 16 | **134 ms** | 61-81 ms | 65 KB |
| `estate-sweep.json` | 40 / 46 | **181 ms** | 103-119 ms | 133 KB |

Only the very first click of the session pays the full chunk download; after
that the browser has them cached, so the "first click" column for the later
fixtures is a warm-cache first click. Over a real network the dominant cost of
the first export is the ~850 KB of lazily-loaded JavaScript, not the work.

**What the walk asserts is not that number.** Both timed tests guard at 15
seconds, which is roughly a hundred times the measured figure. That is the
deliberate choice of the two Jared offered: the criterion is held by the
measurement recorded here, and the test carries a loose guard that still catches
an export that has stopped finishing at all, rather than a tight one that would
go red on a busy CI runner. Re-running the table is one command against the
fixtures above if anyone wants to check it.

**`.env.example` confirmed rather than assumed**, two ways: the file itself
still holds no variables, and a grep of the whole repository for `process.env`
and `import.meta.env` returns hits only in `playwright.config.ts`, all of them
`process.env.CI`, which is a flag the CI runner sets rather than a variable this
app reads. Nothing in this task reads the environment, so nothing was added.

### Decisions recorded

Seven rows appended to `docs/DECISIONS.md`:

- **D62** — the route: vector, `svg2pdf.js` on `jspdf`, with its trade-off
  written out, the registry facts verified at the moment of adding as D24 did,
  and why `pdf-lib` and printing the Task 06 page were both declined.
- **D63** — the signature, `toPdf(layout, doc): Promise<Blob>` with the pure
  `pdfPlan(layout, measure)` beside it, and where each half is tested.
- **D64** — the drawing's styles are resolved by the browser and frozen onto the
  element, so the PDF needs no second copy of the palette.
- **D65** — the embedded font: which one, its licence, its bundle cost, what it
  does not cover, and why the weight is normalised.
- **D66** — the page: Letter, margins, the drawing scaled to one page, repeated
  column headings, the empty-design sentence, uncompressed output.
- **D67** — criterion 11.1 held by a recorded measurement and a loose guard, and
  why that rather than a tight assertion.
- **D68** — the hand-written PDF reader, why it is not a package, that it was
  checked against `pdftotext`, and why the PDF walk has its own spec file.

### Known gaps

1. **A label in a script Roboto does not cover is left out of the PDF.** CJK,
   Arabic, Hebrew and Indic scripts have no glyph in any face of this size; the
   character is simply not drawn. The other three exports still show it. This is
   the honest residue of criterion 2 and it is recorded in D65 and in the font
   module's header rather than papered over. There is no fixture for it, because
   adding one would mean adding a test that asserts a label is missing.
2. **A large drawing prints small.** The drawing is scaled to fit one page, so
   `estate-sweep.json` at 40 nodes comes out with labels around 1.5 pt. It is
   vector, so it is sharp at any zoom on screen, and both tables carry every
   label at full size — but on paper, that drawing is not readable without a
   magnifier. Tiling a drawing across pages, or turning the page landscape when
   that helps, is the fix and neither is in this task. Worth a judgement from
   Jahmyr on whether criterion 2 is satisfied by "readable in the tables and at
   zoom".
3. **The first PDF export downloads about 850 KB of JavaScript** — jsPDF 400 KB,
   the font 212 KB, svg2pdf 86 KB, and 151 KB of jsPDF's own dependencies. It is
   all behind a dynamic `import()`, so the page's own script is unchanged at
   155 KB and only a visitor who exports a PDF pays for it. jsPDF's optional
   `html2canvas` and `dompurify` are split into chunks of their own that nothing
   ever fetches.
4. **Nothing stops a second click while a PDF is still being written.** Two
   clicks produce two identical downloads. A busy state on the buttons is new
   behaviour rather than a fix, and it belongs with the D41 question about
   announcing a finished download, which is parked for all four exporters.
5. **`src/lib/exportStyles.ts` still carries D57's stale comment about `?raw`.**
   The bounded instruction was to fix it only if the route made me read or change
   that file. It did not — D64 is the reason: the PDF takes its colours from the
   browser rather than from a written-out stylesheet, so `exportStyles.ts` was
   never opened. It carries forward to whoever touches it next.
6. **The TDD checkpoint commits could not be made the way `tdd-workflow`
   describes.** The pre-commit hook runs `astro check` across the whole
   repository, so a commit holding a test for a module that does not exist yet is
   rejected. RED was validated by running `bun run test` and watching
   `pdfPlan.test.ts` fail on the missing module before a line of it was written;
   the first commit holds the test and the implementation together.

### Out-of-scope notes for Jared

- **Task 08's route does not follow from this one.** jsPDF and svg2pdf are no
  help for a `.docx`, so the library gate has to be opened again. What does carry
  over is the shape: a pure module that decides the document and a thin one that
  writes it, `downloadBlob` taking the bytes unchanged for a fourth time, and
  `e2e/exportPdf.spec.ts` as the pattern for a fourth spec file rather than
  growing `export.spec.ts` past its ceiling again. D59 also flagged the fuller
  revisit of the export row for when it holds four buttons, which is Task 08.
- **`e2e/export.spec.ts` is at 511 lines and `docs/DECISIONS.md` is now 68 rows
  and about 55 KB.** Neither is a problem yet; the decisions file is the one to
  watch, because every agent in the pipeline reads it and it has doubled since
  Task 04.
- **The font module is 212 KB of base64 in the repository.** It is generated and
  `.prettierignore`d, and its header records the source package, version, file
  and sha256 so it can be regenerated. If the project ever wants it smaller, the
  answer is subsetting the font at build time, which needs a tool this stack does
  not have and would be its own chore.
- **`pdfPlan.ts` is 518 lines**, 295 of them code. That is inside `CLAUDE.md`'s
  800 ceiling and the largest module in `src/lib/`. It has an obvious seam if it
  ever needs one — the page-filling `Sheet` and the text wrapping are independent
  of the document's structure — but splitting it now would be a refactor without
  a reason.
- Nothing was opened in `describeLoadError.ts`, `loadDesign.ts`, `layout.ts` or
  `empty.json`, and the `intersectRect` crash was not touched. All still carried.

## Test report from Jahmyr — round 1

### Verdict

**Changes requested.** Five of the six criteria hold and this is solid work — the
route, the measurement, the font embedding and the two-oracle walk are all right.
Criterion 2 does not hold, and the reason is bigger than the known gap says: **the
PDF silently drops any character the embedded face does not carry, and that
includes the arrows `→`, `←`, `↔`, `⇒` and the marks `✓`, `✗`, `∈`** — not only
the CJK, Arabic, Hebrew and Indic scripts D65 enumerates. An arrow in a label is
an everyday thing in an architecture diagram, so this reaches ordinary
English-language designs and not only non-Latin ones.

The open question about the 40-node drawing I answer below, and the answer is
**yes, criterion 2 is satisfiable by "readable in the tables and at any zoom"** —
that half is not why the box is unchecked.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can export the design as PDF: demonstrated end to end | **pass** | Drove `dist/` in Chromium by hand, outside the suite, and exported nine designs — the five fixtures plus four adversarial ones I wrote. Every one produced a file beginning `%PDF-` that opens and whose text `pdftotext` (xpdf 4.06) reads back. No console errors and no page errors on any of them |
| The PDF shows the same nodes and edges as the preview, with every label readable (5.2) | **fail** | Defect 1 below. `A → B` exports as `A  B`; `API gateway (東京)` exports as `API gateway ()`. The preview, the `.md` and the `.html` all carry the originals; I checked all three |
| The download finishes within a few seconds for a design the size of the owner's use cases (11.1) | **pass** | Re-measured independently, click to file-in-hand: `order-intake` 222 ms, `platform-overview` (15/16) **139 ms**, `estate-sweep` (40/46) **192 ms**, and a 200-node/259-edge design I built **479 ms**. Amon's table reproduces. The loose 15 s guard is the right call and I agree with the reasoning |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download | **fail** | 283 Vitest and 67 Playwright all pass and the walk does check the download. But the behaviour in defect 1 is one a user observes and nothing covers it — which is precisely why nobody saw it. Contingent on defect 1; recheck the two together |
| Every earlier test still passes; CI is green | **pending CI** | Locally nothing regressed: `export.spec.ts`'s Markdown and HTML blocks, `drawing.spec.ts` and `validation.spec.ts` are all green. The CI result is on the pull request |
| Any new environment variable is in `.env.example` with a placeholder | **pass** | Grepped `process.env`, `import.meta.env`, `Deno.env` and `getenv` across the tree: the only hits outside `docs/` are `process.env.CI` in `playwright.config.ts`, which the runner sets. `.env.example` correctly still lists none. `gitleaks detect --source . --no-banner`: 20 commits, 1.31 MB, **no leaks found** |

### Command results

`bun run test`: **283 passed, 18 files**, 697 ms.
`bun run test:e2e`: **67 passed**, 8.5 s.
`bun run check`: **0 errors, 0 warnings, 0 hints** across 53 files.
`bun run build`: **pass**, 1 page in 660 ms.
Secret scan: `gitleaks` — **no leaks found**.

### Defects for Amon

**1. `src/lib/toPdf.ts:resolveStyles`, with `src/lib/fonts/robotoRegular.ts` —
every character outside the embedded face is dropped silently, and the scope is
wider than D65 records.**

Expected, from intake 5.2: *"nothing dropped or mislabeled"*, and *"Every export
format must show the same content as the browser preview."* Actual: a character
Roboto Regular does not carry is removed from the PDF with no signal — not drawn
in the picture **and not written in the tables either**, so no copy of it
survives anywhere in the file. The cause is that `toPdf` points every piece of
text at the single embedded face — `resolveStyles` sets `font-family: Roboto` on
every element of the drawing, and the tables are written with it too — and jsPDF
emits nothing for a code point that face has no glyph for.

D65 names this as CJK, Arabic, Hebrew and Indic. That understates it. Measured,
by exporting a fixture of common symbols and reading the file back with
`pdftotext`:

| In the label (the preview shows it) | In the PDF |
|---|---|
| `A -> B: → arrow` | `A -> B:  arrow` |
| `check ✓ cross ✗` | `check  cross` |
| `double arrow ⇒ element ∈` | `double arrow  element` |
| `left ← updown ↔` | `left  updown` |
| `at least ≥ 99.9%`, and `± § ° € £ ¥ ™ © … • ½ † ‰` | all correct |

An arrow is not an exotic script. This is a tool for drawing systems, and
`Gateway → Queue` is a label its users will write.

Worse than plain absence is the mixed case, because the result is well-formed
and wrong rather than visibly broken:

| In the label | In the PDF |
|---|---|
| `API gateway (東京)` | `API gateway ()` |
| `Cache (القاهرة)` | `Cache ()` |
| `replicates 東京→القاهرة` | `replicates` |
| `Billing — תל אביב` | `Billing —` |

`API gateway ()` reads as a complete label. A reader has no way to know a region
name was there, and the person who exported it has no way to know either,
because the export reports success. That is intake 5.2's "mislabeled", and it is
the quiet wrongness the PRD rules out rather than an honest limit.

The fix is **not** "embed a CJK font" — that is megabytes and I am not asking for
it. It is that the loss must stop being silent. Three shapes, and the choice is
yours:

- draw a visible placeholder such as `□` for a code point the face lacks, so the
  loss is in the document where a reader can see it;
- tell the user after the export — the page already has `#upload-status` with
  `role="status"` and already speaks there in the app's own words (D43) — with a
  sentence naming how many labels lost characters and pointing at the Markdown
  or HTML export, which do carry them;
- or, if you judge neither is affordable inside this task, say so and hand the
  scope question up, rather than leaving it as a `Known gaps` entry.

Whichever you take, it needs a test. The note that *"adding one would mean adding
a test that asserts a label is missing"* is the reason nothing covers this today
— but the test to write is not "assert the label is missing". It is "assert the
user is told", or "assert the placeholder is drawn". There is no fixture for an
uncovered character; the one I used is described above and is trivial to
rebuild. D65's enumerated list wants correcting in the same pass, since arrows
and check marks are not on it and they are the common case.

**2. Minor — `src/lib/toPdf.ts`: the produced PDF carries no `/Title` and no
`/Lang`.** `Producer` is `jsPDF 4.2.1` and the Info dictionary holds nothing
else. The design's title is drawn as ink on page 1 but is not metadata, so a
viewer shows the file name in its window bar and a screen reader has no document
title or language to announce. `pdf.setProperties({ title: layout.title })` and
`pdf.setLanguage('en')` are one line each. Not a criterion failure and not a
blocker — but Task 08's `.docx` will want the same, so the habit is worth
settling here.

### The judgement call Amon asked for

**Is criterion 2 met by "readable in the tables and at any zoom"? Yes — that half
of it.** Every label is in the file at full size in the tables, the drawing is
vector so it stays sharp at any magnification, and nothing is dropped or
mislabeled *by the scaling*. A PDF attached to a ticket is read on a screen. The
criterion's words are "every label readable", not "readable at 100% on paper",
and a label you can zoom to is readable.

**But the measurement is worse than the gap says, and the number belongs on the
record.** I pulled the text matrices out of page 1 of each file. The drawing is
scaled to one page, so its 12 pt labels land at:

| Fixture | Nodes | Drawing label, on the page |
|---|---|---|
| `markup-labels.json` | 4 | 11.8 pt |
| `order-intake.json` | 7 | 10.2 pt |
| `platform-overview.json` | 15 | **4.0 pt** |
| `estate-sweep.json` | 40 | **1.2 pt** |
| a 200-node design (mine) | 200 | 0.24 pt |

The gap is written as "a 40-node drawing prints small". It starts at **15
nodes** — `platform-overview.json`, the fixture created for this task and
labelled *a design at the owner's scale*. 4 pt is below the smallest type anyone
sets in print. So the printed drawing stops being useful at the owner's own
scale, not three times past it.

That is a scheduling matter rather than a defect in this task: landscape pages,
or a readable floor on the label size with the drawing tiled across sheets, is
the fix, and neither is in scope here. **Jared and Sam should see this table**,
because "a few dozen nodes" was the headroom this task was asked to show and the
honest answer is that the picture degrades a good deal earlier than that. The
tables carry every label whatever the drawing is scaled to, which is what keeps
the criterion satisfiable at all.

### Adversarial pass, beyond the checklist

All clean unless noted.

- A zero-byte file, a real `.png`, a `.png` renamed `.json`, trailing-comma JSON,
  valid JSON that is not a design, and JSON missing `nodes` entirely: each leaves
  Export PDF **disabled** and shows the validation panel. There is no way to
  reach the exporter from a failed load.
- A design with no nodes: one page, D51's sentence, both table headings, the
  right file name. Matches what the Markdown and HTML exports say.
- 200 nodes and 259 edges: 14 pages, 730 KB, 479 ms, nothing lost off the end.
- Duplicate identical edges, a 400-character unbroken word, a 300-character edge
  label, a label carrying a newline and a tab, leading and trailing spaces, and a
  title full of markup: all export, all wrap, and the file name is sanitised. No
  throw.
- Labels that are markup: shown as the text they say, in the drawing and in both
  tables. D56 holds in this format too.
- Greek and Cyrillic: correct in the drawing **and** in the table. The
  `550normal` defect is genuinely fixed — confirmed independently by reading the
  faces out with `pdftotext` rather than with `pdfText.ts`.
- Double-clicking Export PDF on a 200-node design does produce two identical
  downloads, as known gap 4 says. Parked with D41; agreed.

### Second oracle

`e2e/pdfText.ts` is hand-written, so I did not take its word for anything. Every
content claim above was re-read out of the files with `pdftotext` (xpdf 4.06),
and the font claim was re-derived by parsing the `Tf` operators and text matrices
myself. The two agree everywhere I checked, which also means `pdfText.ts` can be
trusted going into Task 08.

### Accessibility, best effort

The new button carries its own visible name, is `type="button"`, sits in the
existing `role="group"` named "Export the design" with no restructuring (D59),
and is reachable and operable from the keyboard — Tab from Export HTML lands on
it and Enter downloads, which the walk asserts. The off-screen holder `toPdf`
puts in the page is `aria-hidden`, `pointer-events: none`, holds nothing
focusable, and is removed in a `finally`. No new issue at any severity. The
missing `/Lang` on the produced file is defect 2 above.

### Fixed in place

Two wrong file references in doc comments, both introduced by this task.
`src/lib/toPdf.ts:16` and `src/lib/pdfPlan.test.ts:15` each said the DOM half is
asserted in `e2e/export.spec.ts`, but the PDF walk went to
`e2e/exportPdf.spec.ts` — which D63 and D68 both record correctly. Nothing else
touched; the pre-existing references in `download.test.ts` and `toHtml.test.ts`
are right for their formats and were left alone.

### Checkboxes

Checked 1, 3 and 6 in `docs/tasks/07-export-pdf.md`. Left 2 and 4 unchecked for
defect 1, and 5 unchecked until CI reports on the pull request. `**Status:**`
stays `in progress`.
