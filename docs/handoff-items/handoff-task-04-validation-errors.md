# Handoff — Task 04: Validation errors

**Date:** 2026-09-18
**Branch:** feature/validation-errors
**Task file:** docs/tasks/04-validation-errors.md
**Round:** 1

## Assignment from Jared

### Scope

Task 02 built the boundary: `loadDesign` throws `DesignSyntaxError` or
`DesignSchemaError`, each carrying its evidence untouched — `JSON.parse`'s own
message and `cause`, or Zod's `issues` with the `path` of every field at fault
(D22). Task 03 built the drawing and left the failure case a single line in the
status region, with a comment naming this task. Task 04 is where that evidence
becomes something a person can act on.

The user here is a developer (intake 2.3) holding a file they wrote by hand and
a question with one right answer: *where.* Every message this task writes is
judged on whether it answers that.

Five pieces:

1. **A pure module that turns a `DesignLoadError` into a list of messages.**
   `src/lib/` next to the loader, no DOM, its test written first. Presentation
   logic, not loading logic — the loader stays as it is. This is the piece
   `bun run test` can actually cover, so as much of the thinking as possible
   belongs in it and as little as possible in the page.
2. **The syntax case: name the line, and say something honest when you cannot.**
   See "The no-position case is the whole of criterion 2" below. This is the
   hardest judgement in the task and the one D32 exists to stop you getting
   wrong.
3. **The schema case: one message per problem, naming the field path.** Built
   around D20's two-pass reality rather than against it.
