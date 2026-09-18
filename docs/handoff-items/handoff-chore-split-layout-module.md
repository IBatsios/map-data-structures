# Handoff — Chore: split `src/lib/layout.ts`

**Date:** 2026-09-18
**Branch:** chore/split-layout-module
**Task file:** none — see "Why this has no task file"
**Round:** 1

## Assignment from Jared

### Why this cycle, and why now

I routed this split to its own `chore/` cycle during Task 04, and Sam listed it
first in `docs/handoff-items/handoff-next-phase.md`. I am running it now rather
than deferring it, for one reason that is about cost and not about tidiness.

`layout.ts` has four consumers today: `renderDrawing.ts`, `describeDrawing.ts`,
`src/pages/index.astro`, and `layout.test.ts`. Task 05 adds the first exporter,
and Tasks 06, 07 and 08 add three more — all four read `layoutDesign`, which is
what makes intake 5.2 ("every export format shows the same content as the
preview") true by construction. This is the last moment when the module has the
fewest readers it will ever have again. A behaviour-preserving split is cheapest
now and gets monotonically more expensive with every exporter that lands on top
of it.

The file is 625 lines: inside `CLAUDE.md`'s 800 ceiling, past the 200–400 that is
meant to be typical. Both Amon and Jahmyr flagged it independently, across two
tasks. It is not a defect and nothing fails because of it, which is exactly why
it gets a `chore/` cycle rather than a carve-in to a feature task.

### Why this has no task file

`docs/` is generated from `docs/intake.md`, and this chore is not in the intake,
so there is no `docs/tasks/NN-*.md` for it and I am not adding one — a hand-written
file there would be lost on the next regenerate. **This handoff doc is the whole
contract.** The acceptance criteria below are mine, not the intake's.

Task 05's status stays `ready`. It is not started by this cycle and its own
branch comes later, from `main`, after this merges.

### Scope

Split `src/lib/layout.ts` along the seam that is already there, **changing no
behaviour whatsoever**. `layoutDesign` takes the same input and returns byte-for-byte
the same output when this is done.

**Required — the self-edge routing module.** This is the seam both Amon and
Jahmyr named. Move out, into a new module of your own naming under `src/lib/`:

| Piece | Line today |
|---|---|
| `SELF_LOOP_EXTENT`, `SELF_LOOP_LABEL_GAP`, `SELF_LOOP_PLATE_GAP`, `SELF_LOOP_BAND`, `SELF_LOOP_BAND_INSET` and their doc comments | ~71–100 |
| `SelfLoopSlot` | 379 |
| `selfLoopSlots` | 404 |
| `loopsByNode` | 429 |
| `plateTopOf` | 448 |
| `selfLoop` | 471 |

That is about 135 lines answering to one idea — "a node's n-th loop" — reached
through two calls from `readRoutedEdges` (`selfLoopSlots` at line 340, `selfLoop`
at line 347).

One piece genuinely straddles the seam: **`PreparedEdge` (line 371) is built by
`readRoutedEdges` at line 335 and read by four of the six functions above.** Either
export it from the new module and have `layout.ts` import it, or keep it in
`layout.ts` and have the new module import it. Your call — I mention it so you
meet it as a known crossing rather than as evidence the seam is not clean.

**Permitted, only if it comes out as cleanly.** The normalisation and canvas
group: `offsetToMargin`, `everyX`, `everyY`, `shiftBox`, `shiftEdge`, `canvasFor`,
and `DRAWING_MARGIN` (lines ~548–625, about 78 lines). It is a second real seam —
`layoutDesign`'s last three steps — and taking it lands `layout.ts` near the 400
line mark rather than near 490. If it fights you, leave it and say so. A clean
one-module split is a better outcome than two forced ones.

**Explicitly out of scope:**

- **Any behaviour change at all.** Not a better loop, not a tidier route, not a
  nicer constant. If you find a bug while you are in there, write it down in your
  section of this doc and leave it.
- **The Firefox/SpiderMonkey wording fault** in `src/lib/describeLoadError.ts:191`
  and `:193`. It is carried in `handoff-next-phase.md` and Sam declined to override
  Jahmyr's pass on it. It is a real fix and it wants its own small cycle. It is a
  *behaviour* change in a *different* module, and folding it into a refactor whose
  entire warrant is "nothing changed" would destroy the one property that makes
  this cycle verifiable. Not yours this time.
- **`loadDesign.ts`'s lagging doc comment.** Same reason: that file is not open
  in this cycle.
- **Page styling**, which is waiting for Task 09's second page.
- **Task 05.** No exporter, no download helper, no Mermaid. Not one line.
- `layout.test.ts` — see the next section, this one matters.

### Acceptance criteria

There is no task file to copy these from, so these are the contract, written here:

- [x] `src/lib/layout.ts` is at most 400 lines, and no module created by this
      split exceeds it.
- [x] Self-edge routing lives in its own module: the five `SELF_LOOP_*` constants,
      `SelfLoopSlot`, `selfLoopSlots`, `loopsByNode`, `plateTopOf` and `selfLoop`
      are no longer in `layout.ts`.
- [x] `src/lib/layout.ts` remains the single public door: `layoutDesign`,
      `DesignLayout`, `LayoutNode`, `LayoutEdge`, `LayoutBox`, `LayoutPoint`,
      `LABEL_FONT_SIZE`, `TYPE_FONT_SIZE`, `EDGE_LABEL_FONT_SIZE`, `LINE_HEIGHT`,
      `EDGE_LABEL_LINE_HEIGHT`, `MIN_NODE_WIDTH`, `MAX_TEXT_WIDTH`,
      `DRAWING_MARGIN`, `SELF_LOOP_EXTENT` and `EDGE_LABEL_PADDING` are all still
      importable from `./layout` with the same names and the same types.
- [x] `src/lib/renderDrawing.ts`, `src/lib/describeDrawing.ts` and
      `src/pages/index.astro` are **unchanged** — zero lines, confirmed by
      `git diff --stat`.
- [x] `src/lib/layout.test.ts` is **unchanged**, and all of its tests pass.
- [x] `bun run test` passes with at least the 179 tests that pass on `main` today,
      and `bun run check` is clean.
- [x] `bun run test:e2e` passes all 31, and CI is green on the pull request.
- [x] D34 and D37 still hold, demonstrated rather than asserted — see "Watch out for".
- [x] `docs/DECISIONS.md` records the split and the single-door rule.
- [x] No new environment variable; `.env.example` unchanged.

### The unchanged test file is the point

`src/lib/layout.test.ts` is 484 lines and it is your safety net. **Do not edit it.**
Not a rename, not a moved import, not a tidied assertion. It exercises
`layoutDesign`'s observable output, which is precisely the contract this cycle
promises not to break, and a net you rearrange while you work is not a net.

It already imports `SELF_LOOP_EXTENT`, `DRAWING_MARGIN`, `MIN_NODE_WIDTH`,
`MAX_TEXT_WIDTH` and `EDGE_LABEL_PADDING` from `./layout` (lines 5–9). That is
the practical reason for the single-door criterion: re-export from `layout.ts`
and this file does not need to know the split happened.

You may **add** a new test file against the extracted module's own surface, and
it would be good if you did — a seam worth extracting is a seam worth testing
directly. But do not move the existing self-loop tests out of `layout.test.ts`
to do it. Moving them is a separate decision and this is not the cycle for it.

If you become convinced an existing test must change, **that is a finding to
report, not a step to take.** It means either the split changed behaviour or the
test was pinning an implementation detail. Both are things I want to hear about
in writing before anyone edits the file.

### Files expected to change

A guide, not a cage.

| Path | Expected |
|---|---|
| `src/lib/layout.ts` | Shrinks to ≤400 lines. Keeps `layoutDesign`, the sizing and graph-building group, `readPlacedNodes`, `readRoutedEdges`, the public types, and re-exports of anything that moved. Its top doc comment (lines 1–36) is load-bearing and describes the *module's* contract — purity, serialisability, "the one module Tasks 05 to 08 all consume". Keep it, and update it to say where the parts now live. |
| `src/lib/` — new self-edge module | New. Name it yourself. Carries its own doc comment explaining the ordinal-and-lane idea, since D37's reasoning currently lives in `layout.ts`'s comments and must not be lost in the move. |
| `src/lib/` — new normalisation module | Only if you take the optional second seam. |
| `src/lib/` — a new test file for the extracted module | Additive. Encouraged, not required. |
| `src/lib/layout.test.ts` | **No change.** A criterion. |
| `src/lib/renderDrawing.ts`, `src/lib/describeDrawing.ts`, `src/pages/index.astro` | **No change.** A criterion. |
| `docs/DECISIONS.md` | Append one row to "Added after the build": the split, its seam, and the single-door rule. Append only — do not rewrite existing rows. |
| `README.md`, `CLAUDE.md` | Only if a command changed. None should. |
| `.env.example` | No change. |
| This handoff doc | Your "Work completed by Amon — round 1" section. |

### Skills to load

- `front-refactor` — `CLAUDE.md` names it for exactly this: "when a component or
  module grows past a screen and needs simplifying without changing behavior."
  This is the cycle that skill exists for.
- `coding-standards` — before the first file, for the new modules' names and shape.
- `front-comments` — the doc comments in `layout.ts` carry D34 and D37's reasoning
  and are the main thing at risk of being lost in a move. Moving a function without
  its comment is how a project forgets why a constant is `1 / 6`.
- `tdd-workflow` — for any test you add against the new module.
- `e2e-testing` — you are not writing new e2e, but you need the walk green.

### Watch out for

#### D34 and D37 are the behaviour you are preserving

Read both in `docs/DECISIONS.md` before you move a line. They are the two most
expensive decisions in this module and the self-edge code is their entire
implementation:

- **D34** — a self-edge is routed by `layout.ts` itself, out of the node's right
  border and back, because dagre parks a stub in a lane and leaves the loop to the
  consumer. Passing dagre's points through drew a line touching neither end.
- **D37** — every self-edge gets its own lane. The n-th loop reaches
  `SELF_LOOP_EXTENT × n` past the border and meets the border further from its
  middle than the one inside it; all of a node's plates stack in one column past
  the widest loop. Without the ordinal, two self-edges on one node came out as one
  route drawn twice, with the first label hidden under the second opaque plate —
  three edges in the file, two on screen. That is the quietly-wrong drawing intake
  5.2 rules out.

A refactor that quietly restores either bug is worse than no refactor, because the
tests that would catch it are the ones I have told you not to touch — which is
why I have told you not to touch them.

#### Demonstrate the preservation, do not assert it

"All tests still pass" is necessary and not sufficient after a move, because the
tests could have stopped exercising the moved code. Jahmyr has spent two tasks
verifying by mutating the source rather than trusting the report, and he will do
it here. Save him the round: before you hand off, break the extracted module on
purpose — delete the `slot.ordinal + 1` from `selfLoop`'s reach, or return a
constant from `plateTopOf` — confirm `layout.test.ts` goes red, and put that in
your section. That is the evidence that the seam is still wired to its net.

A diff of `layoutDesign`'s output over a design with a multi-loop node, before and
after, is the other good form of proof. Both are cheap.

#### `readRoutedEdges` is where the seam actually cuts

Lines 329–370. It builds `prepared`, asks `selfLoopSlots` for the slot map, then
per edge either calls `selfLoop` or falls through to dagre's points via
`labelCentre`/`straightLine`/`toPoint`. Those last three stay in `layout.ts` —
they serve ordinary edges, not loops. The cut is between "which loop is this, and
where does it go" and "read what dagre gave us".

#### Re-export, do not re-declare

If a constant moves, `layout.ts` re-exports it from the new module. It does not
declare a second copy. Two `SELF_LOOP_EXTENT`s that agree today are two that
disagree the day one is tuned, and the drawing would be wrong in a way no test
would name.

#### The module doc comment is a contract, not decoration

`layout.ts`'s first 36 lines state two properties Tasks 05 to 08 depend on:
**pure** (no `document`, no measuring, no clock — which is what lets it run in
Vitest, in a worker, and inside a PDF exporter) and **serialisable** (plain
numbers, strings and arrays). Both must remain true of every module you create.
An exporter will hand this result across a boundary.

#### Commands

`bun run test` runs Vitest. **Never `bun test`** — that runs Bun's own runner and
silently skips the suite. Correct it anywhere you find it written wrong.

Do not re-run `husky init`; it writes `bun test` into the hook.

#### Process boundaries

- **Amon: pushing and opening the pull request are Jahmyr's, not yours.**
  `.claude/settings.json` is the authority. Commit on `chore/split-layout-module`
  and stop there. Jahmyr pushes the branch, opens the pull request, and gets the
  CI signal; Sam merges. If you think you need to push to finish, you have found
  something to report, not a step to take.
- **For Sam, recorded here so it is not rediscovered a fifth time:** the post-merge
  doc refresh goes through a `chore/…` branch and a pull request.
  `.claude/settings.json` denies `git push origin main:*`, so refreshing
  `docs/handoff-items/handoff-next-phase.md` after the merge cannot be a direct
  push to `main`.
- **Do not check the acceptance boxes above.** Jahmyr checks them when he has
  exercised them.
- **`docs/` is generated from `docs/intake.md`.** Append to the "Added after the
  build" table of `docs/DECISIONS.md`. Do not rewrite task-file bodies, the PRD,
  the architecture doc, or the runbook, and do not add a task file for this chore.
- **Do not edit `.claude/` or any agent configuration.** Both process notes above
  are written out by hand on purpose; the configuration change itself is still
  with the user.

### Carried into this cycle, and where each went

| Item | Source | Disposition |
|---|---|---|
| `src/lib/layout.ts` is 625 lines | Amon + Jahmyr, Tasks 03 and 04 | **This cycle.** |
| Firefox/SpiderMonkey wording fault, `describeLoadError.ts:191`, `:193`, and "not valid JSON" twice on the same path | Jahmyr round 2, Task 04; Sam declined override | **Not this cycle.** Behaviour change, different module. Stays in `handoff-next-phase.md`; I will route it to its own small cycle. |
| `loadDesign.ts` doc comment lags D38 | Amon, Tasks 04 rounds 1 and 2 | **Not this cycle.** One sentence, whenever that file is next open. |
| `loadDesign.test.ts:146`'s conditional assertion | Amon round 2, Task 04 | **Not this cycle.** Rides with the Firefox cycle — same module family, same engine question. |
| Page styling outside the drawing | Sam, Task 04 | **Not this cycle.** Task 09 adds the second page that makes the decision worth taking once. |
| Edges have no `id`, so "duplicate edge ids" is an ignored extra key | Jahmyr round 2 adversarial pass | **Closed by design.** Not a bug. Recorded so it is not re-raised. |

### Two Task 04 behaviours the exporters will inherit

Not this cycle's work — noted so they are not rediscovered in Task 05 or 09.
Whitespace-only strings are now refused, with interior spaces preserved (D39),
and a file-kind check refuses non-JSON files before they are opened (D40), so a
JSON file named `notes.txt` is refused by design.

### Definition of done for this cycle

Every acceptance criterion above is checked in this document, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

`src/lib/layout.ts` was 625 lines. It is 346 now, and both seams named in the
assignment are out — the second one because it had to be, not because it was
tempting: with the self-edge module extracted, `layout.ts` still stood at 436 lines,
past the 400 the first criterion asks for. Taking the normalisation group as well
landed it at 346.

Four modules where there was one:

- **`layout.ts`** (346) — `layoutDesign`, the sizing and graph-building group,
  `readPlacedNodes`, `readRoutedEdges`, `labelCentre`, `straightLine`, `toPoint`. It
  is the single public door: every name in the criterion list is still importable
  from `./layout`, and the ones that moved are **re-exported, never re-declared**.
  Its top doc comment is kept and extended with a paragraph naming where the parts
  now live and restating the one-door rule for whoever moves the next piece.
- **`selfLoops.ts`** (203) — the five `SELF_LOOP_*` constants, `SelfLoopSlot`,
  `selfLoopSlots`, `loopsByNode`, `plateTopOf`, `selfLoop`, each with its own doc
  comment, under a module comment that carries D34's and D37's reasoning: why the
  route is ours rather than dagre's, and why the ordinal is what makes two loops two
  loops. `SELF_LOOP_EXTENT` is exported from here and re-exported by `layout.ts`; the
  other four constants stay module-private exactly as they were.
- **`normaliseDrawing.ts`** (115) — `DRAWING_MARGIN`, `offsetToMargin`, `everyX`,
  `everyY`, `shiftBox`, `shiftEdge`, `canvasFor`. `everyX` and `everyY` stay private.
- **`layout.types.ts`** (90) — `LayoutPoint`, `LayoutBox`, `LayoutNode`,
  `LayoutEdge`, `DesignLayout`, `EdgeLabelPlate`, `PreparedEdge`.

**`PreparedEdge`, the piece that straddles the seam.** You offered two homes and I
took a third, which is the one decision here worth arguing with. `selfLoop` returns a
`LayoutEdge` and takes a `LayoutBox`, so a type crosses that seam whatever
`PreparedEdge` does — putting it in either module leaves the other importing back,
and an import cycle that is type-only today is a real one the day someone needs a
value from it. A types module is this project's own existing answer to that
(`design.types.ts`, D15), so the layout vocabulary went the same way. Every
dependency now points one direction: `layout.types` ← `selfLoops` ← `layout`, and
`layout.types` ← `normaliseDrawing` ← `layout`. Nothing outside `src/lib/` imports
any of the three; `./layout` is still the only door anyone knocks on.

Both load-bearing properties from the module doc comment hold of all four modules: no
`document`, no measuring, no clock, and nothing returned but plain numbers, strings
and arrays.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/layout.ts` | 625 → 346 lines. Keeps `layoutDesign` and the dagre-facing group; imports and re-exports what moved; doc comment extended with where the parts live. |
| `src/lib/layout.types.ts` | New, 90. The shared vocabulary, including `PreparedEdge` and `EdgeLabelPlate`. |
| `src/lib/selfLoops.ts` | New, 203. Self-edge routing, moved verbatim with its comments. |
| `src/lib/normaliseDrawing.ts` | New, 115. Margin offset, the two shifts, and the canvas, moved verbatim with their comments. |
| `src/lib/selfLoops.test.ts` | New, 15 tests. Additive — nothing was moved out of `layout.test.ts`. |
| `src/lib/normaliseDrawing.test.ts` | New, 12 tests. Also additive. |
| `docs/DECISIONS.md` | One row appended: D46. |
| This doc | This section. |

**Unchanged, as the criteria require:** `src/lib/layout.test.ts`,
`src/lib/renderDrawing.ts`, `src/lib/describeDrawing.ts`, `src/pages/index.astro`,
`.env.example`, `README.md`, `CLAUDE.md`. `git diff --stat main` lists exactly the
four source files and two test files above, plus the two docs.

`README.md` was checked and left alone on purpose: no command changed, and its
`## Layout` section describes `src/lib/` by what it holds rather than file by file,
so it is still true.

### Tests written

Both files are new and both are additive — no existing self-loop test was moved.
Each was written before its module existed and first failed on `Cannot find module`,
which is the honest RED for a module that is not there yet.

`src/lib/selfLoops.test.ts` — 15 tests:

| Test | What it pins |
|---|---|
| gives a slot to every self-edge and to no other edge | only `from === to` gets a slot, keyed by its place in the file |
| numbers a node's loops from zero in the order the file listed them | the ordinal, and that an intervening ordinary edge does not consume one |
| counts each node's loops separately | three nodes looping once each are each their node's first — D37's "unchanged" case |
| starts the first plate at the top of the stack and clears every earlier one | `plateTop` grows past every earlier plate **plus a gap** — the assertion the constant-return mutation fails |
| measures the stack as every plate plus the gaps between them | `stackHeight` ends exactly where the last plate does, which is what lets the column centre |
| gives a lone loop a stack of its own plate and nothing else | the whole slot for the single-loop case, by value |
| finds no slots in a design that loops nowhere | the empty map |
| hangs both ends of the loop on the node's right border | D34: both ends on the border, neither at the same height |
| reaches SELF_LOOP_EXTENT past the border for the first loop, twice for the second | the ordinal in the reach |
| meets the border further from its middle the further out the loop reaches | the band steps with the ordinal |
| keeps a loop's ends off the corners of a short node | `SELF_LOOP_BAND_INSET`: the cap, on a 40px-tall node with five loops |
| puts the label plate past the widest loop, not just past its own | plates share one column, so none cuts an outer loop's line |
| centres the stack of plates on the middle of the node | the `middle - stackHeight / 2 + plateTop` arithmetic, and that two plates do not overlap |
| carries the edge's own words and lines through untouched | a label with interior spaces is not tidied |
| reads the node box without touching it | purity |

`src/lib/normaliseDrawing.test.ts` — 12 tests: `offsetToMargin` puts the
top-left-most thing at exactly `DRAWING_MARGIN`, brings a drawing back from dagre's
negative coordinates, measures route points and plates and not only boxes, and moves
nothing when nothing is placed; `shiftBox` moves a box, keeps everything else it
carries, and returns a new one; `shiftEdge` moves every point and the plate with them
and leaves the label alone; `canvasFor` fits with a margin all round, counts a plate
reaching past the last box, rounds a fractional extent up, and still gives an empty
design a canvas (D19).

### Local results

- `bun run test`: **pass — 206 tests in 13 files.** Baseline was 179 in 11 files; the
  27 new ones are the two files above, and every one of the original 179 still passes.
- `bun run check`: **pass — 0 errors, 0 warnings, 0 hints** (38 files).
- `bun run build`: **pass** — 1 page built.
- `bun run test:e2e`: **pass — 31 of 31** against the built `dist/`.

### Preservation, demonstrated rather than asserted

**1. The output is byte-identical.** Before touching anything I dumped
`layoutDesign`'s full result over six designs — empty; a lone node; the README's
order-intake example; one self-edge; a four-node design whose `worker` carries three
loops, one of them with a label long enough to wrap, and whose `who` carries two; and
a design of wrapped labels and a whitespace-only label. The same dump was taken after
each seam: `diff` clean both times, md5 `5b9e661f5815a09321b151cce8eadd9d` throughout.

**2. Five deliberate mutations, each caught by the untouched `layout.test.ts`.** Run
as `bunx vitest run src/lib/layout.test.ts` on its own, so the evidence is that file
and not my new ones:

| Mutation | `layout.test.ts` result |
|---|---|
| `selfLoop`: reach loses `slot.ordinal + 1` | **1 failed** — "draws two self-edges on one node as two loops, neither hiding the other": `expected 229 to be greater than 229`. The second loop stopped reaching further than the first. |
| `plateTopOf`: returns a constant `0` | **1 failed** — same test: `expected true to be false`, which is `overlaps(first.labelBox, second.labelBox)`. Both plates landed on one spot: D37's lost label, exactly. |
| `offsetToMargin`: normalises to 0 instead of `DRAWING_MARGIN` | **3 failed** — "starts the drawing exactly one margin…", "fits the canvas…", "places a lone node at the margin…" |
| `canvasFor`: drops the trailing margin | **3 failed** — including "lays an empty design out as an empty canvas that still has size" |
| `shiftEdge`: leaves the route where dagre put it | **4 failed** — including all three self-edge tests |

Worth reporting rather than hiding: my **first** attempt at the fifth mutation was a
no-op. I inserted `points: edge.points` above the existing `points:` key and the
later key won, so the suite passed and for a moment it looked like a hole in the net.
Reading the mutated source showed it; redone as a replacement, it produced the four
failures above. Small, but it is the exact failure mode "prove, do not assert" guards
against — a mutation that does not mutate proves nothing, and a green run looks the
same either way.

### Decisions recorded

One row appended to `docs/DECISIONS.md`, **D46**: the two seams and the four modules,
why now (the module was about to gain four readers), why both seams were needed (436
lines after the first), the single-door rule and why re-export rather than
re-declare, and `PreparedEdge`'s third home with the D15 reasoning behind it. It also
records that preservation was shown by the byte-identical dump and the five mutations
rather than claimed.

### Known gaps

- **Nothing in the assignment is unfinished.** Every criterion has been exercised
  locally; the boxes are left unchecked for Jahmyr, and CI is his to see, since
  pushing is his.
- `layout.types.ts` exports `EdgeLabelPlate` and `PreparedEdge`, which were private to
  `layout.ts` before. Neither is re-exported from `layout.ts`, so **no public surface
  widened** — but a module boundary means any file in `src/lib/` could now import
  them. That is the price of the seam; the alternative was an import cycle.
- Both new test files construct their inputs by hand rather than through
  `layoutDesign`. That is deliberate — it is what makes them tests of the extracted
  modules rather than a second copy of `layout.test.ts` — but it does mean they would
  not notice if `readRoutedEdges` began handing `selfLoopSlots` something other than
  what it hands it today. `layout.test.ts` is what covers that, and it does: mutation
  5 above is that exact kind of miswiring, and it fails four of its tests.

### Out-of-scope notes for Jared

Small and real; none of it touched.

1. **`describeDrawing.test.ts` is a fifth consumer of `layout.ts`.** The assignment
   names four (`renderDrawing.ts`, `describeDrawing.ts`, `index.astro`,
   `layout.test.ts`); `describeDrawing.test.ts:5` also imports `layoutDesign`. It
   needed no change, and the count does not weaken the argument for doing this now —
   noting it only so the consumer list is right when Task 05 adds to it.
2. **`straightLine` falls back to dagre's *centres* while every other route runs
   border to border.** `layout.ts:329`. On that fallback an edge is drawn from one
   box's middle to the other's, so its ends sit under the two boxes rather than on
   their borders. It is unreachable today — dagre gives points for every edge a
   loaded design can produce, and no test in `layout.test.ts` reaches it — so it is
   not a defect anyone can see, and I left it exactly as it was. Worth a look
   whenever an exporter starts drawing arrowheads, because on that path one would
   land inside a box.
3. **The three items routed to the Firefox cycle are untouched**, as asked:
   `describeLoadError.ts:191` and `:193`, `loadDesign.ts`'s lagging doc comment, and
   `loadDesign.test.ts:146`'s conditional assertion. I did not open those files.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass.** All ten acceptance criteria verified by exercising them. No defects.

This is a refactor whose only warrant is that nothing changed, so it was judged on
preservation. Preservation was not taken on report: a worktree of `main` was checked
out beside the branch and `layoutDesign`'s output compared directly, and the
extracted modules were mutated to see whether the net still catches them.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| `layout.ts` ≤ 400 lines, and no module created by the split exceeds it | pass | `wc -l`: `layout.ts` 346, `selfLoops.ts` 203, `normaliseDrawing.ts` 115, `layout.types.ts` 90. Baseline `git show main:src/lib/layout.ts` is 625 |
| Self-edge routing lives in its own module; the five `SELF_LOOP_*` constants, `SelfLoopSlot`, `selfLoopSlots`, `loopsByNode`, `plateTopOf`, `selfLoop` are out of `layout.ts` | pass | `grep` over `layout.ts` finds those names only in one doc-comment line, one `import` of `selfLoop`/`selfLoopSlots`, one `export … from './selfLoops'`, and the two call sites at `:286` and `:293`. No declaration of any of them remains. `loopsByNode` and `plateTopOf` are module-private in `selfLoops.ts` at `:122` and `:141`, as they were before |
| `./layout` is still the single public door for all 16 named exports | pass | A temporary probe imported all 16 from `./layout` and asserted the ten constant values against main's — `14, 11, 12, 18, 16, 132, 220, 28, 34, {x:7,y:4}` — all equal. The five types were exercised at type level and `bun run check` compiled the probe with 0 errors over 39 files. `DRAWING_MARGIN` and `SELF_LOOP_EXTENT` each have exactly one declaration in the tree, so re-export-never-re-declare holds |
| `renderDrawing.ts`, `describeDrawing.ts`, `index.astro` unchanged | pass | `git diff --name-only main` over those paths returns zero files, and each file's md5 equals that of `git show main:<path>` |
| `layout.test.ts` unchanged, and all its tests pass | pass | md5 `05e1ba61ae1591f438f7dbf25bf1c30e` on both `main` and the branch. 26 of 26 pass |
| `bun run test` passes with at least the 179 on `main`, and `bun run check` is clean | pass | 206 passed in 13 files. A JSON-reporter set comparison against main's run shows **0 of the 179 missing** — none renamed, removed or skipped — and 27 added. `bun run check`: 0 errors, 0 warnings, 0 hints over 38 files |
| `bun run test:e2e` passes all 31, and CI is green on the pull request | pass | 31 passed locally in 5.9s. CI green on PR #9: typecheck 0 errors, 13 test files passed, 31 e2e passed |
| D34 and D37 still hold, demonstrated rather than asserted | pass | The invariant check and the mutation table below |
| `docs/DECISIONS.md` records the split and the single-door rule | pass | D46 appended. `git diff main -- docs/DECISIONS.md` is one added line and no removals, so the append-only rule held |
| No new environment variable; `.env.example` unchanged | pass | `.env.example` md5 equals main's. The only environment reads in the tree are `process.env.CI` in `playwright.config.ts`, which is CI-provided, predates this branch, and is not app configuration |

### Preservation, verified independently

**Byte-identical output over 19 designs.** A worktree of `main` was checked out
beside the branch and the same dump script run in both. The design set was written
without reading Amon's: empty, lone node, order-intake, a four-node design with a
three-loop and a two-loop node, wrapped and whitespace-only labels, five loops on a
short node, parallel edges, empty labels, unicode and CJK, a 24-node chain, a
15-node fan, three nodes looping once each — then a second adversarial pass with a
300-node/900-edge design, a 400-character unbreakable word, tabs and newlines and
U+2028 inside labels, twenty loops on one node, and three identical duplicate edges.

`diff` clean both times: 60,916 bytes at md5 `0648512273ef6f0f1bb9bbd35f4e632d`, and
669,160 bytes on the adversarial set. Layout time on the 300-node design was 174 ms
on `main` and 170 ms on the branch — no regression.

**D34 and D37 as invariants, over every self-loop in the dump.** Both ends of every
loop sit exactly on its node's right border and at different heights (D34); each
loop reaches exactly `SELF_LOOP_EXTENT` further than the one inside it — `worker`'s
three loops reach 284, 318, 352 — no two label plates overlap, and every plate
clears the widest loop on its node (D37). The same check gives the same answer on
`main`.

**Thirteen mutations.** Each was applied to the extracted module, checked to be a
real edit, then checked to actually move `layoutDesign`'s output before its red was
trusted — the no-op guard Amon's disclosed near-miss calls for.

| # | Mutation | Output moved | Caught by |
|---|---|---|---|
| 1 | `selfLoop` reach loses `slot.ordinal + 1` | yes | `layout.test.ts`, 1 failed |
| 2 | `plateTopOf` returns a constant 0 | yes | `layout.test.ts`, 1 failed |
| 3 | `offsetToMargin` normalises to 0 | yes | `layout.test.ts`, 3 failed |
| 4 | `canvasFor` drops the trailing margin | yes | `layout.test.ts`, 3 failed |
| 5 | `shiftEdge` leaves the route where dagre put it | yes | `layout.test.ts`, 4 failed |
| 6 | `selfLoop` band loses the ordinal | yes | `layout.test.ts`, 1 failed |
| 7 | label column uses its own reach, not the widest | yes | `selfLoops.test.ts`, 1 failed |
| 8 | plate stack not centred on the node | yes | `layout.test.ts`, 1 failed |
| 9 | `loopsByNode` keeps only the last loop per node | yes | `layout.test.ts`, 1 failed |
| 10 | band inset cap removed | yes | `selfLoops.test.ts`, 1 failed |
| 11 | `shiftBox` moves x only | yes | `layout.test.ts`, 7 failed |
| 12 | `everyX` ignores route points | yes | `normaliseDrawing.test.ts`, 1 failed |
| 13 | **control:** duplicate `points:` key, later key wins | **no — no-op** | nothing, correctly |

Mutations 1 to 5 are Amon's, re-run here rather than taken on report; they reproduce
his counts and his failing test names exactly. Mutations 6 to 12 are mine.

Two things are worth recording. First, mutation 13 is a deliberate replay of the
no-op Amon disclosed, and the harness flagged it as a no-op on its own — which is
what licenses trusting the other twelve, all of which did move the output. His
disclosure was accurate and his redone mutation 5 is real. Second, mutations 7, 10
and 12 are caught by the **new** test files and not by `layout.test.ts`. Those three
holes were in the net on `main` too. The additive tests are therefore not a second
copy of `layout.test.ts`; they close gaps in it.

### Command results

- `bun run test`: 206 passed, 13 files (main baseline 179 in 11; 0 of the 179 missing)
- `bun run check`: 0 errors, 0 warnings, 0 hints, 38 files
- `bun run build`: pass, 1 page
- `bun run test:e2e`: 31 of 31
- `bun run dev`: serves HTTP 200 with the expected page and no errors in the log; stopped after
- Secret scan: `gitleaks detect --source . --no-banner` — no leaks found, 15 commits scanned
- Accessibility: `front-a11y` audit of `src/pages/index.astro` — 0 critical, 0 major, 0 minor. Labelled file input, `<main>`, `lang`, two valid `role="status"` live regions, and the generated SVG carries `role="img"` with `aria-labelledby` to its `<title>` and `<desc>`. The page is byte-identical to `main`, so no regression was possible
- CI: **green** on PR #9, both the push-triggered and the pull-request-triggered run

### Defects for Amon

None.

### Fixed in place

None. Nothing needed correcting.

### On the third home for `PreparedEdge`

Verified rather than accepted. Dependencies point one way only, with no cycle even
type-only: `layout.types.ts` imports `design.types` and `shapes` and nothing else in
the split; `selfLoops.ts` and `normaliseDrawing.ts` each import `layout.types` and
neither imports the other or `layout.ts`; `layout.ts` imports all three. Nothing
outside `src/lib/` imports any of the three — `index.astro:74` still imports
`layoutDesign` from `../lib/layout`. The call is sound and matches D15.

### Confirming Amon's two notes for Jared

Both stand, and neither is this cycle's work.

1. `describeDrawing.test.ts:5` does import `layoutDesign` from `./layout`. Five
   consumers, not four. It is byte-identical to `main`, so it needed no change.
2. `straightLine` at `layout.ts:329` does fall back to dagre's centres while every
   other route runs border to border. It is unreachable through `layoutDesign`
   today — none of the 19 designs, including the 300-node one, reached it — so it is
   not a visible defect, and it is byte-identical to the code on `main`. Real, and
   worth having written down for whenever an exporter starts drawing arrowheads.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/9 — draft, as the process asks.
Sam marks it ready and merges.

---

## Verification and merge by Sam

### Document audit

| Document | State | Action taken |
|---|---|---|
| This handoff doc | Complete — all ten acceptance criteria checked, Jared's assignment, Amon's round 1, and Jahmyr's round 1 all present and legible | None. Re-verified independently rather than trusted: `wc -l` on all four modules matches the reported 346/203/115/90; `git diff --stat main...chore/split-layout-module` shows exactly the four source files, two new test files, and two docs changed, with `layout.test.ts`, `renderDrawing.ts`, `describeDrawing.ts`, `index.astro`, `.env.example`, `README.md`, `CLAUDE.md` all empty-diffed; all 16 named exports (`layoutDesign`, `DesignLayout`, `LayoutNode`, `LayoutEdge`, `LayoutBox`, `LayoutPoint`, the eight sizing constants, `DRAWING_MARGIN`, `SELF_LOOP_EXTENT`, `EDGE_LABEL_PADDING`) confirmed importable from `./layout`, re-exported rather than re-declared |
| `README.md` | Amon's judgment that the `## Layout` section is still true, checked rather than assumed | Read the section directly: it describes `src/lib/` by what it holds ("the design core: types, the schema, the loader, the layout, …") rather than file by file, so the split does not make it stale. Left unchanged, correctly |
| `CLAUDE.md` | No material change — status and stack are unaffected by a refactor with no behaviour change, and neither section names `layout.ts` or its internal shape | Left unchanged |
| `docs/DECISIONS.md` | D46 appended, one row, append-only (`git diff` on the file is one added line, zero removed) | None needed |
| `.env.example` | Unchanged, correctly — the app still reads no environment variables | None needed |
| `docs/ARCHITECTURE.md` | Checked for staleness per the assignment's ask. It describes layout at a conceptual level ("computes a layout … The layout engine is not specified in the intake") and never names `layout.ts` or any internal module. The split does not make it stale | No action; nothing to flag to a person |
| `docs/tasks/` | No task file exists for this chore, correctly — it isn't in `docs/intake.md`, so a hand-written file would be lost on regenerate. The handoff doc is the whole contract, as Jared's assignment states | None needed |

### Gates

`bun run test`: pass, 206 tests in 13 files, re-run independently on this branch before merge.
CI: green — both `test` checks pass on PR #9 (`gh pr checks`), re-confirmed immediately before merge.
Secret scan: `gitleaks detect --source . --no-banner` — "no leaks found", 16 commits scanned.

### Merge

Squashed as `8a55336` into `main`. Branch `chore/split-layout-module` deleted (confirmed via `git fetch --prune`). PR https://github.com/IBatsios/map-data-structures/pull/9.

### Left for a person

Nothing. No document was found wrong, no generated doc needed a person's edit, and no Phase 0 step was outstanding — the remote already existed and CI already ran.

The three items already queued in `handoff-next-phase.md` (Firefox/SpiderMonkey wording fault, `loadDesign.ts`'s doc comment, `loadDesign.test.ts:146`'s conditional assertion) remain queued for their own small cycle after Task 05, per Jared's routing — not this cycle's or this merge's to act on.
