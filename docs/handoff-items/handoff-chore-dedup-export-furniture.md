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

- [ ] `toMarkdown(layoutDesign(d))` returns a **byte-identical** string, before
      and after, for at least three designs including a design with no nodes and
      `e2e/fixtures/estate-sweep.json`.
- [ ] `htmlPage(layout, drawing)` returns a **byte-identical** string, before and
      after, for the same designs.
- [ ] `JSON.stringify(pdfPlan(layout, measure))` and
      `JSON.stringify(docxPlan(layout))` are **byte-identical**, before and
      after, for the same designs. Both planners are pure and return plain
      objects, so this is a direct comparison; capture the "before" off `main`
      and record in your section how you captured it.
- [ ] The six column shares are still `0.26 / 0.46 / 0.28` and
      `0.26 / 0.26 / 0.48`, and the headings are still `Id | Label | Type` and
      `From | To | Label`, in that order.
- [ ] `src/lib/pdfPlan.test.ts`, `src/lib/toHtml.test.ts`,
      `src/lib/toMarkdown.test.ts` and `src/lib/docxPlan.test.ts` are
      **unchanged** — zero lines, confirmed by `git diff --stat`.
- [ ] `src/pages/index.astro`, `src/lib/toPdf.ts`, `src/lib/toDocx.ts` and
      `src/lib/exportStyles.ts` are **unchanged**, confirmed by
      `git diff --stat`.

**Chore 1 — the sentence:**

- [ ] `grep -rn "so there is nothing to draw" src/` finds the sentence declared
      **exactly once** outside test files.
- [ ] `import { NOTHING_TO_DRAW } from './pdfPlan'` still resolves, to the same
      string, as a re-export rather than a second declaration.
- [ ] `toHtml.ts`, `toMarkdown.ts` and `docxPlan.ts` each import it rather than
      declaring it, and `docxPlan.ts`'s four-copies pointer comment is gone,
      because it now points at nothing.

**Chore 2 — the headings and shares:**

- [ ] The node columns and the edge columns are declared **exactly once** in
      `src/`, with heading and share together.
- [ ] The private `Column` interface exists in one file, not two.
- [ ] `toHtml.ts` and `toMarkdown.ts` derive their headings from that one
      declaration rather than re-typing the strings.
- [ ] A Vitest test fails if a heading or a share is changed in one export and
      not the others — the role `exportStyles.test.ts` plays for the palette.
      One test covering the shared module is enough; it is now the only copy.

**Chore 3 — the fixture name:**

- [ ] `e2e/fixtures/empty.json` no longer exists. The 0-byte file has a name
      that means *a file with no bytes*, and `wc -c` on it still reads **0**.
- [ ] The rename is recorded as a rename, confirmed by
      `git log --follow --oneline` on the new path or `git diff -M --stat`.
- [ ] `e2e/validation.spec.ts`'s "says an empty file is empty" test points at the
      new name and still passes, with its assertions unchanged.
- [ ] `src/lib/describeUpload.test.ts` no longer uses the old name to mean a
      design with 0 nodes and 0 edges; the expected string changes with it and
      the assertion is otherwise unchanged.
- [ ] `e2e/export.spec.ts`'s disambiguating comment at 182–184 is gone or
      reduced, and `upload.choose('empty-design.json')` at 185 and 507 is
      untouched.
- [ ] No other file in `e2e/fixtures/` is renamed, added or removed.

**Comments:**

- [ ] `src/lib/loadDesign.ts`'s module header no longer speaks of what "Task 04
      has to work with".
- [ ] `readPlacedNodes`'s throw comment in `src/lib/layout.ts` accounts for
      `placeWithDagre` and `isWhollyPlaced` gating ahead of it (D98).
- [ ] Neither comment change alters a single line of executable code in those
      two files, confirmed by reading the diff.

**The suite:**

- [ ] `bun run test` passes with at least the **441** tests that pass on `main`
      today, across 26 files. A lower count means something was deleted.
- [ ] `bun run test:e2e` passes all **124**.
- [ ] `bun run check` is clean.
- [ ] CI is green on the pull request, on both jobs.
- [ ] `docs/DECISIONS.md` records this cycle, numbered from **D102** (D101 is the
      highest today): one decision for where the shared export text and columns
      now live and what keeps them from drifting, one for the fixture naming
      rule that a name says *no bytes* or *no nodes* and never both.
- [ ] No new dependency, no new environment variable; `.env.example` unchanged.

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
