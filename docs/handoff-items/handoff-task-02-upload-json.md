# Handoff — Task 02: Upload a JSON file

**Date:** 2026-09-18
**Branch:** feature/upload-json
**Task file:** docs/tasks/02-upload-json.md
**Round:** 1

## Assignment from Jared

### Scope

Turn the walking skeleton's "assume the file is fine" loader into a real one. A
user opens `/`, chooses a JSON file **or drops one on the page**, and the file
becomes a validated `Design` in the browser, with its file name and its node and
edge counts shown. The drawing from Task 01 keeps working, unchanged, off the
validated design.

Three pieces, in this order:

1. **The schema.** A Zod schema for `Design`, `DesignNode`, `DesignEdge`,
   living beside the types in `src/lib/`. It is the single definition the page,
   the validator and later Task 09's schema page all share, so it is written to
   be read, not just to run.
2. **The loader.** `loadDesign(text): Design` — takes the raw file text, parses
   it, validates it, returns a `Design` or throws. It replaces `parseDesign`
   entirely; do not leave two loaders in the tree. Task 04 turns its failures
   into messages, so the failure it throws must still carry the JSON syntax
   position or the Zod issue path. A failure here may still throw, but it
   throws something structured.
3. **The screen.** The labelled file input from Task 01 stays and keeps working.
   Add drag-and-drop onto the page as an addition to it. After a successful
   load, show the file's name and how many nodes and edges it holds, and hand
   the design to the existing drawing.

**Explicitly out of scope, and each already owned by another task:**

- Validation *messages* — the line, the field, the wording, the presentation.
  That is Task 04. Here a failure may throw, and the page may keep Task 01's
  single-line fallback in the status region. Do not build half of Task 04's
  feature.
- Layout and styling of the drawing (Task 03). Boxes in a row stays.
- The published schema page, `sample.json`, and "Load sample" (Task 09).
- Any export (Tasks 05 to 08), Playwright and any e2e step (Task 03),
  deployment (Task 10).
- Closing the typecheck gap D17. Routed to Task 03 — see "Routing notes" below.
  Do not add `typescript` or `@astrojs/check` in this task.

### Acceptance criteria

- [ ] As a user, I can upload a JSON file describing a system: demonstrated end to end.
- [ ] Tests cover the behavior, as a user would observe it, and pass.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the file input is reachable by keyboard and labeled, and drag-and-drop is an addition to it, not a replacement.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one is expected to need no edit — nothing in the tree reads
`import.meta.env` or `process.env` today. Say so rather than inventing a
placeholder.

### Files expected to change

A guide, not a cage.

| Path | Expected |
|---|---|
| `src/lib/design.schema.ts` | New. The Zod schema, exported, documented. |
| `src/lib/design.schema.test.ts` | New. Written first. Accepts a good design; rejects each bad shape by name. |
| `src/lib/loadDesign.ts` | New. `loadDesign(text): Design`. |
| `src/lib/loadDesign.test.ts` | New. Written first. |
| `src/lib/parseDesign.ts`, `src/lib/parseDesign.test.ts` | Removed once `loadDesign` covers their cases. Carry the cases over; do not lose "every node and edge, in file order". |
| `src/lib/design.types.ts` | May stay hand-written or become `z.infer` of the schema — your call, recorded. D15's module and names stay either way. |
| `src/pages/index.astro` | Drop target, file name and counts, calls `loadDesign`. |
| `src/components/…` + a `.module.css` | Only if the upload area genuinely wants to be a component. CSS Modules is the convention (D1) if you style the drop target at all; keep it to what a drop target needs to be visible. |
| `package.json`, `bun.lock` | `zod` added. Commit the lockfile. |
| `docs/DECISIONS.md` | The JSON shape (see below), plus any judgement call you made. |
| `README.md` | Only if a command changed. It should not. |
| This handoff doc | Your "Work completed by Amon — round 1" section. |
| `.env.example` | Expected: no change. |

### Skills to load

- `coding-standards` — before the first file.
- `tdd-workflow` — schema and loader tests before the schema and the loader.
- `error-handling` — the loader is the boundary this project has, and the shape
  of its failures is Task 04's raw material.
- `front-comments` — `CLAUDE.md` names this skill for exactly this module: the
  schema, which the page and the validator share.
- `front-a11y` — there is a screen, and one acceptance criterion is about it.
- `front-review` — before you hand off, since this changes an exported page.

