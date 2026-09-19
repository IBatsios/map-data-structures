# Handoff — Chore: one copy of the export furniture, and one meaning per fixture name

**Date:** 2026-09-18
**Branch:** chore/dedup-export-furniture
**Task file:** none — see "Why this has no task file"
**Round:** 1

## Assignment from Jared

### Why this cycle, and why now

This is the second half of a split I made deliberately. When the crash and the
Firefox wording fault came up, three no-behaviour-change chores were already
queued behind them, and I kept them out of that cycle on purpose: a round 2 on
a dagre crash should not have to drag mechanical renames back through review a
second time. That cycle closed clean — PR #23 merged, docs refreshed in PR #24,
`main` at `d56efd8`. So these are now due, and they are the whole of this cycle.

Two of the three have also stopped moving, which is the other half of the
timing. I deferred the column *shares* partly because drawing-sheet tiling was
likely to move them; tiling landed two cycles ago (`drawingSheets.ts`) and the
six numbers have not changed since. And `docxPlan.ts:153–159` already carries a
comment I asked for, pointing at the other three copies of D51's sentence so
whoever finally unified them could find all four. That is you.

**Every one of these is pinned by tests that already exist.** Nothing here needs
a new behaviour test. What it needs is proof that no behaviour moved, which is
why the acceptance criteria below are written as things that must come back
*identical* rather than things that must start working.

### Why this has no task file

`docs/` is generated from `docs/intake.md`, and none of this is in the intake,
so there is no `docs/tasks/NN-*.md` for it and I am not adding one — a
hand-written file there is lost on the next regenerate. **This handoff doc is
the whole contract.** The acceptance criteria below are mine, not the intake's.

Same precedent as `chore/split-layout-module`, `fix/drawing-label-size` and
`fix/layout-crash-and-loader-wording`: own branch, own handoff doc, criteria
written here.

Tasks 10 and 11 stay `ready`. This cycle does not start either one.

### Scope

Three chores, and two comment corrections I have judged into the cycle. **No
behaviour changes anywhere.** Every exported file — `.md`, `.html`, `.pdf`,
`.docx` — comes out the same as it goes in on `main` today.

---

#### Chore 1 — D51's sentence, in four files, held together by nothing

The sentence is `'This design has no nodes, so there is nothing to draw.'` and
it is written out four times:

| File | Line | Shape |
|---|---|---|
| `src/lib/pdfPlan.ts` | 49 | `export const NOTHING_TO_DRAW` |
| `src/lib/toHtml.ts` | 56 | `const NOTHING_TO_DRAW` (private) |
| `src/lib/toMarkdown.ts` | 71 | `const NOTHING_TO_DRAW` (private) |
| `src/lib/docxPlan.ts` | 160 | `const NOTHING_TO_DRAW` (private) |

D51 chose the sentence, D60 carried it into HTML, D66 carried it into the PDF,
and Task 08 carried it into Word. What holds them together today is one Vitest
assertion — `pdfPlan.test.ts:192–193` checks the PDF's copy against the one
`toMarkdown` writes, which is the guarantee D66 claims. **`toHtml.ts` and
`docxPlan.ts` are covered by nothing at all.** Two of four copies can drift
silently, which is the exact situation `exportStyles.test.ts` was written to
prevent for the palette.

Make one copy. A new module under `src/lib/` in the shape `exportStyles.ts`
already established — it owns the shared text, the four exports import it.

**`pdfPlan.ts` must keep exporting `NOTHING_TO_DRAW` under that name**, as a
re-export from the new module, never a second declaration. That is the single
public door rule the layout split established, and it is also what keeps
`pdfPlan.test.ts` unchanged, which is one of the criteria below. If you think
the test should instead import from the new module directly, say so in your
section and leave the test alone this cycle — I would rather hear the argument
than have the safety net edited in the cycle it is securing.

---

#### Chore 2 — the four exports' column headings, and two copies of the shares

`Id | Label | Type` and `From | To | Label` are written out four times:

| File | Lines | Shape |
|---|---|---|
| `src/lib/toHtml.ts` | 50, 53 | `NODE_HEADINGS` / `EDGE_HEADINGS`, `as const` tuples |
| `src/lib/toMarkdown.ts` | 35, 38 | the same two, `as const` tuples |
| `src/lib/pdfPlan.ts` | 160–171 | `Column[]` — heading **and** share |
| `src/lib/docxPlan.ts` | 258–269 | `Column[]` — the same headings, the same shares |

And the shares are duplicated outright. `pdfPlan.ts` and `docxPlan.ts` both
declare an identical private `Column` interface and identical numbers:
`0.26 / 0.46 / 0.28` for nodes, `0.26 / 0.26 / 0.48` for edges. Two files, two
declarations, six numbers that must agree and are checked by nothing.

Put the columns — heading and share together — in one place, and let the
headings for Markdown and HTML be derived from it rather than re-typed. The
comments already admit the coupling in prose: `pdfPlan.ts:159` says "with the
same columns `toMarkdown` and `toHtml` print", `docxPlan.ts:257` says "with the
columns the other three exports print", `toHtml.ts:49` says "as `toMarkdown`
names them". Three files pointing at each other in comments is the duplication
telling you where it wants to be.

The two planners keep their own use of the shares — points in the PDF, DXA in
Word, with `docxPlan`'s last-column rounding behaviour untouched. Only the
declaration moves.

**Watch the `as const` tuples.** `toHtml.ts` and `toMarkdown.ts` type their
headings as fixed-length readonly tuples today; a naive `.map()` off the shared
columns widens that to `readonly string[]`. If anything downstream depends on
the tuple type, keep the narrowing — and either way `bun run check` must stay
clean. This is the one place in the cycle where a purely mechanical move can
change a type.

