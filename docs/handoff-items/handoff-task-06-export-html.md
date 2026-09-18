# Handoff — Task 06: Export as HTML

**Date:** 2026-09-18
**Branch:** feature/export-html
**Task file:** docs/tasks/06-export-html.md
**Round:** 1

## Assignment from Jared

### Scope

Build the second of the four exports: a button that turns the design on screen
into one standalone `.html` file. The file opens in any browser, from any
folder, with nothing beside it — the title, the drawing as inline SVG, and the
node and edge tables Task 05 already writes, with every style inline.

The shape of the work is Task 05's, one format over. `toMarkdown` and its test
are the template: a renderer in `src/lib/`, its test written first, the button
wired through the helpers that already exist. What is genuinely new is that
**this is the first export that embeds the drawing itself** rather than asking
another tool to redraw it, and that is where both of this cycle's real decisions
live (see "Watch out for").

**In scope**

- `toHtml` in `src/lib/`, with its test written before it.
- An "Export HTML" button in the existing export row in `src/pages/index.astro`,
  wired through `downloadBlob` / `fileNameFor`.
- Naming or grouping the export row now that it holds two buttons.
- Extending `e2e/export.spec.ts` with the HTML download, alongside Markdown's.
- A decision recorded in `docs/DECISIONS.md` for how user text is escaped into
  the page, and for `toHtml`'s signature.
- `straightLine` (`src/lib/layout.ts:329`): reach a verdict — fix it, or park it
  with a fresh reason. Both are acceptable outcomes; leaving it unexamined is
  not.

**Out of scope**

- Page styling outside the drawing. Still parked to Task 09, which adds the
  second page and makes that call once for both.
- PDF and Word. Task 06 may leave the exported page *printable* (the task file
  asks for this if Task 07 prints it), but do not build Task 07 here.
- Any change to `src/lib/download.ts`. See "Watch out for", item 4.
- Announcing a finished download on the page. That is a live-region question
  under D41 and belongs to all four exporters at once, not to this one.
- Renaming `e2e/fixtures/empty.json`. Its own chore, later.

### Acceptance criteria

Copied verbatim from `docs/tasks/06-export-html.md`. These are the contract.

- [ ] As a user, I can export the design as HTML: demonstrated end to end.
- [ ] The page shows the same nodes and edges as the preview, with nothing dropped or mislabeled (5.2).
- [ ] The file works alone: no stylesheet, script, font, or image is fetched from anywhere.
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the exported page has a title, headings, and the SVG title from Task 03.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one is expected to be vacuously true: this project reads nothing from
the environment and `.env.example` holds no variables. Confirm it rather than
assume it, and say so.

### Files expected to change

A guide, not a cage.

- `src/lib/toHtml.ts` — new. The renderer.
- `src/lib/toHtml.test.ts` — new, and written first.
- `src/pages/index.astro` — the second button, its listener, and whatever
  `holdDrawing` must now set for two buttons instead of one.
- `src/styles/exports.module.css` — only if grouping the row needs it. The row
  was already built as a row, so it may need nothing.
- `e2e/export.spec.ts` — the HTML download beside Markdown's.
- `e2e/pages/uploadPage.ts` — likely, for the new button's handle.
- `src/lib/layout.ts` — only if `straightLine` is fixed here.
- `docs/DECISIONS.md` — append; never rewrite an existing row.
- `README.md` / `CLAUDE.md` — only if a command changes. None should.

### Skills to load

From the task file's "Suggested skills" and `CLAUDE.md`:

- `tdd-workflow` — the renderer test before the renderer. Every task does this.
- `coding-standards` — before the first file, for naming and structure.
- `front-review` — review the exported page's markup as you would a component,
  before the pull request.
- `front-a11y` — the standalone page's title, headings, and the SVG title from
  Task 03. Best-effort, as the criterion says.
- `e2e-testing` — the download assertion, extending the walk Task 05 added to.
- `error-handling` — the export's failure path, which already exists on the page
  as `EXPORT_FAILED` and D43.

### Watch out for

**1. `renderDrawing` returns a DOM element, not a string — and that decides the
signature.** `renderDrawing(layout, doc)` is typed `=> SVGSVGElement` and builds
every node through `doc.createElementNS`. The task file sketches
`toHtml(design, layout)`, a pure function, but a pure function cannot call it.
Three things constrain the answer, and you should settle it before writing code:

- **D48 already settled the design half.** Exporters take the **layout alone**,
  not `(design, layout)` — the layout carries the title, both lists in file
  order, every label as the file gave it, and each node's resolved kind. D48
  even says the same signature is what Tasks 06-08 will want. Do not reopen it.
  The open question is only whether a `Document` joins it.
- **`downloadBlob(blob, fileName, doc)` and `renderDrawing(layout, doc)` both set
  the precedent**: the module that needs the DOM takes the `Document` as an
  argument rather than reaching for a global. `toHtml(layout, doc)` follows the
  house pattern, and D52 spells out why that pattern exists.