4. **An error panel beside the upload control.** Lists the messages, clears when
   a good file loads, leaves no drawing behind, and is announced to assistive
   technology. Styled by a CSS Module (D1, and D23/D27's precedent).
5. **The end-to-end walk.** One broken file per fault, loaded through the real
   input: read the message, fix the file, load it again and see the drawing.

Plus four carve-ins that are this task's by my own routing out of Task 02 and
Task 03. They are listed in "Backlog carried into this task" below, and three of
them are the reason this scope is bigger than its five bullet points look.

**Explicitly out of scope, each owned elsewhere:**

- **Any export.** Markdown, HTML, PDF, Word are Tasks 05 to 08.
- **The schema page, `sample.json`, and "Load sample."** Task 09, which is
  blocked by this task. You will want broken fixtures; put them under a test
  fixture path, not a public URL, and do not link to them from the page.
- **Deployment.** Task 10.
- **Splitting `src/lib/layout.ts`.** It is 625 lines with about 130 of self-edge
  routing behind one call as the obvious seam, flagged independently by Amon and
  Jahmyr. It is real and it is not yours: Task 04 does not read that module, and
  a refactor of the one file every export task consumes does not belong inside a
  task about error messages. I am routing it as its own `chore/` cycle before
  Task 05, which is the first task that reads `layoutDesign` in earnest. Leave
  it alone.
- **Styling the page as a whole.** The body copy is still browser-default serif
  beside a sans-serif drawing. That wants a global-styling decision nobody has
  made, D1 constrains it to CSS Modules, and Task 09 adds the second page that
  makes it worth deciding once. Style *your panel* to sit with what is already
  there; do not open the site-wide question here.
- **The self-edge display backlog** — five loops reading as three at 4x, loop
  ends meeting the bounding box rather than the silhouette, stacked labels
  identified by position. All disclosed and accepted in Task 03. Not yours.
- **Changing the design's shape.** `{ title, nodes: [{ id, label, type }],
  edges: [{ from, to, label }] }` is final (D14, D18). `type` stays free text.
  The one schema change this task may make is the whitespace decision below, and
  only with a row in `docs/DECISIONS.md` behind it.
- **Re-architecting the loader.** D22 stands. If you find yourself wanting
  `loadDesign` to return messages instead of throwing structured errors, stop
  and report — that is a decision to reopen, not a refactor to do.

### Acceptance criteria

Copied verbatim from `docs/tasks/04-validation-errors.md`. These are the
contract.

- [ ] As a user, I can see validation errors when the JSON is malformed or missing required fields: demonstrated end to end.
- [ ] Malformed JSON shows the line; a missing required field shows the field (14.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the error panel is a live region and its text is readable.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

The last one is expected to need no edit. Nothing in the tree reads
`import.meta.env`, and the only `process.env` in the repo is `process.env.CI` in
`playwright.config.ts`, which CI sets rather than a user. Say so rather than
inventing a placeholder.

### Files expected to change

A guide, not a cage.

| Path | Expected |
|---|---|
| `src/lib/describeLoadError.ts` (name your own) | New. Pure: a `DesignLoadError` and the file's text in, a list of messages out. No DOM. |
| `src/lib/describeLoadError.test.ts` | New. **Written first.** One broken input per test, including a synthetic no-position syntax message — see "Watch out for". |
| `src/lib/` — a file-kind check | New, small, pure: name and MIME type in, "is this plausibly JSON" out. Called before the file is read, so a dropped PNG never reaches `JSON.parse`. Testable, therefore not in the page. |
| `src/pages/index.astro` | The `catch` arm's one line becomes the panel. Keep the script wiring-only: find elements, listen, put the result where it goes. |
| `src/styles/` | The panel's CSS Module — extend `upload.module.css` or add one beside it. Not a global sheet. |
| `src/lib/design.schema.ts`, `src/lib/design.schema.test.ts` | Only if the whitespace decision is "tighten". If it is "narrow D19's wording", neither file changes and `docs/DECISIONS.md` does. |
| `e2e/fixtures/` | New broken files: no `nodes`, a trailing comma, an empty file, a node with no `label`, an edge naming an unknown id, two nodes sharing an id, and a genuine non-JSON binary for the dropped-PNG case. |
| `e2e/drawing.spec.ts` or a new `e2e/validation.spec.ts` | The walk. A separate spec file reads better than growing the drawing spec; your call. |
| `e2e/pages/uploadPage.ts` | A locator for the panel and a reader for its messages. |
| `docs/DECISIONS.md` | Append to "Added after the build": the no-position wording, the whitespace decision, the file-kind check, the live-region choice, and any cap on how many messages are shown. |
| `README.md`, `CLAUDE.md` | Only if a command changed. None is expected to. |
| This handoff doc | Your "Work completed by Amon — round 1" section. |
| `.env.example` | Expected: no change. |

### Skills to load

From the task file's "Suggested skills" and `CLAUDE.md`:

- `coding-standards` — before the first file.
- `tdd-workflow` — one broken file per test, written first. This is the
  best-shaped TDD task in the project so far: nearly every case is a string in
  and a string out.
- `error-handling` — `CLAUDE.md` names this skill for the messages in this task
  by name.
- `front-a11y` — the live region and the message contrast are an acceptance
  criterion, not a nicety.
- `front-comments` — if you touch `design.schema.ts`, its doc comment states the
  three rules as facts; a change to the rules is a change to that comment.
- `make-interfaces-feel-better` — the panel's spacing, its heading, the order of
  the list, once it works.
- `e2e-testing` — the walk. The CI step already exists; you are adding tests to
  it.
- `front-review` — before handoff, since this changes an exported page.
- `front-refactor` — `index.astro`'s script is about 135 lines today. If the
  panel pushes it past a screen, that is the signal to move logic into
  `src/lib/`, which is where it wants to be anyway.

### Watch out for

#### The no-position case is the whole of criterion 2

"Malformed JSON shows the line" is easy on V8 and impossible to keep as a
promise everywhere. D32 records why: V8 gives `... in JSON at position 17 (line
2 column 5)`; JavaScriptCore gives a message with no position, no line and no
column. Safari is a browser a desktop app plainly targets.

It is also not only a Safari problem, and that is good news for testing: **V8
gives no position for an empty file either.** `JSON.parse('')` is `Unexpected
end of JSON input` on Node and Chromium alike, with no position in the message.
Jahmyr hit exactly that while testing Task 03. So the no-position path is
reachable in Vitest and in the Playwright walk, and there is no excuse for
leaving it untested.

What I want from you, in order of how much it matters:

1. **Never print a line number you inferred from nothing.** A message that says
   "line 1" because there was no better answer is worse than one that admits it
   does not know. The file is the user's own; a wrong pointer costs them more
   than no pointer.
2. **Prefer computing the line and column yourself from a position.** Older V8
   messages carry `position N` with no `(line L column C)` after it. The file's
   text is in hand, so a position is enough to count newlines and give a line
   and column in the app's own consistent wording rather than the engine's. That
   also buys one wording across every engine that gives a position, instead of
   whatever each phrases it as.
3. **Design the module so the engine is an input, not an ambient fact.** If the
   function takes the message text and the file text as arguments, a
   JavaScriptCore-shaped message is a one-line test on Node. If it reads a live
   `SyntaxError` instead, you inherit the shape of `loadDesign.test.ts`'s
   conditional assertion — `if (/position \d+/.test(...))`, a test that quietly
   asserts nothing on the engine that needed it most. Make the Safari case a
   test that runs everywhere.
4. **Say what you do know.** With no position there is still a fault worth
   naming and a next step worth offering. That wording is yours to write and is
   a `docs/DECISIONS.md` row once you have chosen it.

#### Do not leak raw bytes into a message

`src/pages/index.astro:27` sets `accept="application/json,.json"`, which filters
the picker and nothing else. Drag-and-drop bypasses it entirely, so a dropped
PNG is read as text and its first bytes come back inside the engine's own
message: `Unexpected token '\x89', "\x89PNG..."` lands in the status region
today. Two separate fixes, both yours:

- **Check the file before reading it.** Name or MIME type, checked while the
  `File` is still in hand, so the app can say *that is not JSON* — this task's
  wording to choose — instead of failing halfway through a parse. That is the
  only reason the check is its own module: it takes a name and a type, not text,
  so it cannot live inside `loadDesign`.
- **Assume the check gets passed anyway.** A file genuinely named `.json` and
  full of binary still reaches the parser. Whatever you echo from the engine's
  message, echo it deliberately: bounded in length, and safe to set as
  `textContent`. Every message in this app goes in through `textContent`, never
  `innerHTML`. Keep it that way and say so in a comment, because a panel that
  prints file contents is exactly where someone later reaches for markup.

#### The whitespace-only string is a decision, not a bug

`src/lib/design.schema.ts:35` is `z.string().min(1)`, so `" "` passes and a node
with a whitespace-only label loads and draws as a blank box. D19 justifies "no
string may be empty" as stopping precisely that, so the rule under-delivers on
what the decision claims. Two honest outcomes:

- **Tighten it** to reject a string with no non-whitespace character. Note that
  it starts rejecting files which load today, and that the schema's comment
  forbids *trimming* for a good reason — the drawing must show what the file
  says. Rejecting a blank label is not the same as editing a padded one; if you
  tighten, keep that distinction visible in the code.
- **Narrow D19's wording** to say what the rule actually does, and let a blank
  box be a thing a file is allowed to describe.

Either way it is a row in `docs/DECISIONS.md` with the reason. Decide it in this
cycle rather than after Task 09 publishes the schema, because after that the
rule is something other people's files depend on. I have no strong preference
between the two; I have a strong preference that it stops being ambiguous here.

#### D20 is correct, and the message list has to be built around it

Zod runs `superRefine` only once every field has passed, so a file with both a
malformed field and a dangling edge reports the field on the first load and the
edge on the second. Two agents have now confirmed this is right — a rule that
reads the whole list of nodes cannot run over a `nodes` that is not a list of
nodes yet. Do not try to defeat it.

What it means for you: **never let the panel claim to be exhaustive.** "Here is
everything wrong with your file" is a sentence this app cannot honestly say.
Phrasing that describes this pass is fine; phrasing that promises a complete
list is a defect Jahmyr should find. A user who fixes three problems and is
handed a fourth should feel the app is working through their file, not that it
lied to them.

Related and practical: a 120-node file with a systematic mistake produces
hundreds of issues. Decide what the panel does with that — a cap plus a count of
the remainder is the obvious answer — and record it. Do not paint a thousand
list items into the DOM.

#### Two live regions, one voice

`#upload-status` with `role="status"` is the only thing this app says out loud
today, and until now it has carried both outcomes. You are adding a second
region, and the criterion requires it to be live. Three traps:

- **A region announces changes to itself, not its own arrival.** A panel created
  or replaced wholesale on failure may say nothing at all. Keep the container in
  the DOM from first paint and change its *contents*.
- **Two polite regions changing at once talk over each other.** Decide which one
  speaks in each outcome. If the status line keeps the success sentence and the
  panel keeps the failures, each outcome must clear the other rather than leave
  a stale sentence behind — and a stale success line sitting above a list of
  errors is exactly the quiet wrongness intake 5.2 rules out.
- **`role="alert"` is assertive and interrupts; `role="status"` is polite and
  waits.** An error the user just caused by choosing a file is arguably worth
  interrupting for. I lean toward keeping the panel polite and making it the
  only voice on failure, but it is your call with `front-a11y` open. Make it
  deliberately and record it.

Also from the Task 03 backlog and now yours: **nothing announces that the
drawing changed** beyond the count line. You own success wording as well as
failure wording. You do not have to solve that richly, but you do have to look
at it once, since you are the task that owns what this app says.

#### The existing e2e test pins the old wording on purpose

`e2e/drawing.spec.ts` has *"clears the drawing and says so when the file is not
a design"*, asserting `could not be drawn`, with a comment saying Task 04 owns
the wording. Changing that string is expected. Update the test to the new
wording rather than keeping the old sentence alive beside the new panel — two
voices for one outcome is how a fallback survives into production.