---

#### Chore 3 — `e2e/fixtures/empty.json`: one name, two opposite meanings

Jahmyr named this one precisely, which is what makes it cheap. The file is
**0 bytes**. Three places use the word "empty" and they do not all mean the same
thing:

- `e2e/validation.spec.ts:84` chooses `empty.json` to prove the app says *"That
  file is empty."* — correct: it means **a file with no bytes**, which is a
  syntax error.
- `src/lib/describeUpload.test.ts:50` passes the string `'empty.json'` as a file
  *name* alongside a design of 0 nodes and 0 edges, asserting
  `'empty.json is drawn below: 0 nodes, 0 edges.'` — it means **a valid design
  that holds nothing**, which draws fine. That is the opposite case.
- `e2e/export.spec.ts:182–184` needs three lines of comment to tell a reader
  which is which.

`e2e/fixtures/empty-design.json` already sits beside it holding
`{ "title": "Nothing yet", "nodes": [], "edges": [] }`, so the valid-but-empty
meaning already has a name. The 0-byte file is the one that needs a truthful
one — something that says *no bytes*, not *no nodes*. `empty-file.json` pairs
with `empty-design.json` and I would take it, but the name is yours; make it
unambiguous.

Then fix the second site: `describeUpload.test.ts:50` should use a name that
means a design with nothing in it, not the name that now means a file with
nothing in it. It is a string literal in a unit test with no fixture behind it,
so this is two lines.

And the third: once the names no longer collide, `export.spec.ts`'s
disambiguating comment is explaining a confusion that no longer exists. Remove
or shorten it — do not leave a comment defending a distinction the filenames now
make on their own.

Use `git mv` so the rename is a rename in history. Rename nothing else in
`e2e/fixtures/`.

---

#### Comment drift — the two I have judged in

I was asked to judge three of these. Two are in:

1. **`src/lib/loadDesign.ts:7–8`, the module header.** It still reads "the error
   carries whatever evidence **Task 04 has to work with**". Task 04 is done and
   merged; the sentence dates a finished task as though it were pending. This is
   the comment one line above the one the last cycle scoped, which Amon
   correctly left alone because that file was not open then. It is open now.
   Say what the error carries, without the task number doing the work.

2. **`src/lib/layout.ts`, `readPlacedNodes`'s throw comment** (the block ending
   "...so this one is unreachable by any file a user can write"). It reads as
   though that throw is the only thing standing between dagre and a bad
   placement. Since the crash fix, `placeWithDagre` gates ahead of it with
   `isWhollyPlaced`, which is *stricter* — every coordinate finite, across both
   keyings, before `readPlacedNodes` is ever reached. The comment is not wrong
   about being an assertion; it is now incomplete about what runs first. Bring
   it up to date with D98, and keep it an assertion about this app's invariant
   rather than turning it into a user-facing message.

And one is out, recorded below instead: **`describeLoadError.ts` now importing
`layout.ts`**. There is no bundle cost today — `index.astro` is the only module
that imports `describeLoadError` as a value, and it already imports `layout` —
so the only available action is structural: move `DesignLayoutError`, or split
it out. That is a real change to module boundaries, and a cycle whose entire
warrant is "nothing changed" is the wrong place to make one. It goes in the
notes, not in the diff.

---

### Explicitly out of scope

- **Any behaviour change at all.** Not a better sentence, not a re-tuned share,
  not a tidier heading. If you find a bug in there, write it in your section of
  this doc and leave it.
- **`PARALLEL_ROUTE_SPREAD = 18` and `PARALLEL_LABEL_GAP = 4`** in
  `parallelEdges.ts`. Chosen rather than designed, legible at twelve duplicates.
  A design-pass question. Recorded below; not touched here.
- **Reporting dagre's ordering bug upstream.** Real, reproducible against
  `@dagrejs/dagre` 3.1.1, and optional — the app no longer needs it fixed.
- **Task 10 and the Netlify site.** Do not run `netlify login`, do not run
  `netlify init`, do not create any hosting account. See below.
- **The 1280px content-column width.** Routed to Task 11's v2 handoff doc.
  Nobody touches it before then.
- **Any test file listed as unchanged in the criteria.** Those are the safety
  net; editing them is editing the thing that proves the cycle.
- **Agent configuration.** That proposal is still with the user.

### Acceptance criteria

There is no task file to copy these from, so these are the contract, written
here. **The warrant for this cycle is that nothing changes, so most of these are
written to be falsifiable by comparison against `main`, not by assertion.**

**Nothing changed — the proof:**

- [x] `toMarkdown(layoutDesign(d))` returns a **byte-identical** string, before
      and after, for at least three designs including a design with no nodes and
      `e2e/fixtures/estate-sweep.json`.
- [x] `htmlPage(layout, drawing)` returns a **byte-identical** string, before and
      after, for the same designs.
- [x] `JSON.stringify(pdfPlan(layout, measure))` and
      `JSON.stringify(docxPlan(layout))` are **byte-identical**, before and
      after, for the same designs. Both planners are pure and return plain
      objects, so this is a direct comparison; capture the "before" off `main`
      and record in your section how you captured it.
- [x] The six column shares are still `0.26 / 0.46 / 0.28` and
      `0.26 / 0.26 / 0.48`, and the headings are still `Id | Label | Type` and
      `From | To | Label`, in that order.
- [x] `src/lib/pdfPlan.test.ts`, `src/lib/toHtml.test.ts`,
      `src/lib/toMarkdown.test.ts` and `src/lib/docxPlan.test.ts` are
      **unchanged** — zero lines, confirmed by `git diff --stat`.
- [x] `src/pages/index.astro`, `src/lib/toPdf.ts`, `src/lib/toDocx.ts` and
      `src/lib/exportStyles.ts` are **unchanged**, confirmed by
      `git diff --stat`.

