# Handoff — after Task 03

**Date:** 2026-09-18
**Phase finished:** Task 03: Preview the generated drawing
**Next phase:** Task 04: Validation errors

## Where things stand

`main` has Tasks 01 to 03, merged from `feature/preview-drawing` (squashed as
`3e6d6c0`, PR #5, three rounds of Jahmyr's testing — two self-edge routing
defects found and fixed along the way). `bun install`, `bun run dev`,
`bun run test`, `bun run test:e2e`, `bun run check`, and `bun run build` all
work. CI (`.github/workflows/ci.yml`) runs all four in order — typecheck,
Vitest, browser install, Playwright — on every push and pull request, and is
green.

Choose a JSON file, with the picker or by dropping it on the page, and once
`loadDesign` accepts it against the Zod schema in `src/lib/design.schema.ts`,
`layoutDesign` (`src/lib/layout.ts`, wrapping `@dagrejs/dagre`) lays it out
and an SVG draws below the status line: six node kinds — `service`,
`database`, `queue`, `external`, `user`, `decision` — each in their own
silhouette and colour band, anything else a plain grey dashed rectangle
printing its own type under the label, labelled edges with arrowheads, and
self-edges looped against their own node, each in its own lane so two or more
on one node draw as distinct nested loops with stacked, readable labels. The
SVG carries a `<title>` and a `<desc>` naming every node and edge for
accessibility. 125 Vitest tests and 11 Playwright tests pass; `gitleaks
detect` finds nothing.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. Start Task 04 (`docs/tasks/04-validation-errors.md`) from `main`, on a
   branch named `feature/<short-description>`. Unblocked — Tasks 01 and 02
   are done.
2. Task 04's second acceptance criterion — "malformed JSON shows the
   line" — needs a plan for engines that give `JSON.parse` no position at
   all. D32 corrects D22's premise: true of V8, **false of JavaScriptCore**
   (Safari), which gives a message with no line or column. The loader
   already throws structured errors carrying the original message and
   `cause` (D22); Task 04 owns what to say when there is no position to say
   it from.
3. Carried forward from Task 02, still open:
   - `src/pages/index.astro:27` — `accept="application/json,.json"` filters
     the picker only; a dropped non-JSON file's raw bytes reach `loadDesign`
     and a byte leaks into the status line inside a `JSON.parse` message.
     Check the type or extension before parsing so the app can say "that is
     not JSON."
   - `src/lib/design.schema.ts:35` — `z.string().min(1)` admits a
     whitespace-only string, so a blank label or id still loads and draws a
     blank box. D19 justifies "no empty strings" as exactly what stops a
     blank box, so the rule under-delivers on what the decision claims. A
     decision to make (tighten to a non-blank check, or narrow D19's
     wording), not an obvious bug.
   - D20 (confirmed correct, not a bug) — Zod's cross-field refinement only
     runs once every field has passed, so a file with both a malformed field
     and a dangling edge reports only the field on the first pass. Design
     the message list around that staged, two-pass reality.
4. Also open, from Task 03: `src/lib/layout.ts` is 625 lines — inside the
   800-line ceiling, past the 200-400 that is meant to be typical. The
   self-edge routing (`selfLoop`, its slots, its four constants — about 130
   lines answering to one idea, consumed through one call) is the obvious
   seam to extract. Both Amon and Jahmyr flagged it independently; worth
   doing before Tasks 05-08 start reading this module in earnest, since all
   four exporters consume `layoutDesign`.
5. Small backlog, not blocking Task 04: five self-edge loops on one node
   reads as three at 4x zoom (the band clamps from the fourth loop on — all
   five routes and labels stay distinct, so criterion 2 held, but the
   nesting cue stops working); loop ends meet each node's bounding box
   rather than its silhouette, the same as every other edge end, so one fix
   covers all of them; and which stacked self-loop label belongs to which
   loop is positional, not drawn — fine at two loops, weak at five.
6. The page outside the drawing has no styling at all — default serif body
   copy beside a sans-serif drawing, reading as two documents side by side.
   This wants a global-styling decision, which D1 constrains to CSS Modules
   but nobody has made yet. Task 09 adds a second page and will hit the same
   thing.
7. Update `README.md` or `CLAUDE.md` if a command changes.
8. When Task 04 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-04-*.md`.

## Suggested skills for the next session

- `error-handling`: typed failures from the loader, user-facing messages in
  the panel.
- `tdd-workflow`: one broken file per test, written first.
- `front-a11y`: the live region and the message contrast.
