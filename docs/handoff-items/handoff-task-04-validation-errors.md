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

---

## Test report from Jahmyr — round 1

### Verdict

**Changes requested.** One defect, and it is the one Amon asked me to hunt for:
the panel can print a line and column it has no evidence for. Everything else on
the list holds, and holds well. Four of six criteria checked.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| Validation errors visible end to end, malformed or missing fields | **pass** | 25 Playwright tests green locally and in CI; plus my own walk driving a real `drop` event with a real `DataTransfer` (not `setInputFiles`) for a PNG, a renamed PNG, a good file and a broken one — every one produced the panel the criterion describes. |
| Malformed JSON shows the line; a missing field shows the field | **fail** | Missing-field half passes exactly as promised. Malformed half: `trailing-comma.json` gives `That file is not valid JSON. Line 8, column 1: Expected double-quoted property name.`, and `cut-short.json` / `empty.json` name no line. But a file whose own text contains `position <digits>` near the fault makes the panel invent a location. See defect 1. |
| Tests cover the behavior as a user would observe it, and pass | **fail** | 176 Vitest + 25 Playwright all pass, and the coverage is genuinely good. Two gaps: nothing catches defect 1, and `validation.spec.ts:148` `refuses a dropped image without reading a byte of it` uses `setInputFiles` — the picker — so the drop path that `jsonFile.ts` exists for is not exercised by any test. See defects 1 and 2. |
| Every earlier test still passes; CI is green | **pass** | Local: 176/176 Vitest, 25/25 Playwright. CI run 35360817631 on ubuntu-latest: typecheck 0 errors over 33 files, 176 Vitest, 25 Playwright, all green. |
| Best-effort accessibility: live region, readable text | **pass** | Measured in Chromium: `#upload-problems` carries `role="status"`, is in the DOM and empty at first paint, and is never `display:none` when empty (it drops padding and border instead) — so it stays in the accessibility tree and a change to it is announced. Computed text `rgb(92,17,22)` on `rgb(253,243,243)` at 16px is **12.5:1**, and 13.7:1 against bare white; both unit-tested at 4.5 or better. `front-a11y` audit of `index.astro`: 0 critical, 0 major. Label/`for`/`id` and `aria-describedby` all resolve; one `h1`; `<main>`; `lang="en"`. |
| Any new environment variable is in `.env.example` | **pass** | No env reads anywhere in `src/`, `e2e/` or `astro.config.mjs`; `.env.example` correctly says there are none; no `.env` tracked. `gitleaks detect`: 20 commits, 618 KB, **no leaks found**. |

### Command results

- `bun run test`: **176 passed / 176, 11 files**
- `bun run test:e2e`: **25 passed / 25** (chromium)
- `bun run build`: clean, 1 page in about 500 ms
- `bun run check`: **0 errors, 0 warnings, 0 hints** over 33 files
- Secret scan: `gitleaks detect --source . --no-banner` — no leaks found
- CI: **green** — https://github.com/IBatsios/map-data-structures/actions/runs/35360817631

### Defects for Amon

**1. `src/lib/describeLoadError.ts:318` — `positionIn` scrapes a position out of
the user's own file text, and the panel prints it as a line and column.**

```ts
const found = /\bposition (\d+)/u.exec(engineMessage);
```

Expected: a line is named only when the engine named a position. Actual: V8's
*no-position* message form is
`Unexpected token 'p', "<snippet of the file>"... is not valid JSON`, and that
snippet is the file's own bytes. When the snippet contains the word `position`
followed by digits, this regex matches the **file's text** rather than the
engine's position clause.

Reproduced in Chromium through a real drop event. File `gantry.json`, four lines,
contents `position 900: gantry\nnodes:\n  - id: a\n` — a YAML config saved with a
`.json` name:

```
That file is not valid JSON. Line 1, column 10: Unexpected token 'p', "position 9"... is not valid JSON.
```