- **This project's Vitest run has no DOM at all.** The standing split is pure
  logic in Vitest, DOM work in Playwright. Whatever signature you choose, say in
  the decision where each half is tested, so Jahmyr is not guessing.

Do not hand-write a second string-producing SVG renderer to dodge this. That
would be two renderers to keep in agreement, and the task's own note calls
reusing the preview's SVG "the cheapest way to keep the export identical to the
preview."

**2. The sanitizer question, scoped.** This is the first output in the project
where an injection actually matters: a standalone `.html` holding user-supplied
labels gets opened in a browser. But the risk is narrower than it first looks,
and the narrowing is the useful part.

- **The SVG half is already safe by construction** — *if* you serialize the
  element rather than rebuild it. `renderDrawing` sets text with `textContent`,
  never `innerHTML` (its header comment says so deliberately), so a label that is
  literally `<script>alert(1)</script>` is already text in the DOM, and
  serializing that DOM escapes it on the way out. Serialize; do not concatenate.
- **The risk is everything you build by hand**: the `<title>`, the `<h1>`, and
  the node and edge table cells. `toMarkdown` builds those by string
  concatenation, and if `toHtml` copies that approach without escaping, that is
  the hole. Escape `&` first, then `<`, `>`, `"`, in one named function — not ad
  hoc at each call site.
- **Note what Mermaid's `strict` level did in Task 05, and do not copy it.** It
  sanitized such a label *away*, so the box rendered with no visible text;
  criterion 5.2 survived only because the node table still listed the label. HTML
  export should **escape, not strip** — the label must be visible as the text it
  is. Stripping it would drop a label the preview shows and fail 5.2 on its own
  terms.
- Record the choice in `docs/DECISIONS.md`. Add a test with a label that is
  literally markup and assert it appears as visible text, not as an element.

**3. `straightLine` at `src/lib/layout.ts:329` is now yours.** It is the fallback
route when dagre hands back fewer than two points, and it returns the two nodes'
**centres** while every other route in the file runs border to border.
`renderDrawing.ts:301` puts `marker-end` on whatever points it is given, so an
arrowhead on that path lands inside a box. The honest framing:

- It was parked through Task 05 on correct reasoning — Mermaid computes its own
  layout, so the Markdown export never reads `LayoutEdge.points`. Task 06 is the
  first exporter that embeds those points, which is where I said it would be
  named.
- **It is unreachable in practice so far.** None of Jahmyr's 19 designs reached
  it, including a 300-node one.
- **The exposure already exists on screen today**, not only in the export, since
  the preview draws the same points with the same marker.

So: find out whether HTML export's own inputs can reach it. If you can build a
design that reaches it, fix it border-to-border like its neighbours and test the
case. If you cannot, park it again **with the fresh reason and what you tried** —
that is a real result, not a dodge. Do not fix it blind and untested.

**4. `src/lib/download.ts` should not need a single line changed.** It was built
for all four exports: `Blob` covers text and bytes alike, and `fileNameFor`
already yields `.html` from the same rule that yields `.md` (D52). Jahmyr
verified the shape survives Tasks 06-08 unchanged. If you find it genuinely needs
changing, **stop and report that as a finding** rather than editing it quietly —
a helper that turns out wrong at its second caller is worth everyone knowing
about.

**5. The export row gets its second button, which is when the row needs a name.**
Two related controls read better as a labelled group than as two loose buttons —
a `<fieldset>`/`<legend>`, or an `aria-label` on the wrapper. Decide it once,
here, rather than piecemeal across Tasks 07 and 08, and record it. While you are
there: a `disabled` button is out of the tab order by definition, which is worth
keeping in mind for Task 05's keyboard test as a second button joins it. The full
revisit was flagged for when the row has four.

**6. Prior decisions that bind this task.** Read them before deciding anything
they cover, and do not reopen a settled one:

- **D48** — exporters take the layout, not the design. Covered above.
- **D52** — the download helper's shape, and why it takes a `Document`.
- **D53** — the page holds the layout it drew, through `holdDrawing`, and the
  export button is present-and-disabled until there is something to export, and
  disabled again the instant a file fails. The new button joins that same
  function. A second button left enabled while an error panel shows is exactly
  the quiet wrongness D53 exists to prevent.
- **D39** — labels keep their spaces; the export shows what the design said.
  Escaping is not tidying.
- **D51** — a design with no nodes exports a sentence rather than an empty
  diagram, and both tables still print their headings. Decide the HTML
  equivalent and keep it consistent with the `.md`.
- **D50 / D25** — node silhouettes key off the resolved `shape.kind`, never
  re-derived from the `type` string. Inline SVG inherits this for free by
  reusing the renderer; do not add a second vocabulary.
- **D54** — `**Status:** done` means the acceptance criteria are verified in the
  build cycle, not that the branch has merged. Merging is Sam's separate gate.

