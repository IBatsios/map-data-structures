# Handoff — Task 05: Export as Markdown

**Date:** 2026-09-18
**Branch:** feature/export-markdown
**Task file:** docs/tasks/05-export-markdown.md
**Round:** 1

## Assignment from Jared

### Scope

An **"Export Markdown" button next to the preview** that downloads a `.md` file
named after the design, holding the design's title, a table of its nodes, a
table of its edges, and the drawing as a fenced `mermaid` flowchart block.

Three pieces, and the middle one outlives this task:

1. **`toMarkdown`** — a pure function turning a loaded design into the text of
   the file. Its test is written first.
2. **The shared download helper** — the piece Tasks 06, 07 and 08 all reuse,
   per the runbook's "Delivers" column for this task. Read the next section
   before you shape it; its shape matters more than this one export does.
3. **The button and its wiring** in `src/pages/index.astro`, plus the Playwright
   walk's download assertion.

**The Mermaid question is settled. Do not re-ask it.** The task file's step 2
says "confirm with the user that Mermaid is acceptable" — that confirmation has
already happened. The user was asked how the drawing should appear inside the
exported `.md` and chose a fenced ` ```mermaid ` flowchart over a linked image
and over doing both: it is self-contained, travels with the file, and renders
natively on GitHub and GitLab, which is where "drops into a repo or wiki"
points. Build against that. `mermaid` is in `CLAUDE.md`'s skill list for exactly
this block — load it. Record the choice as a decision row in `docs/DECISIONS.md`.

**Out of scope, explicitly:**

- **HTML, PDF and Word.** They are Tasks 06, 07 and 08 and each has its own
  cycle. Build the download helper so they can reuse it; do not build them.
- **`straightLine` at `src/lib/layout.ts:329`.** Parked — see "Watch out for".
- **The Firefox/SpiderMonkey wording fault** (`describeLoadError.ts:191`,
  `:193`), **`loadDesign.ts`'s lagging doc comment**, and
  **`loadDesign.test.ts:146`'s conditional assertion**. All three are routed to
  their own small cycle after this one. That routing is confirmed unchanged this
  cycle: they are one module family, all three are cosmetic or test-hygiene, and
  folding loader fixes into an exporter feature would blur what this PR is for.
  Do not open those files.
- **Styling the page outside the drawing.** It is still default serif beside a
  sans-serif drawing. Task 09 adds the second page that makes that decision
  worth taking once. Style the button enough that it is legible, labelled and
  keyboard-reachable; do not start a page-wide type and colour pass here.
- **Loading a sample file.** The task file's step 4 says "load the sample" —
  there is no shipped `sample.json` yet; that is Task 09. Walk the story with an
  `e2e/fixtures/` design instead.

### The shared download helper, which is the durable half of this task

Three constraints that come from the tasks after this one, not from this one:

- **It must carry bytes, not just text.** Markdown and HTML are strings; PDF and
  Word are binary. A helper that only takes a string gets rewritten in Task 07.
  Take a `Blob` (or data plus a media type) so all four formats fit.
- **It must take its `Document` as a parameter**, the way
  `renderDrawing(layout, doc)` already does. This repo's Vitest suite has no DOM
  environment configured at all — no test in `src/` touches `document` — and the
  pattern that has held so far is pure logic unit-tested in Vitest, DOM work
  verified in Playwright. Follow it rather than adding a DOM environment to
  Vitest inside an exporter task. That split is also why this task's acceptance
  criteria pair unit tests with a Playwright download check.
- **It must revoke the object URL it creates.**

**Naming the file is the other shared piece.** `<design>.md` means the design's
`title`, and Tasks 06–08 need the same name with a different extension, so the
name-building belongs beside the helper rather than inside `toMarkdown`. Decide
and record: how a title becomes a filename, and what happens when a title is all
punctuation and slugifies to nothing. A blank title cannot reach you (D39
refuses it), but `"***"` can.

### Acceptance criteria

Copied verbatim from `docs/tasks/05-export-markdown.md`. These are the contract.

- [ ] As a user, I can export the design as Markdown: demonstrated end to end.
- [ ] The file lists every node and edge the preview shows, with the same labels (5.2).
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright test from Task 03 now also clicks this button and checks the download.
- [ ] Every earlier test still passes; CI is green.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one is almost certainly satisfied by changing nothing: this app reads
no environment variables and this task adds none. Confirm it rather than assume
it, and say so.

### Files expected to change

A guide, not a cage.

| File | Why |
|---|---|
| `src/lib/toMarkdown.ts` + `.test.ts` | new: the renderer, test first |
| `src/lib/download.ts` + `.test.ts` | new: the shared helper and the filename rule; the pure part is what the unit test can reach |
| `src/pages/index.astro` | the button, and holding the loaded design so the button has something to export |
| `e2e/pages/uploadPage.ts` | a locator for the button and a download accessor |
| `e2e/drawing.spec.ts` or a new `e2e/export.spec.ts` | the download assertion; your call which, but say why |
| `docs/DECISIONS.md` | append-only: the Mermaid choice, the filename rule, anything else you had to decide |
| `docs/tasks/05-export-markdown.md` | Jahmyr checks the boxes, not you |
| `README.md`, `CLAUDE.md` | only if a command or the "What works today" story changed |
| `.env.example` | expected: unchanged |

`src/lib/shapes.ts`, `src/lib/layout.ts` and the drawing modules should not need
to change. If you find yourself editing `layout.ts`, stop and say why first.

### Skills to load

From the task file's "Suggested skills" and `CLAUDE.md`:

- **`mermaid`** — the flowchart block, against the fenced form the user chose.
- **`tdd-workflow`** — the renderer's test before the renderer. Every task here
  writes the test first.
- **`e2e-testing`** — extending the Playwright walk with a download assertion.
- **`coding-standards`** — before the first file, for naming and structure.
- **`front-review`** — before the PR, because this adds a control to an exported
  page.
- **`front-a11y`** — best effort, because this task has a screen.
- **`make-interfaces-feel-better`** — the button's label and placement once it
  works.

### Watch out for

**Reuse `shapes.ts` for the Mermaid node shapes; do not re-derive them.**
`shapeForType(node.type).kind` already maps free-text types onto the six kinds
(D25), and `LayoutNode.shape.kind` carries the answer the preview used. Mermaid
has a shape for each — rounded, cylinder, stadium, hexagon, diamond — and a
plain rectangle for everything else, which is exactly the fallback `shapes.ts`
already gives. Keying off that module is what keeps the `.md` and the SVG from
ever disagreeing about what kind a node is. Re-deriving the mapping is a second
source of truth, and it will drift.

**`flowchart TD` matches the preview.** `src/lib/layout.ts:212` sets dagre's
`rankdir: 'TB'`, so top-to-bottom is the direction the user just looked at.

**Mermaid syntax is the real risk in the renderer, and it is a correctness risk,
not a security one.** A design's node ids and labels are free text that the
schema only checks for non-blankness (D19, D39). Ids may hold spaces and
punctuation that Mermaid will not accept as ids; labels may hold quotes,
brackets, braces, parentheses, or the literal `-->`. A file that silently fails
to render on GitHub fails criterion 1 as surely as a missing node does. Mint
safe ids of your own and keep the user's text in the label, quoted and escaped.
Test the ugly cases: a label with a `"` in it, an id with a space, a label that
contains `-->`, a type nobody has heard of.