The real fault is line 1, column 1. The `900` in the user's own first line was
clipped to `position 9` by V8's ten-character snippet window, `9` was scraped out
of it, and `lineColumnOf` turned that into "column 10". Nothing in the engine's
message said where.

This breaks the module's own rule 1 — *never print a line number inferred from
nothing* — and D32, and it is the half of criterion 2 that matters most: a wrong
pointer into a file the user wrote costs them more than no pointer at all, which
is the doc comment's own argument.

The trigger is narrow but not exotic for a diagramming app: any no-position fault
whose echoed snippet contains `position <digits>`. For a file that is not JSON at
all the snippet is the **first ten characters or so of the file**, so a note, a
log or a config renamed to `.json` reaches it easily. The tell in the output is
the self-contradiction — `engineDetail`'s strip regex does not fire on this
shape, so the sentence names a column and then ends `... is not valid JSON`.

The one-line shape of the fix is to anchor the match to the same phrase
`engineDetail:305` already strips — `/\bin JSON at position (\d+)/u` — so the
position is only ever read from the engine's own clause and never from an echoed
snippet. That changes which files get a line number, so it is your call and your
decision record, not mine to patch. It wants a regression test with a fixture in
this shape.

**2. `e2e/validation.spec.ts:148` — the test named for a drop does not drop.**

`refuses a dropped image without reading a byte of it` calls
`upload.choose('logo.png')`, which is `setInputFiles` on `#design-file` — the
picker. The comment above it says `accept` "filters the picker and nothing else,
so a file dropped on the page reaches the same code path this does", which is the
right reasoning, but the test then never takes the dropped path. The result is
that `watchForDroppedFiles` in `index.astro:130` — the `preventDefault` on
`dragover` and `drop`, and `event.dataTransfer?.files?.[0]` — has no coverage at
all, and `jsonFile.ts` exists precisely because of that path.

I drove it by hand and **the behaviour is correct**: dropped `logo.png` is
refused unread, dropped `renamed-image.json` is described as binary with no
`IHDR` and no `PNG` anywhere in the panel's HTML, and a dropped good file draws
and silences the panel. So this is a missing test, not a broken feature. A
`DataTransfer` built in `page.evaluateHandle` and a
`page.dispatchEvent('#drop-zone', 'drop', ...)` is about ten lines, and it
belongs in `uploadPage.ts` next to `choose` so the specs can say `drop(...)` as
easily as they say `choose(...)`.

**3. Handoff doc, "Bun runs Vitest on JavaScriptCore here" — this is false, and a
premise elsewhere rests on it.**

`bun run test` on this machine runs Vitest on **Node.js 24 /
V8 13.6.233.17-node.48**: `navigator.userAgent` is `Node.js/24`, `globalThis.Bun`
is `undefined`, `process.versions.bun` is `undefined`, and `JSON.parse('[1,]')`
returns V8's `Unexpected token ']', "[1,]" is not valid JSON`. Bun runs the
*script*; the `vitest` bin still executes under Node.

Consequences, both in your favour and worth correcting so nobody later reasons
from the false version:

- Your V8-keyed tests are **live** here, not inert. That is better than you
  claimed, and it is why I could reproduce defect 1 under `bun run test`.
- `loadDesign.test.ts:146`'s conditional `if (/position \d+/.test(...))` is
  **executing** its assertion, not skipping it — so the shape you flagged as
  "exactly the shape this task was told not to repeat" is currently load-bearing
  rather than dead. Still Task 02's to clean up, but it is not inert.

### Things I tried to break and could not

Recorded so the next round does not re-run them.

- **Making it print an unjustified line by any other route.** A position past
  end-of-file clamps into the file; `position 0` gives line 1 column 1; schema
  messages never carry a position. Only the snippet-scrape in defect 1 gets
  through.
- **The byte leak.** Through both the picker and a real drop: `logo.png` refused
  unread; `renamed-image.json` answered with the binary sentence and the panel's
  `innerHTML` contains no `IHDR`, no `PNG`, no file bytes. `holdsRawBytes` also
  correctly catches a raw control character in an otherwise-plausible `.json`.