Keep what that test actually protects: the failure is never silent, and no
drawing is left on screen that the status line has stopped describing.

#### Prior decisions that bind this task

- **D1, D23, D27** — CSS Modules, reached through data attributes, with the
  script owning state and the CSS owning the class name. The panel follows the
  same pattern.
- **D14, D18, D19, D20, D21** — the shape and the rules. You inherit them. The
  only one in play is D19's whitespace wording, above.
- **D22** — the loader throws structured errors and flattens nothing. This task
  consumes that contract; it does not renegotiate it.
- **D26, D35** — the drawing wraps rather than truncates. The same instinct
  applies to a message: wrap it, do not cut it off mid-word — while still
  bounding what you echo from a file's own bytes.
- **D29** — `bun run check` runs `astro check` over `.astro` and `.ts` alike, in
  CI and in the pre-commit hook. The page's `<script>` is type-checked now. Do
  not reach for `any` or `@ts-ignore` to get a green run.
- **D31** — `bun run test` stays Vitest-only; the walk is `bun run test:e2e`.
  Keep e2e specs out of `src/`.
- **D32** — the correction this whole task is built on. Read the row before you
  write the syntax message.
- **D33** — the file input's value is cleared after every read, so re-picking
  the same file fires a fresh `change`. That matters more here than it did in
  Task 03: "fix the file, load it again" is literally step 4 of this task, and
  it only works because of D33. Do not remove it.
- **D13** — CI installs with `bun install --frozen-lockfile`. If you add a
  dependency, commit `bun.lock` in the same commit as `package.json`. I do not
  expect this task to need one.

#### Commands

`bun run test` runs Vitest. **Never `bun test`** — that runs Bun's own runner
and silently skips the suite. Correct it anywhere you find it written wrong.

#### Process boundaries

- **Amon: pushing and opening the pull request are Jahmyr's, not yours.**
  `.claude/settings.json` is the authority. Commit on
  `feature/validation-errors` and stop there. Jahmyr pushes the branch, opens
  the pull request, and gets the CI signal; Sam merges. If you think you need to
  push to finish, you have found something to report, not a step to take.
- **For Sam, recorded here so it is not rediscovered a fourth time:** the
  post-merge doc refresh goes through a `chore/…` branch and a pull request.
  `.claude/settings.json` denies `git push origin main:*`, so refreshing
  `docs/handoff-items/handoff-next-phase.md` after the merge cannot be a direct
  push to `main`.
- **Do not check the acceptance boxes.** Jahmyr checks them when he has
  exercised them. Leave `**Status:** in progress` alone; Sam sets it to done.
- **`docs/` is generated from `docs/intake.md`.** Append to the "Added after the
  build" table of `docs/DECISIONS.md`. Do not rewrite task-file bodies, the PRD,
  the architecture doc, or the runbook.
- **Do not re-run `husky init`** — it writes `bun test` into the hook.
- **Do not edit `.claude/` or any agent configuration.** Both process notes
  above are written out by hand on purpose; the configuration change itself is
  still with the user.

### Backlog carried into this task

