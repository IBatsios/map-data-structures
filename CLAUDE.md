<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# CLAUDE.md — MapDataStructures

MapDataStructures is a web app for software architects and technical leads that turns a JSON description of a system into a formatted architectural design document as Word, PDF, HTML, or Markdown. Users: anyone that wants to upload json, probably from the owner's website. The most important path is Upload JSON get a drawing back.

## Stack

TypeScript, Astro, no backend, no database and no data layer, CSS Modules, tests with Vitest and Playwright, bun. Everything runs in the browser and the site ships as static files. Details in `docs/ARCHITECTURE.md`.

## Conventions

- `main` is not protected. Branches are still the habit: name them `feature/<short-description>`, `fix/<short-description>`, or `chore/<short-description>` and merge through a pull request, which is what runs CI.
- Commit messages: conventional commits with types feat, fix, chore, docs, test, refactor.
- Every new environment variable is added to `.env.example` with a placeholder. Secrets never go in code or commits. Today there are no variables.
- At the end of a phase, write a handoff doc in `docs/handoff-items/`.

## Status

Tasks 01 to 07 are done. Choose a JSON file, with the picker or by dropping it
on the page, and it is validated against the Zod schema in
`src/lib/design.schema.ts` before anything draws it — a duplicate node id or an
edge naming an unknown node is refused, not silently drawn wrong, and no
string may be blank (`"   "` is refused; `"  Public API  "` keeps its spaces).
A loaded design is laid out with `@dagrejs/dagre` and drawn as an SVG below the
status line: six node kinds each in their own silhouette (`service`,
`database`, `queue`, `external`, `user`, `decision`), anything else a grey
dashed rectangle, labelled edges with arrowheads, self-edges looped against
their own node, a `<title>` and `<desc>` for accessibility.

A file that is not JSON by name or reported type (`src/lib/jsonFile.ts`) is
refused before it is opened, whether picked or dropped. A file that fails to
parse or to validate is explained in a live-region panel beside the upload
control: a syntax error names the line and column when the engine gives one
and says so plainly when it does not, never guessing; a schema error names the
field at fault, one message per problem.

With a design on screen, **Export Markdown** downloads `<design>.md`: the
title, a table of every node and edge, and the drawing itself as a fenced
` ```mermaid ` `flowchart TD` block, keyed off `shapes.ts` so it never
disagrees with the preview. **Export HTML** downloads `<design>.html`: one
standalone page with the preview's own SVG, the same two tables, and every
style inline, so nothing is fetched from anywhere once it is saved. **Export
PDF** downloads `<design>.pdf`, the drawing in as vector (`svg2pdf.js` on
`jspdf`) so it stays sharp at any zoom, with one embedded font (Roboto
Regular, SIL OFL 1.1, licence at `src/lib/fonts/Roboto-LICENSE.txt`) so the
file opens the same everywhere. A character the font cannot draw, including a
control character, is replaced one-for-one with a visible `■` in both the
drawing and the tables, never dropped silently, and a lossy export says so
after the fact. All three buttons live in one `role="group"` export row and
disable together the moment a file fails. `src/lib/download.ts`
(`downloadBlob`, `fileNameFor`) is the shared piece Task 08 reuses for Word,
which is still to come. See `docs/RUNBOOK.md` for the frontier.

**Known limit carried from Task 07:** the PDF's drawing is scaled to fit one
page, and its on-page label size degrades much earlier than expected —
readable at 7 nodes (10.2pt), unreadable without a magnifier at 15 nodes
(4.0pt, the scale the owner's designs actually run at). The tables still
carry every label at full size regardless. Landscape pages or tiling the
drawing across sheets is the fix; it is not built yet and wants its own
task. Detail in `docs/handoff-items/handoff-task-07-export-pdf.md`.

## Run and test

```
bun install
bun run dev       # http://localhost:4321
bun run test      # Vitest suite
bun run test:e2e  # Playwright walk, in a real browser
bun run check     # astro check
bun run build     # static site into dist/
```

`bun run test` runs Vitest. Plain `bun test` would run Bun's own runner instead, so always include `run`.

`bun run test:e2e` stays out of `bun run test`: the pre-commit hook runs the latter, and a hook that starts a browser on every commit stops being run. It needs `bunx playwright install chromium` once. The hook is lint-staged, then `bun run check`, then `bun run test`.

Astro 7 backgrounds both `dev` and `preview` whether or not `--background` is passed, and both hold a lock file, so neither can be a Playwright `webServer`; `e2e/staticServer.ts` serves `dist/` in the foreground instead (D30).

## Where things are

- `docs/PRD.md`: what and why. `docs/ARCHITECTURE.md`: how. `docs/DECISIONS.md`: what was decided and why; append new decisions there.
- `docs/RUNBOOK.md`: what to do next. Phase 0 is done by a person. Phase 1 is the task list.
- `docs/tasks/`: one file per task. Pick any task whose "Blocked by" list is entirely done. Finish it to its acceptance criteria before starting another.
- `docs/intake.md`: the source all of the above was generated from. Change the intake and run `/kickoff` to regenerate; edits to generated files are lost on regenerate.

## Skills to use

- `coding-standards`: before the first file of any task, for naming and structure.
- `tdd-workflow`: every task writes its test before its function.
- `setup-pre-commit`: once in Task 01, to add formatting and the test run on commit.
- `error-handling`: the loader in Task 02 and the messages in Task 04.
- `front-review`: before each pull request that adds or changes a component or an exported page.
- `front-refactor`: when a component or module grows past a screen and needs simplifying without changing behavior.
- `front-comments`: on the schema module, which the page and the validator share.
- `e2e-testing`: the Playwright walk from Task 03 on, and its CI step.
- `frontend-design-direction`: before styling the drawing in Task 03 and the schema page in Task 09.
- `make-interfaces-feel-better`: spacing, labels, and controls once each screen works.
- `front-a11y`: the best-effort accessibility check on every task with a screen.
- `mermaid`: the diagram block in the Markdown export, if Mermaid is chosen.
- `anthropic-skills:pdf`: choosing and using the PDF route in Task 07.
- `anthropic-skills:docx`: building the Word document in Task 08.