### Watch out for

- **`bun run test`, never `bun test`.** Plain `bun test` runs Bun's own runner
  and silently skips the Vitest suite. Every script, doc line and commit message
  says `bun run test`. Fix it wherever you find it wrong.
- **Pushing and the pull request are Jahmyr's, not yours.** `.claude/settings.json`
  is the authority here: Amon commits on `feature/upload-json` and stops there.
  Jahmyr pushes the branch, opens the pull request, and gets the CI signal. Sam
  merges. If you think you need to push to finish, you have found a problem to
  report, not a step to take. (This paragraph is addressed to Amon; the version
  in Task 01's assignment was addressed to the wrong agent and cost a round-trip.)
- **Duplicate node ids must be rejected.** Today `originsByNodeId` in
  `src/pages/index.astro` builds a `Map` keyed by node id, so two nodes sharing
  an id both draw boxes but every edge touching that id resolves to the later
  one — a silent wrong drawing, against the PRD's "nothing dropped or
  mislabeled". The schema is where that stops. Name it in a test.
- **An edge that names an id no node defines must be rejected too.** The page
  currently throws a vague "an edge names a node the file does not define" from
  deep inside rendering. Same class of defect, same rule, and Task 03's layout
  should never have to defend against it. Both of these are cross-field rules,
  so they belong in a schema refinement, not in the field types.
- **Keep the failure structured.** Task 04 has to name the line or the field. A
  `JSON.parse` failure carries a position in its message; a Zod failure carries
  `issues[].path`. Whatever you throw must still carry them — do not flatten
  either to a plain sentence on the way out.
- **Zod is confirmed.** It is the Projects-root default for validation, it is
  MIT, and it is the only new dependency this task should add (D7 open-source
  only, D8 no paid services). Adding it changes `bun.lock`, and CI runs
  `bun install --frozen-lockfile` (D13) — commit the lockfile in the same commit
  as `package.json`.
- **D14 is provisional and this task is where it stops being provisional.**
  `{ title, nodes: [{id,label,type}], edges: [{from,to,label}] }` was Task 01's
  reading of the data model. Task 02 owns the published shape and is still free
  to rename `from`/`to` before anything is public — Task 09 publishes whatever
  you land on. Either confirm D14 as final or record the rename, with the
  reason, as a new row in the "Added after the build" table of
  `docs/DECISIONS.md`. Record your call on required-versus-optional fields and
  on whether a design with zero nodes is valid, too; they are real decisions and
  the schema page will publish them.
- **D15 stands.** The types keep living in `src/lib/design.types.ts` as `Design`,
  `DesignNode`, `DesignEdge`. `Node` is a DOM global — never import or declare a
  bare `Node` in a module the page also touches.
- **You get no compiler help inside `index.astro` (D17).** TypeScript is not
  installed, so nothing type-checks the `<script>` block and no test imports it.
  Keep that block thin — wiring, DOM lookups, event handlers — and put anything
  with logic in `src/lib/`, where Vitest at least runs it. Counting nodes and
  edges for the status line is logic.
- **Accessibility is a criterion, not a nicety.** The file input keeps its
  `<label for="design-file">` and its keyboard reach; drag-and-drop is added
  beside it, never in place of it. `#upload-status` already carries
  `role="status"` — put the file name and the counts there and a successful load
  gets announced, which today it is not.
- **Nothing leaves the browser.** No backend, no data layer (D1). The file is
  read with the File API. That is the PRD's retention promise, not just an
  architecture note. A drop handler must `preventDefault` on both `dragover` and
  `drop`, or the browser navigates away to the file and the promise breaks in the
  most literal way possible.
- **`astro dev` is detached in Astro 7.** It prints a pid and returns; use
  `astro dev status`, `astro dev logs`, `astro dev stop`. Expect that if you walk
  the story by hand.
- **Do not re-run `husky init`** — it writes `bun test` into the hook, and the
  hook must keep running Vitest only.
- **Do not check the acceptance boxes.** Jahmyr checks them when he has
  exercised them. Leave `**Status:** in progress` alone; Sam sets it to done.
- **`docs/` is generated from `docs/intake.md`.** Append to the "Added after the
  build" section of `docs/DECISIONS.md`; do not rewrite task-file bodies, the
  PRD, or the architecture doc.

### Routing notes — not this task, recorded so they are not rediscovered

- **D17, the missing typecheck gate, is assigned to Task 03.** Task 03 is
  already the task that adds a CI step (Playwright) and the task that moves real
  layout logic into page scripts, which is exactly the blind spot. It adds
  `typescript` and `@astrojs/check`, an `astro check` script, a CI step, and the
  typecheck line the `setup-pre-commit` skill wanted in the hook. Not Task 02.
- **Status messaging is Task 04's.** Task 02's file name and counts land in the
  existing `role="status"` region and incidentally give the success case a voice;
  the deliberate design of success and failure messaging stays with Task 04.
  Task 03 must not drop the live region when it rebuilds the drawing.
- **Task 03 also inherits:** Astro 7's detached `astro dev` must be reflected in
  Playwright's `webServer` config, and `bun run test` must stay Vitest-only so
  the pre-commit hook does not start a browser on every commit — give the e2e
  walk its own script.
- **Sam's post-merge doc refresh goes through a branch and a pull request.**
  `.claude/settings.json` denies `git push origin main:*`, so refreshing
  `docs/handoff-items/handoff-next-phase.md` after the merge cannot be a direct
  push to `main`. Task 01 had to be re-routed through PR #2 after the fact. Open
  a `chore/…` branch for the refresh by default.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

An uploaded file is now validated before anything draws it, and the page takes a
dropped file and says what it loaded.

- **The schema.** `designSchema` in `src/lib/design.schema.ts` is the one
  definition of what a design file may be, written to be read: every field
  required and no empty strings, unknown keys ignored, an empty design valid,
  and the two cross-field rules — unique node ids, and edges that only name
  nodes the file defines — in a refinement, with a comment on each saying what
  goes silently wrong without it.
- **The loader.** `loadDesign(text): Design` replaces `parseDesign`, which is
  gone along with its test; its four cases live on in `loadDesign.test.ts`,
  "every node and edge, in file order" among them. Failures throw
  `DesignSyntaxError` (keeps `JSON.parse`'s message, position and all, plus the
  original error as `cause`) or `DesignSchemaError` (keeps Zod's `issues`
  untouched), both `DesignLoadError` with a `code` for Task 04 to switch on.
- **The screen.** The labelled file input is untouched and still the keyboard's
  way in; drag-and-drop is added beside it, over the whole page, with `dragover`
  and `drop` both prevented so the browser cannot navigate away to the file.
  After a load the file name and the node and edge counts go into the existing
  `role="status"` region, so a success is announced where before only a failure
  was.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/design.schema.ts` | New. The Zod schema, exported and documented. |
| `src/lib/design.schema.test.ts` | New, written first. |
| `src/lib/loadDesign.ts` | New. `loadDesign` and the three error classes. |
| `src/lib/loadDesign.test.ts` | New, written first. |
| `src/lib/describeUpload.ts` | New. The status line's file name and counts. |
| `src/lib/describeUpload.test.ts` | New, written first. |
| `src/lib/parseDesign.ts`, `src/lib/parseDesign.test.ts` | Deleted. One loader in the tree. |
| `src/lib/design.types.ts` | Comment only: says why the types stay hand-written. |
| `src/pages/index.astro` | Drop target, file name and counts, calls `loadDesign`. |
| `src/styles/upload.module.css` | New. What a drop target needs to be visible. |
| `package.json`, `bun.lock` | `zod@4.6.5` added; lockfile committed with it. |
| `docs/DECISIONS.md` | D18 to D23. |
| `README.md` | Two statements that had stopped being true. No command changed. |
| `.env.example` | **No change, as expected.** Nothing in the tree reads `import.meta.env` or `process.env`; checked, not assumed. |

### Tests written

46 tests pass, 41 of them new. What each group pins down:

**`design.schema.test.ts` (26)**

- A node or an edge missing any one field is rejected, named field by field.
- An empty `id` is rejected; an id that is not a string is rejected.
- A good two-node one-edge design parses and comes back unchanged, in file order.
- A design with no nodes and no edges is valid.
- A key the schema does not name is ignored rather than fatal.
- The schema does not mutate what it was handed.
- A missing `title`, `nodes` or `edges` is rejected, and the issue path names it.
- An array, a string and `null` are each rejected where a design object belongs.
- **Two nodes sharing an id are rejected**, and the issue path is `nodes.1.id` —
  the repeat, which is the line the author has to change.
- **An edge whose `from` or `to` names no node is rejected**, with the path
  `edges.0.from` / `edges.0.to` and the undefined id quoted in the message.
- A self-edge is accepted: it names a node the design defines.

**`loadDesign.test.ts` (15)**

- The four cases carried over from `parseDesign.test.ts`, now from file text.
- Malformed JSON throws `DesignSyntaxError`, whose message is `JSON.parse`'s
  own, still matching `/position \d+/`, with the `SyntaxError` as `cause`.
- An empty file is rejected.
- A JSON file that is not a design throws `DesignSchemaError` carrying issue
  paths; `nodes.0.label`, `nodes.1.id` and `edges.0.to` are each pinned by name.
- Every faulty *field* is reported, not only the first.
- The cross-field rules are only checked once the fields are sound — pinned
  deliberately, see "Known gaps".
- Both errors carry a `code`: `invalid-json` and `invalid-design`.

**`describeUpload.test.ts` (5)**

- Names the file and counts nodes and edges; singular at one, plural at nought
  and at many; counts what the design holds rather than what is distinct in it;
  shows the file name as given.

### Local results

`bun run test`: **pass** — 3 files, 46 tests, 0 failures.
`bun run build`: **pass** — 1 page built. CSS Modules resolve: the hashed class
names are in `dist/index.html` and the drag handlers are in the client bundle.

Walked by hand as far as this seat allows: `bunx astro dev`, fetched `/`, and
confirmed the served markup keeps `<label for="design-file">`, the input with
`aria-describedby="drop-hint"`, `#drop-zone[data-dragging="false"]` and
`#upload-status[role="status"]`. Actually dragging a file needs a browser, which
is Playwright's job and Task 03's — **Jahmyr should drop a file by hand**, and
choose one, and try a duplicate id and a dangling edge.

### Decisions recorded

Six rows appended to the "Added after the build" table in `docs/DECISIONS.md`:

- **D18** — D14 confirmed final, not renamed. `from`/`to` read as the direction
  the line is drawn and are already in the README, the tests and the skeleton; a
  rename would cost Task 09 and every reader more than it bought.
- **D19** — Every field required, no empty strings, unknown keys ignored, an
  empty design valid.
- **D20** — The two cross-field rules live in a refinement, and are reached only
  once every field has passed.
- **D21** — The types stay hand-written rather than becoming `z.infer`; the
  exporters should not have to import Zod to read the contract.
- **D22** — What `loadDesign` throws, and what each failure keeps.
- **D23** — The CSS Module and the `data-dragging` attribute.

### Known gaps

- **A file with both a bad field and a bad cross-field rule reports only the
  field.** Zod does not run a refinement once the object's shape has failed, and
  that is right — a rule that reads the whole list of nodes cannot run over a
  `nodes` that is not a list of nodes yet. The consequence for a user is a
  two-pass fix: correct the fields, load again, then hear about the dangling
  edge. Pinned by a test and written into D20 so Task 04 designs for it rather
  than discovering it.
- **Nothing exercises the page's `<script>`.** No test imports it and, until D17
  closes in Task 03, no type-checker reads it either. The logic that could be
  moved out of it has been — validating is `loadDesign`'s, counting is
  `describeUpload`'s — but the drop handlers, the `preventDefault` pair and the
  status wiring are verified by reading and by the dev server, not by a test.
  Task 03's Playwright walk is where that ends.
- **A dropped file does not appear in the file input.** The input still reads
  "No file chosen" after a drop; the status line is what names the file. Setting
  `input.files` from the drop is possible and was left out as polish this task
  does not own.
- **The drag cue is best-effort for a keyboard or screen-reader user.** There is
  nothing to announce — dragging is a pointer gesture, and the file input is the
  equivalent path, which is what the acceptance criterion asks for.

### Out-of-scope notes for Jared

- **`renderEdge` in `index.astro` still guards against a node with no box**, and
  I kept it: the schema makes it unreachable for a validated design, but the map
  lookup is still a maybe-miss to the type system, and a silent miss would draw
  a line from nowhere. Its message now says the app broke its own guarantee
  rather than blaming the file. When Task 03 moves layout out of the page, that
  guard should move with it and become an assertion rather than an error string.
- **`accept="application/json,.json"` filters the file *picker* only.** A
  dropped file of any type reaches `loadDesign` and comes back as
  `DesignSyntaxError`, so a dropped PNG is reported as bad JSON rather than as
  the wrong kind of file. Task 04 may want to check the type or the extension
  before reading, so it can say "that is an image" instead.
- **Choosing the same file twice in a row does nothing**, because the input's
  `change` event does not fire when the value has not changed. A user who edits
  their file and re-picks it sees a stale drawing with no hint why. Clearing
  `input.value` after each read would fix it; it belongs with Task 04's
  messaging or Task 03's page work, not here.
- **The status region is doing two jobs** — success facts and failure text —
  through one `textContent`. Task 04 is where that splits; flagging it because
  Task 03 must not drop the live region when it rebuilds the drawing.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass.** Every acceptance criterion was exercised and holds. Nothing found rises
to a failed criterion; the four defects below are recorded for the tasks that own
them, and the first corrects a premise Task 04 would otherwise have built on.

The drag gesture was driven in a real Chromium through CDP
`Input.dispatchDragEvent` with real OS file paths, so the browser built genuine
`File` objects and delivered a genuine `DragEvent` — the same path an OS drop
takes, not a synthetic `DataTransfer` assembled in page script. Playwright was
installed outside the repository, in the session scratchpad; the branch is
untouched by it and Task 03 still owns adding it for real.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| As a user, I can upload a JSON file describing a system: demonstrated end to end. | pass | Chromium against `bun run dev`. **Picker:** the status region read `Loaded good.json: 2 nodes, 1 edge.` and the drawing held 1 `<svg>`, 2 `<rect>`, 1 `<line>`, 2 `<text>`. **Drop:** identical result; the URL was unchanged before and after, so the `preventDefault` pair holds and the browser did not navigate away to the file; `data-dragging` read `"true"` during the drag and `"false"` after. Both refusals confirmed on both paths: duplicate id and dangling edge each refused, `#drawing.innerHTML` emptied to `""`, and a previously good drawing cleared rather than left stale. |
| Tests cover the behavior, as a user would observe it, and pass. | pass | `bun run test` gives 3 files, 46 tests, 0 failures. All four `parseDesign.test.ts` cases carried over by name into `loadDesign.test.ts`, "keeps every node and every edge, in the order the file lists them" among them — checked by diffing the deleted file's `it(` list against the new one, not by taking the claim. Limitation, already routed and not counted against this criterion: nothing imports the page's `<script>`, so the drop handlers and the status wiring are covered by my browser walk rather than by the suite. Task 03 owns Playwright. |
| Every earlier test still passes; CI is green. | pass | CI run 35320855940 on PR #3: `bun install --frozen-lockfile` resolved, so the committed `bun.lock` is valid; `vitest run` gave `Test Files 3 passed (3)`, `Tests 46 passed (46)`. Both the push-triggered and the PR-triggered runs are green. |
| Best-effort accessibility: the file input is reachable by keyboard and labeled, and drag-and-drop is an addition to it, not a replacement. | pass | One `Tab` from page load puts focus on `#design-file`; `<label for="design-file">` resolves to it with the text "Design JSON file"; `aria-describedby="drop-hint"` resolves to the hint. `#upload-status` carries `role="status"` and is present and empty at load, which is what lets a later injection announce — and a *success* now announces where before only a failure did. The drop zone carries no click handler and the file input is untouched, so drag is strictly additive. The drag cue changes `border-style` as well as colour, so it does not depend on telling two colours apart. axe-core, WCAG 2.1 A + AA + best-practice, across three states (at rest, after a design draws, after a refusal): **0 violations**. The generated `<svg>` carries `role="img"`, `aria-label="Drawing of Order intake"` and a `<title>`. |
| Any new environment variable is in `.env.example` with a placeholder. | pass, vacuously | `grep -rn 'import\.meta\.env\|process\.env' src/ astro.config.mjs vitest.config.ts` returns no matches. Nothing reads the environment, so there is nothing to add. Amon's "checked, not assumed" is confirmed. |

### Adversarial pass, beyond the checklist

Every one behaved. The most important path is hard to break.

| Input | Result |
|---|---|
| Empty file | Refused. `Unexpected end of JSON input`. |
| Malformed JSON | Refused. `Expected double-quoted property name in JSON at position 46 (line 2 column 1)` — the position survives all the way to the screen. |
| Parses but has no `nodes`/`edges` keys | Refused, `invalid-design`, issue paths naming the missing keys. |
| A JSON array where a design belongs | Refused. `expected object, received array`. |
| `null` | Refused. `expected object, received null`. |
| Valid design with **zero** nodes | **Loads**, per D19 — `Loaded no-nodes.json: 0 nodes, 0 edges.`, empty `<svg>`. Correct, and the plural reads right at nought. |
| Two identical edges | **Loads** — edges carry no id, so there is nothing to collide. `2 nodes, 2 edges`. |
| A PNG chosen instead of JSON | Refused, as bad JSON. See defect 3. |
| 2000 nodes / 1999 edges, 190 KB | Loads in 92 ms; 2000 `<rect>`, 1999 `<line>`, counts correct. No hang. |
| `__proto__` at the top level and inside a node | Stripped by Zod; `({}).polluted` stayed `undefined`. No prototype pollution. |
| A non-string id (`1`) | Refused, path `nodes.0.id`. |
| `nodes` not an array | Refused, path `nodes`. |

Console errors and uncaught exceptions across the entire walk: **none**.

### Command results

`bun run test`: **pass** — 3 files, 46 tests, 0 failures, 289 ms.
`bun run build`: **pass** — 1 page built in 496 ms, no warnings.
`bun run dev`: **pass** — serves on `http://localhost:4321` detached, `astro dev status` healthy, and the served markup carries the label, the `aria-describedby`, `#drop-zone[data-dragging="false"]` and `#upload-status[role="status"]`. Stopped cleanly with `astro dev stop`.
Secret scan: **clean** — `gitleaks detect --source . --no-banner`, 11 commits, ~270 KB scanned, no leaks found.
CI: **green** — PR #3, run 35320855940.

### On the judgement call Amon flagged (D20)

**Confirmed correct, and correctly staged.** I reproduced it rather than reading
it: a file with a node missing `type` *and* an edge naming `"ghost"` reports
exactly `[{ path: ['nodes', 0, 'type'] }]` and nothing about the edge. Zod does
not run a `superRefine` once the base object has failed, so this is the library's
staging and not a choice made in `design.schema.ts`, and the reasoning holds — a
rule that reads the whole list of nodes genuinely cannot run over a `nodes` that
is not a list of nodes yet.

Changing the test rather than the code was the right call. The alternative —
running the cross-field rules over only the entries that happened to validate —
buys a one-pass fix at the cost of rules that operate on a partial file, which is
how you end up telling someone their edge is dangling because its target was
dropped for being malformed. Pinning the staging with `toEqual(['nodes.0.type'])`
at `src/lib/loadDesign.test.ts:237` makes it a decision Task 04 can design around
instead of a surprise it discovers. D20 records it accurately.

### Defects for Amon

None of these fails an acceptance criterion. The first is the one worth acting on
before Task 04 starts.

1. **`src/lib/loadDesign.ts:41-43`** — the doc comment claims `JSON.parse`'s
   message "names the position — and, in every browser this app targets, the line
   and column too." That is true of V8 and false elsewhere. Same malformed input,
   two engines: V8 gives `Expected double-quoted property name in JSON at
   position 46 (line 2 column 1)`; JavaScriptCore — which is Safari, and which is
   also what bun runs on — gives `JSON Parse error: Property name must be a
   string literal`, with no position, no line and no column. An empty file is the
   same story: `Unexpected end of JSON input` against `JSON Parse error:
   Unexpected EOF`. The class itself is fine: it keeps whatever the engine gave,
   which is all it can do. The problem is that the comment, and D22's "keeps
   `JSON.parse`'s message, position and all", hand Task 04 a guarantee that does
   not hold on one of the three target browsers, and
   `src/lib/loadDesign.test.ts:135` asserts `toMatch(/position \d+/)` where it can
   never fail, because Vitest runs on Node and Node is V8. Task 04 is the task
   whose whole point is "name the line". It needs to know that on Safari there is
   no line to name and it has to degrade to something like "that file is not valid
   JSON". The test would say more if it kept line 134's verbatim-message assertion
   as the contract and treated the position as a bonus rather than a promise.

2. **`src/pages/index.astro:96`** — the `change` listener never fires a second time
   for the same file, so the drawing and the status line both go stale while still
   reading `Loaded good.json: 2 nodes, 1 edge.` Measured: 0 `change` events after
   re-picking an identical path. Amon flagged this and routed it, and the routing
   is right, but it is worth more than "polish": the loop Task 04 exists to serve
   is *see the error, fix the file, load it again*, and re-picking the file you
   just edited is exactly the gesture that does nothing. Worse than doing nothing,
   the live region keeps asserting a successful load that is now one edit out of
   date. The fix is one line — clear `fileInput.value` after reading — but it
   changes behavior, so it belongs to whichever task takes it, not to me.

3. **`src/pages/index.astro:27`** — `accept="application/json,.json"` filters the
   picker only, confirmed on both paths: a PNG comes back as `Unexpected token
   '\x89', "\x89PNG..." is not valid JSON`. Already flagged and routed to Task 04;
   recorded here because I reproduced it, and because that message leaks a raw
   byte into the status region, which is a presentation problem Task 04 should
   catch before it reaches `textContent`.

4. **`src/lib/design.schema.ts:35`** — `requiredText = z.string().min(1)` admits a
   whitespace-only string. `{ "id": "   ", "label": "   ", "type": "s" }` loads and
   draws a blank box. D19 justifies the rule by saying "a node without a label is a
   blank box… not worth drawing", and `"   "` produces precisely that blank box, so
   the rule does not deliver what the decision claims for it. The no-trim reasoning
   is sound for *labels* — trimming would edit the user's text on the way through —
   but "not empty" and "not blank" are different rules and only the first is
   implemented. Low severity, and a decision rather than an obvious bug: either
   tighten to a non-blank check or narrow D19's wording.

### Fixed in place

None. Nothing in the branch was trivia — every finding either changes behavior or
changes a recorded decision, so all four went back rather than being patched here.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/3 — draft, `feature/upload-json` into `main`, CI green. Not merged; Sam marks it ready.

---

## Verification and merge by Sam

### Document audit

| Document | State | Action taken |
|---|---|---|
| `docs/tasks/02-upload-json.md` | All five acceptance-criteria boxes were already checked by Jahmyr; `**Status:**` still read `in progress`. | Set `**Status:** done`. |
| `README.md` | Run/test/build commands present, correct, and match `CLAUDE.md`; already described the validated upload, drag-and-drop, and the JSON shape (D18/D19). | No change needed. |
| `CLAUDE.md` | `## Status` still described Task 01 only ("No validation… yet"), which stopped being true once Task 02 merged. | Updated the snapshot to say Tasks 01 and 02 are done, and to name the validation (duplicate ids and dangling edges refused). |
| `docs/DECISIONS.md` | D18–D23 present, dated 2026-09-18, each with a reason and a source. Matches everything Amon's and Jahmyr's reports describe as decided. | No change needed. |
| `.env.example` | Still holds no variables; `grep` for `import.meta.env`/`process.env` across `src/`, `astro.config.mjs`, `vitest.config.ts` returns nothing (reconfirmed independently). | No change needed. |
| This handoff doc | Jared's assignment, Amon's round 1 report, and Jahmyr's round 1 report all present and legible. | Appended this section. |

Not touched, per the generated-file boundary: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, `docs/intake.md`, and the body of `docs/tasks/02-upload-json.md` (only its `Status` line changed).

### Gates

`bun run test`: **pass** — 3 files, 46 tests, 0 failures (verified independently, both before and after the doc-fix commit).
CI: **green** — PR #3, both the push-triggered and pull-request-triggered `test` jobs passed on the head commit at merge time (runs `35321375756` and `35321375763`, on top of Jahmyr's already-green `35320855940`).
Secret scan: **clean** — `gitleaks detect --source . --no-banner`: 12 commits scanned, ~280.88 KB, no leaks found.

### Merge

Squashed as `b98971b` into `main`. Branch `feature/upload-json` deleted (confirmed 404 on the remote branch after merge). PR https://github.com/IBatsios/map-data-structures/pull/3.

A small doc-only commit (`661cccc`: task status → done, `CLAUDE.md` status refresh) was added to the branch before merge, and CI was allowed to re-run and go green on it before `gh pr ready` / `gh pr merge` — no red or pending check was merged.

### Left for a person

Nothing blocks a person here — no generated doc is wrong, Phase 0 is already satisfied (the remote exists, gitleaks is clean), and no check was red or pending at merge time.

The four defects Jahmyr recorded (none failing a Task 02 criterion) are carried forward into `docs/handoff-items/handoff-next-phase.md` for whoever picks up Task 04, since neither Task 04's task file nor a Task 04 handoff doc exists yet to receive them directly. The first — the Safari `JSON.parse` message claim in `src/lib/loadDesign.ts:41-43` and D22 — is flagged there as worth resolving before Task 04's "name the line" acceptance criterion is built against a guarantee that only holds on V8.