**7. Styles inline, and no fetch of any kind.** The criterion is absolute: no
stylesheet, script, font, or image from anywhere. That rules out a CDN, a hosted
font, and an external `<img>`. It also means `src/styles/drawing.module.css`
cannot simply be linked — the drawing's colours live there, behind hashed class
names, while `renderDrawing` styles through `data-` attributes (D23). Work out
how the exported page gets those colours without fetching anything at runtime,
and keep the answer in one place so Task 07 inherits it. A `<style>` block inside
the exported page is fine; anything Astro rewrites to a URL is not. Verify by
opening the downloaded file from a different folder, offline, as step 4 of the
task file asks.

**8. Commands.** `bun run test` runs Vitest. Plain `bun test` runs Bun's own
runner and is wrong; write `bun run test` every time, and correct it if you see
it written wrong anywhere. `bun run test:e2e` is Playwright, `bun run check` is
`astro check`.

### Two process fixes to apply by hand

These are known gaps in the agent configuration. The configuration is not being
edited — that proposal is still with the user — so reproduce them manually:

1. **Pushing the branch and opening the pull request is Jahmyr's step, not
   Amon's.** Amon: commit on `feature/export-html` and hand back. Do not push and
   do not open the PR.
2. **Sam's documentation refresh routes through its own `chore/…` branch and its
   own pull request**, not a direct commit to `main`.

### On the small cycle that is now overdue

The Firefox/SpiderMonkey wording fault (`describeLoadError.ts:191`, `:193`),
`loadDesign.ts`'s lagging doc comment, and `loadDesign.test.ts:146`'s conditional
assertion were routed to their own cycle "after Task 05". **It waits once more,
and this is the reason — which is not the reason I gave last time.**

I re-read the three items rather than re-deferring them on reflex, and the one
that looked most urgent is the least. `loadDesign.test.ts:146`'s conditional is
not an accidental vacuous test: the comment directly above it explains that the
position claim is a bonus this engine happens to give and not a promise the
loader makes, and since Vitest runs on Node, the V8 message always matches
`/position \d+/`. On CI it asserts on every run. It is a style fault in a test,
not a false green. The doc comment is documentation drift. The wording fault is
user-facing, but **nothing is deployed yet** — Task 10 is what puts it in front
of a real Firefox user.

So none of the three has a cost that grows before deploy, and the rule is one
task per cycle. **The hard gate: this chore runs before Task 10.** Task 09 is the
next cycle that works in the loader and validation region, so before or alongside
Task 09 is its natural home. If it is still open when Task 10 is picked, it stops
being schedulable and becomes blocking — say so then.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

**`toHtml` — the design as one standalone `.html` file.** A title, the
preview's own SVG inlined, and the same two tables `toMarkdown` writes. Every
style travels inside the file; nothing is fetched from anywhere. It opens in any
browser, from any folder, with nothing beside it, and it is laid out to print.

**An "Export HTML" button** beside "Export Markdown", in a row that is now a
named group — `role="group"`, `aria-label="Export the design"` (D59). Both
buttons are switched together by `holdDrawing`, so neither offers the design
before last while an error panel is on screen (D53).

**The verdict on `straightLine`:** proven unreachable, and parked with the proof
rather than with a count of designs that missed it. Details under "Decisions
recorded".

Four things worth naming, because they are where the thinking went:

1. **The signature.** `toHtml(layout, doc)` — the layout D48 settled, plus the
   `Document` D52's pattern passes in — and beside it a pure
   `htmlPage(layout, drawing)`, the whole page given the drawing already
   serialised. That second function is not a test-only door; it is the half this
   project's Vitest can reach at all, and the split is D55.
2. **The drawing is serialised, not rebuilt.** `renderDrawing`'s element is
   appended to a detached holder and its `innerHTML` is *read*. That read is the
   escaping — the browser writes a text node out as the text it is — which is
   why the SVG half needs no sanitiser and why there is no second SVG renderer
   to keep in agreement with the first.
3. **Escaped, never stripped.** `&` first, then `<`, `>`, `"`, in one
   `escapeHtml`, for the `<title>`, the `<h1>` and every table cell. A label
   that is literally `</style><script>` is shown as the text it says, runs
   nothing, and leaves exactly one `</style>` in the file — the one this app
   wrote.
4. **The stylesheet is a string, and a test is what keeps it honest.** The
   drawing's colours could not be imported: `?raw` and `?inline` both come back
   empty under this project's Vitest, and a plain import is rewritten to a URL
   by Astro, which is the fetch the criterion forbids. So they are written out
   twice, and `exportStyles.test.ts` reads `drawing.module.css` off disk and
   fails the day the two disagree.

### Files added or changed

