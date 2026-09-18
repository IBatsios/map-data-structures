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

Tasks 01 to 03 are done. Choose a JSON file, with the picker or by dropping it
on the page, and it is validated against the Zod schema in
`src/lib/design.schema.ts` before anything draws it — a duplicate node id or an
edge naming an unknown node is refused, not silently drawn wrong. A loaded
design is laid out with `@dagrejs/dagre` and drawn as an SVG below the status
line: six node kinds each in their own silhouette (`service`, `database`,
`queue`, `external`, `user`, `decision`), anything else a grey dashed
rectangle, labelled edges with arrowheads, self-edges looped against their own
node, a `<title>` and `<desc>` for accessibility. Still one blunt validation
line, no exports yet. See `docs/RUNBOOK.md` for the frontier.

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
