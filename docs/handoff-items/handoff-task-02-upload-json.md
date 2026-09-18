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