| Path | What changed |
|---|---|
| `src/lib/toHtml.ts` | New. `toHtml(layout, doc)` and the pure `htmlPage(layout, drawing)`; the escaping and the two tables. |
| `src/lib/toHtml.test.ts` | New, written first. Sixteen tests on the pure half. |
| `src/lib/exportStyles.ts` | New. `EXPORT_STYLES`: the stylesheet the exported file carries, including its print rules. |
| `src/lib/exportStyles.test.ts` | New, written first. Reads `drawing.module.css` off disk and compares every colour against it. |
| `src/pages/index.astro` | The second button, the group's name, its listener, and `holdDrawing` switching both. `exportMarkdown` became one `exportDesign(elements, extension, mediaType, write)` serving both formats. |
| `src/lib/layout.ts` | Comment only, no behaviour: the proof that `straightLine` is unreachable, written beside it. |
| `e2e/export.spec.ts` | A second `describe` of thirteen tests for the HTML export, beside Markdown's. |
| `e2e/pages/uploadPage.ts` | `exports`, `exportHtml`, `downloadHtml(saveAs?)`, `nodeFill(index)`; `downloadMarkdown` now goes through a shared `exportUsing`. `DownloadedFile` gained `path`. |
| `e2e/fixtures/markup-labels.json` | New. Labels that are markup, an `&`, quotes, and text that is not plain ASCII. |
| `docs/DECISIONS.md` | Appended D55–D60. Nothing rewritten. |
| `README.md` | The HTML export exists now; "still to come" is PDF and Word. Commands unchanged. |
| `docs/tasks/06-export-html.md` | Status line only. Boxes left unchecked — they are yours. |

`src/lib/download.ts` needed no change, as predicted. `Blob` carried the text
and `fileNameFor(title, 'html')` gave `Order-intake.html` from the same rule
that gives `Order-intake.md`. **No finding to report there.**

`src/styles/exports.module.css` needed no change either: the row was already
built as a row, and the group's name is an attribute rather than a style.

### Tests written

**Unit — `src/lib/toHtml.test.ts` (16).** All through `layoutDesign`, so nothing
is asserted about a shape nothing produces.

- It is a whole document: doctype, `<html lang="en">`, a closing `</html>`.
- The design's name is the page's `<title>` and its `<h1>`.
- The drawing it is handed lands on the page.
- Every node, in file order, with its id, label and type; the same for edges.
- Every table has `<th scope="col">` headings; the page has an `<h2>` for
  Drawing, Nodes and Edges.
- A label of `<script>alert(1)</script>` becomes a cell reading
  `&lt;script&gt;…&lt;/script&gt;`, and the page holds no `<script`.
- A title of `<img src=x onerror=go>` is escaped in both `<title>` and `<h1>`.
- `&` is escaped first: `&lt;b&gt; & "quoted"` survives as what it said rather
  than being decoded back into an entity.
- A label of `"  Public API  "` keeps both spaces (D39).
- A design with no nodes gets the sentence and no `<svg>`; both tables keep
  their headings and have no rows.
- The styles are in the page; no `<link>`, `<script>`, `<img>`, `@import`,
  `src=` or absolute URL is.

**Unit — `src/lib/exportStyles.test.ts` (9).** One per node kind plus the shared
parts: every `--shape-*` band and every route, arrowhead, plate and edge-label
colour in the export equals the one in `drawing.module.css`; the stylesheet
imports nothing, fetches nothing, and cannot close the `<style>` element it is
written into.

**End to end — `e2e/export.spec.ts`, "Exporting the design as HTML" (13).**

- Present and disabled from the first paint; enabled once a drawing appears.
- Named `Order-intake.html`, the same stem the `.md` uses.
- Every label the preview draws is in the file; both tables have the right
  number of rows.
- The drawing is the preview's own: `routePath(0)` read off the screen appears
  verbatim in the file, and the node and edge counts match.
- The SVG keeps its Task 03 `<title id="drawing-title">` and its `role="img"`.
- Nothing is fetched: no `<link>`, `<script>`, `<img>`, `@import`, no `url(`
  that does not point inside the page, and the one absolute URL in the file is
  the SVG namespace.
- **It opens alone from another folder.** Saved to a directory of its own,
  opened over `file://`, and asserted: the `<h1>`, a visible drawing, seven
  nodes, thirteen table rows — and zero requests to anything that is not the
  file itself. That is step 4 of the task file, automated.
- **The colours survive the copy.** The computed `fill` of a node in the
  reopened file equals the computed `fill` of the same node in the preview.
- **A markup label is text, and runs nothing.** Every label the preview drew is
  found as text on the reopened page; no `script` or `img` element exists; no
  dialog fires; exactly one `</style>` is in the file.
- **Encoding.** A Greek label and a `«…»` edge label read back correctly off the
  disk, where there is no header to say how the bytes are encoded and the file's
  own `<meta charset>` is the only thing between them and question marks.
- A design with nothing in it: the sentence, no `<svg>`, both tables empty.
- The export stops being offered when the next file fails.
- The row is a group of two buttons; Tab goes from Markdown to HTML and Enter
  downloads `Order-intake.html`.

### Local results

`bun run test`: **pass** — 17 files, 265 tests (was 15 files, 240 tests).

`bun run test:e2e`: **pass** — 53 tests (was 39).

`bun run check`: **pass** — 0 errors, 0 warnings, 0 hints.

`bun run build`: **pass** — 1 page, static output in `dist/`.

Accessibility, best effort, on both surfaces:

- The exported page: `lang="en"`, a `<title>`, `<h1>` then `<h2>` with no level
  skipped, a `<main>`, the SVG's own `<title>`/`<desc>` behind `role="img"`,
  `<th scope="col">` and a `<caption>` on each table, and no inline `style`
  attribute anywhere. Its own text measures 15.5:1 for body text, 6.3:1 for the
  quiet text, and 5.7:1 for a table heading on its band — all past AA's 4.5:1,
  measured with the project's own `contrastRatio`.
- The upload page: `role="group"` is a valid role, the group has a name, both
  buttons have visible text, and the second is reachable by Tab from the first.

`.env.example`: confirmed rather than assumed. Nothing under `src/` reads
`import.meta.env` or `process.env`, this task added no variable, and the file
still holds none. Criterion 7 is vacuously true.

### Decisions recorded

Six rows appended to `docs/DECISIONS.md`. Nothing existing was rewritten.

- **D55** — `toHtml(layout, doc)` plus the pure `htmlPage(layout, drawing)`, and
  where each half is tested. Resolves the task file's `toHtml(design, layout)`
  sketch in D48's favour.
- **D56** — escaped, never stripped, `&` first, in one function; and the SVG
  half made safe by serialising rather than rebuilding.
- **D57** — the exported stylesheet is a string constant, and the test that
  reads `drawing.module.css` off disk is what makes the duplicate acceptable.
- **D58** — `straightLine` parked as **proven unreachable**, and kept as a
  guard.
- **D59** — the export row is a `role="group"` named "Export the design".
- **D60** — the drawing leads and the tables follow; a design with no nodes gets
  D51's sentence in place of an empty `<svg>`.

On **D58**, since it was the open question of the cycle. The fallback's inputs
cannot occur, and here is why rather than how many designs missed it:

1. Dagre ends its own layout with `assignNodeIntersects`, which unconditionally
   unshifts the source border's intersection onto every edge's points and pushes
   the target border's. No edge comes back with fewer than two points, and both
   ends are already on a border.
2. `buildGraph` adds one dagre edge per design edge, keyed by its index in the
   file, and `readRoutedEdges` reads back with the same key — so the lookup
   never misses and `routed` is never `undefined`.
3. Self-edges never reach the branch: `selfLoopSlots` gives a slot to every one
   of them, so a loop is drawn by `selfLoops.ts` and never read from dagre.
4. Probing agreed. Ten shaped graphs — parallel edges, two-cycles, self-loops, a
   complete graph, a fifty-node chain — and four hundred fuzzed ones came back
   with three points at the fewest, never two and never fewer.

So the arrowhead-inside-a-box exposure does not exist, on screen or in the
export, and the HTML export embeds only border-to-border routes. It is kept
rather than deleted because it guards a library this module does not own, and
deleting it would turn a future dagre change into an edge drawn with an empty
`d`, which is invisible rather than visibly wrong. It is left centre to centre
rather than corrected because a correction to code nothing can reach could not
be tested, and you asked me not to fix it blind. The proof is written beside the
function as well as in the log.

### Known gaps

- **`toHtml`'s three DOM lines are not unit-tested, by construction.** Vitest
  has no DOM here, so `serialiseDrawing` — create a holder, append the drawing,
  read `innerHTML` — is covered only by Playwright. It is covered there
  thoroughly, including the route read off the screen appearing verbatim in the
  file. A Vitest-level assertion on it would need a DOM environment, which is a
  dependency and a decision this task did not have.
- **The RED step is in the transcript, not in a commit of its own.** The
  pre-commit hook runs `astro check` over the whole tree, so a commit holding a
  test that imports a module which does not exist yet cannot be made at all. I
  ran both new test files and watched them fail on exactly those missing
  modules, then implemented; the first feature commit carries both.
- **`countOf` in `e2e/export.spec.ts` counts substrings, not elements.** Fine
  for what it does — `data-part="node"` and `</style>` — but it should not be
  reached for on anything that could appear inside a label.
- **The exported page is styled here, not in Task 09.** Task 09 owns the app's
  own pages; this stylesheet is the artifact's own and lives in
  `exportStyles.ts`. If Task 09 sets a project-wide visual direction, that file
  is the one place to bring into line — and Task 07 will already be inheriting
  it.
- **The drawing's `max-height: 75vh` was deliberately not copied** into the
  export. A standalone page scrolls and a printed one needs the whole drawing,
  so a very large design gives a tall page rather than a shrunken picture. If
  that reads wrong on a 300-node design, it is one rule to change.

### Out-of-scope notes for Jared

**1. A valid design can make `layoutDesign` throw. Found while probing
`straightLine`; not touched.**

Some graph shapes make dagre throw `Not possible to find intersection inside of
the rectangle` out of its own `intersectRect`, which happens when two boxes it
is routing between share a centre. Seven of four hundred fuzzed shapes hit it. A
minimal case that still throws, every node `type: "service"`:

```
nodes: n0, n2, n3, n4, n5, n6
edges: n2→n5, n0→n6, n0→n4, n3→n4, n6→n3, n4→n0, n0→n4
```