**Chore 1 — the sentence:**

- [x] `grep -rn "so there is nothing to draw" src/` finds the sentence declared
      **exactly once** outside test files.
- [x] `import { NOTHING_TO_DRAW } from './pdfPlan'` still resolves, to the same
      string, as a re-export rather than a second declaration.
- [x] `toHtml.ts`, `toMarkdown.ts` and `docxPlan.ts` each import it rather than
      declaring it, and `docxPlan.ts`'s four-copies pointer comment is gone,
      because it now points at nothing.

**Chore 2 — the headings and shares:**

- [x] The node columns and the edge columns are declared **exactly once** in
      `src/`, with heading and share together.
- [x] The private `Column` interface exists in one file, not two.
- [x] `toHtml.ts` and `toMarkdown.ts` derive their headings from that one
      declaration rather than re-typing the strings.
- [x] A Vitest test fails if a heading or a share is changed in one export and
      not the others — the role `exportStyles.test.ts` plays for the palette.
      One test covering the shared module is enough; it is now the only copy.

**Chore 3 — the fixture name:**

- [x] `e2e/fixtures/empty.json` no longer exists. The 0-byte file has a name
      that means *a file with no bytes*, and `wc -c` on it still reads **0**.
- [x] The rename is recorded as a rename, confirmed by
      `git log --follow --oneline` on the new path or `git diff -M --stat`.
- [x] `e2e/validation.spec.ts`'s "says an empty file is empty" test points at the
      new name and still passes, with its assertions unchanged.
- [x] `src/lib/describeUpload.test.ts` no longer uses the old name to mean a
      design with 0 nodes and 0 edges; the expected string changes with it and
      the assertion is otherwise unchanged.
- [x] `e2e/export.spec.ts`'s disambiguating comment at 182–184 is gone or
      reduced, and `upload.choose('empty-design.json')` at 185 and 507 is
      untouched.
- [x] No other file in `e2e/fixtures/` is renamed, added or removed.

**Comments:**

- [x] `src/lib/loadDesign.ts`'s module header no longer speaks of what "Task 04
      has to work with".
- [x] `readPlacedNodes`'s throw comment in `src/lib/layout.ts` accounts for
      `placeWithDagre` and `isWhollyPlaced` gating ahead of it (D98).
- [x] Neither comment change alters a single line of executable code in those
      two files, confirmed by reading the diff.

**The suite:**

- [x] `bun run test` passes with at least the **441** tests that pass on `main`
      today, across 26 files. A lower count means something was deleted.
- [x] `bun run test:e2e` passes all **124**.
- [x] `bun run check` is clean.
- [x] CI is green on the pull request, on both jobs.
- [x] `docs/DECISIONS.md` records this cycle, numbered from **D102** (D101 is the
      highest today): one decision for where the shared export text and columns
      now live and what keeps them from drifting, one for the fixture naming
      rule that a name says *no bytes* or *no nodes* and never both.
- [x] No new dependency, no new environment variable; `.env.example` unchanged.

### Files expected to change

A guide, not a cage.

- **New:** one module under `src/lib/` holding the shared sentence and the
  shared columns, plus its test.
- `src/lib/pdfPlan.ts` — drop the two `Column` lists and the `Column` interface,
  re-export `NOTHING_TO_DRAW`.
- `src/lib/docxPlan.ts` — same, plus delete the four-copies pointer comment.
- `src/lib/toHtml.ts`, `src/lib/toMarkdown.ts` — import both, drop four
  declarations each.
- `src/lib/loadDesign.ts`, `src/lib/layout.ts` — comments only.
- `e2e/fixtures/empty.json` → its new name (`git mv`).
- `e2e/validation.spec.ts`, `e2e/export.spec.ts`,
  `src/lib/describeUpload.test.ts` — the three name sites.
- `docs/DECISIONS.md` — D102 onward.

### Skills to load

- `front-refactor` — the core of the cycle: move the sentence, the headings and
  the shares without changing behaviour.
- `coding-standards` — before the first file, and specifically for naming the
  new module and the renamed fixture.
- `tdd-workflow` — the existing tests pin behaviour. Run them around each move,
  one chore at a time, so a failure names which chore caused it.
- `front-comments` — the two comment corrections, and the doc comment on the new
  shared module.
- `e2e-testing` — for the fixture rename and the Playwright sites that use it.

### Watch out for

1. **The one property this cycle has is that nothing changed.** If you fold in a
   behaviour change, however small, you destroy the only thing that makes the
   cycle verifiable. This is the same reasoning that kept the Firefox wording
   fix out of the layout split.

2. **Do the three chores as separate commits.** They are independent, and a
   failure in one should not require bisecting the other two. Conventional
   commits, `chore:` for the moves and the rename, `docs:` for the comments and
   the decisions if you separate them.

3. **D66 makes a specific claim** — that a Vitest test asserts the PDF's copy of
   the sentence is byte-for-byte the one `toMarkdown` writes, "so a third literal
   copy cannot drift". After this cycle there is no third literal copy to drift.
   Do not silently invalidate the decision's reasoning; D102 should note that the
   guarantee is now structural rather than asserted.

4. **D71 and `docxPlan.ts:162–166`:** the document's furniture — column names and
   the empty-design sentence — is English whatever language the design is written
   in. Moving it to a shared module must not read as making it configurable. Say
   so in the new module's doc comment.

5. **D51, D60 and D66 are settled.** The sentence's wording, the fact that both
   tables still print their headings when a design is empty, and the
   sentence-instead-of-empty-block choice are all decided. You are moving the
   text, not reconsidering it.

