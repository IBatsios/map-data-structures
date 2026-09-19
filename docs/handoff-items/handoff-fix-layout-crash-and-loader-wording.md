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