Four items, all routed here by me, none of which failed an earlier task's
criteria. Three are covered in the body above; this is the ledger.

| Item | Source | Where it is handled |
|---|---|---|
| No position from `JSON.parse` on JavaScriptCore, and on V8 for an empty file | D32, Task 03 | "The no-position case is the whole of criterion 2" |
| A dropped non-JSON file leaks raw bytes into the status region (`index.astro:27`) | Jahmyr, Task 02 | "Do not leak raw bytes into a message" |
| `z.string().min(1)` admits whitespace-only strings (`design.schema.ts:35`) | Jahmyr, Task 02 | "The whitespace-only string is a decision, not a bug" |
| Nothing announces that the drawing changed beyond the count line | Amon, Task 03 | "Two live regions, one voice" |

And one explicitly **not** routed here: the `src/lib/layout.ts` split. It gets
its own `chore/` cycle before Task 05.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

A bad file now answers the question it raises. Five things exist that did not:

1. **`describeLoadError`** — pure, no DOM: a `DesignLoadError`, the file's name
   and the file's text in; a heading, a list of messages and a count of what was
   left out, back. Every sentence the app says about a file that failed is
   written and tested here.
2. **A file-kind check** — `looksLikeJsonFile(name, type)`, asked while the
   `File` is still unopened, so a dropped picture is refused before a byte of it
   reaches `JSON.parse`.
3. **The panel** — `#upload-problems`, in the page from the first paint, filled
   by `renderProblems` through `textContent`, styled by `upload.module.css`,
   announced as a polite live region, and cleared by the next good file.
4. **The whitespace rule, decided** — a required string must now hold a
   character that is not a space. It rejects a blank label; it still never trims
   one.
5. **The walk** — `e2e/validation.spec.ts`: fourteen tests over ten new
   fixtures, one fault each, including "read the message, fix the file, load it
   again and see the drawing".

The four carried items are all closed. Answering each in the order the
assignment weighted them:

**1. The no-position fallback.** `describeSyntaxFault(engineMessage, fileText)`
takes the engine's message as an argument, so a JavaScriptCore message is a
one-line test on Node — three of them are. Where a position is given the line
and column are **counted here** from the file's text, never read out of
`(line L column C)`, which is why an older-V8 `position 59` with no line clause
still produces `Line 5, column 1`. Where no position is given, the message says
so and names no line: the standing rule is tested twice, once per engine shape.

Measuring the engines rather than trusting the earlier handoffs turned up
something worth recording: **on modern V8 the no-position path is the ordinary
path, not Safari's corner.** Node 24 and Chromium give a position for a trailing
comma *inside an object* (`Expected double-quoted property name in JSON at
position 248 (line 8 column 1)`) and give none at all for a trailing comma
inside an *array*, for a file that ends early, or for anything that is not JSON
at all (`Unexpected token ']', …"` with no position). Both fixtures are in the
walk for that reason. Two cases the file answers better than any engine: an
empty file is reported as empty, and a file holding raw bytes is reported as
binary — both derived from the text, neither guessing a position. D38.

**2. The dropped-PNG leak, both halves.** `src/lib/jsonFile.ts` is the check
before the read, mirroring the input's own `accept` (D40). For the file that
gets past it — a real PNG renamed `.json`, which is a fixture — the syntax
message detects bytes no text file holds and says so instead of echoing them.
And behind both, one bounder: every untrusted fragment, engine message or
quoted node id alike, is stripped of control and format characters, collapsed
and cut to 120 code points, and every message is set with `textContent`, stated
in a comment in both modules (D43).

**3. The whitespace-only string.** Tightened, not narrowed (D39). D19 justified
the rule by the blank box it was meant to stop, and `min(1)` admitted exactly
that box, so the rule was the part that under-delivered. Tightening is not
trimming: `"  Public API  "` still loads with its spaces, and there is a test
named for that distinction so it cannot erode. `min` aborts, so an empty string
still reports one issue rather than two — which matters now that one issue is
one message.

**4. D20's two-pass reality.** Not fought. The panel's heading says what *this
pass* found; nothing anywhere claims to be the whole list. Over ten problems the
list is capped and the rest are counted, with a sentence that promises them on
the next load (D42).