6. **`docxPlan`'s last-column rounding** (`columnWidths`, ~line 563) gives the
   final column whatever the rounding left over, because a table whose columns
   do not sum to its own width is the one Word lays out differently from every
   other reader. That behaviour stays exactly as it is. Only the share
   *declaration* moves.

7. **`exportStyles.ts` is the precedent, not a module to extend.** It owns the
   embedded stylesheet and its doc comment explains at length why that duplicate
   exists. The new module is a sibling with a different job. Do not merge them.

8. **The Playwright trap, standing:** `playwright.config.ts` has
   `reuseExistingServer: !process.env.CI` on port 4321. Check that nothing is
   already serving 4321 before trusting a local e2e run — a stale server will
   serve you a `dist/` from before your changes and pass. CI is unaffected.

9. **`git mv` on a 0-byte file.** The rename is the whole content of that change;
   make sure git records it as a rename and not as a delete plus an add, so the
   fixture's history survives.

10. **Do not check any acceptance-criteria box yourself.** Only Jahmyr's
    verification earns a check.

### Recorded, not acted on

Carried forward so it is not lost:

- **`PARALLEL_ROUTE_SPREAD = 18` and `PARALLEL_LABEL_GAP = 4`** in
  `src/lib/parallelEdges.ts` are chosen rather than designed. Legible at twelve
  duplicates, but a design-pass question, not a defect.
- **Dagre's ordering bug is upstream and reportable** against `@dagrejs/dagre`
  3.1.1, with a known minimal repro (a pair of nodes carrying both a two-cycle
  and a parallel duplicate). Optional; the app no longer needs it fixed.
- **`describeLoadError.ts` now imports `layout.ts`** for `DesignLayoutError`. No
  bundle cost today, since `index.astro` is the only value importer and already
  imports `layout`. Judged out of this cycle above, because the only fix is
  structural.
- **The 1280px content column** is capped and left-aligned, leaving roughly 40%
  of the width empty, and `/schema`'s table runs wider than its prose. Routed to
  Task 11's v2 handoff doc as a v2 candidate.

### What comes after this cycle

Not yours to solve — recorded here so it is not lost.

- **Task 10, `docs/tasks/10-deploy.md`, is the frontier the moment this merges**,
  and its step 1 says in its own words that it needs a person: creating the
  Netlify site needs the Netlify and GitHub accounts. `netlify login` +
  `netlify init` in the repository, or the console import; build command
  `bun run build`; publish directory `dist`; and confirming on the first build
  log that Netlify installs bun when it finds the lockfile. `.env.example` has no
  variables, so there is nothing to set in the site's environment settings. I am
  putting this to the user when this cycle closes. **Do not attempt it and do not
  create any hosting account.**
- **Still open for a person:** Microsoft Word is unverified against the `.docx`
  export — no machine that has touched this project has Word installed.
- **Task 11** is blocked until Task 10 is done.

### Process for this cycle

- **Amon:** build on `chore/dedup-export-furniture`, commit there, and hand back.
  **Do not push and do not open the pull request** — the push and the PR are
  Jahmyr's, by name.
- **Sam's documentation refresh** at the end of the cycle routes through its own
  `chore/…` branch and its own pull request, not this one.
- Nobody edits agent configuration this cycle. That proposal is still with the
  user.
- `bun run test` runs Vitest. Plain `bun test` runs Bun's own runner and is
  wrong. Write `bun run test` every time, and correct it if you see it written
  wrong anywhere.

### Definition of done for this cycle

Every acceptance criterion above is checked in this document, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

Nothing, deliberately. Every exported file comes out of this branch the same
bytes it comes out of `main`. What changed is how many places those bytes are
written down in.

**Chore 1 — the sentence.** `'This design has no nodes, so there is nothing to
draw.'` is now declared once, in a new `src/lib/exportFurniture.ts`. All four
exports import it. `pdfPlan.ts` re-exports `NOTHING_TO_DRAW` under that name
rather than declaring a second one, so `pdfPlan.test.ts` — the safety net this
cycle is securing — is untouched, and `docxPlan.ts`'s comment pointing at the
other three copies is gone, because it now points at nothing.

**Chore 2 — the columns.** The node columns and the edge columns are declared
once in the same module, heading and share together, and the private `Column`
interface that was in both planners is now one exported interface. The two
planners keep their own use of a share: points in the PDF, DXA in Word, with
`docxPlan`'s last-column rounding untouched. `toHtml` and `toMarkdown` derive
their headings from the same lists instead of re-typing the words.

**Chore 3 — the fixture.** `e2e/fixtures/empty.json` is `empty-file.json`,
which says *no bytes*, beside the `empty-design.json` that says *no nodes*. The
unit test's string literal uses `empty-design.json`, the name that means what
that test means. `export.spec.ts`'s three-line disambiguating comment is cut to
the one fact it was there to state.

**The two comments.** `loadDesign.ts`'s module header no longer dates Task 04 as
pending, and `readPlacedNodes`'s throw comment in `layout.ts` accounts for
`placeWithDagre` and `isWhollyPlaced` gating ahead of it.

### The `as const` trap, and how I know it did not bite

`toHtml.ts` and `toMarkdown.ts` typed their headings as fixed-length readonly
tuples. Deriving them with a bare `.map()` would have widened that to `readonly
string[]`, which is the one place in this cycle a mechanical move changes a
type. `headingsOf` maps over `keyof C` instead, so the derived constants keep
the exact type the hand-written ones had.

I did not take `bun run check` being clean as proof of that, because a widening
is not a type error. I compiled a throwaway probe asserting exact type identity
with the usual conditional-type trick, `Exact<typeof NODE_HEADINGS, readonly
['Id', 'Label', 'Type']>`, and it compiled with 0 errors. I then confirmed the
probe was not vacuous by swapping the expected type to `readonly string[]`,
which failed the check — so the passing assertion is real. The probe was
deleted; it is not in the diff.

