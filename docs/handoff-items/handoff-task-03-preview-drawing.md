# Handoff — Task 03: Preview the generated drawing

**Date:** 2026-09-18
**Branch:** feature/preview-drawing
**Task file:** docs/tasks/03-preview-drawing.md
**Round:** 3 (rounds 1 and 2 tested by Jahmyr, changes requested both times)

## Assignment from Jared

### Scope

Task 01 drew boxes in a row. Task 02 made the file a validated `Design`. Task 03
is where the app finally does the thing it exists to do: a real, laid-out
drawing. This is the product's face — the PRD's whole premise is "I'd rather
write it in JSON than open draw.io", and this task is the first time the output
is worth comparing to draw.io at all.

Five pieces, in this order:

1. **Shapes.** Decide the set of node `type` values v1 draws and what each one
   looks like, guided by the owner's existing draw.io designs (intake 12.4).
   Record the set, and the default for a type you do not recognise, in
   `docs/DECISIONS.md`.
2. **Layout.** A pure function — `Design` in, a position and size for every node
   and a route for every edge out. No DOM, no `document`, no measuring against a
   live browser. Its test is written first, on a small design. This is the one
   piece Tasks 05 to 08 all consume, so it is a module in `src/lib/`, not code in
   a page.
3. **The SVG.** Replace the skeleton's row of boxes with a rendering of the
   layout: shapes per type, edges with arrowheads and their labels, an SVG that
   fits the page and carries a `<title>` naming the design.
4. **Typecheck (D17 closes here).** `typescript` and `@astrojs/check`, an
   `astro check` script, a CI step, and the line in the pre-commit hook.
5. **The first Playwright test and its CI step.** Load a small JSON file, assert
   every node label and every edge label is in the SVG.

Plus three carve-ins named in "Defects routed into this task" below — all small,
all in files this task is already rewriting.

**Explicitly out of scope, each already owned by another task:**

- **Validation messages** — wording, naming the line, naming the field, the
  "that is not JSON" case for a dropped PNG. Task 04. The page keeps the single
  fallback line in the status region. Do not build half of Task 04's feature.
- **Any export.** Markdown, HTML, PDF, Word are Tasks 05 to 08. The layout you
  write is their input, which is a reason to keep it pure and serialisable, not
  a reason to write an exporter now.
- **The schema page, `sample.json`, and "Load sample."** Task 09. You will want a
  fixture design to test against; put it under a test fixture path, not at a
  public URL, and do not link to it from the page.
- **Deployment.** Task 10.
- **Changing the schema.** `type` stays free text (D14, D18, D19). Do not
  tighten it to an enum — that would start rejecting files that load today, and
  the published shape belongs to Task 02's decisions and Task 09's schema page.
- **Editing or nudging the drawing in the browser.** The PRD rules it out
  explicitly: the JSON is the only editor.

### Acceptance criteria

Copied verbatim from `docs/tasks/03-preview-drawing.md`. These are the contract.

- [ ] As a user, I can preview the generated drawing in the browser: demonstrated end to end.
- [ ] Every node and edge in the JSON is visible in the drawing, with nothing dropped or mislabeled (5.2).
- [ ] The drawing appears within one second of choosing the file, for a design the size of the owner's use cases.
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright test runs in CI.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the SVG has a title, and label text has readable contrast against its shape.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one is expected to need no edit — nothing in the tree reads
`import.meta.env` or `process.env`, and nothing in this task adds a reason to.
Say so rather than inventing a placeholder.

### Files expected to change

A guide, not a cage.

| Path | Expected |
|---|---|
| `src/lib/layout.ts` (name your own) | New. The pure layout function. Exported, documented, no DOM. |
| `src/lib/layout.test.ts` | New. **Written first.** A small design in, known positions and routes out. |
| `src/lib/shapes.ts` or similar | New, if the type-to-shape mapping wants its own module. It is logic, so it wants to be testable. |
| `src/pages/index.astro` | The `<script>` loses its layout maths and gains a renderer driven by the layout module. Keep the script thin. |
| `src/styles/` | A CSS Module for the drawing, per D1 and D23's precedent. Do not style the SVG from a global sheet. |
| `playwright.config.ts` | New. `testDir` set explicitly — see "Watch out for". |
| `e2e/` (or `tests/e2e/`) | New. The first Playwright spec, plus its fixture JSON. |
| `.github/workflows/ci.yml` | `bunx playwright install --with-deps`, an e2e step, and the `astro check` step. |
| `.husky/pre-commit` | The typecheck line. |
| `package.json`, `bun.lock` | `typescript`, `@astrojs/check`, `@playwright/test`, and the layout engine **if and only if the user confirms one**. Commit the lockfile. |
| `src/lib/loadDesign.ts`, `src/lib/loadDesign.test.ts` | Carve-in 1 only — the comment and the assertion. No behaviour change. |
| `docs/DECISIONS.md` | The shape set, the layout engine (or the decision not to add one), the `astro check` command name, the Playwright `webServer` choice, and the D22 correction. |
| `README.md`, `CLAUDE.md` | Only if a command changed — and one did, so expect to touch these. |
| This handoff doc | Your "Work completed by Amon — round 1" section. |
| `.env.example` | Expected: no change. |

### Skills to load

From the task file's "Suggested skills" and `CLAUDE.md`:

- `coding-standards` — before the first file.
- `tdd-workflow` — the layout test before the layout function. Not negotiable;
  a layout function is exactly the kind of code that is easy to write and hard
  to trust without a test that pins real numbers.
- `frontend-design-direction` — `CLAUDE.md` names this skill for this task by
  name. Decide how the drawing should look *before* styling it.
- `make-interfaces-feel-better` — spacing, label sizes, arrowheads, once the
  layout works.
- `front-a11y` — the SVG title and the label contrast are an acceptance
  criterion, not a nicety.
- `e2e-testing` — the first Playwright test and its CI step.
- `front-review` — before you hand off, since this changes an exported page.
- `front-refactor` — the `<script>` block in `index.astro` is already 220 lines
  and this task both adds to it and takes away from it. If it grows past a
  screen after the layout moves out, that is the signal.

### Watch out for

#### The layout engine is a gate, not a choice you make alone

The task file says it plainly: *"The intake names no layout engine; ELK and
dagre are the common open-source choices for this, so confirm one with the user
before adding it."* That is a real gate. **Do not `bun add` a layout engine
until the user has confirmed which one**, and if no answer comes back, stop and
report rather than picking one quietly.

To make the question answerable, here is the shape of it as I read it. Three
options, all compatible with D7 (open-source only) and D8 (no paid services):

- **`@dagrejs/dagre`** — the maintained fork of dagre. Layered directed-graph
  layout, small, MIT. Closest fit to "boxes and arrows in a flow", which is what
  every use case in the PRD is.
- **`elkjs`** — far more capable, many more layout algorithms, but large (it is
  a compiled Java port) and licensed EPL-2.0 rather than MIT. Open source, so
  D7 is satisfied, but confirm the licence is acceptable given D2 puts our own
  code under MIT.
- **No engine at all** — a hand-written layered placement in `src/lib/`. The
  designs here are small (intake 11.1: one person at a time, small diagrams),
  the function has to be pure and testable either way, and this adds nothing to
  the bundle. It is more code to own and it will not do edge routing well.

Verify the licence and the maintenance status at the moment you add it, not from
this document. Whatever is chosen — including "none" — record it in
`docs/DECISIONS.md` with the reason.

#### Playwright will try to run the Vitest suite

Playwright's default `testMatch` matches `**/*.@(spec|test).?(c|m)[jt]s?(x)`,
which matches `src/lib/loadDesign.test.ts` and every other Vitest file in
`src/`. Set `testDir` explicitly in `playwright.config.ts` to the e2e folder.
If you do not, the first `bun run test:e2e` will try to drive a browser through
the unit tests and the failure will be confusing.

The mirror of this also matters: `vitest.config.ts` has
`include: ['src/**/*.test.ts']`, so keep e2e specs out of `src/` and Vitest
stays clean by construction.

#### `bun run test` stays Vitest-only

The pre-commit hook runs `bun run test`. If the e2e walk joins that script, the
hook starts a browser on every commit and the habit of committing dies. Give the
walk its own script — the task file names `test:e2e` — and wire CI to run both
as separate steps.

And the standing rule: **`bun run test`, never `bun test`.** Plain `bun test`
runs Bun's own runner and silently skips Vitest. Fix it wherever you find it
wrong.

#### The dev server, and why `astro preview` is probably the better webServer

The prior handoff flags that Astro 7's `astro dev` is a detached background
server. I checked the CLI on the installed version and the picture is slightly
more specific, which matters for Playwright's `webServer` config:

- backgrounding is opt-in via `--background`, with `astro dev stop|status|logs`
  to manage it;
