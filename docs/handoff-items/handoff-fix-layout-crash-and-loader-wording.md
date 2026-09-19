# Handoff — Fix: a valid design that will not draw, and a message that contradicts itself

**Date:** 2026-09-18
**Branch:** fix/layout-crash-and-loader-wording
**Task file:** none — see "Why this has no task file"
**Round:** 1

## Assignment from Jared

### Why this cycle, and why now

I gated this in front of Task 10 during the Task 09 cycle, and this is it
running. Task 10 deploys to Netlify. Everything still wrong when Task 10 merges
is wrong at a public URL, which is a different thing from being wrong on a
branch, so the two defects below go first.

Task 10 is also waiting on a person regardless (see "What comes after this
cycle"), so this cycle costs the schedule nothing.

### Why this has no task file

`docs/tasks/` is generated from `docs/intake.md`, so a hand-written numbered
file there would be lost on the next regenerate. The precedent is the
`layout.ts` split (`handoff-chore-split-layout-module.md`) and the label-size
fix (`handoff-fix-drawing-label-size.md`): each got its own branch, its own
handoff doc, and acceptance criteria written by me.

**This handoff doc is the whole contract.** The acceptance criteria below are
mine, not the intake's. Task 10's status stays `ready`; it is not started by
this cycle.

### What I split out of this cycle, and why

The handoff after Task 09 listed five items as one "paired small-fixes cycle".
I have split them in two. **This cycle carries two of them. Do not do the other
three.**

**This cycle — two defects, one seam.** Both are the app telling a user
something untrue about a file they wrote, and both are verified the same way:
load a file, look at what comes back.

1. The dagre crash on a valid design.
2. The loader's self-contradicting message on Firefox, with the two stale
   comments and the one conditional assertion that sit beside it.

**The next cycle — three chores, no behaviour change.** D51's empty-design
sentence in four copies, the four exports' column headings and shares in four
copies, and the `e2e/fixtures/empty.json` name that means two opposite things.
Those are pure dedup and renaming, pinned by tests that already exist, and they
are verified by *nothing changing*. Mixing them in here would put a mechanical
rename in the same review round as an open investigation into a graph library,
and a second round on the crash would drag the renames back through review for
no reason.

If you find yourself editing `pdfPlan.ts`, `docxPlan.ts`, `toMarkdown.ts` or
`toHtml.ts` in this cycle, stop and ask why — those four files belong to the
next one.

### Scope

**Two things, in this order.** Item 1 is the larger and the less predictable;
item 2 is bounded and can be landed first if you want a green run under you
before starting the graph work. Either order is fine. Both must land.

---

#### Item 1 — a valid design that crashes dagre instead of drawing

Every node `type: "service"`, labels are yours to invent (D19 requires a
non-blank `id`, `label` and `type` on every node and a non-blank `from`, `to`
and `label` on every edge, so the fixture must carry all of them):

```
nodes: n0, n2, n3, n4, n5, n6
edges: n2→n5, n0→n6, n0→n4, n3→n4, n6→n3, n4→n0, n0→n4
```

That file passes `loadDesign` — ids are unique, every edge names a defined node,
no field is blank — and then `layoutDesign` throws out of dagre's
`intersectRect`.

**What is already known, so you do not re-derive it:**

- It needs **both** a two-cycle (`n0→n4` and `n4→n0`) and a **parallel
  duplicate** (`n0→n4` appears twice). Neither alone reproduces it.
- Confirmed three ways independently: Amon hit it 7 times in 400 fuzzed
  designs, Jahmyr 2 times in 2000, and an exhaustive sweep of every multigraph
  on 2 and 3 nodes with up to 4 edges found **zero**. So it is real, it is rare,
  and it needs more than three nodes to appear. A test at 2 or 3 nodes will not
  catch it — that sweep is the proof.
- It **fails safely today.** Nothing is drawn wrong; nothing is dropped
  silently. `layoutDesign` throws, `drawOrExplain` in `src/pages/index.astro`
  catches it, and `describeLoadError` falls through to its last branch:
  `Something went wrong while reading that file: <bounded engine message>`.
  So the bytes are bounded and D43's rule is not broken — but the words are
  dagre's, about a graph internal the user has never heard of, attached to a
  file that is correct.

**What "fixed" means, in priority order:**

1. **First choice: it draws.** The intake's most important path is "Upload JSON
   get a drawing back", and this is a design a user can legitimately write. A
   valid design that produces a drawing with all six nodes and all seven edges
   is the outcome worth having. Find out what dagre is actually choking on
   before choosing a remedy.
2. **Second, and required either way: if some graph still cannot be laid out,
   the app says so in its own words.** Not dagre's. A sentence a person can act
   on, tested in Vitest like every other message in this app. This is the floor,
   not the goal — do not reach for it as the whole answer without first
   establishing that (1) is out of reach, and say plainly in your handback which
   one you achieved and why.

Do not pin the app to a forked or patched dagre, and do not add a graph library.
Working around dagre inside `layout.ts` is fine; `layout.ts`'s own doc comment
already calls that module "the wall around" dagre, and this is exactly the kind
of thing a wall is for.

**One thing this defect has already falsified, and you must deal with it.**
`straightLine`'s doc comment at `src/lib/layout.ts:331` calls the fallback
"**Unreachable, and measured rather than assumed (D58)**", and the measurement
it rests on is that "Dagre ends its own layout with `assignNodeIntersects`,
which unconditionally puts the source border's intersection at the front of
every edge's points" — citing "ten shaped graphs — parallel edges, two-cycles,
self-loops … and four hundred fuzzed ones". `intersectRect` is the function
`assignNodeIntersects` calls. That step does **not** always complete, and the
ten shaped graphs missed this case because it needs a two-cycle *and* a parallel
duplicate *at once*. Whatever you do to the crash, that comment and D58's
reasoning have to end this cycle true. Correct the comment; append a new
decision row (the next number is **D98**) recording what was actually found and
what changed.

---

#### Item 2 — a message that says the browser gave no position, then quotes one

`src/lib/describeLoadError.ts:191`–`:193`. On SpiderMonkey (Firefox) the panel
prints:

> That file is not valid JSON, and this browser did not say where in it. It
> reported: JSON.parse: … at line 3 column 5 of the JSON data. Check the file
> for a missing comma, bracket or quote.

The sentence denies a position and the next sentence quotes one. Firefox is a
browser this app plainly targets — the same argument D32 made for Safari.

**The cause is narrower than it looks, and it is not the pattern.**
`ENGINE_POSITION_CLAUSE` (line 344) is correct and its end-anchoring rule is
load-bearing — leave that rule intact, and read its doc comment before touching
anything, because it is the fix for a round-1 defect where a file's own bytes
were mistaken for an engine's clause. The gap is the **return type's shape**:
`positionIn` can only yield a character index (`number | undefined`), and
SpiderMonkey gives a line and a column and no index at all. So the SpiderMonkey
message cannot be represented, `positionIn` returns `undefined`, and `atPosition`
is unreachable for it.

What it wants is a second clause that yields a `LineAndColumn` directly — the
interface already exists at line 313 — so `describeSyntaxFault` can take either
"an index to count from the file's own text" or "a line and column the engine
already named". Both then reach `atPosition`, which needs no change.

**Three rules constrain the fix:**

- **Never print a line inferred from nothing** (rule 1 of the module's own doc
  comment). A SpiderMonkey line and column is the engine's own statement, so
  printing it honours the rule; do not start scraping numbers out of message
  shapes you have not identified.
- **`positionIn` and `engineDetail` may never disagree.** They read the same
  pattern today on purpose — the module comment at line 354 says a message that
  named a column and then ended `… is not valid JSON` "was how the round 1
  defect announced itself". Whatever a second clause matches, `engineDetail`
  must strip the same thing, or Firefox users get the line printed twice: once
  in the app's words and once in the engine's.
- **The engine stays an argument, never an ambient fact** (rule 2). Vitest runs
  on Node and will only ever see V8. Test the Firefox case the way
  `describeLoadError.test.ts` already tests Safari's: a string constant beside
  `JAVASCRIPTCORE` at line 30, and a test that runs on Node.

Use real SpiderMonkey message text, not invented text. Get it from Firefox's
own documented `JSON.parse` messages, and say in your handback where you got it.
If you can run the file through Firefox via the Playwright browsers already
installed, better — but do not add a browser to the e2e matrix for it.

**Two stale comments and one guard, beside the same fix:**

- `src/lib/loadDesign.ts`, the `DesignSyntaxError` doc comment (lines 39–53):
  it enumerates two engine shapes ("V8 names a position and often a line and
  column, while JavaScriptCore … names none of the three") and misses
  SpiderMonkey's third, which names a line and column and no position. It also
  speaks of Task 04 in the future tense ("Task 04 has to say where the fault
  is", "its design work"). Task 04 shipped. Bring both up to date without
  weakening what the class actually promises — the message and the cause, not a
  position.
- `src/lib/loadDesign.test.ts:146`: `if (/position \d+/.test(original.message))`.
  I examined this and it is **not** a vacuous test — Vitest runs on Node, the V8
  message always matches, and the assertion always runs. So this is not a
  bug hunt; it is a guard doing nothing, in a test whose own comment explains at
  length why the position is "a bonus this engine happens to give". Assert it
  unconditionally and let the comment carry the caveat, so a future reader
  cannot mistake a live assertion for a skipped one. Do not delete the
  assertion.

### Acceptance criteria

These are the contract. Only Jahmyr's verification checks a box.

- [ ] The repro design — nodes `n0, n2, n3, n4, n5, n6` all of type `service`,
      edges `n2→n5, n0→n6, n0→n4, n3→n4, n6→n3, n4→n0, n0→n4` — loads and lays
      out without throwing, and its drawing shows all 6 nodes and all 7 edges.
- [ ] That design ships as a fixture and is covered by a Vitest regression test
      that fails against `main` as it stands today.
- [ ] A fuzz run of at least 2000 random multigraphs — the scale at which
      Jahmyr found it twice — produces zero layout failures of this class, and
      the run is reported with its seed or its generator so the number means
      something.
- [ ] If any design still cannot be laid out, the panel says so in the app's own
      words rather than dagre's, and that wording is covered by a Vitest test.
      If no such design remains, say so explicitly in the handback instead.
- [ ] `straightLine`'s doc comment and D58's reasoning in `src/lib/layout.ts`
      are true as of the end of this cycle, and `docs/DECISIONS.md` carries a
      new row from D98 recording what was found and what changed.
- [ ] A SpiderMonkey-shaped `JSON.parse` message produces a panel message that
      names the line and the column the engine named, and never says the browser
      did not say where.
- [ ] That message quotes the engine's line and column at most once: the
      position clause is stripped from the detail for SpiderMonkey exactly as it
      already is for V8.
- [ ] The V8 and JavaScriptCore messages are unchanged — every existing case in
      `describeLoadError.test.ts` still passes, including the one asserting that
      V8 and JavaScriptCore agree on wording, and the no-position wording still
      appears for an engine that genuinely names no position.
- [ ] The SpiderMonkey message text used in tests is real, and its source is
      named in the handback.
- [ ] `loadDesign.ts`'s `DesignSyntaxError` doc comment names all three engine
      shapes and no longer speaks of Task 04 as future work.
- [ ] `loadDesign.test.ts:146`'s assertion runs unconditionally.
- [ ] `bun run test` passes in full, and `bun run test:e2e` passes in full
      against a freshly built `dist/`.
- [ ] CI is green on the pull request, on both the push-event and the
      pull_request-event runs.

### Files expected to change

A guide, not a cage.

- `src/lib/layout.ts` — the dagre wall, and `straightLine`'s doc comment.
- `src/lib/layout.test.ts` — the regression test for the repro design.
- `e2e/fixtures/<name>.json` — the repro design as a fixture. Name it for what
  it *is* (a two-cycle with a duplicate edge), not for the bug. And see the
  next cycle's fixture-naming chore before you pick: one fixture name in that
  folder already means two opposite things, so do not add a third ambiguity.
- `src/lib/describeLoadError.ts` — the second position clause and its shape.
- `src/lib/describeLoadError.test.ts` — the SpiderMonkey constant and its cases.
- `src/lib/loadDesign.ts` — the `DesignSyntaxError` doc comment only. No
  behaviour change here.
- `src/lib/loadDesign.test.ts` — line 146's guard.
- `src/pages/index.astro` — only if the layout failure needs its own wording
  path. Prefer putting wording in a tested module over putting it in the page.
- `docs/DECISIONS.md` — append from D98. Append only; never rewrite a row.

**Not in this cycle:** `pdfPlan.ts`, `docxPlan.ts`, `toMarkdown.ts`,
`toHtml.ts`, `e2e/fixtures/empty.json`, `src/lib/describeUpload.test.ts`.

### Skills to load

- `error-handling` — both halves of this cycle are failure paths.
- `tdd-workflow` — every fix gets its test first; the regression test for the
  crash must be seen to fail before it passes.
- `coding-standards` — before the first file, for naming and structure.
- `front-comments` — three doc comments change in this cycle and two of them
  currently assert things that are false. They are the deliverable, not
  decoration.
- `front-a11y` — only if the page's failure path gains new wording.

### Watch out for

1. **The Playwright trap, which has bitten twice.** `playwright.config.ts` has
   `reuseExistingServer: !process.env.CI`, so a local `bun run test:e2e` will
   silently test a stale `dist/` if anything is holding port 4321 — a leftover
   `e2e/staticServer.ts` did exactly that last cycle (PID 8076). Before
   trusting a local e2e run, confirm nothing is listening on 4321, or build
   first. CI is unaffected. Leave the config alone unless you are closing the
   trap deliberately and saying so in your handback.

2. **`bun run test` runs Vitest. Plain `bun test` runs Bun's own runner and is
   wrong.** Write `bun run test` every time, and correct it if you find it
   wrong anywhere.

3. **D43 is not broken today and must not be broken by the fix.** Nothing the
   app did not write reaches the screen unbounded, and every message is set
   with `textContent`, never `innerHTML`. If the layout failure gains a wording
   path, it goes through `boundedText` like everything else.

4. **D22 and D32 constrain the loader.** The loader keeps `JSON.parse`'s
   message word for word and the original error as `cause`, and it promises no
   position. Item 2 changes what the *describer* can read out of a message; it
   changes nothing about what the loader promises. D32 exists precisely because
   a doc comment claimed more than was true about engine messages — do not
   replace one over-claim with another. If SpiderMonkey's message shape is
   something you could not verify, say so rather than asserting it.

5. **D20's two-pass reality.** `loadDesign` reaches the cross-field rules only
   once every field has passed, so the repro fixture must be valid on both
   passes to be a repro at all. Confirm it loads cleanly before concluding the
   crash is in the layout.

6. **D34 and D37 own self-edges.** The repro has none, and this cycle should
   not need to touch self-loop routing. If your fix reaches into `selfLoops.ts`,
   that is a signal the diagnosis drifted.

7. **`layout.ts` is the one door** (its own doc comment, and the `chore/
   split-layout-module` cycle that made it so). Nothing outside that folder
   imports `layout.types.ts`, `selfLoops.ts` or `normaliseDrawing.ts`, and a
   moved constant is re-exported, never re-declared. Keep that true.

8. **Do not check any acceptance-criteria box yourself.** Only Jahmyr's
   verification earns a check.

### What comes after this cycle

Not yours to solve — recorded here so it is not lost.

- **The three-chore cycle** described above (D51's sentence, the export column
  headings and shares, the `empty.json` name). I will assign it next.
- **Then Task 10, which needs a person.** The Netlify/GitHub account linkage is
  a Phase-0-style step: `netlify login` + `netlify init`, or the Netlify console
  import, with build command `bun run build` and publish directory `dist`. It
  needs accounts and a decision that is not an agent's to make. I am putting it
  to the user when Task 10 comes up. Do not attempt it, and do not create any
  hosting account.
- **Still open for a person:** Microsoft Word is unverified against the `.docx`
  export — no machine that has touched this project has Word installed.
- **Cosmetic, routed and deliberately not fixed:** at 1280px the content column
  is capped and left-aligned, leaving roughly 40% of the width empty on the
  right, and `/schema`'s table runs wider than its prose. It reads fine and the
  measure is a defensible choice, so it is neither a defect nor a chore. It
  belongs to a design pass with `frontend-design-direction` and
  `make-interfaces-feel-better` loaded, not to a fix cycle. It goes in Task 11's
  v2 handoff doc as a v2 candidate. Nobody touches it before then.

### Process for this cycle

- **Amon:** build on `fix/layout-crash-and-loader-wording`, commit there, and
  hand back. **Do not push and do not open the pull request** — the push and the
  PR are Jahmyr's, by name.
- **Sam's documentation refresh** at the end of the cycle routes through its own
  `chore/…` branch and its own pull request, not this one.
- Nobody edits agent configuration this cycle. That proposal is still with the
  user.
- Commits are conventional: this branch is `fix:`, with `docs:` for the
  comment-and-decision commits if you separate them.

### Definition of done for this cycle

Every acceptance criterion above is checked in this document, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

**Item 1 — the repro draws.** Outcome (1), not the floor. The six-node design
lays out, and a real browser renders six boxes and seven arrows from it.

The diagnosis first, because it changes what the defect is. Dagre's ordering
pass has a special case for two parallel dummy chains between the same pair of
nodes, and it merges them when one of the two is a *reversed* edge — which is
what a two-cycle becomes after dagre's own acyclic pass. That merge drops one
chain out of the ordering, so its dummy node is never given a position and comes
back holding `NaN`.

**`intersectRect` is not throwing because two centres coincide.** It throws
because `point.x - rect.x` is `NaN`, and `!NaN` is `true`, so the guard
`if (!dx && !dy)` fires. That matters, because it means the fault has a second
face: where the `NaN` is *not* an edge's first or last point,
`assignNodeIntersects` never touches it, dagre returns normally, and the `NaN`
lands in the SVG path's `d`, which voids the whole path. **An edge disappears
with nothing said at all.** I found this while fuzzing for the crash — 2 cases
in 20,000 at one seed, and one inside the 2500-graph Vitest run. It is the same
defect and the worse half of it, because nothing announces it.

The remedy is in the wall, not in dagre. `layoutDesign` now asks dagre twice:

1. **`'per-edge'`** — one dagre edge per edge in the file, exactly what it has
   always been asked. Provably unchanged: every group holds one member, so the
   reserved plate is that edge's own plate, the route comes back as given and
   the label centre comes back as given. No existing drawing moves.
2. **`'per-pair'`** — taken only when the first ask does not come back whole.
   One dagre edge per pair of nodes, which removes the shape the special case
   fires on; `parallelEdges.ts` then fans the duplicates apart, keeping both
   ends on their borders and stacking the label plates.

"Whole" is deliberately stricter than "did not throw": every coordinate has to
be finite. That is what closes the silent half.

**The floor is there too, as required either way.** If neither keying places a
graph, `layoutDesign` throws `DesignLayoutError` and `describeLoadError` words
it in this app's own sentence. Dagre's words never reach the screen.

**To answer the criterion directly: no such design remains that I can find.**
Per-pair keying failed zero times in 60,000 fuzzed multigraphs across three
seeds, where per-edge failed 36 times. But "none I can produce" is a smaller
claim than "none", so the wording exists and is tested rather than argued away.

**Item 2 — Firefox is told where.** `describeSyntaxFault` reads a second engine
clause and resolves either one to a `LineAndColumn`, so both reach `atPosition`
unchanged. Both clauses live in one ordered list that `placeIn` and
`engineDetail` both walk, which makes the invariant structural: the position
that is printed and the position that is stripped from the detail cannot come
from different clauses. `ENGINE_POSITION_CLAUSE` is untouched, still first and
still end-anchored.

Firefox now gets:

> That file is not valid JSON. Line 5, column 1: JSON.parse: expected
> double-quoted property name.

### Where the SpiderMonkey message text came from

**Read out of Firefox, not out of documentation.** Firefox 156.0 is installed on
this machine (`Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0)
Gecko/20100101 Firefox/156.0`). Headless `--screenshot` failed on the software
compositor, so I started it with `--marionette` against a throwaway profile and
ran `JSON.parse` on the exact file texts the test file already uses, over the
Marionette protocol, reading `error.message` back. Every SpiderMonkey string in
`describeLoadError.test.ts` is a verbatim capture. The browser was stopped
afterwards; nothing was installed and `playwright.config.ts` is untouched.

Three things that came out of it and are now recorded in the code:

- Every SpiderMonkey `JSON.parse` message ends `… at line N column M of the
  JSON data`, so the new clause is end-anchored like V8's.
- SpiderMonkey **never quotes the file**. Asked about a file whose own text
  reads `position 900`, it answers `JSON.parse: unexpected character at line 1
  column 1 of the JSON data` and quotes no byte of it. So D32's trap has no
  SpiderMonkey equivalent; the end anchor there is insurance, not a measured
  need, and the comment says exactly that rather than over-claiming.
- On the trailing comma, V8 and SpiderMonkey both land on line 5, column 1 —
  which is now a test.

### Files added or changed

- `src/lib/parallelEdges.ts` — **new.** Which edges share one dagre edge under
  each keying, and the geometry that fans them back apart.
- `src/lib/parallelEdges.test.ts` — **new.** Its unit tests, led by the
  "per-edge keying changes nothing" property.
- `e2e/fixtures/two-cycle-duplicate-edge.json` — **new.** The repro, named for
  what it is. Title "Settlement mesh"; six `service` nodes and seven edges.
- `src/lib/layout.ts` — `DesignLayoutError`; `placeWithDagre` and its
  finite-coordinate gate; `buildGraph` and `readRoutedEdges` reworked onto
  shared routes; `straightLine`'s doc comment corrected.
- `src/lib/layout.test.ts` — the repro block and the seeded fuzz.
- `src/lib/describeLoadError.ts` — the `DesignLayoutError` branch and its
  wording; `ENGINE_LINE_AND_COLUMN_CLAUSE`; `ENGINE_POSITION_CLAUSES` and
  `placeIn`; rule 1 of the module comment rewritten for three engine shapes.
- `src/lib/describeLoadError.test.ts` — the three SpiderMonkey constants with
  their provenance, five SpiderMonkey cases, two layout-failure cases.
- `src/lib/loadDesign.ts` — the `DesignSyntaxError` doc comment only. No
  behaviour change.
- `src/lib/loadDesign.test.ts` — line 146's guard removed, assertion kept.
- `e2e/drawing.spec.ts` — the browser walk over the new fixture.
- `docs/DECISIONS.md` — D98 and D99 appended.

### Tests written

**Layout (`layout.test.ts`)**

- `accepts the fixture as a design before any of this is about layout` — D20's
  two passes; pins that the crash is downstream of the loader.
- `draws all six nodes and all seven edges instead of throwing` — the criterion.
- `gives every node and every point of it a number a renderer can draw` — the
  silent half.
- `routes the two parallel edges apart, so a reader can see both` — distinct
  routes, non-overlapping plates.
- `keeps each parallel edge's own label on its own plate` — no label swapped.
- `lays out 2500 random multigraphs without one failure` — seed `20260918`,
  generator `randomNumbers` in the file, 2 to 8 nodes, 0 to 2n edges. It counts
  both throws and non-finite coordinates.

**Parallel edges (`parallelEdges.test.ts`)** — 12 tests. The first block is the
safety argument: the plate reserved for a group of one is that edge's own plate
to the pixel, `fanOutRoute` returns the very same array, `stackedLabelCentre`
returns the same centre. Then: duplicates merge, a two-cycle's two directions do
not, self-edges never merge, ends stay on borders, a two-point route gains a
middle, plates stack in file order, and `EDGE_KEYINGS` is ordered safe-first.

**Messages (`describeLoadError.test.ts`)** — `names the line and column an
engine gives without giving a position`; `reads an engine's line and column out
at most once`; `puts two engines reading one broken file at the same line and
column`; `still names the line when SpiderMonkey puts its fault after the JSON`;
`trusts SpiderMonkey's own line, which never quotes the file back`; plus `says
it in the app's own words rather than the graph library's` and `never repeats
the graph library's own words back to the user`.

**Browser (`drawing.spec.ts`)** — `draws a two-cycle with a duplicate edge that
dagre alone cannot place`: nine labels present, 6 nodes, 7 edges, different `d`
attributes on the parallel pair, plates not overlapping.

### Local results

`bun run test`: **pass** — 26 files, 441 tests (baseline on `main` was 25 files,
416 tests).
`bun run build`: **pass** — 2 pages.
`bun run check`: **pass** — 0 errors, 0 warnings, 0 hints.
`bun run test:e2e`: **pass** — 124/124 against a freshly built `dist/`.

On the standing trap: I checked `netstat` before the run and **nothing was
LISTENING on 4321** (only `TIME_WAIT` remnants of the run itself afterwards), and
the `webServer` command begins with `bun run build`, so the build was fresh.
`playwright.config.ts` is unchanged — I did not close the trap, deliberately, as
that was not this cycle's scope.

### Decisions recorded

- **D98** — the dagre fault, both of its faces, the two-keying remedy, the
  measurements (60,000 fuzzed graphs, three seeds) and the rejected alternatives
  (`acyclicer: "greedy"`, which left 17 of 20 failures in place; patching or
  forking dagre; a second graph library; making the merged keying the only one).
  It also records that D58's reasoning is corrected in place.
- **D99** — the second engine clause, the single shared clause list that makes
  the `placeIn`/`engineDetail` invariant structural, why taking SpiderMonkey's
  own line does not break rule 1, and where the message text came from.

### Known gaps

- **No RED-only commit.** The repo's pre-commit hook runs `bun run check` and
  `bun run test`, so a commit with a failing test is refused. I watched each
  test fail for the right reason before writing any implementation — the
  fixture threw out of `assignNodeIntersects`, the fuzz reported `run 1050:
  Not possible to find intersection…` and `run 1749: a coordinate was not
  finite`, and the five SpiderMonkey tests each returned the literal
  contradicting sentence — and the evidence is in the commit bodies. I did not
  use `--no-verify` to manufacture a red commit.
- **`layout.ts` grew** from 369 to 503 lines. Within the 800 ceiling but
  above the 200–400 band, which is why the new logic went into
  `parallelEdges.ts` rather than inline. If it grows again, `placeWithDagre` and
  its gate are the next thing to lift out.
- **The `'per-pair'` path is exercised by exactly one hand-written fixture** plus
  whatever the fuzz happens to route through it. Its geometry constants
  (`PARALLEL_ROUTE_SPREAD = 18`, `PARALLEL_LABEL_GAP = 4`) are chosen, not
  tuned against a designer's eye. They only ever affect a drawing that would
  otherwise not exist, so I would rather they were looked at than changed on a
  hunch.
- **SpiderMonkey was measured on one version**, Firefox 156.0 on Windows. The
  clause has been stable across Firefox's history as far as I can tell, but I
  only verified the one, and the comments say so rather than claiming more.
- **JavaScriptCore is still unmeasured by me.** Its constant is D32's, unchanged
  and untouched. No Safari on this machine.

### Out-of-scope notes for Jared

- **`loadDesign.ts`'s module header still says "whatever evidence Task 04 has to
  work with"** (line 8). Not the `DesignSyntaxError` comment you scoped, so I
  left it. It is the same lagging Task-04 reference, one comment up.
- **Dagre's ordering bug is upstream and reportable.** Minimal repro: a
  multigraph with a two-cycle and a parallel duplicate between the same pair,
  needing more than three nodes. `@dagrejs/dagre` 3.1.1. Someone may want to
  file it; the app no longer needs them to.
- **`readPlacedNodes`'s throw is now unreachable by a different route.**
  `placeWithDagre` already checks every node has finite coordinates before it
  returns, so that guard can only fire if the two disagree about what a node is.
  Its comment still reads as though it is the only check. Harmless, but it is a
  comment that will drift.
- **The e2e fixture folder now has 22 files and one naming convention it does
  not follow consistently.** I named mine for what it is, as you asked. The
  `empty.json` / `empty-design.json` collision you routed to the next cycle is
  the sharper case, and it is still there.
- **`describeLoadError.ts` now imports `layout.ts`**, which pulls dagre into
  anything that imports it. Only `index.astro` imports it as a value today, and
  that page already imports `layout`, so there is no bundle cost. If a page ever
  wants the messages without the drawing, `DesignLayoutError` should move to a
  module of its own that `layout.ts` re-exports.
