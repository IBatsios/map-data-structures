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