- there is a **lock file**, evidenced by `--ignore-lock` ("Start the dev server
  even if another one is already running, without checking or writing the lock
  file"). A second dev server, or a stale background one nobody stopped, is
  therefore a live failure mode for an automated `webServer`.

My recommendation, which you should confirm or overturn with a reason: point
Playwright's `webServer` at **`astro build` + `astro preview`**, not `astro dev`.
This site ships as static files (D1, and `docs/ARCHITECTURE.md` "Built to static
files and served by Netlify"), so preview is what production actually is, it has
no lock file and no background-process semantics, and it removes a whole class
of flake from CI. The cost is a build before each e2e run. If you use `astro dev`
anyway, handle the lock and the detachment deliberately and say how. Either way,
record the choice in `docs/DECISIONS.md`.

#### D17 closing will surface errors, and that is the point

Nothing in this repo has ever been type-checked: `typescript` is not installed,
so neither `tsc` nor `astro check` has run, and the `.astro` `<script>` block is
the blind spot — no test imports it either. Expect `astro check` to report real
errors on existing code the first time it runs. Fix them; do not silence them
with `any` or `@ts-ignore` to get a green run. `tsconfig.json` already extends
`astro/tsconfigs/strict`, so the settings are in place and have simply never
been enforced.

Two practical notes:

- `astro check` needs the generated `.astro/types.d.ts`. If it or CI complains
  about missing generated types, `astro sync` is the step that writes them.
- Putting `astro check` in the pre-commit hook is what the `setup-pre-commit`
  skill asked for, and it is right. If it makes the hook slow enough to be
  resented, say so in your report with the number, and record the tradeoff you
  chose rather than quietly dropping the line.

This matters more this task than any previous one, because Task 03 moves real
layout logic into the page. Close the gate before you lean on it.

#### Do not drop the live region

`#upload-status` with `role="status"` must survive the rebuild of the drawing.
Task 04 designs messaging properly, but until then the success case gets its
only voice from that region — the file name and the node and edge counts land
there and get announced. Rebuilding the drawing must not take the region with
it, and must not stop writing to it.

#### Nothing dropped, nothing mislabeled — including bad data

Acceptance criterion 2 is the PRD's own line (intake 5.2). Two specific ways to
fail it:

- **An unrecognised `type` must still draw.** `type` is free text in the schema.
  If a file names a type your shape set does not cover, the node still gets a
  shape — a sensible default — and its label. It never silently disappears.
- **Do not launder bad data in the renderer.** If a label is whitespace-only
  (see the routed defect below), draw what the schema let through. Do not trim,
  do not substitute a placeholder, do not skip the node. A renderer that hides
  bad input is the same defect as one that drops good input, and it would hide
  the very thing Task 04 needs to see in order to fix it at the source.

#### The `renderEdge` guard moves and becomes an assertion

`renderEdge` in `index.astro` currently throws `No box was placed for the node
"…"` when a map lookup misses. Sam flagged it for you: when layout moves out of
the page, that guard moves with it and becomes an assertion about the app's own
invariant, not an error string shown to a user. The schema already rejects a
dangling edge (D20), so reaching it means the app broke its own guarantee.

#### One second, demonstrated not assumed

"The drawing appears within one second of choosing the file" is a criterion
someone has to actually observe. Decide what "a design the size of the owner's
use cases" means, say what you used, and measure it once. Do not build a
performance harness for it — intake 11.1 is one person at a time, and this is
not a task about throughput.

#### Prior decisions that bind this task

- **D1** — CSS Modules for styling. D23 set the precedent with
  `src/styles/upload.module.css`; follow it for the drawing.
- **D7, D8** — open-source libraries only, no paid services. Applies to the
  layout engine and to anything else you reach for.
- **D13** — CI is `oven-sh/setup-bun@v2` with `bun install --frozen-lockfile`.
  Any dependency you add changes `bun.lock`, and a stale lockfile fails CI at
  the install step. Commit the lockfile in the same commit as `package.json`.
- **D14, D18** — the design shape is final: `{ title, nodes: [{ id, label, type }],
  edges: [{ from, to, label }] }`. `from` and `to` read as the direction the line
  is drawn, which is also the direction the arrowhead points.
- **D15, D21** — the types stay hand-written in `src/lib/design.types.ts` as
  `Design`, `DesignNode`, `DesignEdge`. Never declare or import a bare `Node` in
  a module the page touches; it is a DOM global and you will silently get the
  wrong one. Note `design.types.ts` currently says *"`type` is free text until
  Task 03 gives it meaning"* — this is the task that gets to update that comment.
- **D16** — Prettier is configured to the scaffold's style and does not format
  `docs/` or `.claude/`. Do not re-run a formatter init.
- **D19, D20** — the validation rules and their staging. You inherit them; you
  do not change them here.
- **D22** — see carve-in 1; its premise is being corrected, not its design.

#### Process boundaries

- **Pushing and the pull request are Jahmyr's, not yours.** `.claude/settings.json`
  is the authority: Amon commits on `feature/preview-drawing` and stops there.
  Jahmyr pushes the branch, opens the pull request, and gets the CI signal. Sam
  merges. If you think you need to push to finish, you have found a problem to
  report, not a step to take.
- **Do not check the acceptance boxes.** Jahmyr checks them when he has
  exercised them. Leave `**Status:** in progress` alone; Sam sets it to done.
- **`docs/` is generated from `docs/intake.md`.** Append to the "Added after the
  build" table of `docs/DECISIONS.md`; do not rewrite task-file bodies, the PRD,
  the architecture doc, or the runbook.
- **Do not re-run `husky init`** — it writes `bun test` into the hook, and the
  hook must keep running Vitest, not Bun's runner.
- **Bun blocks dependency lifecycle scripts by default.** `package.json` already
  carries an `allowScripts` entry for `esbuild`; if a new dependency needs one,
  that is the existing pattern, and say in your report that you added it.
- **For Sam, recorded here so it is not rediscovered a third time:** the
  post-merge doc refresh goes through a `chore/…` branch and a pull request.
  `.claude/settings.json` denies `git push origin main:*`, so refreshing
  `docs/handoff-items/handoff-next-phase.md` after the merge cannot be a direct
  push to `main`.

### Defects routed into this task

Jahmyr recorded four defects while testing Task 02. None failed a Task 02
criterion. I have routed them; two are carve-ins here, two go to Task 04. Each
carve-in is small and lands in a file this task is already rewriting. None of
them is permission to start Task 04.

**Carve-in 1 — the Safari `JSON.parse` claim. Correct the record only.**
`src/lib/loadDesign.ts:41-43` and D22 claim `JSON.parse`'s message "names the
position … in every browser this app targets." That is true of V8 and false of
JavaScriptCore, which gives no position, line or column — so the claim is wrong
for Safari, a browser this desktop app plainly targets.
`src/lib/loadDesign.test.ts:135`'s `toMatch(/position \d+/)` can never catch it,
because Vitest runs on Node, which is V8. Do three things and nothing more:

1. Correct the doc comment at `loadDesign.ts:41-43` so it says what is actually
   true — the original error is preserved as `cause`, and a position is
   available on some engines, not all.
2. Loosen `loadDesign.test.ts:135` so the position is asserted as a bonus on
   this engine rather than as a cross-engine contract the test cannot see.
3. Append a row to `docs/DECISIONS.md` correcting D22's premise. D22's *design*
   stands — the loader still throws structured errors carrying what they carry.
   Do not edit D22 in place; the table is newest-at-the-bottom and the
   correction is its own row.

**Not in scope:** actually building a fallback message for an engine that gives
no line. That is Task 04's second acceptance criterion and its design work.
Jahmyr's point was that Task 04 must not be built on a false premise — fixing
the premise is this task's whole obligation here.

**Carve-in 2 — re-picking the same file does nothing.**
`src/pages/index.astro:96`. Re-picking an identical file fires zero `change`
events, so the drawing and the status region go stale while still asserting the
old load. Sam put it with "Task 04's messaging or Task 03's page work"; it is
Task 03's, for two reasons. It is one line (`fileInput.value = ''` after each
read) in a script you are rewriting anyway, and a Playwright walk that loads a
file twice — which is exactly how you would check the drawing refreshes after a
layout change — trips over it immediately.

**Routed to Task 04, not here — a dropped non-JSON file.**
`src/pages/index.astro:27`. `accept="application/json,.json"` filters the
*picker* only, so a dropped PNG's raw bytes reach `loadDesign` and a byte leaks
into the status region inside a `JSON.parse` message. This is a messaging defect
end to end — checking the type before parsing so the app can say "that is not
JSON" is Task 04's job and Task 04's wording. Task 03's only obligation is not
to make it worse: keep clearing the drawing on failure, as `showFile` does now.

**Routed to Task 04, with a decision attached — whitespace-only strings.**
`src/lib/design.schema.ts:35`. `z.string().min(1)` admits `"   "`, so a
whitespace-only label or id loads and a blank box draws. D19 justifies the "no
empty strings" rule as precisely what stops a blank box, so the rule
under-delivers on what the decision claims. That is a decision to make — tighten
to a non-blank check, or narrow D19's wording — not an obvious bug, and it
belongs with Task 04's pass over the validation story. Low severity. Task 03's
obligation is the one stated above under "Nothing dropped, nothing mislabeled":
draw it, do not launder it.

**Also standing, for Task 04 and confirmed correct by Jahmyr — D20.** Zod does
not run its cross-field refinement once a field has failed, so a file with both
a malformed field and a dangling edge reports only the field on the first pass.
The staging is right and is not a bug. Task 04 should design its message list
around that two-pass reality rather than assume every problem surfaces at once.
Nothing for Task 03 to do; recorded so it is not rediscovered.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

The app now does the thing it exists to do. Choose a JSON file and a laid-out
drawing appears: a silhouette per node kind, arrows with labels on their own
plates, and an SVG that scales to fit the page rather than overflowing it.

- **A shape vocabulary.** Six kinds — `service`, `database`, `queue`,
  `external`, `user`, `decision` — each with its own silhouette and colour
  band, each answering to a handful of aliases (`db`, `actor`, `topic`, …).
  `type` stays free text: anything else draws as a plain grey dashed rectangle,
  keeps its label, and prints its own type under it.
- **A pure layout function.** `layoutDesign(design)` in `src/lib/layout.ts`
  wraps `@dagrejs/dagre`. No DOM, no measuring, no clock. Out come top-left
  boxes and routes, normalised so the drawing always starts exactly one margin
  from the corner, in new objects sharing nothing with the design that went in.
  This is the one module Tasks 05 to 08 consume.
- **An SVG renderer** that decides nothing: geometry comes from the layout,
  colour from the CSS Module, and it takes the `Document` as an argument so the
  one impurity stays visible and `astro check` can see the whole thing.
- **D17 closed.** `typescript`, `@astrojs/check`, a `check` script, a CI step
  and the pre-commit line.
- **The first Playwright walk**: nine tests, its own `test:e2e` script, its own
  CI step, and `testDir` set explicitly.
- Both carve-ins, and no more than both.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/text.ts` + test | New. Estimates text width without a browser, and wraps without ever truncating. |
| `src/lib/shapes.ts` + test | New. The type-to-shape vocabulary. Never returns nothing, never throws. |
| `src/lib/layout.ts` + test | New. The pure layout function. The one input Tasks 05 to 08 share. |
| `src/lib/renderDrawing.ts` | New. The laid-out design as SVG. The only DOM in the drawing. |
| `src/lib/describeDrawing.ts` + test | New. The `<desc>` text, so `role="img"` does not hide the content. |
| `src/styles/drawing.module.css` | New. The drawing's look, reached through `data-` attributes per D23. |
| `src/styles/drawing.module.test.ts` | New. Measures every colour band against WCAG AA. |
| `src/pages/index.astro` | The script lost its layout maths; 220 lines of script down to about 135, all wiring. Plus carve-in 2. |
| `src/lib/design.types.ts` | The "free text until Task 03" comment, answered. |
| `src/lib/loadDesign.ts`, `loadDesign.test.ts` | Carve-in 1, comment and assertion only. No behaviour change. |
| `playwright.config.ts` | New. `testDir` explicit; `webServer` builds then serves `dist/`. |
| `e2e/drawing.spec.ts` | New. The walk. |
| `e2e/pages/uploadPage.ts` | New. The page object. |
| `e2e/staticServer.ts` | New. Serves `dist/` in the foreground — see "Known gaps". |
| `e2e/fixtures/*.json` | New. Three fixtures, under a test path, not a public URL. |
| `.github/workflows/ci.yml` | Typecheck step, browser install, e2e step, report artifact. |
| `.husky/pre-commit` | `bun run check`, between lint-staged and the tests. |
| `package.json`, `bun.lock` | `@dagrejs/dagre`; `typescript@^6`, `@astrojs/check`, `@playwright/test`, `@types/node`. Scripts `test:e2e` and `check`. |
| `docs/DECISIONS.md` | D24 to D33. |
| `README.md`, `CLAUDE.md` | Commands and status. |
| `.env.example` | **No change, as expected.** See below. |

### Tests written

118 Vitest tests (up from 46) and 9 Playwright tests.

**`text.test.ts`** — pins that width scales with length and font size, that
whitespace counts, that wrapping never loses a character, that every line fits,
that an over-long word is broken rather than allowed to overflow, and that
whitespace-only text comes back verbatim rather than trimmed away.

**`shapes.test.ts`** — pins a silhouette per kind, aliases resolving to a
canonical kind, case- and padding-insensitive lookup, that every known kind has
a distinct silhouette, and that an unknown, empty or blank type still gets a
shape instead of a throw.

**`layout.test.ts`** — pins node order, labels and types carried through
untouched, the shape each type resolves to, sizing (minimum width, wider for a
longer label, *taller* not wider past the text limit), top-to-bottom flow,
unconnected nodes sharing a row, no two boxes overlapping, every edge routed
from source box to target box, both of two edges between the same pair
surviving with their own labels, a self-edge routed, the label box sized to its
label, the drawing starting exactly at the margin, the canvas containing
everything, a lone node's exact geometry, an empty design still getting a
canvas, the input design not mutated, and determinism.

Three of those exist specifically to stop the renderer laundering data: a
whitespace-only label comes through untouched, an unrecognised type is still
placed, and duplicate edges are not collapsed.

**`describeDrawing.test.ts`** — pins that the description opens with the title,
names every node with its kind, reads every edge in arrow direction, uses
labels rather than ids, says so plainly for an empty design, and leaves out no
node whatever its label says.

**`drawing.module.test.ts`** — reads the stylesheet and measures each band's
label and type line against its own fill with WCAG's formula, plus a self-check
that the ratio function gives 21 for black-on-white and 1 for a colour against
itself. It also asserts every kind the drawing can produce has a band, so
adding a shape without a colour fails here rather than in someone's eyes.

**`drawing.spec.ts`** (Playwright) — every node and edge label present in the
SVG; the drawing inside one second; the title and `role="img"`; the description
carrying every label; the kind each type resolved to including
`widget-factory` becoming `unknown`; the status region's text and its
`role="status"`; a redraw on a different file; a redraw on the *same* file
twice (carve-in 2); and a cleared drawing plus a spoken failure when the file
is not a design.

### Local results

- `bun run test`: **pass**, 118 tests in 8 files.
- `bun run test:e2e`: **pass**, 9 tests, about 5s including the build.
- `bun run check`: **pass**, 0 errors, 0 warnings, 0 hints over 25 files.
- `bun run build`: **pass**.
- `bunx prettier --check`: clean.

### Decisions recorded

D24 to D33 in `docs/DECISIONS.md`: the layout engine and why it beat the other
two; the shape vocabulary and the unrecognised-type default; estimate-don't-
measure and grow-taller-not-wider; the CSS Module and its contrast test; the
SVG description; the `check` script and the TypeScript 6 pin; the Playwright
`webServer`; `testDir` and the Vitest/Playwright split; **D32**, the D22
correction as its own row; and the cleared file input.

### Known gaps

**I overturned the `astro preview` recommendation, and the reason matters.**
On the installed Astro (7.3.3) `astro preview` detaches with no flags at all:
it prints its URL, returns exit 0 in about three seconds, and leaves a
background process holding a lock file, which `astro preview status` then
reports as "(background)". Playwright watches the process it spawned, so it
reads that as "Process from config.webServer exited early" — I hit exactly
that, and then hit the orphaned server colliding with the next run. `astro dev`
behaves the same. The recommendation's *intent* was right and is kept: the walk
runs against `dist/`, which is what Netlify serves. Only the server changed —
`e2e/staticServer.ts`, foreground, no lock, dies with the run. Recorded as D30.
Worth a look on your side, because it also means the README's old claim that
only `dev` backgrounds was wrong; that is corrected now.

**The pre-commit hook is slower.** `astro check` takes about 5.8s and does not
cache — the same warm or cold. With lint-staged and `bun run test` a commit
goes from roughly 3s to roughly 9s. I kept the line, because the block it
covers is the page script, which is the exact blind spot D17 left open and the
exact place this task moved code through. The tradeoff is D29. If nine seconds
is resented, moving it to a pre-push hook is the obvious next step.

**`typescript` is pinned to `^6`, not 7.** TypeScript 7's native compiler does
not expose the programmatic API `astro check` drives; on 7.0.2 the command
refuses to start, and `@astrojs/check`'s peer range is `^5 || ^6` anyway.
`bun add -d typescript` resolves to 7 by default, so the caret range matters.

**Edge ends meet the bounding box, not the silhouette.** Dagre computes the
intersection with a node's *rectangle*, so on a diamond or a cylinder an
arrowhead lands a few pixels outside the drawn outline. Visible if you look for
it on a cylinder's top cap; not otherwise. Fixing it means clipping the route
against each silhouette, which is real work for a small gain, so I left it.

**A very long label still makes a very wide drawing.** Labels wrap at a maximum
text width so the box grows taller, but a design that is simply wide produces a
large canvas that the SVG then scales down to fit. Nothing is cropped or
hidden — it just gets small. Acceptable for the sizes intake 11.1 describes.

**Layout positions are pinned as relations, not pixels.** The tests assert
exact numbers for everything we compute — sizes, the margin, the canvas, a lone
node's geometry — but assert dagre's placement as relation (target below
source, unconnected nodes sharing a row, no overlaps). Pinning dagre's internal
coordinates would break on a dagre upgrade without telling us anything true. If
you would rather have a pixel snapshot too, say so and I will add one.

**`.env.example` needed no edit, as the assignment predicted.** Nothing in the
tree reads `import.meta.env` or `process.env` except `playwright.config.ts`,
which reads `CI` — set by GitHub Actions, not a variable this project owns. I
had briefly added a `PORT` override to the static server and took it back out,
so the claim that this project reads nothing from the environment is still
literally true.

**Accessibility audit is clean.** I walked `index.astro` against every rule in
`front-a11y`: label and input pairing, `lang`, `main`, heading order, valid
roles, no positive `tabindex`, no click-only `div`, no inline colour. The drop
zone's dragging cue changes border *style* as well as colour (D23) and the
unknown node kind is dashed as well as grey, so neither depends on telling
colours apart. The one thing I did *not* do is add a landmark around
`#drawing`; the SVG carries its own accessible name and description, and a
region wrapper for a single image felt like ceremony.

### Out-of-scope notes for Jared

**The page outside the drawing has no styling at all.** There is no global
stylesheet, so the heading and body copy render in the browser's default serif
while the drawing is sans-serif. Side by side it reads as two different
documents. That is pre-existing — Task 01 and Task 02 both left it — but Task
03 is the first task where the page has something worth looking at next to it,
so it is now visible. It wants a decision about global styling, which D1
constrains to CSS Modules and which I did not think was mine to make. Task 09
adds a second page and will hit the same thing.

**`role="status"` announces the count, but nothing announces that the drawing
changed.** The status region says "Loaded x.json: 7 nodes, 6 edges" and that is
the only announcement. A screen-reader user has to go and find the SVG to hear
its description. Task 04 owns the messaging; it may want to decide whether the
success message should also point at the drawing.

**Two edges between the same pair draw on top of each other.** The schema
allows it, the layout keeps both (there is a test), and dagre routes them — but
with identical endpoints the two routes overlap and only the upper label is
readable. Nothing is dropped, so intake 5.2 holds, and it is a rare file. If it
matters, it is an edge-bundling decision for whoever owns the drawing next.

**`astro check` has no incremental mode.** It re-checks everything every run,
which is the 5.8s above. If the tree grows, the pre-commit line is the first
thing that will hurt.

---

## Test report from Jahmyr — round 1

### Verdict

**Changes requested.** The task is one defect away from done. The path the PRD
is about — choose a JSON file, get a drawing back — works, and works well: I
loaded `e2e/fixtures/order-intake.json` in a real browser and looked at the
result, and all seven nodes are there in the silhouette their type implies, all
six edges are routed to the right boxes with readable labels, and nothing is
dropped. Six of the seven acceptance criteria are checked. CI is green on the
pull request, including the browser install and the e2e step.

What holds it back is one input the schema allows and the drawing gets wrong:
an edge from a node to itself is drawn as a line and an arrowhead floating in
empty space, touching neither end. That is a quietly wrong drawing rather than
a visibly broken one, which is the outcome this project's own schema comments
call the one thing the PRD rules out.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can preview the generated drawing in the browser: demonstrated end to end. | **pass** | Loaded `order-intake.json` through the real file input in Chromium against the built `dist/`, and looked at a full-page screenshot. Seven nodes, each in its own silhouette — hexagon for `user`, rounded rect for `service`, stadium for `queue`, cut corner for `external`, cylinder for `database`, grey dashed rect for the unrecognised `widget-factory`, which prints its own type under the label. Six arrows, each with its label on a white plate. Also drove the drop path: a `DataTransfer` drop gives "Loaded dropped.json: 1 node, 0 edges." |
| Every node and edge in the JSON is visible in the drawing, with nothing dropped or mislabeled (5.2). | **fail** | Holds for every design I threw at it except one. A self-edge routes detached from its node — see Defect 1. Everything else verified: whitespace-only labels draw verbatim, nothing trimmed; two edges between the same pair both survive *and* dagre bows them apart, so both labels are readable (better than "Known gaps" claims); an unrecognised type still draws; HTML and unicode in labels render as text, not markup, so `<b>bold</b>` shows literally and there is no injection. |
| The drawing appears within one second of choosing the file, for a design the size of the owner's use cases. | **pass** | A 25-node, 24-edge design: SVG visible **56ms** after the file was chosen. The 7-node fixture is well inside the spec's own 1000ms assertion. Even a deliberately oversized 150-node, 199-edge design draws in **502ms**. |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright test runs in CI. | **pass** | `bun run test` 118/118 in 8 files; `bun run test:e2e` 9/9. The e2e step ran on the pull request and passed on Linux — job log shows `Running 9 tests using 1 worker` then `9 passed (4.8s)`. The walk asserts through the page's own ids and `data-part` attributes, not hashed class names. One test inside it is weaker than its name — see Defect 1. |
| Every earlier test still passes; CI is green. | **pass** | The 46 tests from Tasks 01–02 are inside the 118. CI green on both the push and the pull-request run (43s each): Typecheck `Result (25 files): 0 errors, 0 warnings, 0 hints`; Test `118 passed`; `bunx playwright install --with-deps chromium` completed; Test end to end `9 passed`. |
| Best-effort accessibility: the SVG has a title, and label text has readable contrast against its shape. | **pass** | See "the contrast test, checked rather than trusted" below. Plus, in the browser: the live region exists in the static HTML before any text lands in it, the first Tab stop is `INPUT#design-file`, the SVG carries `role="img"` with `aria-labelledby` resolving to both `#drawing-title` ("Order intake") and `#drawing-description` (which names all seven nodes and all six edges in arrow direction), both ids unique. No horizontal overflow at an 800px viewport. No inline colour anywhere in the renderer. |
| Any new environment variable is in `.env.example` with a placeholder. | **pass** | Grepped `import.meta.env`, `process.env`, `Bun.env`, `Deno.env` across the tree. The only hits are `process.env.CI` in `playwright.config.ts`, which GitHub Actions sets and this project does not own. `.env.example` correctly still says the project reads nothing. `.env*` is gitignored with `!.env.example`; the only tracked env file is the example. |

### Command results

`bun run test`: **118 passed, 8 files**, 380ms
`bun run test:e2e`: **9 passed**, 5.0s including the build
`bun run check`: **0 errors, 0 warnings, 0 hints** over 25 files
`bun run build`: **pass**, 1 page in 446ms
`bun run dev`: **pass** — HTTP 200, page serves the file input, no errors in the log
`bunx prettier --check .`: clean
Secret scan: **gitleaks, 14 commits scanned, no leaks found**
CI: **green** — https://github.com/IBatsios/map-data-structures/actions/runs/35348368272

### Defects for Amon

**1. `src/lib/layout.ts:274` (and `src/lib/layout.test.ts:219-228`) — a self-edge
is routed outside the node it loops on, so it draws as a line and an arrowhead
in empty space.**

An edge whose `from` and `to` are the same node is valid: the Task 02 schema's
uniqueness and dangling-edge refinements both accept it, and `layout.test.ts`
has a test for it, so it is in scope by your own reckoning.

Expected: the route starts and ends on the node's own outline, so a reader can
see it loops back on itself.

Actual: the route lies entirely outside the node. For the design
`a(service) -> b`, `a -> b`, `a -> a`, node `a` occupies x 28..160, y 28..90,
and the self-edge's points come back as

```
[{328,28},{328,28},{262,59},{196,90},{196,90},{262,59},{262,59}]
```

— every one of them at x >= 196, at least 36px clear of the node's right edge.
On screen it is a short diagonal stroke with an arrowhead pointing at nothing,
plus a "loops to itself" plate beside it. It also inflates the canvas to 426px
wide to hold a route that means nothing where it sits.

Cause: dagre keeps self-loops out of its normal edge routing and parks a stub
beside the node for the consumer to replace with its own loop path. `layout.ts`
passes dagre's points through verbatim, as it correctly does for every ordinary
edge, so the stub reaches the renderer as if it were a route.

Why the suite did not catch it: `layout.test.ts:219-228`, "routes an edge that
points a node at itself", asserts only
`expect(layout.edges[0]?.points.length).toBeGreaterThanOrEqual(2)`. A detached
stub satisfies that. The neighbouring test that checks an edge runs from source
box to target box is the assertion this case needs and does not get. I left the
assertion alone rather than strengthening it, because tightening it turns the
suite red on a branch I am handing back — but it should be tightened as part of
the fix, to assert a self-edge's first and last points touch the node's own box.

Smallest honest fix is probably to detect `edge.from === edge.to` in the routing
step and synthesise a loop against the node's own geometry, which the layout
already has, rather than trusting dagre's points for that one case.

**2. `src/lib/layout.ts:193` — edge labels never wrap, so one long edge label
shrinks the whole drawing.**

`nodeSize` at `layout.ts:171` wraps with
`wrapText(node.label, MAX_TEXT_WIDTH, LABEL_FONT_SIZE)`, so a long node label
makes a taller box. `edgeLabelSize` at `layout.ts:193` calls
`estimateTextWidth(label, EDGE_LABEL_FONT_SIZE)` with no wrap at all, so an edge
label's plate grows without bound.

Expected: an edge label behaves like a node label — it wraps, and its plate
grows taller.

Actual: a 300-character edge label produces a plate roughly 2,250px wide. The
canvas grows to match, and because the SVG scales to fit `max-width: 100%`, the
entire drawing — every node, every other label — is shrunk to near-illegibility
to make room for one label. Nothing is dropped, so this is not a criterion
failure, and realistic edge labels are short. But it is an asymmetry with no
reason behind it, and one line from being consistent.

Worth correcting in the record too: "Known gaps" says "Labels wrap at a maximum
text width so the box grows taller". That is true of node labels only.

**3. `src/lib/describeDrawing.ts` — the spoken description says "a external",
"a user", "a unknown".**

The accessible description renders as "Payments provider, a external" and
"Ledger feed, a widget-factory". Cosmetic, and only a screen-reader user hears
it, but it is the one part of the drawing that is read aloud. It needs an
article that agrees with the following word; `describeDrawing.test.ts` pins the
current phrasing, so the test moves with it.

### What I checked specifically because you asked

**The contrast test measures what it claims — verified by mutation, not by
reading.** I changed the `unknown` band's `--shape-text` back to a light grey
(`#8b93a3`) and re-ran: `drawing.module.test.ts` failed with
`expected 2.802703425369002 to be greater than or equal to 4.5`, naming the
band. Reverted. So the test genuinely reads the stylesheet and genuinely
measures. I also recomputed every band independently with my own implementation
of the WCAG formula and the numbers agree: labels 11.1:1 to 14.1:1, type lines
4.54:1 to 6.29:1, edge label on its plate 12.6:1 — all clear AA. The wiring is
honest too: the test reads `--shape-fill`, `--shape-text` and `--shape-stroke`,
and those are the variables `[data-part='shape']`, `[data-part='label']` and
`[data-part='type']` actually consume, on elements that inherit them from the
`data-kind` group. One note, not a defect: the `database` type line is
**4.54:1**, four hundredths above the threshold. Any future darkening of that
fill fails the test, which is the test working.

**D30 holds. Overturning the `astro preview` recommendation was right, and I
reproduced the evidence.** On this Astro (7.3.3), `bunx astro preview` with no
flags at all:

- returned **exit 0 after 3,533ms**;
- printed `Preview server running at http://localhost:4321 (pid 20320)`;
- `astro preview status` then reported `(pid 20320, uptime 8s, background)`;
- and the orphan was really serving — `curl` got **HTTP 200** from it after the
  command had already exited. It took `astro preview stop` to kill it.

Playwright's `webServer` watches the process it spawned, so a command that exits
in 3.5s is exactly the "Process from config.webServer exited early" you hit, and
the surviving listener on 4321 is exactly what collides with the next run.
`--background` being documented as opt-in is what made the original
recommendation reasonable; the flag simply does not describe the behaviour. I
confirmed `bun run dev` detaches the same way (pid 11652, needed
`astro dev stop`). `e2e/staticServer.ts` is the right answer, it still serves
`dist/` so it still tests what Netlify will serve, and it is not a toy: the
`resolveWithin` containment check decodes `%2e%2e%2f` before resolving and
refuses anything that lands outside `dist/`.

**CI, the thing most likely to go red on GitHub rather than locally, is green.**
Both runs passed in 43s. The step you flagged,
`bunx playwright install --with-deps chromium`, completed on `ubuntu-latest`
under `oven-sh/setup-bun@v2` — it switched to root, installed the apt
dependencies and fetched the browser — and the e2e step then ran the full walk
headlessly: `Running 9 tests using 1 worker` then `9 passed (4.8s)`. The
four-step order — typecheck, unit, browser install, e2e — works as written.

**The carve-ins are done, and done narrowly.** Carve-in 1: the doc comment at
`loadDesign.ts` now says the message and the `cause` are the contract and a
position is a bonus some engines give, naming JavaScriptCore explicitly; the
assertion in `loadDesign.test.ts` is guarded by
`if (/position \d+/.test(original.message))`; D32 is its own row and D22 is
untouched. No fallback message was built — correctly left to Task 04. Carve-in
2: `forgetChosenFile` clears the input after every read in a `finally`, so it
also clears after a failure, and the Playwright walk loads a file, then a
second, then the first again and asserts both the title and the status line.

### Adversarial pass

Every one of these went through the real file input in Chromium, with
`pageerror` and console errors collected. **No uncaught errors in any case.**

| Input | Result |
|---|---|
| Empty file, 0 bytes | No drawing, status "That file could not be drawn: Unexpected end of JSON input" |
| Truncated JSON | Same, drawing cleared |
| `null`, a bare array, or an object with no `nodes` | "That file could not be drawn: That JSON file is not a design." |
| Valid design with no nodes and no edges | Draws an empty SVG, status "0 nodes, 0 edges" — matches the schema's stated intent |
| Whitespace-only labels and types | Drawn verbatim, nothing trimmed or laundered |
| Duplicate edges between one pair, plus a self-edge | Both parallel edges drawn and separated, both labels readable; the self-edge is Defect 1 |
| A 34-character unbroken word as a node label | Wrapped across 6 lines, nothing truncated |
| A 300-character edge label | Defect 2 |
| 150 nodes and 199 edges | Draws in 502ms, nothing dropped; scaled down by `max-height: 75vh` to the point of illegibility, with no zoom or scroll affordance. Beyond the sizes intake 11.1 describes, so not a defect — but a product question for whoever owns the drawing next |
| HTML and unicode in labels | Rendered as text, never as markup. No injection path |

### Fixed in place

None. All three defects change behaviour, so they are Amon's. I did not tighten
the weak self-edge assertion either, for the reason given in Defect 1.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/5 — draft, base `main`, CI
green. Left as a draft for Sam; I did not mark it ready and did not merge.

### Notes for Jared, not defects

Everything routed out of scope, I agree is out of scope. Confirmed by looking:
the page outside the drawing really does render in the browser's default serif
next to a sans-serif drawing, and it reads as two documents. One correction in
Amon's favour — two edges between the same node pair do **not** draw on top of
each other; dagre separates them and both labels are readable.

---

## Work completed by Amon — round 2

### What was built

The three defects from Jahmyr's round 1 report, and nothing else.

- **A self-edge now loops on the node it points at.** `layout.ts` routes that
  one case itself instead of passing dagre's stub through: out of the node's
  right border, around, and back into it, with the arrowhead landing on the box
  and the label clear of the loop and level with the node. For the design
  Jahmyr reported it on, node `a` occupies x 28..160 and the loop now runs
  `[{160,48.67},{194,48.67},{194,69.33},{160,69.33}]` — both ends on the border,
  where they were 36px clear of it before. The canvas that held the meaningless
  route shrinks with it, from 426px wide to 356.
- **An edge label wraps**, at the same text limit a node label does, and its
  plate grows taller rather than wider. Jahmyr's 300-character label made a
  plate about 2,250px wide; it now makes one 230px wide and 11 lines tall, with
  every character still in it and the rest of the drawing still at full size.
- **The spoken description agrees its article**: "an external", "an unknown",
  "an actor", but still "a user" and "a service".

Nothing else in the drawing moved. Everything Jahmyr confirmed good — D30 and
the foreground static server, the contrast test, the CI shape, both carve-ins —
is untouched, and `database`'s 4.54:1 type line is untouched too: no colour,
fill or stroke changed this round.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/layout.ts` | `selfLoop` routes a self-edge against its own node's box; `edgeLabelPlate` wraps an edge label and reports the lines; `LayoutEdge` carries `labelLines`; `SELF_LOOP_EXTENT`, `EDGE_LABEL_LINE_HEIGHT` and `EDGE_LABEL_PADDING` are exported geometry. |
| `src/lib/layout.test.ts` | The weak self-edge assertion replaced, two self-edge tests, three edge-label wrapping tests, one helper. |
| `src/lib/renderDrawing.ts` | `edgeLabelText` draws an edge label on the lines the layout wrapped it onto, the way `nodeText` already did. |
| `src/lib/describeDrawing.ts` | `articleFor` picks `a` or `an` by the sound of the type that follows. |
| `src/lib/describeDrawing.test.ts` | Two tests: the article agrees; a whitespace-only type is still described as it was written. |
| `e2e/drawing.spec.ts` | The self-edge walk, in a real browser, against the box the browser drew. |
| `e2e/pages/uploadPage.ts` | `nodeBox` reads a node's `getBBox`; `routePoints` reads a route's corners back off its path. |
| `e2e/fixtures/retry-loop.json` | New. Two nodes, two parallel edges and a self-edge — the shape the defect was found on. |
| `docs/DECISIONS.md` | D34, D35, D36. |
| `README.md`, `CLAUDE.md` | **No change.** No command changed this round; both are still true. |
| `docs/tasks/03-preview-drawing.md` | **No change.** Criterion 2 stays unchecked and the status line stays `in progress`. |
| `.env.example` | **No change.** Still nothing in the tree reads `import.meta.env` or `process.env` but `playwright.config.ts`'s `CI`. |

### Tests written

124 Vitest tests (up from 118) and 10 Playwright tests (up from 9).

**`layout.test.ts`**

- *loops a self-edge against the node it points at, not out in empty space* —
  replaces the assertion that only asked for two points, which a detached stub
  satisfied. It pins both ends of the route to the node's own right border, pins
  each end inside the node's vertical span, requires the two ends to differ, and
  pins the reach in between to exactly `SELF_LOOP_EXTENT` past the border, so
  the loop is attached at both ends and visible in between.
- *keeps every part of a self-edge beside the node it loops on* — Jahmyr's own
  design (`a -> b`, `a -> b`, `a -> a`). Every point of the loop is within the
  node's own neighbourhood, and the label plate is clear of the loop and level
  with the node's middle.
- *keeps a short edge label on one line* — the ordinary case, unchanged.
- *wraps a long edge label, so its plate grows taller and not endlessly wider* —
  the plate is never wider than the text limit plus its padding, and a long
  label makes a taller plate than a short one.
- *loses no word from an edge label it had to wrap* — wrapping is not
  shortening.

**`describeDrawing.test.ts`**

- *agrees the article with the type it is about to say* — `external`, `unknown`
  and `actor` take "an"; `user` and `service` take "a".
- *still says something for a type that is nothing but spaces* — the description
  launders no more than the drawing does.

**`drawing.spec.ts`**

- *loops a self-edge against the node it points at* — loads `retry-loop.json`
  through the real file input, asserts all three edges and every label are
  drawn, then reads the node's box back with `getBBox` and the route's corners
  back off the path the renderer wrote, and asserts both ends of the loop land
  on that box and that the loop reaches past it in between.

### Local results

- `bun run test`: **pass**, 124 tests in 8 files, 410ms.
- `bun run test:e2e`: **pass**, 10 tests, 5.1s including the build.
- `bun run check`: **pass**, 0 errors, 0 warnings, 0 hints over 25 files.
- `bun run build`: **pass**, 1 page in 471ms.
- `bunx prettier --check .`: clean.

Both new tests were watched failing first, and for the right reason. The unit
test failed with the self-edge's first point at x 298.5 against a node border at
160 — the detached stub, in numbers. The walk was checked by mutation rather
than trusted: with the loop routing disabled and the site rebuilt, it failed
with the route's first point 196.5px clear of the node, measured in Chromium,
and passed again when the routing was restored.

I also looked at both fixed cases in a browser: the loop reads as a loop, with
its arrowhead on the box and "retries on failure" beside it, and a
106-character edge label wraps into a four-line plate with the rest of the
drawing still at full size.

### Decisions recorded

D34, D35 and D36 in `docs/DECISIONS.md`: the layout routing self-edges itself
and why dagre's points are right for every other edge and wrong for that one;
edge labels wrapping at the node label's limit; and the article rule in the
spoken description, recorded as the heuristic it is rather than as a dictionary.

### Known gaps

**The loop is anchored to the node's bounding box, not its silhouette.** Same
known gap as round 1 and the same cause: on a cylinder or a diamond the two ends
of a loop land a few pixels outside the drawn outline, because the box is what
the layout knows. Consistent with every other edge end in the drawing; fixing it
means clipping against each silhouette, which is one piece of work for all of
them rather than something to do for self-edges alone.

**The loop always leaves from the right.** A node with a self-edge and something
already drawn immediately to its right would share that lane — dagre reserves
one there for exactly this edge, and `SELF_LOOP_EXTENT` plus the label gap stays
inside `NODE_SEPARATION` so the loop cannot reach a neighbour's box, but the
label plate is as wide as its text and could in principle overlap a plate in the
next lane. I did not see it happen; a design would have to be crowded in a
particular way.

**The article rule is a heuristic and will meet an initialism it gets wrong.**
"an ui" is the shape of the failure: a written vowel that is spoken as a letter
name. Every kind in the shape vocabulary and every alias of one comes out right,
which is what the test pins. The alternative is a word list pretending to know
every noun a user might type, which is worse.

**Wrapped edge labels are several `<text>` elements, one per line.** The
drawing's `<desc>` still carries each label whole, so nothing a screen reader
hears changed, but a test that reads `text` elements and looks for a whole label
will only find one that fitted on a line. `drawing.spec.ts` is written that way
and is fine — every label in the fixtures is short — and it is worth knowing
before someone adds a long one to a fixture and is puzzled.

### Out-of-scope notes for Jared

**Everything I left alone in round 1 is still true and still out of scope**: the
page outside the drawing has no styling, `role="status"` announces the count but
nothing announces that the drawing changed, and `astro check` has no incremental
mode. Jahmyr's correction stands — parallel edges do *not* draw on top of each
other — so that note from round 1 can be dropped.

**Edge labels sit beside their route rather than on it, by dagre's default.**
`labelpos: 'r'` with `labeloffset: 10` is dagre's default for an edge label, so
every plate is offset to one side of its line rather than centred on it. It is
consistent across the drawing and arguably better than covering the line — but
`drawing.module.css` says the plate exists because "without it the label sits on
top of its own line", which is not what is happening. Nothing to fix; worth
knowing before someone changes one and expects the other.

**A very wide design still scales down to fit.** Unchanged by this round, and
now the only remaining way the drawing gets small: a design that is simply wide
produces a large canvas that the SVG scales to fit the page. Nothing is cropped.
Jahmyr's 150-node case is beyond the sizes intake 11.1 describes, and he raised
the same product question — whether a large drawing wants zoom or scroll. Still
a decision for whoever owns the drawing next, not a defect.

---

## Test report from Jahmyr — round 2

### Verdict

**Changes requested.** All three round 1 defects are genuinely fixed — I watched
each one in a real browser, not in a test report. The self-edge now leaves
`Delivery worker`'s right border, loops, and lands its arrowhead back on the
box; a 130-character edge label wraps into a six-line plate with every other
node still at full size; the spoken description says "an external" and "a user".
Six of seven criteria pass, and CI is green on the pull request with 124 Vitest
and 10 Playwright tests on Linux.

Criterion 2 still fails, on one input, for a new reason the fix introduced.
`selfLoop` ignores which self-edge it is routing, so **every self-edge on the
same node is drawn at exactly the same coordinates**. Two loops on one node
render as one loop with one readable label; the other is underneath it and
invisible. Dagre was reserving a separate lane per self-edge and the old code
was passing those lanes through — so this is the half of the routing that moved
in-house without bringing the lane with it.

It is one small, well-understood change away, and I would rather say so now than
check a box that a two-edge fixture disproves.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can preview the generated drawing in the browser: demonstrated end to end. | **pass** | Loaded `order-intake.json` and `retry-loop.json` through the real file input in Chromium against the built `dist/`, and looked at full-page screenshots of both. All seven nodes in their own silhouettes, six labelled arrows, nothing dropped. Unchanged from round 1. |
| Every node and edge in the JSON is visible in the drawing, with nothing dropped or mislabeled (5.2). | **fail** | The round 1 case is fixed and verified in the browser: `retry-loop.json` gives a loop whose route is `M 195 48.67 L 229 48.67 L 229 69.33 L 195 69.33` against a node box the browser reports as x 28..195, y 28..90 — both ends exactly on the border, both inside the vertical span, `marker-end="url(#drawing-arrowhead)"` on the route. But two self-edges on one node draw byte-identical `d` attributes and overlapping plates, and one label disappears under the other. See Defect 1. |
| The drawing appears within one second of choosing the file, for a design the size of the owner's use cases. | **pass** | 150 nodes and 199 edges: SVG visible **157ms** after the file was chosen, all 150 node groups and all 199 edge groups present in the DOM. The layout function alone is 75.7ms on that design and 2.9ms on twenty self-loops, so the wrapping added per edge costs nothing measurable. |
| Tests cover the behavior, as a user would observe it, and pass; the Playwright test runs in CI. | **pass** | `bun run test` 124/124 in 8 files; `bun run test:e2e` 10/10. CI job log shows `Running 10 tests using 1 worker` then `10 passed (5.1s)` after `bunx playwright install --with-deps chromium`. The new walk asserts against `getBBox` and the path the renderer wrote, which is the right instrument — it measures the drawing, not the layout's own opinion of it. |
| Every earlier test still passes; CI is green. | **pass** | 118 to 124 with no test removed or weakened; the replaced self-edge assertion is strictly stronger. CI green on both the push and the pull-request run: Typecheck `Result (25 files): 0 errors, 0 warnings, 0 hints`, Test `124 passed`, Test end to end `10 passed`. |
| Best-effort accessibility: the SVG has a title, and label text has readable contrast against its shape. | **pass** | Verified rather than trusted. In the browser: `role="img"`, `aria-labelledby="drawing-title drawing-description"` resolving to both, no duplicate ids on the page, first Tab stop still `INPUT#design-file`, no horizontal overflow at 800px. I recomputed every contrast band from the stylesheet with my own WCAG implementation: labels 11.12:1 to 14.08:1, type lines 4.54:1 to 6.29:1 — `database` is still **exactly 4.54:1**, unmoved, as claimed. `git diff` confirms zero lines changed in any `.css` or `.astro` file this round. The `<desc>` still carries each edge label whole even when the plate wraps it. |
| Any new environment variable is in `.env.example` with a placeholder. | **pass** | Re-grepped `import.meta.env`, `process.env`, `Bun.env`, `Deno.env` across `src/`, `e2e/` and the root configs. The only hits are `process.env.CI` in `playwright.config.ts`, which GitHub Actions sets and this project does not own. `.env.example` correctly still says the project reads nothing. |

### Command results

`bun run test`: **124 passed, 8 files**, 397ms
`bun run test:e2e`: **10 passed**, 5.2s including the build
`bun run check`: **0 errors, 0 warnings, 0 hints** over 25 files
`bun run build`: **pass**, 1 page in 468ms
`bunx prettier --check .`: clean
Secret scan: **gitleaks, 20 commits scanned, no leaks found**
CI: **green** — https://github.com/IBatsios/map-data-structures/actions/runs/35351398473

### Defects for Amon

**1. `src/lib/layout.ts:356` (`selfLoop`), reached from `layout.ts:319-322` —
every self-edge on the same node is routed to identical coordinates, so the
second one is invisible underneath the first.**

`selfLoop(edge, node, plate)` derives its whole route from the node's box and
nothing else. Two self-edges on one node therefore produce the same four points
and the same label origin, and the renderer draws one on top of the other.

Expected: two self-edges on a node read as two loops with two readable labels,
the way two parallel edges between two nodes already do — round 1 confirmed
dagre bows those apart and both labels stay readable.

Actual, measured in Chromium on a two-loop fixture:

```
route[0] "M 195 48.66666666666667 L 229 48.66666666666667 L 229 69.33333333333334 L 195 69.33333333333334"
route[1] "M 195 48.66666666666667 L 229 48.66666666666667 L 229 69.33333333333334 L 195 69.33333333333334"
plate[0] x 237 y 47  148x24   ("retries on failure")
plate[1] x 237 y 47  163x24   ("escalates after five")
```

Identical routes, co-located plates. Because the plate is opaque and the second
is the wider of the two, it covers the first completely: the screenshot shows
one loop labelled "escalates after five" and no trace of "retries on failure".
The file says three edges, the drawing shows two.

Cause, and the part worth knowing: **dagre was already reserving a lane per
self-edge, and the round 2 change stopped reading it.** Driving dagre directly
with the same graph — two self-edges on `a`, node `a` at x 0..132 — it returns
stubs at x 281.5 and x 404, with label centres at 270 and 396. That is two
distinct lanes about 122px apart, which is why the pre-fix drawing put two
readable (if detached) labels on screen. `readRoutedEdges` now short-circuits to
`selfLoop` before it ever calls `graph.edge(...)` for that edge, so the lane
dagre picked is discarded along with the stub that was wrong.

The narrow fix is to give `selfLoop` the ordinal of this edge among the
self-edges on that node and step out by it — `border + SELF_LOOP_EXTENT * (n+1)`
for the reach, and the label origin with it — or to keep reading dagre's label
`x` for the self-edge and hang the loop off that, which uses the lane dagre has
already sized to the label. The room exists either way; only the offset is
missing.

Reproduce with this as a fixture:

```json
{
  "title": "Two loops",
  "nodes": [
    { "id": "worker", "label": "Delivery worker", "type": "service" },
    { "id": "outbox", "label": "Outbox", "type": "queue" }
  ],
  "edges": [
    { "from": "worker", "to": "worker", "label": "retries on failure" },
    { "from": "worker", "to": "worker", "label": "escalates after five" },
    { "from": "worker", "to": "outbox", "label": "reads batch" }
  ]
}
```

I did not commit it — the test comes first, and it is yours to write. Note that
both new unit tests use a design with exactly one self-edge, which is why they
stayed green through this.

### What I checked specifically because you asked

**The `NODE_SEPARATION` claim holds, and holds better than the argument for it.**
The worry was that the loop could reach a neighbour. It cannot, and not only for
the 34 + 8 < 48 reason given: dagre sizes the self-edge's reserved lane to the
*label*, so a long label widens the lane rather than pushing the plate into the
next one. On a four-sibling rank with a self-loop on the middle node, the plate
lands at x 562..614 with the next node at 650..782. With a 74-character
self-edge label the plate lands at 382..612 and the next node at 648..780. I
checked every node box against every route point and every plate against every
other plate, programmatically, on both designs: no collision.

**Nothing you said was untouched, was touched.** `git diff fccde52..HEAD` over
`*.css`, `*.astro`, `.github/`, `.husky/`, `package.json`, `e2e/staticServer.ts`
and `playwright.config.ts` is **zero lines**. So D30's foreground static server,
the four-step CI order, both carve-ins and every colour band are the ones I
verified in round 1, and the contrast numbers I recomputed confirm it.

**The wrapping does not shorten anything.** A 300-character unbroken label wraps
to 11 lines that rejoin character-for-character identical to the original; a
400-character one to 14 lines, identical; a 99-character word-y label to 4 lines
with every word preserved; CJK text to 6 lines, identical.

### Adversarial pass

Through the real file input in Chromium, collecting `pageerror` and console
errors. **No uncaught errors in any case.**

| Input | Result |
|---|---|
| Empty file, 0 bytes | No drawing, "That file could not be drawn: Unexpected end of JSON input" |
| Truncated JSON | Same, drawing cleared |
| `null` | "That file could not be drawn: That JSON file is not a design." |
| Parses but has no nodes | Empty SVG, "0 nodes, 0 edges" — the documented intent (D19) |
| 150 nodes, 199 edges | 157ms, all 150 nodes and all 199 edges drawn |
| Two self-edges on one node | **Defect 1** |
| One self-edge, empty label | Loop drawn, 14px plate, correct |
| Self-edge on a lone node | Loop drawn against the node, canvas 274x134 |
| Self-edge in a crowded rank, short and long label | No collision with any neighbour |
| 300 and 400 character edge labels, unbroken | Wrapped, nothing lost, drawing stays full size |
| CJK edge label | Wrapped, nothing lost |
| Edge label of tabs, newlines, or a few spaces | Preserved verbatim |

One note, not a defect: an edge label of **80 consecutive spaces** now comes back
as `['']` rather than 80 spaces, because wrapping splits on words and drops the
separators. This is pre-existing `wrapText` behaviour that node labels have had
since round 1, it is only newly reachable from edge labels, and it is invisible
to a reader either way — blank is blank, and the plate is now 14px instead of
2,250px, which is an improvement. Worth a line in `text.ts`'s doc comment, whose
"whitespace-only text comes back as it went in" is true only of text short
enough not to wrap. Not worth a round.

**Known gaps I confirmed rather than re-litigated:** "an ui" is wrong, as
documented — so is nothing else I tried; `api`, `actor`, `external`, `unknown`,
`user`, `service`, `queue`, `database`, `worker` and a hyphenated unknown type
all come out right. Loop ends meet the bounding box rather than the silhouette,
the same as every other edge end. Both are recorded as gaps and neither is a
criterion failure.

### Fixed in place

None. The one defect changes routing behaviour, so it is Amon's.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/5 — pushed
`fccde52..dd8ba05`, CI green on the pull-request run. Still a draft, for Sam. I
did not mark it ready and did not merge.

---

## Work completed by Amon — round 3

### What was built

The one defect from Jahmyr's round 2 report, and nothing else.

- **Two self-edges on one node are now two loops with two readable labels.**
  Each self-edge knows which loop on its node it is: the n-th reaches
  `SELF_LOOP_EXTENT` further out than the one inside it *and* meets the border
  further from its middle, so an outer loop wraps around an inner one rather
  than tracing over its arms and landing its arrowhead on the same pixel. On
  Jahmyr's own fixture the two routes are now

  ```
  route[0] "M 195 48.67 L 229 48.67 L 229 69.33 L 195 69.33"
  route[1] "M 195 38.33 L 263 38.33 L 263 79.67 L 195 79.67"
  plate[0] x 271 y 32  148x24   ("retries on failure")
  plate[1] x 271 y 62  163x24   ("escalates after five")
  ```

  against a node box of x 28..195, y 28..90 — both loops still anchored on the
  border at both ends, both inside the node's vertical span, and the plates 6px
  clear of each other instead of on the same spot. The file says three edges and
  the drawing shows three.

- **A node's label plates are stacked in one column past its widest loop.**
  Stepping each plate out with its own loop was my first cut, and it was wrong
  for a reason worth recording: an opaque plate that steps out sits across the
  loops outside it and cuts their lines. I saw it in a screenshot before I
  believed the numbers. One column past the widest loop is clear of every
  stroke, and the vertical stack is what keeps the plates off each other.

- **A node with one self-edge is drawn exactly where it was.** It is the first
  loop in a stack of one, so every constant falls back to its round 2 value:
  reach 229, ends at 48.67 and 69.33, plate at x 237..385 y 47..71 — the numbers
  Jahmyr verified in Chromium, unmoved. I checked the `retry-loop.json`
  screenshot against his description as well as the arithmetic.

Nothing else moved. No `.css`, no `.astro`, no CI, no hook, no dependency, no
colour — `git diff fccde52..HEAD` over `*.css`, `*.astro`, `.github/`,
`.husky/`, `package.json`, `bun.lock`, `e2e/staticServer.ts` and
`playwright.config.ts` is still **zero lines**, so `database`'s 4.54:1 is still
4.54:1.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/layout.ts` | `selfLoopSlots` works out which loop on its node each self-edge is and where its plate sits in the stack; `selfLoop` takes that slot and steps its reach, its band and its plate by it. `SELF_LOOP_PLATE_GAP`, `SELF_LOOP_BAND` and `SELF_LOOP_BAND_INSET` are the new geometry, all module-private. |
| `src/lib/layout.test.ts` | The two-loop test, plus `edgeAt` and `reachOf` helpers so it reads as prose rather than optional chaining. |
| `e2e/drawing.spec.ts` | The same case in a real browser, against the `d` the renderer wrote and the plates the browser laid out. |
| `e2e/pages/uploadPage.ts` | `routePath` reads an edge's `d` verbatim (`routePoints` now parses that); `plateBox` reads a label plate's own box back with `getBBox`. |
| `e2e/fixtures/two-loops.json` | New. Jahmyr's repro fixture, committed with the test that needed it. |
| `src/lib/text.ts` | Doc comment only, per his note: wrapping rebuilds a line from its words, so 80 consecutive spaces come back as `['']`. No behaviour change. |
| `docs/DECISIONS.md` | D37. |
| `README.md`, `CLAUDE.md` | **No change.** No command changed this round; both are still true. |
| `docs/tasks/03-preview-drawing.md` | **No change.** Criterion 2 stays unchecked and the status line stays `in progress`. |
| `.env.example` | **No change.** Still nothing in the tree reads `import.meta.env` or `process.env` but `playwright.config.ts`'s `CI`. |

### Tests written

125 Vitest tests (up from 124) and 11 Playwright tests (up from 10). Nothing was
removed, weakened or renamed.

**`layout.test.ts` — *draws two self-edges on one node as two loops, neither
hiding the other***. Jahmyr's design, three edges. It pins all three labels in
file order; both loops anchored on the node's right border at both ends with
every point inside the node's vertical span; the two routes *not* deeply equal;
the second loop reaching further than the first; the two loops meeting the
border at different heights; and — the assertion the defect needed — the two
label plates not overlapping, and neither overlapping the node.

**`drawing.spec.ts` — *draws two self-edges on one node as two loops a reader
can tell apart***. The same file through the real file input in Chromium: every
node and edge label present, three edge groups drawn, the two `d` attributes not
byte-identical, both loops' ends on the box `getBBox` reports, and the two
plates' own boxes not overlapping. It measures the drawing, not the layout's
opinion of the drawing.

### Local results

- `bun run test`: **pass**, 125 tests in 8 files, 394ms.
- `bun run test:e2e`: **pass**, 11 tests, 5.0s including the build.
- `bun run check`: **pass**, 0 errors, 0 warnings, 0 hints over 25 files.
- `bun run build`: **pass**, 1 page in 450ms.
- `bunx prettier --check .`: clean.

**Both tests were watched failing first, on the unfixed code.** The unit test
failed with `expected [ …(4) ] to not deeply equal [ …(4) ] — Compared values
have no visual difference`, which is the defect stated in one line. The walk
failed with `expect(received).not.toBe(expected)`, the expected value being the
`d` Jahmyr quoted, and Playwright's failure screenshot shows one loop, one label
reading "escalates after five", and no trace of "retries on failure" — his
report as a picture. Both went green on the fix, and I looked at the result in a
browser afterwards: two nested loops, two arrowheads landing at different points
on the border, both labels legible, no line cut by a plate.

**Collision swept programmatically, not assumed**, over four designs: the two
loops above; two loops (one with a 56-character label) on the middle node of a
four-sibling rank; five loops on one node; and the single-loop `retry-loop`
shape. Every label plate against every other, every plate against every node
box, and every route point against every node box it does not belong to. **No
collisions in any of them.** On the crowded rank the widest plate ends at x 826
with the next node starting at 1006, which is the lane dagre reserved doing its
job.

### Decisions recorded

**D37** in `docs/DECISIONS.md`: the per-self-edge lane — why the ordinal was the
missing piece, why the band steps as well as the reach, why the plates share one
column instead of stepping out with their loops, and the correction to D34's
account of the room (dagre reserves one lane *per self-edge*, each sized to that
edge's label, not the single `NODE_SEPARATION` gap D34 named). D34 is left
untouched; the table is newest-at-the-bottom.

### Known gaps

**Past the third loop on one node, the ends stop moving.** The band is clamped
2px inside the node's top and bottom, so on a 62px box loops four and five meet
the border where loop three does. They still reach further out, so their routes
are still distinct and their labels still stacked and readable — swept above, no
collisions — but the nesting stops being the cue past three. A node with four
self-edges is not a design I expect to see; the clamp is there so no end ever
lands outside the box it is supposed to be attached to.

**The loop is still anchored to the node's bounding box, not its silhouette.**
Unchanged from rounds 1 and 2, and the same as every other edge end in the
drawing. Fixing it means clipping routes against each silhouette, which is one
piece of work for all of them rather than something to do for self-edges alone.

**Which label belongs to which loop is positional, not drawn.** The plates are
stacked in file order — the first loop's label on top — beside loops nested in
the same order. With two loops it reads; with five it is a column of labels
beside a set of nested rectangles and nothing joins them but the order. A leader
line would fix it, and is more drawing than this defect asked for.

### Out-of-scope notes for Jared

**`src/lib/layout.ts` is now 625 lines.** Inside the 800-line ceiling, past the
200–400 that is meant to be typical, and the self-edge routing is the obvious
seam — `selfLoop`, its slots and its four constants are about 130 lines that
answer to one idea and are consumed through one call. I did not split it on the
round that has to land. Worth doing before Tasks 05 to 08 start reading this
module in earnest.

**Everything I left alone in earlier rounds is still true and still out of
scope**: the page outside the drawing has no styling, `role="status"` announces
the count but nothing announces that the drawing changed, `astro check` has no
incremental mode, edge labels sit beside their route rather than on it by
dagre's default, and a very wide design still scales down to fit.

---

## Test report from Jahmyr — round 3

### Verdict

**Pass.** The round 2 defect is fixed, and I verified it by looking at the
drawing rather than at the test that claims it. All seven acceptance criteria
now hold; criterion 2 is checked and `**Status:**` is `done`.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can preview the generated drawing in the browser | pass | Loaded eight designs through the real file input in Chromium — the four committed fixtures plus four of mine. Every one drew. |
| Every node and edge is visible, nothing dropped or mislabeled (5.2) | **pass** | My own probe, not Amon's test: for each design, node and edge counts against the JSON; every label matched against the file (whitespace-collapsed, since long labels wrap); every route `d` distinct; a geometric sweep for any plate painted over an earlier plate or label; and `document.elementFromPoint` over a 24x6 grid on every `<text>`, requiring the browser to name that text as topmost somewhere. Zero occlusions across `two-loops` (3 edges, 3 drawn), `retry-loop`, `order-intake`, `billing-run`, five-loops-on-one-node, a crowded four-sibling rank with two 56-char loop labels on the middle node, three duplicate edges between the same pair, and a 120-node / 129-edge design with 10 self-loops on one node. Screenshot at 4x confirms two nested loops, two distinct arrowheads, two readable stacked labels. |
| Drawing appears within one second | pass | Measured from `setInputFiles` to the last node being present: `order-intake` 69 ms, the 120-node/129-edge design 98 ms. |
| Tests cover the behavior and pass; Playwright runs in CI | pass | 125 Vitest, 11 Playwright locally. CI log shows the `Test end to end` step: `Running 11 tests using 1 worker` / `11 passed`. |
| Every earlier test still passes; CI is green | pass | Both PR check runs green. `astro check` 0 errors over 25 files; `bun run build` clean; `prettier --check` clean. |
| Best-effort accessibility: SVG title, readable contrast | pass | `<title>` = "Order intake", `role="img"`, `<desc>` names every node and its type. Computed every label's contrast against the fill actually painted under it: worst is 4.91:1 (`queue`), above the 4.5:1 AA floor. |
| Any new environment variable is in `.env.example` | pass | Grepped the whole tree for env reads: the only hits are `process.env.CI` in `playwright.config.ts`, which CI sets, not a user. The app reads nothing. `.env.example` says exactly that. |

### What I did to try to break it

- **Empty file** and **malformed JSON** (`{ "title": "Broken", "nodes": [ `): both give `That file could not be drawn: Unexpected end of JSON input`, clear the drawing, and raise no uncaught page error.
- **Valid JSON with no nodes**: `Loaded no-nodes.json: 0 nodes, 0 edges.` and an empty SVG. No crash.
- **Recovery**: a good file chosen after a bad one draws correctly.
- **Duplicate edges** — three edges with identical `from`, `to` and `label`: three distinct routes, three readable plates.
- **Large file** — 120 nodes, 129 edges including 10 self-loops on one node: everything drawn, nothing occluded, 98 ms.

### The "single self-edge is unchanged" claim

Verified directly rather than taken on trust. I dumped `layoutDesign` over all
fixtures at `225d492` (the round 2 commit I signed off) and at HEAD and diffed
the two:

- `billing-run.json` and `order-intake.json`: **identical**, not one character.
- `retry-loop.json`: identical except two `y` values that moved from
  `69.33333333333334` to `69.33333333333333` — one unit in the last place, about
  1.4e-14 px, from `node.y + (height * 2) / 3` becoming `middle + band`. Not
  "byte-for-byte" as Amon wrote, but not a difference any reader or renderer can
  see. Noted for accuracy, not as a defect.
- `two-loops.json`: matches the numbers in his round 3 notes exactly — routes at
  reach 229 and 263, plates at x 271, y 32 and y 62.

I also confirmed the new unit test is genuinely RED against the old code: with
`src/lib/layout.ts` reverted to `225d492`, `draws two self-edges on one node as
two loops, neither hiding the other` fails on
`expected [ …(4) ] to not deeply equal [ …(4) ]` — the exact assertion he said
he watched fail.

### Command results

`bun run test`: 125 passed, 8 files, 0 failed.
`bun run test:e2e`: 11 passed.
`bun run check`: 0 errors, 0 warnings, 0 hints over 25 files.
`bun run build`: complete, 1 page.
`bunx prettier --check .`: all matched files use Prettier code style.
`bun run dev`: serves `http://localhost:4321` with HTTP 200, no errors; stopped after.
Secret scan: `gitleaks detect --source . --no-banner` — 24 commits, 515 KB, **no leaks found**.
CI: green. Both runs on PR #5, `Test end to end` reporting `11 passed`.

### Defects for Amon

None.

### Observations, not defects

- **Five loops on one node reads as three.** Confirmed at 4x zoom: with the band
  clamped from the fourth loop on, loops 3, 4 and 5 share their top and bottom
  arms and only their right-hand verticals differ, so the group reads as one
  wide rectangle with dividers. All five routes are distinct and all five labels
  are readable, so criterion 2 holds as written — and Amon disclosed this. Worth
  a line in the backlog with the leader-line idea, not a change now.
- Amon's 4.54:1 figure for `database` was against the node's own fill; measuring
  against what is actually painted under that text I get 4.99:1. Either way it
  clears 4.5:1.

### Fixed in place

None. Everything I wrote to test this — my verification specs, the adversarial
fixtures and a layout-dump script — lived outside the repo or was deleted, and
the working tree was clean before I pushed.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/5 — pushed
`225d492..f22193d`, CI green on both runs. Still a draft. I did not mark it
ready and I did not merge.