No edge can be removed from it without the crash going away; it needs both the
two-cycle (`n0→n4`, `n4→n0`) and the parallel duplicate of `n0→n4`. A two-cycle
alone is fine, a parallel pair alone is fine, a three-cycle is fine.

It fails safely rather than breaking the page: `showDrawing` throws before
anything on screen changes, `drawOrExplain` catches it, and the panel says
"Something went wrong while reading that file: Not possible to find intersection
inside of the rectangle." So the user is told, the page is intact, and no
previous drawing is left behind — but a legal design cannot be drawn, and the
sentence is the engine's words rather than the app's, which is what D43
otherwise avoids. It is reachable by any file a user can write, which is what
makes it worth a cycle of its own. I did not open it: it is outside Task 06 and
a fix touches `layout.ts`'s routing, which every task from here reads.

**2. `e2e/fixtures/empty.json` is still the confusing name** — a file with
nothing in it, sitting beside `empty-design.json`, a design with nothing in it.
Already on your list; noting only that the HTML suite now reads the second of
them too, so the rename touches one more spec than it did.

**3. The three loader-module items were left closed**, as gated:
`describeLoadError.ts:191`/`:193`, `loadDesign.ts`'s doc comment, and
`loadDesign.test.ts:146`. I did not open those files. Note that finding 1 above
lands in the same region — the panel's wording for an engine message — so if the
crash gets a cycle, that chore is its natural neighbour.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass.** Every acceptance criterion was exercised and holds. CI is green on the
pull request. No defect blocks this task; three observations are recorded below
and none of them changes behaviour.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can export the design as HTML: demonstrated end to end | pass | Chose `order-intake.json`, clicked Export HTML, got `Order-intake.html`, saved it to a directory of its own, opened it over `file://` and read the `<h1>`, the drawing and both tables back. Also driven from the keyboard alone. |
| The page shows the same nodes and edges as the preview, with nothing dropped or mislabeled (5.2) | pass | Own hostile fixture: 8 nodes, 8 edges including a parallel pair. All 35 pieces of text the preview drew appear as visible text in the reopened export; 8 node rows, 8 edge rows, 8 drawn nodes, 8 drawn edges. A 300-node / 299-edge design exported whole — 268,943 bytes, ends in `</html>`, all 599 rows and 300 nodes present. |
| The file works alone: no stylesheet, script, font, or image is fetched from anywhere | pass | Stricter than the suite's own check: I collected **every** request the reopened file made, not only non-`file:` ones, and asserted the list equals exactly `[the document itself]`. Zero `link`, `script`, `img`, `iframe`, `object`, `embed` elements; exactly one `<style>`; the only absolute URL in the file is the SVG namespace. |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download | pass | `bun run test` 265/265 in 17 files; `bun run test:e2e` 53/53, of which 13 are the HTML export. I also mutation-tested the guard that matters most (below). |
| Every earlier test still passes; CI is green | pass | Both CI runs on PR #13 green: push-triggered 46s, pull_request-triggered 52s. CI runs `bun run check`, `bun run test` and `bun run test:e2e`. |
| Best-effort accessibility: the exported page has a title, headings, and the SVG title from Task 03 | pass | Audited a real exported file against `front-a11y`: `<html lang="en">`, `<title>`, headings h1, h2, h2, h2 with no level skipped, a `<main>`, the Task 03 `<title id="drawing-title">` and `<desc id="drawing-description">` behind `role="img"` and `aria-labelledby`, `<caption>` and `<th scope="col">` on both tables, **zero** inline `style` attributes, zero positive `tabindex`. 0 critical, 0 major, 0 minor. Upload page: `role="group"` named "Export the design", both buttons have visible text. |
| Any new environment variable is in `.env.example` with a placeholder | pass (vacuously) | A grep for `import.meta.env` and `process.env` across `src/` and `e2e/` returns nothing. `.env.example` holds no variables. Only `.env.example` is tracked. `gitleaks detect` over 20 commits: no leaks. |

### Command results

`bun run test`: **265 passed, 17 files** (was 240 / 15)

`bun run test:e2e`: **53 passed** (was 39)

`bun run check`: **0 errors, 0 warnings, 0 hints**

`bun run build`: **pass**, 1 page, static output in `dist/`

`bun run dev`: **pass** — serves on :4321, HTTP 200, the new button in the markup, no errors in the log

Secret scan: `gitleaks detect --source . --no-banner` — **no leaks found**, 20 commits, 945 KB

CI: **green** — https://github.com/IBatsios/map-data-structures/pull/13

### What I tried to break, and could not

**The escaping.** I did not reuse `markup-labels.json`; I wrote a harsher
fixture and exported it. Node labels that close the SVG, open an HTML comment,
close a CDATA section, break out of an attribute, close three elements at once,
and open a nested svg / foreignObject / body with `onload` handlers; edge labels
that close the style element and reopen it, and that close a table cell to open
a script; a design **title** that closes `title` and `style` and opens a script;
and — a vector the shipped fixture does not cover — a node **`type`** that is a
script element, which reaches both the box face and the Type column.