- **XSS.** A file named `<img src=x onerror=window.__pwned=1>.json` renders as
  escaped text — `&lt;img ...&gt;` — no `img` element is created and
  `window.__pwned` is `undefined`. `textContent` throughout, as the module
  comments promise.
- **The cap.** `many-problems.json` gives exactly 10 items,
  `This pass found 15 problems in it:`, and `5 more problems are not listed. Fix
  these and load the file again to see the rest.`
- **The schema tightening.** `"label": "   "` is refused with
  `nodes[0].label holds only whitespace. It has to say something.`;
  `"  Public API  "` loads with both pairs of spaces intact. Tightening did not
  become trimming.
- **Two voices.** After a failure `#upload-status` is empty and only the panel
  speaks; after a good file the panel is empty and the status reads
  `order-intake.json is drawn below: 7 nodes, 6 edges.` True on the drop path too.
- **Malformed and degenerate input.** Empty file, whitespace-only file, BOM-only,
  top-level `[]` / `"str"` / `null` / `42`, `nodes` as an object, a file that
  parses with no nodes (`{"nodes":[],"edges":[]}` loads, correctly — nothing
  forbids an empty design), duplicate identical edges (load, correctly — the
  schema gives edges no identity).
- **Your open question about large files.** A 5,000-issue, 173 KB file takes
  **26 ms** end to end through `describeLoadError` and yields 10 shown and 4,990
  hidden. Bounded and fast; capping before describing would be an optimisation
  with nothing to optimise.
- **The BOM.** A UTF-8 BOM defeats `JSON.parse` in Node, but `Blob.text()` strips
  it, so a BOM-prefixed file draws normally in the browser. Not reachable in the
  app.

### Minor, not blocking, your call

- The panel's heading is a `<p>`, as disclosed. No criterion asks for a heading
  and the list reads fine without one; only worth a thought if the page ever
  grows a second panel.
- On the no-position path the sentence reads `That file is not valid JSON ... It
  reported: Unexpected token '#', "# camera p"... is not valid JSON.` — "not
  valid JSON" twice. Honest, because the second is the engine's own words, but
  slightly redundant.
- `bun run check` now reports 33 files rather than the 32 in your notes. Nothing
  changed; it is the generated types file.

### Fixed in place

None. Both defects change behaviour or add coverage, so both are yours. I removed
nothing and edited no source; the only files I touched are this handoff doc and
the checkboxes in `docs/tasks/04-validation-errors.md`.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/7 — draft, base `main`,
CI green. Opened so CI signal exists for criterion 4; it stays draft and unmerged
until defects 1 and 2 are closed. Push the fix to `feature/validation-errors` and
CI will re-run on it.

### Boxes

Checked: 1, 4, 5, 6. Left unchecked: 2 and 3, for the reasons in the table.
`**Status:** in progress` is unchanged.

### Round

Round 1 of 3. Round 2 goes to Amon.

---

## Work completed by Amon — round 2

Both defects are closed, and defect 3's correction is taken and applied below.

### What was built

**Defect 1 — the panel can no longer print a line the engine never gave.**

The fault was one unanchored regular expression. A `JSON.parse` message holds at
most two things worth reading — the engine's position clause, and a quotation of
the file that failed — and the second is the user's own bytes coming back.
`/\bposition (\d+)/` could not tell them apart, so a file whose text says
`position 900` had its own digits scraped out and printed back as a column.

The position is now read from a clause **anchored to the end of the message**:

```ts
const ENGINE_POSITION_CLAUSE =
  /\s*\b(?:in|after) JSON at position (\d+)(?:\s*\(line \d+ column \d+\))?\s*$/u;
```

Two things about that shape, both of which depart from the one-line fix suggested
in the report, and both of which are D44:

- **The anchor, not the phrase, is what makes it safe.** Every engine that gives
  a position ends its message with it; every quotation ends `is not valid JSON`.
  So a message can never end in a clause it is only quoting — and that holds
  however wide a snippet V8 decides to echo. It has to, because the
  ten-character window is not the only form: a *short* file is quoted whole.
  `JSON.parse('JSON at position 900')` gives
  `Unexpected token 'J', "JSON at position 900" is not valid JSON`, where the
  clause words sit inside the quotation, verbatim. A phrase-only fix reads that
  file's `900` as confidently as the old one read `gantry.json`'s. There is a
  test for exactly that file.
- **`after JSON at position` is a real clause and had to stay.** The suggested
  `/\bin JSON at position (\d+)/` would have cost a file with junk after its
  design the line it already had: V8 answers that one
  `Unexpected non-whitespace character after JSON at position 8 (line 2 column 1)`.
  Matching both prepositions keeps it, and treating the preposition as part of
  the clause fixed a second, smaller self-contradiction found while writing that
  test — the strip did not fire on the `after` form at all, so the panel said
  `Line 2, column 1: Unexpected non-whitespace character after JSON at position 8 (line 2 column 1).`,
  naming the place twice in two different wordings.

`engineDetail` now strips the same constant `positionIn` reads from, so the
scrape and the strip cannot disagree again. That disagreement was the tell in the
report: a sentence that named a column and then ended `... is not valid JSON`.

No file that legitimately had a line number loses one. Under the old regex a
snippet-form message only ever yielded a "position" when the file happened to
contain `position <digits>` — and that answer was always wrong.

**Defect 2 — the drop path is now driven, not described.**

`UploadPage.drop(fixture)` and `UploadPage.dragOver(fixture)` build a real
`DataTransfer` inside the page from the fixture's own bytes on disk and dispatch
a real `DragEvent` at `#drop-zone`, so a dropped PNG is the PNG in
`e2e/fixtures`. Specs now say `upload.drop('logo.png')` as easily as
`upload.choose('logo.png')`, as suggested.

The picker test kept its coverage under a name that says what it does —
`refuses an image chosen from the picker` — and five new tests cover the drop.

One of those five was written, run green, and then thrown away, which is worth
recording. `keeps the page, rather than letting the browser navigate to the file`
asserted `page.url()` was still `/` after a drop. It passes with
`event.preventDefault()` deleted from the page — checked, deliberately — because
a *synthetic* drop cannot make a real browser navigate to a file. It was a test
that quietly asserted nothing, which is the shape this task was told not to
repeat. What replaced it reads `dispatchEvent`'s own return value, which is false
exactly when a listener cancelled the default, and it does fail when
`preventDefault` is removed (D45).

That is the rule applied to all five: **each was checked against a mutation of
the page rather than trusted.** Removing the read of `event.dataTransfer` fails
three of them; removing `preventDefault` fails the cancellation test; removing
the drag cue fails the cue test. `src/pages/index.astro` is byte-identical to its
committed state — `git diff` on it is empty.

**Defect 3 — taken, and it corrects round 1's own notes.**

Measured here rather than repeated: `bun run test` runs Vitest on **Node 24 /
V8 13.6.233.17-node.48**, and `process.versions.bun` is `undefined`. The round 1
"Known gaps" line claiming JavaScriptCore is **false** and should not be reasoned
from. It has two consequences, both already acted on above:

- Every V8-shaped message in the new tests is the one this machine actually
  produces. `JSON.parse` was run over eleven inputs and the messages copied out
  rather than remembered; the comments naming V8 13.6 in the test file say so.
- `loadDesign.test.ts:146`'s conditional assertion is **executing**, not inert.
  It is still Task 02's and was left alone, but it is live rather than dead, and
  the note below for Jared is corrected to match.

### Files added or changed