### How I captured "before"

`659ded5` is docs-only on top of `d56efd8`, so this branch's `src/` and `e2e/`
were byte-identical to `main` when I started — `git diff --stat main -- src/ e2e/`
was empty. I confirmed that first, then captured the baseline in place.

The harness was a temporary Vitest file that walked every `.json` in
`e2e/fixtures/`, ran each through `loadDesign` (skipping the ones meant to
fail) and `layoutDesign`, and dumped `toMarkdown(layout)`,
`htmlPage(layout, drawing)`, `pdfPlan(layout, measure)` and `docxPlan(layout)`
to one JSON file. `measure` was `pdfPlan.test.ts`'s own stand-in,
`(text, size) => text.length * size * 0.5`; `drawing` was a fixed string, so
`htmlPage` is compared on its own output only. Eleven fixtures load:
`billing-run`, `control-labels`, `empty-design`, `estate-sweep`,
`markup-labels`, `order-intake`, `platform-overview`, `retry-loop`,
`two-cycle-duplicate-edge`, `two-loops`, `undrawable-labels` — including a
design with no nodes and `estate-sweep.json`, both of which the criteria name.

I re-ran it after each chore and after the comment edits. **Every run came back
byte-identical: `diff` silent, and both files MD5
`c57bec594cf6b30d46c3fccfea501af8`.** The harness is deleted and was never
committed; it is not in the diff.

### Files added or changed

- `src/lib/exportFurniture.ts` — **new.** The sentence, the `Column` interface,
  both column lists, both derived heading tuples, and `headingsOf`.
- `src/lib/exportFurniture.test.ts` — **new.** Eight tests pinning the one copy.
- `src/lib/pdfPlan.ts` — re-exports `NOTHING_TO_DRAW`; drops the `Column`
  interface and both column lists.
- `src/lib/docxPlan.ts` — same, plus the four-copies pointer comment deleted.
- `src/lib/toHtml.ts` — imports the sentence and both heading tuples; drops
  three declarations.
- `src/lib/toMarkdown.ts` — the same three.
- `e2e/fixtures/empty.json` → `e2e/fixtures/empty-file.json` — `git mv`,
  recorded as `rename ... (100%)`, still 0 bytes.
- `e2e/validation.spec.ts` — one call site; assertions unchanged.
- `e2e/export.spec.ts` — the disambiguating comment reduced to two lines.
- `src/lib/describeUpload.test.ts` — the name and the expected string.
- `src/lib/loadDesign.ts`, `src/lib/layout.ts` — comments only, confirmed by
  filtering the diff down to non-comment lines and getting nothing back.
- `docs/DECISIONS.md` — D102 and D103.

### Tests written

All eight are in `src/lib/exportFurniture.test.ts`.

1. *is the wording D51 chose, to the character* — pins the sentence as a
   literal, so a re-wording is a failing test rather than four quiet edits.
2. *is the same string `pdfPlan` exports, because that is a re-export* — pins
   that `pdfPlan`'s door still opens on this room. This is the structural
   replacement for the assertion D66 relied on.
3. *names and sizes the node table the way all four exports print it* — pins
   `Id`/0.26, `Label`/0.46, `Type`/0.28, in order.
4. *names and sizes the edge table …* — pins `From`/0.26, `To`/0.26,
   `Label`/0.48, in order.
5. and 6. *gives the whole node/edge table away, so no share is unaccounted
   for* — pins each set summing to 1. This is a real invariant rather than
   decoration: `pdfPlan` spends the content width on these and `docxPlan` hands
   the last column whatever the rounding left over, so a set summing to less
   than a whole table would print differently in the two planners.
7. and 8. *derives the node/edge headings from those columns rather than
   re-typing them* — pins the headings as exactly the columns' headings, in
   order, which is what stops the two text formats naming one set while the two
   planners size another.

Red first, both times: run 1 failed with `Cannot find module './exportFurniture'`;
run 2 failed 6 of 8 on the missing column exports, with the two sentence tests
still passing. Each chore's tests were green before I moved to the next.

### Local results

- `bun run test`: **pass — 449 tests across 27 files.** Baseline was 441 across
  26; the deltas are the eight new tests and the one new file, and no existing
  test was deleted or edited except `describeUpload.test.ts`'s two renamed lines.
- `bun run test:e2e`: **pass — 124/124**, run twice (after chore 3 and again at
  the end). Port 4321 was confirmed free before both runs, so neither was served
  a stale `dist/`.
- `bun run check`: **clean — 0 errors, 0 warnings, 0 hints across 82 files** (80
  on `main`, plus the two new ones).
- `bun run build`: **pass**, 2 pages.
- No new dependency; `package.json` and `.env.example` are unchanged.

Every file the criteria require untouched is untouched, by `git diff --stat main`:
`pdfPlan.test.ts`, `toHtml.test.ts`, `toMarkdown.test.ts`, `docxPlan.test.ts`,
`index.astro`, `toPdf.ts`, `toDocx.ts`, `exportStyles.ts`, `.env.example`.

Four commits, one per chore plus one for the comments.

### Decisions recorded

- **D102** — where the shared sentence and columns live, and what keeps them from
  drifting. As asked, it does not let D66's reasoning pass: that decision's claim
  that "a third literal copy cannot drift" rests on a test that compared three
  copies and never the fourth, so the claim was thinner than it reads. D102 says
  so, and says the guarantee is now structural rather than asserted.
- **D103** — the fixture naming rule: a name says *no bytes* or *no nodes*, never
  both.

### Known gaps