**Take the acceptance criterion about labels literally.** "Every node and edge
the preview shows, with the same labels" — the preview draws from
`layoutDesign`, which keeps every node and every edge in file order with its
label untouched. Passing the layout into `toMarkdown` gets you that file order
and the resolved `shape.kind` for free, which is the argument for the
`toMarkdown(design, layout)` shape the task file sketches — the geometry is
unused, but the resolved kinds are not. If you end up not needing the layout at
all, say so rather than taking the parameter just to match the sketch.

**A design with no nodes and no edges is valid** (D19). Decide what its `.md`
holds — two empty tables, and what kind of Mermaid block — and make sure the
block you emit is not broken. `e2e/fixtures/empty.json` exists.

**Two Task 04 behaviours the export must respect.** Whitespace-only strings are
refused while interior spaces are preserved (D39): `"  Public API  "` keeps its
spaces, so the `.md` and its Mermaid label should keep them too rather than
trimming on the way out. And a file-kind check refuses non-JSON files before
they are opened (D40). Neither is yours to change.

**The page holds no state today, and this task needs it to.** `showDrawing` in
`src/pages/index.astro` computes design → layout → SVG and discards the design
and the layout on the way out. The export button needs the design that is
currently on screen. Hold it — and this is the part that will bite — **clear it
when a file fails.** `showProblems` empties the drawing; if it does not also
drop the held design, the button will happily export the previous design while
the screen shows an error panel. Decide what the button does before any design
has loaded: absent, or present and disabled. Either is defensible; a button that
downloads an empty file is not.