**5. Two live regions, one voice.** Both are in the page from the first paint
and both start empty, because a region announces changes to itself, not its own
arrival. Each outcome clears the other, so a stale success line never sits above
a list of errors — asserted in the walk. Both stay polite `role="status"`; the
user asked for this by choosing a file. The Task 03 backlog item about
announcing the drawing is answered in the same breath: the success line now
reads `order-intake.json is drawn below: 7 nodes, 6 edges.` (D41).

`e2e/drawing.spec.ts`'s "clears the drawing and says so" test keeps what it
protected and now reads the panel; `could not be drawn` is gone from the tree.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/describeLoadError.ts` | New. The messages: syntax, schema, unsupported file, and anything else thrown. Pure. |
| `src/lib/describeLoadError.test.ts` | New. 31 tests, written first, one broken input each. |
| `src/lib/jsonFile.ts` | New. `looksLikeJsonFile(name, type)`, the check before the read. |
| `src/lib/jsonFile.test.ts` | New. 9 tests, written first. |
| `src/lib/renderProblems.ts` | New. The report as elements; takes the `Document`, like `renderDrawing`. |
| `src/lib/design.schema.ts` | `requiredText` rejects a blank string; the doc comment's rule 1 changed with it. |
| `src/lib/design.schema.test.ts` | Five tests for the new rule, including the one that pins "reject, do not trim". |
| `src/lib/describeUpload.ts`, `.test.ts` | The success line says where the drawing is. |
| `src/pages/index.astro` | The panel element, the two-region comment, and the wiring: kind check, read, draw or explain. |
| `src/styles/upload.module.css` | The panel: one red used for one thing, a left rule, wrapped messages. |
| `src/styles/upload.module.test.ts` | New. Measures the panel's text against its own tint (12.47:1) and the bare page (13.58:1). |
| `src/styles/contrastRatio.ts` | New. WCAG 2.1's formula, now shared by both stylesheet tests. |
| `src/styles/drawing.module.test.ts` | Imports that formula instead of holding a second copy. Unchanged otherwise. |
| `e2e/validation.spec.ts` | New. The walk. |
| `e2e/drawing.spec.ts` | The failure test reads the panel; two status assertions follow the new wording. |
| `e2e/pages/uploadPage.ts` | The panel, its summary, its messages and its remainder line. |
| `e2e/fixtures/` | New: `trailing-comma`, `cut-short`, `empty`, `node-without-label`, `blank-label`, `dangling-edge`, `duplicate-ids`, `many-problems` (15 faults), `logo.png` (a real PNG), `renamed-image.json` (the same PNG). |
| `.prettierignore` | `e2e/fixtures/` — formatting them would repair the faults they exist to carry. |
| `docs/DECISIONS.md` | D38 to D43. |
| `README.md` | What works today, and the schema's blank-string rule. Commands unchanged. |
| `.env.example` | **No change, and none needed.** Nothing in `src/` or `e2e/` reads `import.meta.env` or `process.env`; the only `process.env` in the repo is `process.env.CI` in `playwright.config.ts`, which CI sets. |

### Tests written

Unit, 51 new (176 total, all passing):

- **`describeSyntaxFault`, 11.** A V8 message with a line; an older V8 message
  with a position and no line, which pins that the line is counted and not
  scraped; a JavaScriptCore message, which pins the no-position wording; that
  the no-position message names no line and no column; an empty file on both
  engine shapes; a whitespace-only file; a binary file, which pins that bytes
  are described and never echoed; that control characters are stripped from
  what is echoed; that a 4,000-character engine message is bounded; that a
  position past the end of the file is clamped rather than thrown on.
- **`describeLoadError`, 17.** One message per issue naming the field; missing
  told apart from wrong-typed; empty told apart from blank; the dangling edge
  and the duplicate id, each naming its own end; a file that is JSON but not an
  object; the summary's count, singular and plural; the cap and the remainder;
  a 3,000-character node id bounded; control characters in an id stripped; a
  thrown `TypeError` and a thrown string both still saying something.
- **`describeHiddenProblems`, 3.** Plural, singular, and silence when nothing
  was left out.
- **`looksLikeJsonFile`, 9.** The `.json` name, the empty media type, the
  uppercase extension, `+json`, a media type with parameters, the dropped PNG,
  `design.json.png`, nothing to go on at all, and the renamed image that passes
  on purpose.
- **`design.schema`, 7.** A blank `id`, `label` or `type`; a blank edge label; a
  blank title; one issue rather than two for an empty string; and spaces around
  an accepted label kept exactly as the file wrote them.
- **`upload.module.css`, 4.** Text against its own surface, text against the
  bare page, the custom properties existing, and the state attribute rather than
  a class name.

End to end, 14 new (25 total, all passing):

Both live regions present and empty before anything is chosen; the line and
column named for a malformed file; no line invented for a file that ends early;
an empty file called empty; the two missing lists; a node without a label; a
label of three spaces; a dangling edge; a duplicated id; the cap and its
remainder line; a dropped image refused unread; a renamed PNG described without
a byte of it on screen; no drawing and no stale sentence left behind; and the
walk itself — broken file, message, fixed file, drawing, panel cleared.

### Local results

`bun run test`: **pass**, 176 tests in 11 files.
`bun run check`: **pass**, 0 errors, 0 warnings, 0 hints over 32 files.
`bun run build`: **pass**, 1 page.
`bun run test:e2e`: **pass**, 25 tests in Chromium.

### Decisions recorded

D38 the no-position wording and where the line comes from; D39 the whitespace
rule, tightened, narrowing D19; D40 the file-kind check; D41 the two live
regions and the new success wording; D42 the cap and the "this pass" heading;
D43 bounding everything untrusted and `textContent` everywhere.

### Known gaps

- **`renderProblems.ts` has no unit test**, for the same reason
  `renderDrawing.ts` has none: Vitest runs without a DOM here, so building
  elements can only be exercised through Playwright. The walk asserts the exact
  text of the summary, of each message and of the remainder line, so the
  rendering is covered — but by the slower suite, not by `bun run test`.
- **The line and column are counted in UTF-16 code units**, because that is what
  V8's `position` counts in. A file with astral characters before the fault
  would be off by one per such character if some engine ever counted in code
  points instead. No engine we know of does; it is written down here rather than
  discovered later.
- **The panel's heading is a `<p>`, not a heading element.** A heading that
  exists only sometimes churns the document outline, and the region is announced
  anyway. If Task 09 gives the page a real heading structure, this is worth
  revisiting.
- **`e2e/fixtures/` is now unformatted by Prettier**, valid fixtures included.
  They are small and hand-written, so it costs nothing today.
- **`describeLoadError.ts` is 447 lines**, which is past the 200–400 the
  standards call typical. 227 of them are code and 152 are doc comments, in the
  house style of `loadDesign.ts` and `design.schema.ts`, so I left it whole
  rather than splitting a module whose two halves — a syntax message and a list
  of field messages — are the same decision made twice. The obvious seam if it
  ever needs one is `boundedText` and `sentence`, which are a rule of their own
  (D43) and would take about 70 lines with them.
- Bun runs Vitest on JavaScriptCore here, so `loadDesign.test.ts`'s conditional
  `if (/position \d+/…)` assertion is inert on this machine. That is exactly the
  shape this task was told not to repeat, and none of the new tests have it;
  the old one is Task 02's and was left alone.

### Out-of-scope notes for Jared

- **`loadDesign`'s doc comment is now half a step behind.** It says V8 "names a
  position and often a line and column". True but incomplete: V8 gives no
  position for a bad token, an array's trailing comma, or a file that ends
  early. D38 records the measurement and the loader's contract is unchanged, so
  I left the comment alone rather than edit a Task 02 module in a Task 04 pull
  request. One sentence, whenever that file is next open.
- **`src/lib/layout.ts` is still 625 lines** and still wants its own `chore/`
  cycle. Untouched, as routed.
- **A file whose name is not `.json` is now refused even if it holds JSON.**
  That is D40's deliberate cost. If Task 09's schema page ever offers a
  "paste JSON" box, that is where the escape hatch belongs.
- **Nothing measures how long a large file takes through the panel.** A file
  with 5,000 issues builds 5,000 message strings before ten are shown. It is
  bounded work and the cap keeps the DOM small, but the mapping happens over
  every issue. If a task ever needs it, capping before describing is a
  three-line change.
