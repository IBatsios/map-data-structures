# Handoff — Task 07: Export as PDF

**Date:** 2026-09-18
**Branch:** feature/export-pdf
**Task file:** docs/tasks/07-export-pdf.md
**Round:** 3

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
| Every earlier test still passes; CI is green | **pass** | Nothing regressed locally, and CI is green on [PR #15](https://github.com/IBatsios/map-data-structures/pull/15): typecheck 0 errors, 283 Vitest, 67 Playwright in 18.5 s on the shared runner. The whole e2e run finishing in 18.5 s is itself a point for the loose guard — a 15 s per-export assertion has room it will not need |
| Any new environment variable is in `.env.example` with a placeholder | **pass** | Grepped `process.env`, `import.meta.env`, `Deno.env` and `getenv` across the tree: the only hits outside `docs/` are `process.env.CI` in `playwright.config.ts`, which the runner sets. `.env.example` correctly still lists none. `gitleaks detect --source . --no-banner`: 20 commits, 1.31 MB, **no leaks found** |

### Command results

`bun run test`: **283 passed, 18 files**, 697 ms.
`bun run test:e2e`: **67 passed**, 8.5 s.
`bun run check`: **0 errors, 0 warnings, 0 hints** across 53 files.
`bun run build`: **pass**, 1 page in 660 ms.
Secret scan: `gitleaks` — **no leaks found**.
CI: **green** on PR #15 — typecheck, 283 Vitest and 67 Playwright, 18.5 s e2e.

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

Checked 1, 3, 5 and 6 in `docs/tasks/07-export-pdf.md`. Left 2 and 4 unchecked
for defect 1. `**Status:**` stays `in progress`, which is Amon's to change only
once defect 1 is settled and I have re-verified it.

## Work completed by Amon — round 2

### What was built

**Defect 1 is closed by taking both of the shapes offered, because they reach
two different people.** A character the embedded face has no glyph for is now
replaced with one visible mark, `■`, everywhere the PDF writes text — in the
drawing and in both tables — so the loss travels with the file and whoever opens
it can see that something was there. And the page then says so in
`#upload-status`, in the app's own words, naming how many characters and
pointing at the Markdown and HTML exports, which carry them. The mark tells the
reader of the document; the sentence tells the person who exported it, and
tells them what to do about it.

`Gateway → Queue` now exports as `Gateway ■ Queue` rather than as
`Gateway  Queue`. `API gateway (東京)` exports as `API gateway (■■)` rather than
as `API gateway ()`. Nothing in the file is a label emptied of the thing it
named.

**The suggested `□` could not be used, and finding out why was the first thing
this round did.** The embedded face has no glyph for U+25A1 either, so a hollow
square would have been dropped in its turn and the file would have been back to
saying nothing — the placeholder would have been the defect. U+25A0, the filled
square, *is* in the face. A unit test asserts that whatever the mark is set to
is a character the face can draw, so this cannot regress quietly if the font is
ever regenerated.

**How the export knows.** `src/lib/fontCoverage.ts` reads the answer out of the
font's own `cmap` at export time, by jsPDF's rule rather than OpenType's, which
was read out of jsPDF's source: the first platform 3 encoding 1 format 4
subtable or the first platform 0 format 4 one and no other format, glyph 0
counted as nothing drawn, and nothing above the basic plane, because jsPDF looks
a character up one UTF-16 code unit at a time. A written-down list of covered
ranges was rejected: it is a second copy of the font and drifts the moment the
font is regenerated. The reader agrees with your measurements exactly — it says
the face covers `≥ ± § ° € £ ¥ ™ © … • ½ † ‰` and does not cover
`→ ← ↔ ⇒ ✓ ✗ ∈`, which is the table from your report, derived independently.

**Defect 2 is closed too.** The file carries `/Title` and `/Lang (en)`. The
title is taken from the layout *before* the marking, because metadata is written
into a dictionary rather than drawn with a font — jsPDF writes a non-ASCII title
as UTF-16 with a byte-order mark — so the Info dictionary carries characters the
pages themselves have to mark. The new fixture is titled `Regions → 東京` and the
walk asserts the metadata holds exactly that while page 1 holds `Regions ■ ■`.

**D65's enumerated list is corrected by D69**, which is appended rather than
edited, since the table is append-only.

### Files added or changed

- `src/lib/fontCoverage.ts` — new. Reads which code points the embedded face can
  draw, out of the font's `cmap`, by jsPDF's rule. Pure; throws rather than
  reporting an empty coverage.
- `src/lib/fontCoverage.test.ts` — new, written first. 11 Vitest tests.
- `src/lib/drawableText.ts` — new. `markUndrawable`, `drawableLayout` and
  `describeUndrawable`: the mark, the marked layout with its count, and the
  sentence the page says. Pure.
- `src/lib/drawableText.test.ts` — new, written first. 20 Vitest tests.
- `src/lib/toPdf.ts` — marks the layout before it measures or draws anything,
  returns `PdfExport { blob, undrawable }` rather than a bare `Blob`, and sets
  the document's title and language. Its header says why.
- `src/lib/fonts/robotoRegular.ts` — the "what it does not cover" paragraph was
  wrong in the same way D65 was; corrected, and it now points at D69 and D70
  rather than restating what the face covers.
- `src/pages/index.astro` — `exportDesign` takes a builder that returns
  `{ blob, note }`; the two text formats hand back `null` and the page stays
  quiet, and the PDF hands back `describeUndrawable(...)`, which the status
  region says after the file is in the user's hands.
- `e2e/pdfText.ts` — `pdfTitle` and `pdfLanguage`, which read the two literal
  strings the file carries as metadata, including the UTF-16 form jsPDF uses for
  a non-ASCII title.
- `e2e/exportPdf.spec.ts` — six new tests.
- `e2e/fixtures/undrawable-labels.json` — new. The fixture you described,
  rebuilt: arrows, check marks, set notation, a mixed Japanese label, a mixed
  Arabic label, and a label of signs the face *does* carry.
- `docs/DECISIONS.md` — D69, D70 and D71 appended.
- `README.md` — the PDF paragraph said the uncovered label "is the one thing the
  PDF cannot show". It now says what the mark is and why.
- `docs/handoff-items/handoff-task-07-export-pdf.md` — this section.

Not touched: `src/lib/download.ts`, `src/lib/pdfPlan.ts`, `src/lib/layout.ts`,
`src/lib/exportStyles.ts`, the loader modules, `docs/tasks/07-export-pdf.md`.

### Tests written

**Vitest, `src/lib/fontCoverage.test.ts` (11).** Against the real embedded face:
it covers Latin, Greek and Cyrillic; it covers the punctuation and signs a
design is written with; it does *not* cover `→ ← ↔ ⇒ ✓ ✗ ∈`, which is the
round-one defect stated as a fact about the font; it does not cover CJK, Arabic,
Hebrew or Devanagari; and it covers nothing above the basic plane, which is
jsPDF's own limit. Against fonts built byte by byte in the test, which is the
only way to reach these: a code point mapped to a glyph is covered; one mapped
to glyph 0 in the middle of a mapped range is not; the Unicode subtable is read
and a Mac Roman one beside it is ignored; a font with no Unicode subtable is
refused rather than reported as covering nothing; bytes that are not a font are
refused; a string that is not base64 is refused.

**Vitest, `src/lib/drawableText.test.ts` (20).** Text the font covers is
untouched and counts nothing; a character it lacks becomes one mark and is
counted; each character is marked on its own so nothing else in the label moves;
a label of nothing but uncovered characters becomes marks rather than emptying;
a character from beyond the basic plane becomes one mark, not two; a tab and a
line break are left alone, because neither is a glyph and `pdfPlan` breaks lines
on them; an empty string is empty. Over a whole layout: the title, every node's
id, label, lines and type, and every edge's ends and label are marked; the lines
a label is drawn on still spell the label, so the picture and the table cannot
disagree; the count is per piece of the design's text rather than per line; the
layout handed in is left untouched; the geometry is the preview's own; a design
the font covers entirely comes back unchanged; an empty design is unchanged. The
sentence: nothing at all when nothing was lost (D41 stays parked), the singular
at one, the plural above one, and it names the mark and both other formats.
Finally the guard: the mark is a character the real embedded face can draw.

**Playwright, `e2e/exportPdf.spec.ts` (6 new, 20 in the file).** A visible mark
is written where the font has no glyph, and no label anywhere in the file is
`API gateway ()`, `Cache ()` or `Gateway  Queue`; the mark appears **twice** for
a node label, once in the drawing and once in the table, which is the assertion
a fix that marked only the tables would fail; the signs the face does carry are
still themselves; the status region says how many characters could not be drawn
and names Markdown and HTML; a design the font covers entirely leaves the status
line describing the upload and says nothing about the font; and the file carries
`Regions → 東京` as its title and `en` as its language, read back out of the
bytes.

The walk writes the mark out as a literal rather than importing the constant
from `src/`, the same way the empty design's sentence is written out there, so
it stays a second opinion rather than an echo.

### Local results

`bun run test`: **pass, 314 tests in 20 files** (283 at the end of round 1).
`bun run test:e2e`: **pass, 73 tests** (67 at the end of round 1).
`bun run check`: pass, 0 errors, 0 warnings, 0 hints across 57 files.
`bun run build`: pass, 1 page.

**Criterion 11.1, re-measured**, because every export now decodes the font and
walks the design's text. Same machine and method as round one: Windows 11 Pro,
bun 1.4.2, Chromium via Playwright, `dist/` served from localhost, clock from
the click to the browser having the file, four clicks per fixture.

| Fixture | Nodes / edges | Clicks, in order | File |
|---|---|---|---|
| `empty-design.json` | 0 / 0 | 208 / 85 / 99 / 100 ms | 24 KB |
| `markup-labels.json` | 4 / 3 | 133 / 100 / 97 / 103 ms | 39 KB |
| `undrawable-labels.json` | 5 / 4 | 155 / 114 / 102 / 94 ms | 38 KB |
| `order-intake.json` | 7 / 6 | 126 / 102 / 92 / 99 ms | 41 KB |
| `platform-overview.json` | 15 / 16 | **137 / 111 / 118 / 117 ms** | 65 KB |
| `estate-sweep.json` | 40 / 46 | **181 / 153 / 146 / 157 ms** | 136 KB |

Reading the font's coverage is the new work, and it was measured on its own:
**0.24 to 0.9 ms** per export after the first call, against an export of 110 to
160 ms. That is why it is not cached — a module-level cache would be mutable
state bought for a fifth of a millisecond. The 15-second guard in the walk is
untouched and still has two orders of magnitude of room.

`.env.example` confirmed again rather than assumed: it still lists no variables,
and a grep for `process.env` and `import.meta.env` across `src/`, `e2e/` and the
root finds only `process.env.CI` in `playwright.config.ts`, which the runner
sets. Nothing this round reads the environment.

### Decisions recorded

Three rows appended to `docs/DECISIONS.md`:

- **D69** — the mark and the sentence, what each is for, why the filled square
  rather than the hollow one, and **the correction to D65's enumerated list**:
  the gap is not only CJK, Arabic, Hebrew and Indic, it is the arrows and marks
  too, which reaches ordinary English designs.
- **D70** — coverage is read out of the font's own `cmap` at export time by
  jsPDF's rule, never written down as a list; the measured cost; and why an
  unreadable font throws instead of reporting nothing.
- **D71** — `/Title` and `/Lang`, why the title is taken before the marking, and
  why the language is fixed at `en` rather than guessed from the design.

### Known gaps

1. **The preview still shows the real characters; only the PDF marks them.**
   That is deliberate — the browser has fonts the PDF cannot carry, and the
   marks exist because of the file's font rather than because of the design —
   but it does mean the picture on screen and the picture in the file differ by
   the marks. The sentence in the status region is what connects them.
2. **The count is of the design's text, not of the marks in the file.** A node
   label is written twice in the PDF, once in the drawing and once in the table,
   so a design that loses one character in one label shows two marks and the
   sentence says "1 character". Counting marks instead would be a number the
   user cannot reconcile with their own file, which is why it counts what they
   wrote rather than what was drawn.
3. **Two ids that differ only in characters the font cannot draw become the same
   text in the PDF.** Ids `東` and `京` both export as `■`, so the Nodes table
   would show two rows that read alike and the edge rows could not be told
   apart. The design itself is still valid and every other export distinguishes
   them. Marking them is still better than dropping them, which produced two
   *empty* cells before, but it is an honest limit of one mark for every
   uncovered character and it is not fixed here.
4. **Exporting the same lossy design twice says the sentence once.** The status
   region already holds that exact text after the first export, so the second
   sets an identical string, and a live region announces changes rather than
   content. The text is correct on screen either way. This is the same family as
   the parked D41 question about announcing a finished download, and it belongs
   with it rather than with this fix.
5. **Nothing stops a second click while a PDF is still being written** — carried
   unchanged from round one, still parked with D41.
6. **`src/lib/exportStyles.ts` still carries D57's stale comment about `?raw`.**
   The bounded instruction was to fix it only if the work took me into that
   file. It did not this round either: the marking happens to the layout before
   any style is resolved. It carries forward.

### Out-of-scope notes for Jared

- **The drawing's on-page label size degrades far earlier than "a 40-node
  drawing prints small" says, and this is the item to schedule.** Jahmyr pulled
  the text matrices out of page 1 and measured the drawing's 12 pt labels as
  they land on the page: `markup-labels` (4 nodes) 11.8 pt, `order-intake` (7)
  10.2 pt, **`platform-overview` (15) 4.0 pt**, `estate-sweep` (40) 1.2 pt, and
  a 200-node design 0.24 pt. It starts at **15 nodes** — the fixture created for
  this task and labelled *a design at the owner's scale* — and 4 pt is below the
  smallest type anyone sets in print. The tables carry every label at full size
  whatever the drawing is scaled to, which is what keeps criterion 2 satisfiable
  at all, and the drawing is vector so it stays sharp at any zoom on screen. The
  fix is landscape pages, or a readable floor on the label size with the drawing
  tiled across sheets, and neither is in this task. **This has not been touched
  in round two and wants its own cycle.**
- **Task 08 should take the metadata habit with it.** A `.docx` has a title and a
  language too, and the reason is the same one D71 gives. Whatever library opens
  that gate, it is worth asking the same question this round asked of jsPDF:
  what does it do with a character its font cannot draw, and does it say so.
- **`e2e/exportPdf.spec.ts` is now 472 lines** and `docs/DECISIONS.md` is 71 rows
  and about 58 KB. Neither is over a ceiling; the decisions file is still the one
  to watch, since every agent in the pipeline reads it.
- `src/lib/fontCoverage.ts` is a font parser living in an app that draws boxes.
  It is 218 lines, it is pure, and it exists because the alternative was a
  hand-kept list that drifts. If a fourth format ever needs the same answer, it
  is already the module to ask.
- Nothing was opened in `describeLoadError.ts`, `loadDesign.ts`, `layout.ts`,
  `pdfPlan.ts`, `download.ts` or `empty.json`, and the `intersectRect` crash was
  not touched. All still carried.

## Test report from Jahmyr — round 2

### Verdict

**Changes requested, on one defect, and it is a small one.** Both round-one
defects are genuinely closed, and I confirmed every claim Amon asked me to check,
each against an oracle that is not his: the mark travels with the file, the
sentence reaches the exporter, the coverage reader reproduces my round-one table
exactly, the hollow-square reasoning holds, the metadata is right, and 11.1
reproduces. Five of the six criteria pass.

Criterion 2 still does not hold, for a different trigger and a much narrower one.
**Every character `drawableText.ts` deliberately spares as "a control character"
truncates the rest of the line it is in**, silently, unmarked and uncounted — a
label written `Alpha\tBravo` in the design is written into the Nodes table as
`Alpha`. The premise the sparing rests on is stated in the code and is not true
of `pdfPlan`. It is one line to fix and a test to correct, and round three should
be short.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can export the design as PDF: demonstrated end to end | **pass** | Drove `dist/` in Chromium outside the suite and exported eighteen designs — six repo fixtures plus twelve I wrote. Every one produced a `%PDF-` file that opens and whose text `pdftotext` (xpdf 4.06) reads back. No console errors and no page errors on any of them |
| The PDF shows the same nodes and edges as the preview, with every label readable (5.2) | **fail** | Defect 1 below. The round-one trigger is fixed and I verified it hard; a tab, or any other spared control character, is a new trigger for the same silent loss. `Alpha\tBravo` arrives in the table as `Alpha`, an edge label of `edge\twith\ttabs` as `edge`, and the page says nothing at all |
| The download finishes within a few seconds for a design the size of the owner's use cases (11.1) | **pass** | Re-measured independently, click to file-in-hand, four clicks each: `platform-overview` (15/16) **135 / 111 / 117 / 113 ms**, `estate-sweep` (40/46) **182 / 168 / 163 / 149 ms**, `undrawable-labels` 123 / 99 / 93 / 103 ms, `order-intake` 129 / 99 / 96 / 105 ms, `empty-design` 182 / 85 / 101 / 110 ms, and my own 200-node/259-edge design 494 / 434 / 408 / 440 ms at 13 pages and 570 KB. Amon's table reproduces within noise. The font decode has not moved the number |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download | **pass** | 314 Vitest in 20 files and 73 Playwright, all passing, locally and on CI. I am checking this box this round where I did not last round, and the difference is real: last round the *whole* of the loss behaviour was untested, which is why nobody saw it; this round the mark, the count, the sentence, the clean-export silence and the metadata are each asserted from both oracles, with the walk writing the mark as a literal rather than importing it. The behaviour in defect 1 is untested, but it is one input class inside a covered behaviour rather than an uncovered behaviour |
| Every earlier test still passes; CI is green | **pass** | Nothing regressed. CI green on [PR #15](https://github.com/IBatsios/map-data-structures/pull/15) after pushing `2a08a21`: typecheck 0 errors, 314 Vitest in 20 files, 73 Playwright in 17.2 s, job 54 s |
| Any new environment variable is in `.env.example` with a placeholder | **pass** | Grepped `process.env`, `import.meta.env`, `Deno.env` and `getenv` across the tree again: the only hit outside `docs/` is `process.env.CI` in `playwright.config.ts`, which the runner sets. `.env.example` still lists none. `gitleaks detect --source . --no-banner`: 26 commits, 1.39 MB, **no leaks found** |

### Command results

`bun run test`: **314 passed, 20 files**, 802 ms.
`bun run test:e2e`: **73 passed**, 8.8 s.
`bun run check`: **0 errors, 0 warnings, 0 hints** across 57 files.
`bun run build`: **pass**, 1 page in 665 ms.
Secret scan: `gitleaks` — **no leaks found**.
CI: **green** on PR #15 — typecheck 0 errors, 314 Vitest, 73 Playwright in 17.2 s.

### What I confirmed, each against an oracle that is not Amon's

**The coverage reader reproduces my round-one table exactly, and
independently.** I did not read `fontCoverage.ts` for the answer. I built a
64-node design with one character per node label, exported it, and read the file
back with `pdftotext`. A character that arrives as itself is one jsPDF drew; one
that arrives as a mark is one the export replaced. Every character of my
round-one table lands on the side Amon claims:

| Claim | Characters | What the file says |
|---|---|---|
| covered | `≥ ± § ° € £ ¥ ™ © … • ½ † ‰` | all fourteen arrive as themselves |
| not covered | `→ ← ↔ ⇒ ✓ ✗ ∈` | all seven arrive as the mark |

Forty-three more characters I added to widen it: `— – “ ” ‘ ’ « » ≤ ≠ ∞ µ ¶ × ÷
¡ ¿ ª º ● ○ Ω π Σ ∆ √ ≈ ∑ ₹ ₽ ⁄ ‹ › ‡ ′ ″` all arrive as themselves, and
`★ ☆ ⚠ ⌘ ฿` arrive as the mark. The status sentence for that design said **13**
characters, which is exactly the number of marks I counted in the file. The
reader and the file agree.

**The hollow-square reasoning holds, and the test that guards it is the right
test.** In the same run, index 40 of my probe was U+25A0 and index 41 was U+25A1.
U+25A0 arrived as itself and was **not** counted, so the face draws it. U+25A1
arrived as a mark and **was** counted, so the face does not draw it, and a hollow
square would have been dropped in its turn exactly as Amon says. His reasoning is
correct, and it is now verified from the file rather than from the font reader.

**The mark travels with the file.** `e2e/fixtures/undrawable-labels.json`, read
back with `pdftotext`: the title is `Regions ■ ■■`; `Gateway ■ Queue`,
`API gateway (■■)`, `Cache (■■■■■■■)` and `check ■ cross ■` each appear
**twice**, once in the drawing and once in the Nodes table; `keeps ≥ ± € … •` is
untouched; the edge labels are `double arrow ■ element ■`, `replicates ■■`,
`left ■ updown ■` and `keeps ≥ and —`. There is no `API gateway ()`, no
`Cache ()`, and no label emptied of what it named.

**The sentence is right, and it is right about when to say nothing.** Counted by
hand from the fixture — 3 in the title, 1 + 2 + 7 + 2 + 0 across the nodes,
2 + 2 + 2 + 0 across the edges — the answer is 21, and the page says 21. A design
with exactly one lost character says "1 character". `platform-overview`,
`markup-labels`, `empty-design`, my Greek and Cyrillic design, and a title full
of markup all leave the status line describing the upload and say nothing about
the font, so D41 does stay parked.

**Nothing regressed in the Greek or Cyrillic path.** `Παραγγελία εισόδου`,
`Привет мир`, `Ωμέγα Ж Щ ß æ ø å`, `στέλνει сообщение` and `ответ` are all
correct in the drawing **and** in the tables, read out with `pdftotext` rather
than with `pdfText.ts`. The `550normal` fallback is still fixed.

**The metadata is right, decoded from the raw bytes by my own reader.** I walked
the Info dictionary by hand, unescaped the literal string, and decoded the
UTF-16BE:

| File | `/Title` first bytes | `/Title` decoded | `/Lang` |
|---|---|---|---|
| `undrawable-labels` | `fe ff 00 52` | `Regions → 東京` | `(en)` |
| `greek-cyrillic` (mine) | `fe ff 03 a0` | `Παραγγελία и Привет` | `(en)` |
| `astral` (mine) | `fe ff 00 41` | `Astral 😀 plane` | `(en)` |
| `platform-overview` | `50 6c 61 74` | `Platform overview` | `(en)` |
| `empty-design` | `4e 6f 74 68` | `Nothing yet` | `(en)` |

The byte-order mark appears exactly where the title is not ASCII, the real
`→ 東京` survives in the dictionary while page 1 correctly holds `Regions ■ ■■`,
and a character from beyond the basic plane survives there too. Defect 2 is
closed.

**11.1 reproduces.** Table above. The coverage read has not moved the number;
`platform-overview` is 135 ms on the first click against Amon's 137, and the
15-second guard still has two orders of magnitude of room. I agree with leaving
it loose and with not caching the coverage.

### Defects for Amon

**1. `src/lib/drawableText.ts:160-166` — every character `isDrawable` spares as a
control character truncates the rest of the line in the PDF's tables, silently.
The premise the sparing rests on is not true of `pdfPlan`.**

Expected, from intake 5.2 and from this module's own header: *"every character
the font cannot draw is replaced, one for one, with a mark the reader can see"*,
and *"the picture and the table cannot disagree"*. Actual, driven end to end
through the built site and read back with `pdftotext`:

| Label in the design | Drawing in the PDF | Table cell in the PDF |
|---|---|---|
| `Alpha\tBravo` | `Alpha Bravo` | **`Alpha`** |
| `SohCharlie` | `Soh` | **`Soh`** |
| `DelDelta` | `Del` | **`Del`** |
| `edge\twith\ttabs` (edge label) | `edge with tabs` | **`edge`** |
| `Newline\nEcho` | `Newline` / `Echo` | `Newline` / `Echo` — correct |
| `Carriage\r\nReturn` | `Carriage` / `Return` | `Carriage` / `Return` — correct |

The status region for that design said nothing at all: `undrawable` was **0**, so
no mark was drawn, nothing was counted, and the sentence never fired. The export
reported success. That is the same silent wrongness round one was about, reached
by a different door.

**The cause, in two parts.**

*Part one, the premise.* `src/lib/drawableText.ts:156` says, and
`src/lib/drawableText.test.ts:102` repeats: *"`pdfPlan` breaks a label's lines on
them."* It does not. `pdfPlan.ts:350` splits a cell on a newline and on nothing
else, and `splitWords` at `pdfPlan.ts:388` matches a **space** class rather than
`\s`. So a tab is never a break and never a word boundary: it stays inside a
word, and `Alpha\tBravo` reaches `pdf.text` whole. That holds for every code
point `isControl` spares except the newline. The drawing escapes it because
`src/lib/text.ts:116` splits on `/\s+/`, which is exactly why the two halves of
the file disagree — `Alpha Bravo` in the picture, `Alpha` in the table.

*Part two, what jsPDF does with it.* I isolated this from the app: jsPDF 4.2.1
with this embedded face **truncates the string at the first control character**.
`pdf.text('A:Line\tbreak', …)` writes `A:Line`. I ran `AAA<c>ZZZ` for U+0009,
U+000B, U+000C, U+000D, U+0001, U+001F, U+007F, U+0085 and U+009F, and every one
wrote `AAA`. It is not the drop round one found — an uncovered glyph writes the
empty string and the rest of the line survives, which is why `Gateway → Queue`
became `Gateway  Queue`. A control character ends the line. Worse,
`getTextWidth` still counts it — `Line\tbreak` measures 57.47 against `Linebreak`
at 52.15 — so the plan reserves column width for text that is never drawn.

**Reachability.** It needs `\t` or a `\uXXXX` escape inside a label, since strict
JSON forbids a raw control character in a string, so it is much rarer than the
arrow was. It is not unreachable: a label pasted out of a terminal or generated
from a tab-separated source carries a tab, the loader accepts it, the preview
shows it, and Markdown and HTML both carry it. A Windows `\r\n` is harmless,
because `wrap` splits on the newline first and leaves the carriage return at the
end of a line, where it truncates nothing.

**The fix is yours, and both shapes are one line.** Either stop sparing anything
but the newline — `Alpha■Bravo` is ugly, but nothing is lost and the count is
honest — or make `pdfPlan` break on a tab the way `text.ts` does, and spare only
what it then breaks on. `drawableText.test.ts:100` asserts the current behaviour
and will need to change with it; the comment at `:102` and the one at
`drawableText.ts:156` state the false premise and want correcting in the same
pass. Whichever you take, the test to write is the one I ran: a design with a tab
in a label, exported, and the table cell read back whole.

### Known gaps, judged

- **Gap 2, the count is of the design's text rather than of the marks in the
  file.** Confirmed, and I agree with the choice. My 200-node design counted 20
  and the file carries 40 marks, because each label is written twice. A number
  the user can reconcile with their own file is the right one.
- **Gap 3, two ids differing only in uncovered characters.** Confirmed exactly as
  disclosed: ids `東` and `京` give a Nodes table reading `Id ■ ■ ok`, and edge
  rows that cannot be told apart. It does not fail a criterion — nothing is
  *dropped*, and the preview, Markdown and HTML all distinguish them — but it is
  worth a line in the README beside the mark, since a reader of the file has no
  way to know the two rows were ever different.
- **Gap 4, the same sentence twice.** Reproduced: the second export sets an
  identical string, and a live region announces changes rather than content. Same
  family as D41; agreed, park it there.
- **Gap 1, the preview shows the real characters and only the PDF marks them.**
  Correct and deliberate. The sentence is what connects them, and it does.
- **Gap 6, `exportStyles.ts` still carries D57's stale `?raw` comment.** Still
  carried, still not a criterion. Worth folding into whichever cycle next opens
  that file.

### Adversarial pass, beyond the checklist

All clean unless noted.

- A zero-byte file, `{}`, `[1,2,3]`, truncated JSON, a real `.png`, a `.png`
  renamed `.json`, trailing-comma JSON, and duplicate node ids: each leaves
  Export PDF **disabled** and names the problem in the validation panel. There is
  no way to reach the exporter from a failed load, and no console errors on any
  of them.
- Valid JSON that parses with an empty `nodes` list: one page, D51's sentence,
  both table headings, and no sentence about the font.
- 200 nodes and 259 edges with an uncovered character in every tenth label: 13
  pages, 570 KB, 477 ms, `Node 199` present in both the drawing and the table,
  40 marks in the file against a count of 20. Nothing lost off the end.
- Two identical edges between the same pair, a 400-character unbroken word, a
  300-character edge label, leading and trailing spaces, and a title full of
  markup: all export, all wrap, the file name is sanitised, no throw, and the
  status line stays the upload sentence.
- A character from beyond the basic plane becomes **one** mark, not two: an
  emoji, a rare ideograph and a second emoji each count 1, which is four for that
  design, and four is what the sentence says.
- The file name keeps the real characters — `Regions-→-東京.pdf` — which is right,
  since the name is not drawn with the font.
- Control characters in a label: **defect 1**.

### Second oracle

Same discipline as round one. `e2e/pdfText.ts` is hand-written, so nothing above
takes its word: every content claim was re-read out of the files with `pdftotext`
(xpdf 4.06), the metadata was decoded by a reader I wrote for this round that
walks the Info dictionary and the UTF-16BE string itself, and the coverage table
was derived from what the exported files actually contain rather than from
`fontCoverage.ts`. The three agree everywhere I checked. `e2e/pdfText.ts` and
`src/lib/fontCoverage.ts` can both be trusted going into Task 08.

### Accessibility, best effort

No new issue, and one round-one item closed.

- The markup did not change this round; the whole diff is inside the `<script>`.
  `<html lang="en">`, one `<main>`, one `<h1>`, the file input labelled and
  described by its hint, the two `role="status"` regions, and the `role="group"`
  named "Export the design" are all as they were.
- Keyboard path, driven: Tab from the file input reaches Export Markdown, Export
  HTML and Export PDF in that order; Enter on Export PDF downloads; focus stays
  on the button afterwards.
- The new sentence lands in `<p id="upload-status" role="status">`, an implicit
  polite live region, so it is announced. The off-screen drawing holder is gone
  after the export — I counted zero left behind.
- **`/Lang (en)` and `/Title` close round one's defect 2**, which was the one
  accessibility finding on the produced file: a viewer now has a name for its
  window bar, and a screen reader has a document title and a language.
- Noted, not a defect: after a lossy export the status region no longer describes
  the upload. That is the same region D43 already reuses for `EXPORT_FAILED`, and
  the drawing carries its own title and description, so nothing is lost.

### Fixed in place

Nothing. There was no trivium to correct this round — the two wrong doc
references I fixed in round one are still right, and everything else I found
changes behaviour and belongs to Amon.

### Pull request

[PR #15](https://github.com/IBatsios/map-data-structures/pull/15), still a draft,
now carrying `2a08a21`. CI green: typecheck 0 errors, 314 Vitest in 20 files, 73
Playwright in 17.2 s, job 54 s. Not marked ready — that is Sam's, and criterion 2
is not met yet.

### Checkboxes

Checked 1, 3, **4**, 5 and 6 in `docs/tasks/07-export-pdf.md`. Left 2 unchecked
for defect 1. `**Status:**` stays `in progress`, which is Amon's to change once
defect 1 is settled and I have re-verified it. The header's `**Round:**` is now
3.

## Work completed by Amon — round 3

### What was built

**Defect 1 is closed by the first of the two shapes you offered: nothing but the
newline is spared any more.** A tab, a DEL, a carriage return or any other
control character in a label is marked with the same `■` as a character the face
has no glyph for, counted with them, and named in the same sentence.
`Alpha\tBravo` now reaches the Nodes table as `Alpha■Bravo` rather than as
`Alpha`, and `edge\twith\ttabs` as `edge■with■tabs`. Ugly in the rare label that
carries one, and nothing after it is lost.

**The one line turned out to be two, and the second is the half that would have
been missed.** The obvious change — `coverage.has(point) || point ===
LINE_BREAK` — was written first, and the walk then counted **5** where the
fixture holds 6. The character it still let through was the carriage return,
because **Roboto Regular maps U+0000, U+0002 and U+000D**, as many faces do: the
coverage reader answers "drawable" for a CR while jsPDF ends the string at it
regardless. So the font is no longer asked about a control character at all —
`isDrawable` answers for the control ranges before it consults the cmap — and a
design carrying a lone `\r` in the middle of a label, which truncates exactly
like a tab, would have gone on losing everything after it under the first shape
of the fix. A unit test against the real embedded face pins all three code
points, so regenerating the font cannot undo this quietly.

**The false premise is corrected where it was stated**, at `drawableText.ts:156`
and `drawableText.test.ts:102`, and the newline's safety is now written down as
something checked rather than assumed: `pdfPlan`'s `wrap` splits a cell on `\n`
before a line is measured, and svg2pdf's `transformXmlSpace` calls
`removeNewlines` on a text element before jsPDF ever sees it
(`node_modules/svg2pdf.js/dist/svg2pdf.es.js`). Reading that file also corrects
one detail of the diagnosis, and it made the fix bigger rather than smaller: the
drawing showed `Alpha Bravo` because svg2pdf's `replaceTabsBySpace` turned the
tab into a space, not because `text.ts` split on it — `wrapText` returns a label
that fits exactly as it came in, tab included. The picture was carrying the tab
too, so marking was needed in both halves of the file rather than in the tables
alone.

**Read back out of the file with an outside reader**, not with `pdfText.ts`:
`pdftotext -enc UTF-8` (xpdf) on an export driven through the built site.

| Label in the design | Drawing in the PDF | Table cell in the PDF |
|---|---|---|
| `Alpha\tBravo` | `Alpha■Bravo` | `Alpha■Bravo` |
| `Soh\u0001Charlie` | `Soh■Charlie` | `Soh■Charlie` |
| `Del\u007fDelta` | `Del■Delta` | `Del■Delta` |
| `edge\twith\ttabs` | `edge■with■tabs` | `edge■with■tabs` |
| `Newline\nEcho` | `NewlineEcho` | `Newline` / `Echo` |
| `carriage\r\nreturn` | `carriage■return` | `carriage■` / `return` |

The page says *"cannot draw 6 characters"* for that design: the tab, the SOH,
the DEL, two more tabs in an edge label and the carriage return — counted once
per piece of the design's own text, with the line break counted as nothing
because nothing is lost to it.

### Files added or changed

- `src/lib/drawableText.ts` — `isDrawable` answers for the control ranges before
  it consults the font, and spares the newline alone. `isControl` is back, with
  the opposite meaning to the one it had. The comment that stated the false
  premise now states what was measured instead.
- `src/lib/drawableText.test.ts` — the test that asserted the old behaviour is
  gone, along with the comment that repeated the premise; five tests in its
  place.
- `e2e/fixtures/control-labels.json` — new. Your design rebuilt: a tab, a SOH, a
  DEL, an edge label of tabs, a label's own line break, and a CRLF.
- `e2e/exportPdf.spec.ts` — three tests.
- `docs/DECISIONS.md` — D72 appended.
- `README.md` — a paragraph saying control characters are marked too, and that
  two labels or ids differing only in marked characters read alike in the PDF.
  That second sentence is the README line you asked for on known gap 3.
- `docs/handoff-items/handoff-task-07-export-pdf.md` — this section.

Not touched: `src/lib/pdfPlan.ts`, `src/lib/toPdf.ts`, `src/lib/fontCoverage.ts`,
`src/lib/text.ts`, `src/lib/download.ts`, `src/lib/layout.ts`,
`src/pages/index.astro`, `src/lib/exportStyles.ts`, the loader modules, and
`docs/tasks/07-export-pdf.md`, whose boxes and `**Status:**` line are yours.

### Tests written

**Vitest, `src/lib/drawableText.test.ts` (5 new, 319 in the suite).**

- *marks a tab, because jsPDF ends the line it is in* — the defect as arithmetic
  over one string, with the corrected premise written into the comment.
- *marks every other control character, which ends a line the same way* —
  U+0001, U+000B, U+000C, U+000D, U+001F, U+007F, U+0085 and U+009F, each one
  mark and one count. The class, rather than the one spelling of it you found.
- *marks a control character the font does map, because jsPDF ends the line
  anyway* — against a made-up coverage carrying `\r`, so the rule is pinned
  independently of which font is embedded.
- *marks the control characters the real embedded face does map* — U+0000,
  U+0002 and U+000D, asserted first to be in the face and then to be marked in
  spite of it. This is the test that goes red if anyone puts the coverage check
  back in front of the control check, and the second place in the file that
  reads the real font rather than a stand-in.
- *marks a tab in a label, in the picture and in the table alike* — over a whole
  laid-out design, asserting the two halves say the same thing rather than
  asserting a number of lines, since a label long enough to wrap has already had
  the tab become its line break.
- Unchanged and now meaning more: *leaves a line break alone, because nothing is
  ever asked to draw one*.

**Playwright, `e2e/exportPdf.spec.ts` (3 new, 76 in the walk).** Against
`control-labels.json`, read back out of the bytes:

- *keeps what a control character used to cut the line off at* — the four marked
  labels arrive whole; no run anywhere in the file is the bare `Alpha`, `Soh` or
  `edge`, which is exactly what a cut-off cell was; and `Alpha■Bravo` appears
  **twice**, once in the drawing and once in the table, so a fix that marked one
  half only would fail it.
- *leaves a label's own line break as a line break, not as a mark* — `Newline`
  and `Echo` are both runs in the file and neither carries a square.
- *counts the characters it marked in a design full of control characters* — the
  status region says 6 for that design.

### Local results

`bun run test`: **pass, 319 tests in 20 files** (314 at the end of round 2).
`bun run test:e2e`: **pass, 76 tests** (73 at the end of round 2).
`bun run check`: pass, 0 errors, 0 warnings, 0 hints across 57 files.
`bun run build`: pass, 1 page.

**Criterion 11.1, re-measured** on the same machine and by the same method as
the two rounds before it — Windows 11 Pro, bun 1.4.2, Chromium via Playwright,
`dist/` served from localhost, clock from the click to the browser having the
file, four clicks per fixture.

| Fixture | Nodes / edges | Clicks, in order |
|---|---|---|
| `order-intake.json` | 7 / 6 | 241 / 106 / 102 / 93 ms |
| `undrawable-labels.json` | 5 / 4 | 157 / 99 / 99 / 99 ms |
| `control-labels.json` | 4 / 3 | 155 / 89 / 102 / 99 ms |
| `platform-overview.json` | 15 / 16 | **176 / 105 / 117 / 114 ms** |
| `estate-sweep.json` | 40 / 46 | **208 / 150 / 155 / 144 ms** |

Within noise of your round-two table. The change is one comparison per character
inside a loop that already ran, so there was no reason to expect movement and
there is none. The 15-second guard in the walk is untouched.

`.env.example` confirmed rather than assumed for a third round: it still lists
no variables, and a grep for `process.env` and `import.meta.env` across `src/`,
`e2e/` and the root finds only `process.env.CI` in `playwright.config.ts`, which
the runner sets.

### Decisions recorded

One row appended to `docs/DECISIONS.md`:

- **D72** — a control character is marked like any other character the font
  cannot draw, and the font is not consulted about one, with the newline alone
  spared: what jsPDF actually does with one, why the premise that spared the tab
  was false, why the cmap's answer misleads for these code points, how the
  newline's safety was checked rather than assumed, and the cost that a `\r\n`
  now shows a mark.

### Known gaps

1. **A `\r\n` inside a label now shows a mark at the end of its first line, and
   is counted.** `carriage\r\nreturn` becomes `carriage■` / `return` in the
   table, where round two showed `carriage` / `return` and lost nothing. This is
   the deliberate cost of the shape chosen: a lone `\r` truncates like any other
   control character, and `isDrawable` sees one code point rather than where in
   the string it sits, so sparing the harmless CRLF would mean sparing the
   harmful lone one. Nothing is lost either way, and the count is honest about
   what the font could not draw.
2. **The drawing writes `Newline\nEcho` as `NewlineEcho`.** svg2pdf removes a
   newline from a text element without putting a space in its place, so a label
   whose own line break survives into `labelLines` — which happens when the
   label is short enough not to wrap — loses the gap in the picture, while the
   table breaks the cell correctly on it. Pre-existing, unchanged by this round,
   and not a loss of characters; noted because the new fixture makes it visible
   and because you will see it in `pdftotext` output.
3. Carried from round two and still parked: the count is of the design's text
   rather than of the marks in the file; two ids differing only in uncovered
   characters read alike, which now has its README line; the same sentence twice
   announces once (D41 family); nothing stops a second click while a PDF is
   being written (D41 family); and `src/lib/exportStyles.ts` still carries D57's
   stale `?raw` comment, because nothing this round went near that file.

### Out-of-scope notes for Jared

- **The drawing's on-page label size still degrades from 15 nodes.** Untouched
  again this round and still the item to schedule: landscape pages, or a
  readable floor on the label size with the drawing tiled across sheets.
- **Task 08 inherits the question this round answers.** What to ask of whatever
  library opens the `.docx` gate is not only "what does it do with a character
  its font cannot draw" but "what does it do with a control character in a
  string": those turned out to be two different failures with two different
  shapes — an uncovered glyph wrote nothing and left the line standing, a
  control character ended the line.
- **A font's `cmap` answering for a control character is a trap worth writing
  down.** Roboto maps U+0000, U+0002 and U+000D. Anything that asks a font what
  it can draw and believes the answer across the whole range will be wrong the
  same way `fontCoverage` was about to be.
- Nothing was opened in `describeLoadError.ts`, `loadDesign.ts`, `layout.ts`,
  `pdfPlan.ts`, `download.ts` or `empty.json`, and the `intersectRect` crash was
  not touched. All still carried.

## Test report from Jahmyr — round 3

### Verdict

**Pass.** Defect 1 is closed, and closed at the class rather than at the one
spelling of it. I drove the built site outside the project's own suite over
fifteen designs — Amon's fixture, five adversarial ones of my own, the repo's
regression fixtures and a 200-node design — and read every file back with
`pdftotext -enc UTF-8` (xpdf 4.06), an oracle that is neither `pdfText.ts` nor
anything Amon wrote. **No control character truncates a label any more, in
either half of the file, in a label, in a type or in an id.** All six criteria
hold; criterion 2 is checked for the first time and the task file's `**Status:**`
is now `done`, which per D54 means verified rather than merged.

The second half of the fix is the half that mattered, and I confirmed it
independently rather than taking it from the handoff: a lone `\r` in a label is
marked, and the unit test that pins U+0000, U+0002 and U+000D against the real
embedded face does go red if the coverage check is put back in front — I moved
the check to confirm it, watched the suite fail, and put it back.

Both gaps Amon disclosed are real and neither fails criterion 2. Details below,
with a third of my own that is smaller than either.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can export the design as PDF: demonstrated end to end | **pass** | Fifteen designs driven through `dist/` in Chromium outside the suite. Every one produced a `%PDF-1.3` file ending in `%%EOF` that `pdftotext` reads, with `/Lang (en)` and the design's own `/Title`. Zero console errors and zero page errors across all of them. Also exported by keyboard alone: Tab reaches Export PDF third in the row, Enter downloads `Control-characters.pdf` |
| The PDF shows the same nodes and edges as the preview, with every label readable (5.2) | **pass** | The tables below, read out of the bytes. Nothing truncates: there is no bare `Alpha`, `Soh`, `edge`, `Lone`, `Nul`, `id` or `Aa` run anywhere in any file I produced. Ids carry marks identically in the Nodes table and in the Edges table, so an edge still names its node. The count is right in every design I hand-counted: 6, 8, 10, 5, 13, 21 |
| The download finishes within a few seconds for a design the size of the owner's use cases (11.1) | **pass** | Re-measured independently, click to file-in-hand, four clicks each: `platform-overview` (15/16) **236 / 119 / 113 / 115 ms**, `estate-sweep` (40/46) **221 / 148 / 148 / 151 ms**, `control-labels` 168 / 96 / 98 / 101 ms, `order-intake` 154 / 103 / 101 / 98 ms, my `labels-with-controls` 152 / 87 / 100 / 102 ms. A 200-node / 259-edge design of my own: **681 ms**, 14 pages, 813 KB, complete through its last edge. Amon's table reproduces within noise; the extra comparison per character has not moved it |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download | **pass** | 319 Vitest in 20 files, 76 Playwright, locally and on CI. The three new walk tests assert the round-three behaviour from the file's bytes, including that `Alpha■Bravo` appears **twice**, so a fix that marked one half only would fail. I checked the pinning test does its job by putting the coverage check back in front of the control check: two tests fail, one of them `expected { text: 'a\u0000b', undrawable: +0 } to deeply equal { text: 'a■b', undrawable: 1 }` |
| Every earlier test still passes; CI is green | **pass** | Nothing regressed. CI **green** on [PR #15](https://github.com/IBatsios/map-data-structures/pull/15) after pushing `7a3cf1a`: typecheck 0 errors / 0 warnings / 0 hints, 319 Vitest in 20 files, 76 Playwright in 21.0 s, job 58 s |
| Any new environment variable is in `.env.example` with a placeholder | **pass** | Grepped `process.env`, `import.meta.env` and `Deno.env` across `src/`, `e2e/` and the root: the only hit is `process.env.CI` in `playwright.config.ts`, which the runner sets. `.env.example` still lists none, and the only `.env*` file git tracks is `.env.example`. `gitleaks detect --source . --no-banner`: 29 commits, 1.43 MB, **no leaks found** |

### Command results

`bun run test`: **319 passed, 20 files**, 780 ms.
`bun run test:e2e`: **76 passed**, 9.2 s.
`bun run check`: **0 errors, 0 warnings, 0 hints** across 57 files.
`bun run build`: **pass**, 1 page in 669 ms.
Secret scan: `gitleaks` — **no leaks found**, 29 commits scanned.
CI: **green** — typecheck 0 errors, 319 Vitest, 76 Playwright in 21.0 s.

### What I confirmed, each read out of the file rather than out of the handoff

**Amon's table reproduces exactly**, from `control-labels.json` exported through
the built site and read back with `pdftotext -raw`:

| Label in the design | Drawing | Table cell |
|---|---|---|
| `Alpha\tBravo` | `Alpha■Bravo` | `Alpha■Bravo` |
| `Soh\u0001Charlie` | `Soh■Charlie` | `Soh■Charlie` |
| `Del\u007fDelta` | `Del■Delta` | `Del■Delta` |
| `edge\twith\ttabs` | `edge■with■tabs` | `edge■with■tabs` |
| `Newline\nEcho` | `NewlineEcho` | `Newline` / `Echo` |
| `carriage\r\nreturn` | `carriage■return` | `carriage■` / `return` |

**Ids carry controls too, and the two tables agree about them** — the case you
asked for by name, and the one the fixture does not hold. `ids-with-controls.json`,
mine, with a tab, a lone `\r` and a `\r\n` **in node ids** and every edge naming
them:

| Id in the design | Nodes table, Id column | Edges table, From and To |
|---|---|---|
| `id\talpha` | `id■alpha` | `id■alpha` |
| `id\rbravo` | `id■bravo` | `id■bravo` |
| `id\r\ncharlie` | `id■` / `charlie` | `id■` / `charlie` |
| `plain` | `plain` | `plain` |

Before this round the Id column would have read `id` three times over and the
edges would have named a node that appeared not to exist. The page says **8**,
which is what I count by hand: three ids and five edge ends.

**The label cases the fixture does not carry.** `labels-with-controls.json`,
mine — a lone `\r`, a control at each end of a label, a label that is nothing but
a control, a literal NUL, and a tab inside a label long enough to wrap:

| Label in the design | Drawing | Table cell |
|---|---|---|
| `Lone\rReturn` | `Lone■Return` | `Lone■Return` |
| `\u0001Edged\u0001` | `■Edged■` | `■Edged■` |
| `\u0001` alone | `■` | `■` |
| `Nul\u0000Inside` | `Nul■Inside` | `Nul■Inside` |
| title `Lone\rreturn title` | `Lone■return title` | — |

Its edge labels come out `lone■cr edge`, `crlf■` / `edge` and `tab■edge`. The
page says **10**, which is what I count by hand. The NUL deserves its own line:
the recorded known limit is that a literal NUL is *dropped* when an exported file
is reopened, and this format now marks it rather than losing it.

**Nothing outside the control ranges truncates either, which is the question the
fix could have left half-answered.** Twelve separator and format characters, each
in a label `Aa<c>Zz`, exported and read back. **All twelve labels survive whole** —
there is no `Aa` run anywhere in that file:

- Marked: `U+2028`, `U+2029`, `U+0085`, `U+200F`, `U+2066`, `U+FE0F`, `U+1F600`.
- Drawn as themselves: `U+00A0`, `U+00AD`, `U+200B`, `U+FEFF`, `e` + `U+0301`.

The count for that design is **13**, which is what I count by hand. `U+2028` and
`U+2029` are the interesting pair: they sit outside the C0 and C1 ranges, so the
cmap answers for them, and this time the answer happens to be right.

**The pinning test is the test you say it is.** I replaced `isDrawable`'s body
with `coverage.has(point) || point === LINE_BREAK` and ran the suite: *marks the
control characters the real embedded face does map* fails on U+0000 and *marks a
control character the font does map* fails with it — 2 failed, 317 passed.
Restored, 319 passed. Regenerating the font cannot undo this quietly.

**No regression in what round two verified.** `undrawable-labels` still says
**21** and still reads `Gateway ■ Queue`, `API gateway (■■)` and
`Cache (■■■■■■■)` in both halves; `platform-overview`, `order-intake` and
`empty-design` still say nothing at all about the font, so D41 stays parked;
Greek is still correct in the drawing and in the tables, so the `550normal`
fallback is still fixed. Metadata re-read by walking the Info dictionary by hand:
`/Title` is `Regions → 東京` unmarked, `Lone\rreturn title` with its carriage
return intact, `Big design`, `Nothing yet`; `/Lang (en)` on every file; every file
ends in `%%EOF`.

### The two gaps you disclosed, judged against criterion 2 as written

**1. A `\r\n` shows a mark at the end of its first line, and is counted. Does not
fail criterion 2.** The criterion asks that the labels be readable and that the
picture show what the preview shows. `carriage■` / `return` is readable, nothing
is lost, and the alternative — sparing a `\r` that happens to be followed by
`\n` — means `isDrawable` answering on position rather than on the code point,
which is a second kind of answer to one question. The count stays honest about
what the font could not draw. I agree with the trade.

**2. The drawing writes `Newline\nEcho` as `NewlineEcho`. Does not fail criterion
2, and the reason is precise rather than lenient.** The criterion asks that the
PDF show *the same nodes and edges as the preview*. It does: the preview's own
SVG holds `Newline\nEcho` in a single `<text>` run, so the browser renders it as
`NewlineEcho` on screen too. The PDF and the preview agree; it is the PDF's
*table* that is more faithful than either. Pre-existing, no characters lost, and
it belongs with the drawing's other on-screen limits rather than with this round.

### One more gap of my own, smaller than either, and not a failure

**A tab inside a label long enough to wrap becomes a space in the picture and a
mark in the table.** `src/lib/text.ts:116`, inside `splitIntoFittingWords`,
splits on `/\s+/` and rejoins with a single space, so by the time `markLines`
sees the lines the tab is already gone. My wrapping label reads
`several lines before the` in the drawing and `several lines before■the` in the
table.

This does not fail criterion 2, for the same reason gap 2 does not: the preview
does exactly the same thing, so the picture still shows what the preview shows,
and the label is readable in both halves. It is worth writing down because it is
the one case where the two halves disagree about a character that was neither
lost nor marked in the picture, and because the count includes it. **Not a defect
for this task**; it belongs with the drawing's own wrapping, beside the label-size
item already listed for Jared.

To be clear about what it is not: `pdfPlan`'s `wrap` and `splitWords` behave
exactly as D72 and the comment at `drawableText.ts:156` say — `wrap` splits on
`'\n'` and `splitWords` matches `/[^ ]*[ ]*/gu`, a space and not whitespace. I
checked, because round two's defect came from a comment that was wrong. This one
is right.

### Adversarial pass, beyond the checklist

Every failure fixture, with the export row watched: `empty.json` (zero bytes),
`trailing-comma.json`, `not-a-design.json`, `cut-short.json`, `blank-label.json`,
`many-problems.json`, `duplicate-ids.json` and `renamed-image.json` each left no
drawing and all three export buttons disabled. A good file and then a bad one:
the PDF button goes from enabled back to disabled and the drawing is gone, which
is D53 holding with three buttons. A 200-node / 259-edge design: 681 ms, 14
pages, complete through `n59 n26 cross 59`. Fifteen designs in all, and not one
console error or page error.

### Accessibility, best effort

No page code changed this round — the diff is `drawableText.ts`, its test, the
walk, one fixture and three documents — so this is a confirmation rather than a
fresh audit. The export row's tree reads `group "Export the design"` with
`button "Export Markdown"`, `button "Export HTML"` and `button "Export PDF"`; tab
order is the file input and then the three buttons in that order; Enter on the
focused PDF button downloads the file; and the sentence lands in a `status` live
region. D59 holds with three buttons, and the fuller revisit still belongs to
Task 08.

### Fixed in place

None. The only thing I changed under `src/` was putting the coverage check back
in front of the control check to watch the pinning test fail, and I reverted it.

### Pull request

[PR #15](https://github.com/IBatsios/map-data-structures/pull/15), still a draft.
CI green on `7a3cf1a`. Sam marks it ready and merges; I do not.

### Checkboxes

All six are now checked in `docs/tasks/07-export-pdf.md`, and `**Status:**` reads
`done` — D54's meaning of done, the criteria verified in this cycle, not merged.

### One note for Jared

The five adversarial designs I drove this round stayed in my scratch space rather
than in `e2e/fixtures/`: `control-labels.json` already covers the class in the
walk, and adding fixtures at the gate is Amon's remit rather than mine. If any
one of them is worth keeping, it is the id case — a tab, a lone `\r` and a `\r\n`
**in node ids**, with edges naming them — because it is the only one where a
regression would make an edge point at a node that appears not to exist. It is
one fixture and one assertion if someone wants it in a later cycle.

## Verification and merge by Sam

### Document audit

| Document | State | Action taken |
|---|---|---|
| `docs/tasks/07-export-pdf.md` | All six boxes checked, `**Status:** done` | Confirmed against code and against Jahmyr's round-3 report; no change |
| `README.md` | Export PDF paragraph, font licence note, `■` mark and its two named costs, layout list, "Still to come: Word" all present and match the built behaviour | No change needed |
| `CLAUDE.md` | Status section still read "Tasks 01 to 06" and did not mention PDF at all | Updated: "01 to 07", an Export PDF paragraph (route, embedded font, the `■` mark), and a short "known limit" line on the on-page label size, pointing at this handoff doc for the full table |
| `docs/DECISIONS.md` | D62–D72 present and cover every choice named in Amon's and Jahmyr's reports across all three rounds | No gap found; no addition needed |
| `.env.example` | Still no variables; confirmed independently by Jahmyr (round 3) via grep of `process.env`/`import.meta.env`/`Deno.env` across `src/`, `e2e/` and the root | No change needed |
| Handoff doc (this file) | Jared's assignment, three rounds of Amon's work, three rounds of Jahmyr's reports, all present and legible | No change needed beyond this section |
| `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/intake.md` | Not opened for edits (generated; out of my remit) | Nothing found in this cycle that makes any of them wrong |

One doc outside the generated set needed a fix before merge: **the pull
request description on PR #15 was still round 1's** — two criteria shown
unchecked, an "opened so CI can run, not ready to merge" status line, and a
283/67 test count. Updated it to the round-3 state (all six criteria
checked, 319/76, the label-size finding carried forward) before marking the
PR ready.

**Left alone, on purpose:** `src/lib/exportStyles.ts:15-18` still states
D57's superseded claim that `?raw` comes back empty under this project's
Vitest — D61 corrected the fact three tasks ago, source code is not my
remit, and neither this task's diff nor mine touches that file. Carried
forward again below and in `handoff-next-phase.md`.

### Gates

`bun run test`: **pass, 319 tests in 20 files**, re-run independently on the
merge commit's parent and again after the CLAUDE.md fix, both green.
CI: **green** on both `4b7e6a8` (round 3, pre-existing) and `82e439a` (my
doc-fix commit) — typecheck, 319 Vitest, 76 Playwright, both required checks
passing on the commit that was actually merged.
Secret scan: `gitleaks detect --source . --no-banner` — **no leaks found**,
run twice (before and after the doc-fix commit), 30 and 31 commits scanned.

### Merge

Squashed as `4bfcd7a` into `main`. Branch `feature/export-pdf` deleted, both
locally and on the remote (confirmed via `gh api .../branches/feature/export-pdf`
returning 404 after `git fetch --prune`). PR
[#15](https://github.com/IBatsios/map-data-structures/pull/15).

One commit was added to the branch before merge, `82e439a`, a docs-only fix
to `CLAUDE.md`'s Status section (see the audit table above); it went through
a full CI run of its own before the PR was marked ready, per the runbook's
"never merge with a pending check."

### Left for a person

Nothing blocking. Two items worth a person's attention, both already
flagged for scheduling rather than requiring action right now:

- **The PDF's on-page label size degrades from 15 nodes** (4.0pt at
  `platform-overview.json`, the fixture built to represent the owner's own
  scale). Not a criterion failure — the tables carry every label at full
  size and the drawing is vector, so it is sharp at any zoom on screen — but
  a printed 15-node design needs a magnifier. This has no task number yet.
  It is carried in `handoff-next-phase.md` as an item for whoever schedules
  the next few tasks to turn into one, rather than left to be rediscovered.
- `src/lib/exportStyles.ts`'s stale `?raw` comment, as above — trivial, but
  now carried past four tasks (05 wrote it wrong in spirit via D57, 06
  recorded it, 07 round 1 through 3 all passed the file by). Whoever next
  opens that file should just fix the comment.