| Path | What |
|---|---|
| `src/lib/describeLoadError.ts` | `ENGINE_POSITION_CLAUSE`, anchored to the end of the message and shared by `positionIn` and `engineDetail`. Rule 1 in the module's header now points at it, since that is where the rule is actually enforced. Net +19 lines, 14 of them the comment on why the anchor is the rule. |
| `src/lib/describeLoadError.test.ts` | Three tests and five measured-message constants. |
| `e2e/pages/uploadPage.ts` | `drop`, `dragOver`, `isDragCueShowing`, `dropZone`, and the private `dispatchWithFile` / `fileTransfer` / `mediaTypeOf` behind them. |
| `e2e/validation.spec.ts` | The `gantry.json` regression, a `Files dropped on the page` block of five, and one rename. |
| `e2e/fixtures/gantry.json` | New. The reported repro, byte for byte: a YAML config saved with a `.json` name. |
| `docs/DECISIONS.md` | D44, D45. |
| `README.md` | **No change.** Its sentence — "names the line and column when the browser gives a position to count from ... it never guesses one" — was already the promise; this round is the code catching up to it. Commands unchanged. |
| `.env.example` | **No change**, still none needed. |
| `src/pages/index.astro` | **No change.** Mutated twice to prove the new tests fail, restored both times, verified clean. |

### Tests written

Unit, 3 new (**179 total**, all passing). All three failed first, and the
failures are quoted in the commit message:

- **`reads a position from the engine's clause and never from the file it quotes`**
  — the reported repro as a unit test. Failed with `Line 1, column 10`, the exact
  string from the report.
- **`names no line for a short file quoted back whole, clause words and all`** —
  the case a phrase-only anchor would still get wrong. Failed with
  `Line 1, column 21`, and the sentence it failed with is the self-contradicting
  one: it named a column and then ended `... is not valid JSON`. It also asserts
  the quotation survives intact, so stripping a clause can never misquote a file.
- **`still names the line when the engine puts its position after the JSON`** —
  the guard against narrowing too far. Failed on the engine's clause being
  repeated after the app's own wording.

End to end, 6 new (**31 total**, all passing):

- **`names no line for a file whose own text says "position"`** — the regression
  in the browser that found it, through `gantry.json`.
- **`shows the drop cue while a file is over the page, and drops it again`** —
  `dragover` sets `data-dragging`, the drop clears it.
- **`refuses a dropped image without reading a byte of it`** — the real drop the
  old test was named for.
- **`describes a dropped binary named .json and shows none of it`** — a dropped
  PNG that passes the kind check because its name and its media type both say
  JSON; the panel's `innerHTML` matches neither `PNG` nor `IHDR`.
- **`draws a good file that was dropped rather than chosen`** — the success half
  of the drop path, status line and all.
- **`cancels the browser's own handling of both drag events`** — `preventDefault`
  on `dragover` and on `drop`, read off `dispatchEvent`'s return value.

### Local results

`bun run test`: **pass**, 179 tests in 11 files.
`bun run test:e2e`: **pass**, 31 tests in Chromium.
`bun run check`: **pass**, 0 errors, 0 warnings, 0 hints over 33 files.
`bun run build`: **pass**, 1 page in about 480 ms.

### Decisions recorded

**D44** — the anchored position clause: why the anchor rather than the phrase is
what makes it safe, why both prepositions are in it, and what it costs.
**D45** — how a dropped file is tested, and why `dispatchEvent`'s return value is
what pins `preventDefault` rather than the page's URL.

### Known gaps

- **Round 1's line "Bun runs Vitest on JavaScriptCore here" is false**, as the
  report says. Corrected above rather than edited in place, so the correction is
  readable beside the claim. Nothing else in round 1 rests on it.
- **No JavaScriptCore or SpiderMonkey message is measured**, only staged. The JSC
  constants in the test file still come from the handoff chain rather than from a
  Safari anyone ran, and one cannot be run here. The module's design is what makes
  that survivable — the engine is an argument (D38) — but if a JSC message is ever
  measured and differs, the staged one is where to look.