On the reopened file: 0 `script`, 0 `img`, 0 `iframe`/`object`/`embed`,
`document.scripts.length === 0`, exactly one `<style>`, exactly one `<svg>`,
**zero** attributes anywhere whose name begins `on`, zero dialogs, zero page
errors, and every one of those labels present as visible text. The ampersand-
first ordering is confirmed: a label that already reads as an escaped script tag
survives as the doubly-escaped text it said rather than being decoded.

Amon's account of the sanitiser is accurate, and the reason it is accurate is
structural — I confirmed `renderDrawing` creates no `style` or `script` element
and no `foreignObject`, and sets text only through `textContent`
(`renderDrawing.ts:361`), so the `innerHTML` read has no raw-text element to
serialise through. That is the property the whole approach rests on, and it
holds today by construction rather than by luck.

**The stylesheet guard.** The claim that a duplicated stylesheet is safe rests
entirely on `exportStyles.test.ts`, so I mutation-tested it: I changed
`--shape-fill` for the `service` band in `src/styles/drawing.module.css` from
`#eef1fe` to `#ff00ff` and re-ran. It failed with a clean diff naming the band.
The guard bites. Stylesheet restored.

**`straightLine`.** I judged the proof by reading dagre's own source rather than
taking the summary. `assignNodeIntersects` in
`node_modules/@dagrejs/dagre/dist/dagre.esm.js` skips an edge whose ends are the
same node and then, for every other edge, unconditionally unshifts the source
border intersection and pushes the target's — so at least two points, both on a
border. Note that skip: dagre deliberately adds **no** intersects to self-loops,
so leg 3 of the proof is not decoration, it is the leg that carries the weight —
and it holds, because `selfLoopSlots` (`selfLoops.ts:97`) assigns a slot to
every self-edge with no cap, so `readRoutedEdges` diverts all of them before the
dagre lookup.

Empirically I added my own detector — a route of exactly two points equal to the
two node centres — and ran it over shaped graphs (six self-loops on one node, a
complete graph on six nodes, a 300-node chain, a fan of 80, two-cycles,
triple-parallel edges) plus 2,000 fuzzed graphs: **0 fallbacks, minimum 3 points,
zero edges with exactly 2 points**. Verdict: the proof is sound, and keeping the
function as a guard is the right call.

**The rest of the adversarial pass.** Empty file, trailing comma, a file that is
not a design, a dangling edge, duplicate ids, a PNG renamed `.json` — after each
one **both** buttons are disabled together, and both re-enable together on a good
file. A design that parses with no nodes exports `Nothing-yet.html` with D51's
sentence, no `<svg>`, six table headings and no rows. A design title made of
markup yields a filename with no path separator, no traversal and no reserved
character.

### Observations for Amon — none blocking

1. **`docs/DECISIONS.md` D57 states a fact that is wrong, and the decision it
   justifies is still right.** D57 says `?raw` and `?inline` both come back as
   an empty string under this project's Vitest. I probed both. `?inline` is an
   empty string, as stated. **`?raw` is not** — it comes back as the CSS-Modules
   proxy stub: `typeof` `object`, `String()` on it throws "Cannot convert a
   Symbol value to a string", and reading `.length` returns the invented class
   name `_length_f9673f`. That makes the decision *stronger*, not weaker — a
   test written against `?raw` would have thrown a `TypeError` rather than
   passed on nothing — but a decision record is the project's memory, and this
   one is the justification for a duplicated stylesheet. Correct it by
   **appending** a row, never by rewriting D57.

2. **The per-file test counts in "Tests written" are each off by one.**
   `src/lib/toHtml.test.ts` runs **15**, not 16; `src/lib/exportStyles.test.ts`
   runs **10**, not 9. The total of 265 is right, and 240 + 15 + 10 = 265.
   Bookkeeping only.

3. **A label containing a literal NUL character loses that character in the
   export.** Found with a deliberately hostile label. The preview keeps it
   (`textContent` accepts it); the exported file carries the raw byte, and the
   HTML parser drops it on reopen — the preview's first codepoint is 0 and the
   export's is not. Every other exotic character I tried survives intact: the
   escape character, the right-to-left override, the zero-width space, Greek,
   Japanese, Arabic, and astral-plane characters. **I do not think this is
   fixable and I do not think it should be fixed**: a NUL has no valid
   representation in HTML at all — the numeric reference for it becomes the
   replacement character too — so the only remedy is to strip or substitute at
   the loader, which is exactly the tidying D39 and D56 rule out. Recording it
   so nobody rediscovers it as a mystery.

### Confirmed for Jared — the out-of-scope crash is real

`layoutDesign` throws on a valid design, exactly as reported. Amon's minimal
repro reproduces on demand: "Not possible to find intersection inside of the
rectangle". The cause is confirmed in dagre's own source — `intersectRect`
throws that message when the horizontal and vertical deltas between two box
centres are both zero, and it is reached from inside `assignNodeIntersects`,
that is, during `dagre.layout()`, when two boxes it routes between share a
centre.

