# Handoff — after Task 02

**Date:** 2026-09-18
**Phase finished:** Task 02: Upload a JSON file
**Next phase:** Task 03: Preview the generated drawing

## Where things stand

`main` has Tasks 01 and 02, merged from `feature/upload-json` (squashed as
`b98971b`). `bun install`, `bun run dev`, `bun run test`, and `bun run build`
all work. One page at `/` has a labelled file input plus drag-and-drop over
the whole page; either path reads the file with the File API, validates it
against the Zod schema in `src/lib/design.schema.ts` via `loadDesign`, and —
only once it is valid — shows the file name and node/edge counts and draws a
box per node and a line per edge. A duplicate node id or an edge naming a node
the file does not define is refused rather than silently drawn wrong. Nothing
is sent anywhere. CI (`.github/workflows/ci.yml`) runs `bun run test` on every
push and pull request and is green. A pre-commit hook (Husky + lint-staged)
formats staged files and runs the Vitest suite. `gitleaks detect` finds
nothing. 46 tests pass.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. Start Task 03 (`docs/tasks/03-preview-drawing.md`) from `main`, on a branch
   named `feature/<short-description>`. It is unblocked — Tasks 01 and 02 are
   done. Confirm a layout engine (ELK or dagre — the task file names both as
   common open-source choices) with the user before adding either as a
   dependency; the intake names no engine.
2. Task 03 is also where D17 closes: add `typescript` and `@astrojs/check`, an
   `astro check` script, and a CI step, per the routing note in
   `docs/handoff-items/handoff-task-02-upload-json.md`. It is also where the
   first Playwright test and its CI step land — remember Astro 7's `astro dev`
   is a detached background server (`astro dev status|logs|stop`); reflect
   that in Playwright's `webServer` config, and give the e2e walk its own
   script so `bun run test` stays Vitest-only and the pre-commit hook does not
   start a browser on every commit.
3. Task 04 (`docs/tasks/04-validation-errors.md`) is also unblocked (01, 02
   done) but is not next in the RUNBOOK's order; when it is picked up, carry
   forward four defects Jahmyr recorded while testing Task 02, none of which
   failed a Task 02 criterion but all of which bear on Task 04's design:
   - **Worth resolving before Task 04's work starts.** `src/lib/loadDesign.ts:41-43`'s
     doc comment, and D22, claim `JSON.parse`'s message "names the position…
     in every browser this app targets." True of V8; false of Safari's
     JavaScriptCore, which gives a message with no position, line, or column.
     Task 04's second acceptance criterion is literally "malformed JSON shows
     the line" — it needs a fallback for engines that give no line to show.
     `src/lib/loadDesign.test.ts:135`'s `toMatch(/position \d+/)` cannot catch
     this because Vitest runs on Node (V8); the assertion should treat the
     position as a bonus, not a guaranteed part of the contract.
   - `src/pages/index.astro:96` — re-picking the identical file fires no
     `change` event, so the drawing and the status/error text go stale while
     still asserting the old load. Task 04's loop is "see the error, fix the
     file, load it again," so this is worth fixing as part of that task
     (clear `fileInput.value` after each read).
   - `src/pages/index.astro:27` — `accept="application/json,.json"` filters
     the file *picker* only; a dropped non-JSON file's raw bytes reach
     `loadDesign` and leak into the status region as a `JSON.parse` message.
     Task 04 should check the type or extension before parsing so it can say
     "that is not JSON" instead of echoing a byte.
   - `src/lib/design.schema.ts:35` — `z.string().min(1)` admits a
     whitespace-only string, so a blank label or id still loads and draws a
     blank box. D19 justifies the "no empty strings" rule as exactly what
     stops a blank box, so the rule under-delivers on what the decision
     claims. A decision to make (tighten to a non-blank check, or narrow D19's
     wording), not an obvious bug — low severity.
   Also carry forward: D20 (confirmed correct by Jahmyr) — Zod does not run
   its cross-field refinement once a field itself has failed, so a file with
   both a bad field and a dangling edge reports only the field on the first
   pass. Task 04 should design its message list around that staged,
   two-pass-to-fix reality rather than assume every problem surfaces at once.
4. Update `README.md` or `CLAUDE.md` if a command changes.
5. When Task 03 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-03-*.md`.

## Suggested skills for the next session

- `frontend-design-direction`: decide how the drawing should look before
  styling it — this is the product's face.
- `make-interfaces-feel-better`: spacing, label sizes, and arrowheads once the
  layout works.
- `front-a11y`: check the SVG title and contrast.
- `tdd-workflow`: the layout test before the layout function.
- `e2e-testing`: the first Playwright test and its CI step.