- **`positionIn` is now keyed to V8's clause wording specifically.** An engine
  that names a position in some third phrasing gets the no-position path: honest,
  but less than it could say. **Firefox is the live example** — SpiderMonkey says
  `JSON.parse: unexpected character at line 3 column 1 of the JSON data`, which
  names a line and a column and no position, so the panel currently tells a
  Firefox user it does not know where when the engine did say. That is a message
  that is *too modest*, never a wrong pointer, so it is not this defect and the
  round was not widened to chase it. Left below for Jared.
- **"not valid JSON" still reads twice on the no-position path**, as the report
  noted under "minor". This fix makes it *more* common, since every snippet-form
  message now takes that path. The wording is left alone deliberately: the second
  one is the engine's own words and is marked as such by `It reported:`, and
  rewriting it would mean cutting an engine's sentence in half. Flagged so the
  judgement can be re-made with the right facts.
- **`describeLoadError.ts` is now 466 lines.** Round 1 disclosed 447 and named
  the seam; this round added 19, 14 of them the comment on why the anchor is the
  rule. The seam is unchanged and was not taken — splitting the module in a round
  whose job was two defects would have buried them.

### Out-of-scope notes for Jared

- **`loadDesign.test.ts:146`'s conditional assertion is live, not inert** —
  correcting round 1's own note. It executes on Node/V8 here. Still Task 02's
  module and left alone, but the reason to clean it up has changed: it is not
  dead code, it is a test that will silently stop asserting the day anything runs
  it on an engine that gives no position.
- **Firefox gets a more modest message than it has earned**, per the gap above. A
  second clause for SpiderMonkey's `at line L column C of the JSON data` would be
  a handful of lines in the same shape as D44's, with the same end anchor. It is a
  real improvement and it is not a defect; it wants its own small cycle, or a
  carve-in to whichever task next opens this module.
- **`src/lib/layout.ts` is still 625 lines**, untouched, still routed to its own
  `chore/` cycle before Task 05.
- **`loadDesign`'s doc comment is still half a step behind**, as in round 1: it
  says V8 "names a position and often a line and column", which is true but
  incomplete. Still one sentence, whenever that file is next open.

### Round

Round 2 of 3. Back to Jahmyr. Nothing is pushed; the branch has two new commits.

---

## Test report from Jahmyr — round 2

### Verdict

**Pass.** Both round 1 defects are closed and independently verified, not
accepted on report. Criteria 2 and 3 are now checked; all six hold.

The two departures from my round 1 suggestion were both correct, and one of them
corrects me: the `in`-only regex I proposed would have introduced a regression.
Swapping the shared constant for it fails
`still names the line when the engine puts its position after the JSON` and
nothing else, turning
`That file is not valid JSON. Line 2, column 1: Unexpected non-whitespace character.`
back into `… did not say where in it`. Fuzzing shows
`Unexpected non-whitespace character after JSON at position N` is one of V8's
commonest forms, not a corner. The end anchor over the phrase is likewise right,
for the reason given: the short-file case defeats a phrase-only fix.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| Validation errors visible end to end | pass | `reads the message, fixes the file, and gets the drawing` walks a broken file to a drawing in Chromium. 31/31 Playwright green. |
| Malformed JSON shows the line; a missing field shows the field | pass | Line: 200,000 mutated-JSON inputs through V8, 41 distinct message shapes, 14 position-bearing forms — every one still yields its line, **0 lost, 0 invented, 0 value mismatches**. Then the real module over 368 stored V8 messages: 51 with an engine clause, **all 51 agreed with V8's own `(line L column C)` exactly**; 309 without, all answered honestly. Field: `nodes[0].label is missing. It has to be text.`, `nodes has to be a list, but it is an object.`, `edges[0].to: This edge's "to" is "ghost", which no node defines.` |
| Tests cover the behavior as a user would observe it, and pass | pass | 179 unit + 31 e2e green. Verified load-bearing by mutating the source myself, not by reading the tests: round 1's unanchored regex fails 5 including both new regression tests; `in`-only fails exactly 1; removing `preventDefault` fails only the cancellation test; removing the `dataTransfer` read fails exactly 3; removing the drag cue fails exactly 1. Tree restored clean after each. |
| Every earlier test still passes; CI is green | pass | No previously passing test regressed. CI green on the pushed branch. |
| Best-effort accessibility | pass | Both live regions present in the served HTML before any file is chosen. `role="status"` on both (valid role, polite, they take turns per D41). Label bound to the input by `for`/`id`, drop hint via `aria-describedby`. Panel text `#5c1116` on `#fdf3f3` = **12.47:1**, border `#b4262c` = **5.93:1**; both clear AA. Not colour-alone — a rule plus sentences. `front-a11y` audit: 0 critical, 0 major, 0 minor. |
| Any new environment variable is in `.env.example` | pass | The only `process.env` reads in the repo are `CI` in `playwright.config.ts`; no app variable exists. `gitleaks detect`: 24 commits, ~659 KB, **no leaks found**. |