- **I did not check any acceptance-criteria box.** All 28 are as you left them.
- **Microsoft Word is still unverified** against the `.docx` export. Unchanged by
  this cycle and not mine to close, but the `.docx` bytes are among what moved
  here, so it is worth saying plainly: `docxPlan`'s output is byte-identical to
  `main`'s for all eleven fixtures, so nothing this cycle did can have changed
  what Word sees.
- **The `as unknown as` in `headingsOf`** is a deliberate escape hatch, not an
  oversight: `.map` returns an array where the caller is owed a tuple, and
  TypeScript cannot verify that narrowing through a generic. It is the only type
  assertion in the new module and its doc comment says why it is safe. I would
  rather you see it and judge it than not notice it.

### Out-of-scope notes for Jared

1. **`loadDesign.ts` has two more Task 04 references** that your criterion did
   not scope — line 24, "Task 04 switches on `code` and reads the detail off the
   subclass", and line 74, "it belongs to Task 04". Both are in class doc
   comments rather than the module header, and both read as present-tense
   statements about code that exists, so neither is wrong the way the header was.
   I left them. If you want the file free of task numbers entirely it is a
   two-line follow-up, but it was not what you asked for and this was not the
   cycle to widen.
2. **`describeLoadError.ts` importing `layout.ts`** — carried forward exactly as
   you recorded it. Untouched, and this cycle gave me no new information about it.
3. **`PARALLEL_ROUTE_SPREAD` / `PARALLEL_LABEL_GAP`** and the **upstream dagre
   report** — carried forward, untouched.
4. **`exportFurniture.ts` is the natural home for the next piece of shared
   furniture, which is worth watching rather than acting on.** The document
   language `'en'` in `docxPlan.ts` and the `Nodes` / `Edges` section names all
   four exports print are both furniture by the module's own definition, and
   neither is shared today. I did not move them: the section names are passed as
   arguments at each call site rather than declared as constants, so unifying
   them is a shape change and not a move, and this was the wrong cycle for one.
   Recording it so the module does not quietly become a junk drawer either.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass.** All 28 criteria verified and checked. CI is green on both runs of