**`layout.ts` has five consumers, not four.** `renderDrawing.ts`,
`describeDrawing.ts`, `index.astro`, `layout.test.ts`, and
`describeDrawing.test.ts:5`. Yours is the sixth. Keep the count right in
whatever you write down.

**Know the shape of the net before you add to it.** The chore's two new test
files (`selfLoops.test.ts`, `normaliseDrawing.test.ts`) are additive and close
real gaps `layout.test.ts` never covered — three of thirteen deliberate
mutations (7, 10, 12) are caught only by them. The suite is 206 Vitest and 31
Playwright, all passing on `main` at `8d7ceb0`.

**`straightLine` at `src/lib/layout.ts:329` stays parked — my call, and here is
the reasoning so it is not re-litigated.** It falls back to dagre's *centres*
while every other route runs border to border, so an arrowhead on that path
would land inside a box. Both Amon and Jahmyr flagged it as "worth a look when
an exporter draws arrowheads, which starts with Task 05." It does not start with
Task 05. This export's drawing is a Mermaid block, and Mermaid computes its own
layout — the `.md` never reads `LayoutEdge.points`, so no arrowhead in this
task's output comes from that fallback. Two further reasons to leave it: the
preview already draws arrowheads from those points today, so the exposure is
neither new nor this task's to have created; and it is unreachable through
`layoutDesign` across 19 designs including a 300-node one, so touching it would
change the surface the chore just proved byte-identical, for nothing anyone can
see. **It is routed to Task 06**, the HTML export, which is the first exporter
to embed the SVG itself — I will name it in that assignment. Do not fix it here,
and do not let it grow into a layout refactor inside an exporter task.

**Prior decisions that bind this task:** D7 and D8 — open-source libraries only,
no paid services. Note that emitting a fenced ` ```mermaid ` block needs **no
new dependency at all**: you are writing text, not rendering a diagram. If you
think you need a package, justify it before adding one. D14/D18 fix the JSON
shape. D25 fixes the six kinds. D46 records the layout split — import from
`./layout`, which is the sole public door; never reach into `selfLoops.ts`,
`normaliseDrawing.ts` or `layout.types.ts` directly.

### The commands, exactly

`bun run test` runs Vitest. Plain `bun test` runs Bun's own runner and is the
wrong command; write `bun run test` every time, and correct it if you find it
written wrong anywhere. `bun run test:e2e` runs the Playwright walk and stays
out of `bun run test` on purpose (D31) — the pre-commit hook runs the latter,
and a hook that starts a browser stops being run. `bun run check` is the
typecheck.

### Two process points, reproduced by hand each cycle

These are not yet in agent configuration — that proposal is still with the user,
and no agent edits agent config. So they are written out here:

1. **Amon, you do not push and you do not open the pull request.** Push and PR
   are Jahmyr's, after the test and debug pass. Commit on
   `feature/export-markdown` and hand back.
2. **Sam's documentation refresh routes through its own `chore/…` branch and its
   own pull request**, not a direct commit to `main`.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.
