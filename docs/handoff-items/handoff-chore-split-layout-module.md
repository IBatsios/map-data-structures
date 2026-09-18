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

- [ ] `src/lib/layout.ts` is at most 400 lines, and no module created by this
      split exceeds it.
- [ ] Self-edge routing lives in its own module: the five `SELF_LOOP_*` constants,
      `SelfLoopSlot`, `selfLoopSlots`, `loopsByNode`, `plateTopOf` and `selfLoop`
      are no longer in `layout.ts`.
- [ ] `src/lib/layout.ts` remains the single public door: `layoutDesign`,
      `DesignLayout`, `LayoutNode`, `LayoutEdge`, `LayoutBox`, `LayoutPoint`,
      `LABEL_FONT_SIZE`, `TYPE_FONT_SIZE`, `EDGE_LABEL_FONT_SIZE`, `LINE_HEIGHT`,
      `EDGE_LABEL_LINE_HEIGHT`, `MIN_NODE_WIDTH`, `MAX_TEXT_WIDTH`,
      `DRAWING_MARGIN`, `SELF_LOOP_EXTENT` and `EDGE_LABEL_PADDING` are all still
      importable from `./layout` with the same names and the same types.
- [ ] `src/lib/renderDrawing.ts`, `src/lib/describeDrawing.ts` and
      `src/pages/index.astro` are **unchanged** — zero lines, confirmed by
      `git diff --stat`.
- [ ] `src/lib/layout.test.ts` is **unchanged**, and all of its tests pass.
- [ ] `bun run test` passes with at least the 179 tests that pass on `main` today,
      and `bun run check` is clean.
- [ ] `bun run test:e2e` passes all 31, and CI is green on the pull request.
- [ ] D34 and D37 still hold, demonstrated rather than asserted — see "Watch out for".
- [ ] `docs/DECISIONS.md` records the split and the single-door rule.
- [ ] No new environment variable; `.env.example` unchanged.

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