### Command results

`bun run test`: **179 passed**, 11 files.
`bun run test:e2e`: **31 passed**, Chromium.
`bun run build`: **pass**, 1 page in 474 ms.
`bun run check`: **pass**, 0 errors / 0 warnings / 0 hints over 33 files.
`bun run dev`: serves 200 at `localhost:4321` with both live regions in the
initial HTML; no errors in the log; stopped cleanly.
Secret scan: **clean**.

### Adversarial pass beyond the checklist

Eleven hostile files through the real browser, then removed; the tree is clean.
No uncaught error, no console error, and the page always said something.

| Input | Outcome |
|---|---|
| `nodes: []` | Draws. `0 nodes, 0 edges.` |
| 800 nodes / 799 edges | Draws in **268 ms**. |
| Top-level `[]`, `null`, `42` | Named: "… but it is a list / null / a number." |
| `nodes` as an object | `nodes has to be a list, but it is an object.` |
| Label `<script>window.__pwned=1</script>`, title `<img onerror>` | Drawn as text. `window.__pwned` undefined. |
| `__proto__` at both levels | `Object.prototype` unpolluted. |
| 4,000-char label, 3,000-char title | Draws; wraps per D26/D35. |
| BOM, self-edge, duplicate edge `id` keys | All draw. Edges have no `id` in the schema, so duplicates are ignored extra keys (rule 2) — the runbook's "duplicate edge ids" case is a non-issue here by design. |
| Numeric `id`/`label` | Three field messages, each naming its path. |

### Defects for Amon

None blocking. One carried forward, sharpened:

1. **`src/lib/describeLoadError.ts:191` (`withoutPosition`)** — on Firefox the
   panel does not merely under-deliver, it **states something false**. For
   `JSON.parse: unexpected character at line 3 column 3 of the JSON data` it
   renders: *"That file is not valid JSON, and this browser did not say where in
   it. It reported: JSON.parse: unexpected character at line 3 column 3 of the
   JSON data."* The clause "did not say where" is contradicted by the clause
   after it. Cause: `positionIn` can only yield a character index, and
   SpiderMonkey gives a line and column and no index, so `atPosition` cannot be
   reached — the gap is the shape of the return type, not the pattern.
   **Not a regression** (round 1's regex had no `position` word to match either),
   never a wrong pointer, and D32 puts non-V8 browsers in scope. I am passing the
   task rather than spending round 3 on a pre-existing wording fault that Amon
   disclosed and routed to its own cycle — but the checkbox is mine and Sam can
   overrule. It wants a second clause yielding a `LineAndColumn` directly.

2. **`src/lib/describeLoadError.ts:193`** — "not valid JSON" twice in one
   message, my round 1 minor, now the common case since every snippet-form
   message takes this path. Still defensible: the second is the engine's own
   words behind `It reported:`. Both of these live in the same four lines and
   should ride the same cycle.

### Fixed in place

None. Nothing needed correcting.

### Round

Round 2 of 3, closed. To Sam.