[PR #25](https://github.com/IBatsios/map-data-structures/pull/25), which is open
as a draft for Sam to mark ready and merge.

This cycle's whole warrant is that nothing changed, so I did not take Amon's MD5
on report. I wrote my own capture harness, ran it on `main` and on this branch,
and compared. I then ran a second, adversarial capture over inputs no fixture
covers, and a third over a 400-node design. All three came back byte-identical.
The `as const` narrowing I verified with my own `Exact<A, B>` probe, and then
falsified the probe to prove it was not vacuous.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| `toMarkdown` byte-identical for ≥3 designs incl. a no-node design and `estate-sweep.json` | **pass** | My own Vitest harness dumped `toMarkdown` for all 11 loadable fixtures — `empty-design` (0 nodes) and `estate-sweep` among them — on `main` and on this branch. `diff` silent; the whole dump, 425,344 bytes, MD5 `dd98cd85302b113890562b43f4529e07` on both sides. |
| `htmlPage` byte-identical for the same designs | **pass** | Same harness, same dump, same MD5. `drawing` was held to a fixed string so only `htmlPage`'s own output varies. |
| `pdfPlan` and `docxPlan` `JSON.stringify` byte-identical | **pass** | Same harness, same dump, same MD5. `measure` was `pdfPlan.test.ts`'s own stand-in, `(text, size) => text.length * size * 0.5`. "Before" is genuinely `main`: I confirmed `git diff --stat main 659ded5 -- src/ e2e/` is empty and that `659ded5` is docs-only on `d56efd8`, then ran the harness on a `git checkout main`. |
| Six shares still `0.26/0.46/0.28` and `0.26/0.26/0.48`; headings still Id, Label, Type and From, To, Label, in order | **pass** | `src/lib/exportFurniture.ts:97–108` reads exactly those, in order. Grepping those six numbers anywhere in non-test `src/` returns only that file. Both heading rows appear verbatim in the identical dumps. |
| Four export test files unchanged | **pass** | `git diff -M --stat main` on the four paths is empty, and none appears in `git diff -M --name-status main`. |
| `index.astro`, `toPdf.ts`, `toDocx.ts`, `exportStyles.ts` unchanged | **pass** | Same explicit `git diff -M --stat`: empty. |
| Sentence declared exactly once outside tests | **pass** | `grep -rn "so there is nothing to draw" src/` gives one non-test hit, `exportFurniture.ts:87`. The others are `pdfPlan.test.ts:175`, `toHtml.test.ts:162`, `toMarkdown.test.ts:290`, `docxPlan.test.ts` and `exportFurniture.test.ts:27` — all assertions, none declarations. |
| `import { NOTHING_TO_DRAW } from './pdfPlan'` still resolves, to the same string, as a re-export | **pass** | `pdfPlan.ts:50` is `export { NOTHING_TO_DRAW };` — a re-export of the line 40 import, not a second `const`. It resolves at runtime too: `exportFurniture.test.ts` imports it under an alias and asserts identity, and that test is among the 449 passing. |
| `toHtml`, `toMarkdown` and `docxPlan` import it; `docxPlan`'s four-copies pointer comment gone | **pass** | All three import, at `toHtml.ts:45`, `toMarkdown.ts:32` and `docxPlan.ts:35`; no `const NOTHING_TO_DRAW` survives anywhere. The pointer comment is deleted in the `docxPlan.ts` diff, the block at old 152–160. |
| Node and edge columns declared exactly once in `src/`, heading and share together | **pass** | Grepping `NODE_COLUMNS` and `EDGE_COLUMNS` across `src/` shows one declaration each, `exportFurniture.ts:97` and `:104`; every other hit is an import or a use. |
| `Column` interface in one file, not two | **pass** | `grep -rn "interface Column" src/` gives one hit, `exportFurniture.ts:44`. Both planners now `import type { Column }`. See note 1 below on the word "private". |
| `toHtml` and `toMarkdown` derive their headings rather than re-typing | **pass** | Both import `NODE_HEADINGS` and `EDGE_HEADINGS`; the four `as const` literal declarations are gone from both, and no heading string literal survives outside `exportFurniture.ts`. **The tuples did not widen** — see below. |
| A Vitest test fails if a heading or a share is changed | **pass — mutation-tested** | I did not take this one on the test's existence. Changing `Type` to `Kind` failed 1 of 8; changing the Label share `0.46` to `0.40` failed 2 of 8, the literal pin and the sums-to-a-whole-table invariant. Both mutations were reverted, with `git diff --quiet` confirming the restore each time. |
| `empty.json` gone; the 0-byte file has a no-bytes name; `wc -c` still 0 | **pass** | `e2e/fixtures/empty-file.json`, `wc -c` = **0**. `empty.json` is absent from the tree. The name pairs with `empty-design.json` and speaks of bytes, not nodes. |
| The rename is recorded as a rename | **pass** | `git diff -M --name-status main` gives `R100  e2e/fixtures/empty.json  e2e/fixtures/empty-file.json`, and `git log --follow --oneline` on the new path reaches `b0f8210`, the fixture's first commit. |
| `validation.spec.ts`'s "says an empty file is empty" points at the new name, still passes, assertions unchanged | **pass** | The only changed line is `upload.choose('empty-file.json')`. The `toContain('That file is empty.')` and the `not.toMatch(/line \d/i)` are untouched context in the diff. The test ran green as Playwright test 109. |
| `describeUpload.test.ts` no longer uses the old name for a 0-node design | **pass** | Two lines: the argument and the expected string both read `empty-design.json` now. The assertion is otherwise unchanged. |
| `export.spec.ts`'s disambiguating comment gone or reduced; `choose('empty-design.json')` untouched | **pass** | Three lines cut to two, and the surviving two no longer explain a collision. Both `upload.choose('empty-design.json')` calls are untouched — now at lines 184 and 506, one line up from 185 and 507 because the comment shrank. |
| No other file in `e2e/fixtures/` renamed, added or removed | **pass** | Diffing `git ls-tree --name-only` for that directory, `main` against `HEAD`, shows exactly one removal and one addition: the rename itself. Nothing else moved. |
| `loadDesign.ts`'s module header no longer speaks of what "Task 04 has to work with" | **pass** | The header now says the error carries every piece of evidence `describeLoadError` needs to point at the fault. It names the consumer instead of dating a finished task. |
| `readPlacedNodes`'s throw comment accounts for `placeWithDagre` and `isWhollyPlaced` (D98) | **pass** | Nine lines added at `layout.ts:349–357`. They name `isWhollyPlaced` as the stricter gate that runs first, and name the one case it cannot cover: it walks the graph's own node list, so an id the graph does not hold at all is one it never asks about. Accurate to the code, and still an assertion rather than a user-facing message. |
| Neither comment change alters a line of executable code | **pass — mechanically** | I filtered `git diff -U0 main` for those two files down to added and removed lines that are not `*`, `/**`, `*/`, `//` or blank. **Empty result.** |
| `bun run test` passes at least 441 across 26 files | **pass** | **449 passed across 27 files.** The baseline was observed rather than assumed: I checked out `main` and ran it — **441 across 26**. The delta is exactly the one new file and its eight tests, and no test file was deleted; `name-status` shows one `A` and one `M`. |
| `bun run test:e2e` passes all 124 | **pass** | **124 passed, 21.6s.** Port 4321 was confirmed free before the run, so no stale server served a pre-change `dist/`. |
| `bun run check` is clean | **pass** | `astro check`: **0 errors, 0 warnings, 0 hints across 82 files** — 80 on `main`, plus the two new ones. |
| CI green on the pull request, on both jobs | **pass** | [PR #25](https://github.com/IBatsios/map-data-structures/pull/25), draft. Both event-triggered runs of the `test` job are green: the push run [35418897534](https://github.com/IBatsios/map-data-structures/actions/runs/35418897534) in 1m50s and the pull_request run [35418912466](https://github.com/IBatsios/map-data-structures/actions/runs/35418912466) in 1m33s. Each run does `bun run check`, `bun run test` and `bun run test:e2e` on ubuntu-latest. No repeat of D101's flaky-runner timeout. |
| `docs/DECISIONS.md` records the cycle, numbered from D102 | **pass** | D102 on where the furniture lives and that D66's guarantee is now structural rather than asserted, D103 on a fixture name saying *no bytes* or *no nodes* and never both. D101 was the highest on `main`. |
| No new dependency, no new environment variable, `.env.example` unchanged | **pass** | `package.json` and `bun.lock` are absent from the diff. `.env.example` is unchanged and still declares no variables. Grepping `process.env` and `import.meta.env` across `src/`, `scripts/` and `astro.config` finds **nothing**; the only reads are `playwright.config.ts`'s `CI` checks, which are test infrastructure and pre-date this branch. |

### The `as const` trap, verified independently

Amon's probe was deleted, so I wrote my own rather than take the result on
report. An `Exact<A, B>` conditional-type assertion compiled against this
branch: `typeof NODE_HEADINGS` is exactly `readonly ['Id', 'Label', 'Type']` and
`typeof EDGE_HEADINGS` exactly `readonly ['From', 'To', 'Label']`; `['length']`
is exactly `3` on both, and `NODE_HEADINGS[0]` is exactly `'Id'` rather than
`string`. **0 errors.** I then flipped the expected type to `readonly string[]`
and the same file failed with `TS2344: Type 'false' does not satisfy the
constraint 'true'`, so the passing assertion was not vacuous. These are the
exact types the hand-written `as const` literals carried on `main`. Probe
deleted; not in the diff.

### Preservation, verified independently

Three separate captures, each run on `main` and on this branch and diffed.

1. **All 11 loadable fixtures**, all four exports. 425,344 bytes, MD5
   `dd98cd85302b113890562b43f4529e07` on both sides, `diff` silent. My MD5
   differs from Amon's because my harness uses a different fixed `drawing`
   string and its own JSON shape; what matters is that before and after agree
   under one harness.
2. **An adversarial set no fixture covers** — nodes but no edges, twelve
   duplicate edges between one pair, a two-cycle plus a duplicate (the shape
   that crashed dagre before D98), markup and control characters in labels and
   in a `type`, and a title mixing Greek, Chinese and a U+202E right-to-left
   override. Plus eleven inputs that must be refused: empty file, whitespace
   only, truncated JSON, trailing comma, valid JSON that is not a design, a bare
   array, `null`, a missing `type`, a dangling edge, duplicate ids, and an
   all-spaces label. Every refusal came back the same error class and the same
   message on both sides, and nothing loaded that should not have. `diff`
   silent, MD5 `c6fe3548533dbc2ec27573b54fd5cd5d` on both sides.
3. **A 400-node, 399-edge design** — 40 PDF pages and 70 KB of Markdown,
   exercising pagination and drawing-sheet tiling well past anything in
   `e2e/fixtures/`. 1,311,411 bytes, MD5 `24c0ad990774e32545dd77720f427c12` on
   both sides, `diff` silent.

All three harnesses were deleted, and `git status` was clean before the commit.

### The judgement call you asked me to review

**The `as unknown as` in `headingsOf` — I accept it.** Three reasons.

Its blast radius is three lines and one module: `headingsOf` is not exported, so
nothing outside `exportFurniture.ts` can reach it. It is sound rather than
merely convenient — `HeadingsOf<C>` is a homomorphic mapped type over a tuple,
so it preserves length and index, and every element of the returned array is
read straight off the corresponding column, which makes the value structurally
exactly the asserted type by construction. And `as unknown as` rather than a
single `as` is not sloppiness: with `C` still generic, TypeScript refuses the
direct conversion as possibly mistaken, so the double assertion is the only
spelling available.

The alternative is declaring the heading tuples by hand and asserting equality
at compile time, but that is re-typing the strings, which is the thing the
criterion forbids. The assertion is the price of deriving them, it is paid once,
its doc comment says why it is safe, and I have verified that the type it claims
to produce is the type it produces. Worth watching only if someone later gives
`headingsOf` a second caller with a different shape.

### One thing I checked that nobody asked for

Deduplication creates a failure mode that per-file copies did not have: four
modules now share one array **instance**, so a mutation in any one of them would
be visible in the other three. I checked. Every consumer is read-only —
`pdfPlan.ts:324`, `:403` and `:405`, `docxPlan.ts:522` and `:535`,
`toHtml.ts:160`, `toMarkdown.ts:113` and `:116` use only `.map`, `.reduce`,
`.join` and `.length` — and every parameter that receives these lists is typed
`readonly Column[]` or `readonly string[]`, so the compiler refuses a mutation
at the boundary as well. No `sort`, `reverse`, `push`, `splice` or index
assignment anywhere. The risk is real in general and is not realised here.

### Accessibility

No delta to check. `src/pages/index.astro` and `src/lib/exportStyles.ts` are
untouched by `git diff`, `/schema` is untouched, and the exported HTML is
byte-identical to `main`'s for all 11 fixtures plus the adversarial and
400-node cases — including its `<th scope="col">` headings, which come through
the changed `NODE_HEADINGS` path and survive unchanged. There is no rendered
surface this branch moves.

### Command results

- `bun run test`: **449 passed, 27 files**; baseline on `main` observed at 441/26
- `bun run test:e2e`: **124 passed**, port 4321 confirmed free first
- `bun run check`: **0 errors, 0 warnings, 0 hints, 82 files**
- `bun run build`: **pass**, 2 pages in 747 ms
- `bun run dev`: **pass** — Astro 7 daemonises the server; `GET /` and
  `GET /schema` both returned 200 (27,194 and 26,530 bytes), and the dev log
  shows no error and no overlay. Stopped afterwards.
- Secret scan: **gitleaks — no leaks found**, 33 commits, 2.10 MB scanned
- CI: **green on both runs**, push in 1m50s and pull_request in 1m33s, on PR #25

### Defects for Amon

**None.** Nothing in the diff changes behaviour, and I tried three independent
ways to catch it if it had.

### Fixed in place

Nothing. There was nothing to correct.

### Notes back to Jared

1. **Your criterion reads "the *private* `Column` interface exists in one file,
   not two."** It is now one interface in one file, which is what the criterion
   is about, but it is `export interface Column` rather than private — it has to
   be, since both planners import the type. Read as "one declaration, not two"
   it passes cleanly; read with "private" taken literally it could not have
   passed at all. Flagging the wording, not the code.

2. **I concur with Amon's four notes**, including leaving `loadDesign.ts`'s two
   remaining Task 04 references at lines 24 and 74 alone. I read both: they are
   present-tense statements about code that exists, so neither carries the fault
   the header had, and widening a nothing-changed cycle to reach them would have
   been the wrong trade. A two-line follow-up if you want the file free of task
   numbers entirely.

3. **`exportFurniture.ts` as a future junk drawer** is a real risk, and his read
   on `'en'` and the `Nodes` / `Edges` section names is right: the section names
   are arguments at each call site, so unifying them is a shape change and not a
   move. Worth a line in whichever cycle next opens those files.
