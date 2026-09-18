# Handoff — after Task 01

**Date:** 2026-09-18
**Phase finished:** Task 01: Walking skeleton
**Next phase:** Task 02: Upload a JSON file

## Where things stand

`main` has a working walking skeleton, merged from `feature/walking-skeleton`
(squashed as `e8ac5f1`). `bun install`, `bun run dev`, `bun run test`, and
`bun run build` all work. One page at `/` has a labelled file input; choosing
a JSON file reads it with the File API, parses it with `parseDesign`, and
draws one SVG with a box per node and a line per edge. Nothing is sent
anywhere. CI (`.github/workflows/ci.yml`) runs `bun run test` on every push
and pull request and is green. A pre-commit hook (Husky + lint-staged)
formats staged files and runs the Vitest suite. `gitleaks detect` finds
nothing.

Not live anywhere yet — Task 10 is what deploys to Netlify.

Two standing gaps carried forward, not defects in Task 01:

- **No typecheck runs anywhere** (D17). TypeScript is not a dependency, so
  neither `tsc` nor `astro check` runs, and nothing enforces the `<script>`
  block inside `.astro` pages staying type-clean. Worth its own task or a
  line in an existing one: add `typescript` and `@astrojs/check`, an
  `astro check` script, and a CI step.
- **Duplicate node ids silently collapse** in `src/pages/index.astro` (a
  `Map` keyed by node id), so edges resolve to the later node. Correct for
  Task 01's well-formed-input assumption; Task 02's Zod schema should reject
  this case rather than silently accept it.

## What to do next, in order

1. Start Task 02 (`docs/tasks/02-upload-json.md`) from `main`, on a branch
   named `feature/<short-description>`. It is unblocked — Task 01 is done.
2. Task 02 replaces `parseDesign` with a validating `loadDesign(text): Design`
   backed by a Zod schema, adds drag-and-drop to the existing file input, and
   shows the file name plus node/edge counts after a load. Write the schema
   and loader tests first.
3. Explicitly have the Zod schema reject duplicate node ids (the gap named
   above) rather than silently letting the later one win.
4. Update `README.md` or `CLAUDE.md` if a command changes.
5. When Task 02 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-02-*.md`.

## Suggested skills for the next session

- `error-handling`: shape `loadDesign`'s failures so Task 04 can later name
  the line or field.
- `tdd-workflow`: schema and loader tests before the implementation.
- `front-review`: review the upload component before the pull request.
