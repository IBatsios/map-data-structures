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