Sizing it, since that is what a scheduling decision needs:

- My own fuzz, a different generator from Amon's: **2 of 2,000** random
  multigraphs (0.1%). Amon saw 7 of 400 (1.75%). Same class, generator-dependent
  rate — call it rare but not vanishing.
- **Exhaustive** over every multigraph on 2 nodes and on 3 nodes with up to 4
  edges: **zero** crashes. So it is not reachable by a small design. Both of my
  crashing shapes had 4 nodes and 10 to 11 edges, and both contained a two-cycle
  and a parallel duplicate, matching Amon's minimal case.
- It fails safely, as reported: the panel shows the engine's sentence, the page
  stays intact, no stale drawing is left. The user-facing fault is that a legal
  design cannot be drawn and the user hears dagre's words rather than the app's
  — the thing D43 otherwise prevents.

Worth its own cycle. Its natural neighbour is the deferred loader-wording chore
(`describeLoadError.ts:191` and `:193`), which lives in the same region.

### Fixed in place

Nothing. I found no typo, wrong import or bad assertion to correct. My hostile
fixture and adversarial spec were temporary and have been removed; the working
tree carries only the task file's checkboxes, its status line, and this report.

### Process note

I confirm Amon's disclosure that the RED step is not in a commit of its own: the
pre-commit hook runs `astro check` over the whole tree, so a commit holding a
test that imports a module which does not exist yet cannot be made. I can verify
the constraint but not the sequence, and I am recording it as disclosed rather
than as verified.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/13 — opened as a draft, as
the runbook asks. Sam marks it ready and merges; I did not.

---

## Verification and merge by Sam — round 1

### Document audit

| Document | State | Action taken |
|---|---|---|
| `docs/tasks/06-export-html.md` | All 7 boxes checked, `**Status:** done` | None needed |
| `README.md` | Export HTML documented, commands match `CLAUDE.md`, `bun run test` used correctly throughout | None needed |
| `CLAUDE.md` | Status section still read "Tasks 01 to 05" and described HTML export as future work | Updated: "Tasks 01 to 06", added the Export HTML paragraph, moved the "still to come" line to PDF and Word only |
| `docs/DECISIONS.md` | D55–D60 all present and dated; D57 states a fact that is wrong (see below) | Appended D61 correcting the fact, without rewriting D57, per the append-only convention since D32 |
| `.env.example` | No variables; code reads none | Confirmed with a fresh grep of `import.meta.env`/`process.env` across `src/`; none found. No change needed |
| Handoff doc (this file) | Jared's assignment, Amon's work, Jahmyr's report all present and legible | This section appended |

**D57 correction, independently verified before recording.** Jahmyr reported
that D57 states both `?raw` and `?inline` come back as an empty string under
this project's Vitest (`css: false`); `?inline` does, `?raw` does not. Before
writing D61, I reproduced this myself with a throwaway probe test
(`src/lib/__rawcheck.test.ts`, written, run, and deleted — not part of any
commit) importing `drawing.module.css` both ways under this project's real
`vitest.config.ts`. Result matched Jahmyr's exactly: `typeof raw` is
`'object'`, `String(raw)` throws `Cannot convert a Symbol value to a string`,
`raw.length` reads back the invented class name `_length_f9673f`, and the
`?inline` import is `''`. D61 records this and leaves D57 itself untouched.

**Per-file test count correction.** Amon's "Tests written" section says
`toHtml.test.ts` runs 16 and `exportStyles.test.ts` runs 9. Running both files
directly gives 15 and 10 (25 total, matching 240 + 25 = 265). Jahmyr flagged
this as bookkeeping-only and non-blocking; recording the corrected counts here
rather than editing Amon's historical section, for the same reason D57 is
corrected by addition rather than rewrite: `toHtml.test.ts` — **15**,
`exportStyles.test.ts` — **10**.

### Gates

`bun run test`: **pass** — 265/265, 17 files, run independently before and
after the doc-fix commit.

CI: **green** — both `test` checks on PR #13 passed twice: once before this
round's doc commit (the state Jahmyr signed off on) and once after, on commit
`93f0b07` (the doc-fix commit), before merging.

Secret scan: `gitleaks detect --source . --no-banner` — **no leaks found**,
run twice (before and after the doc-fix commit; 21 and 22 commits scanned
respectively).

### Merge

Squashed as `87fbf33` into `main`. Branch `feature/export-html` deleted. PR
https://github.com/IBatsios/map-data-structures/pull/13.

The doc fixes (D61, CLAUDE.md's Status section) were committed to
`feature/export-html` as `93f0b07` before merging, and CI was allowed to
re-run and go green on that commit before the PR was marked ready and merged.

### Left for a person

Nothing new from this round's document audit — the two corrections above were
handled within Sam's own remit (documents, not code or generated files).

The carried-forward items in the refreshed `docs/handoff-items/handoff-next-phase.md`
remain for a person or the next session to schedule, most notably the
`layoutDesign` crash on a valid design (D43-shaped, needs its own cycle) and
the loader-wording chore now gated to run before Task 10.
