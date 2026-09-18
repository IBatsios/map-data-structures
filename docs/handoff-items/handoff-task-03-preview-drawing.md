# Handoff — Task 03: Preview the generated drawing

**Date:** 2026-09-18
**Branch:** feature/preview-drawing
**Task file:** docs/tasks/03-preview-drawing.md
**Round:** 1

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
