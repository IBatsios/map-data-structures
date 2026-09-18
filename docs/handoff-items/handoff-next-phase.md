# Handoff — after the layout.ts split chore

**Date:** 2026-09-18
**Phase finished:** Chore: split `src/lib/layout.ts` into four modules
**Next phase:** Task 05: Export as Markdown

## Where things stand

`main` has Tasks 01 to 04 plus this chore cycle, squashed as `8a55336`, PR #9.
`bun install`, `bun run dev`, `bun run test`, `bun run test:e2e`, `bun run
check`, and `bun run build` all still work, unchanged by the split. CI
(`.github/workflows/ci.yml`) is green: 206 Vitest (up from 179 — the chore's
two new test files are additive, nothing was moved out of `layout.test.ts`),
31 Playwright, typecheck clean. `gitleaks detect` finds nothing.

`src/lib/layout.ts` was 625 lines and is 346 now. It split along two seams,
both already implicit in the code rather than invented for the split:

- **`src/lib/selfLoops.ts`** (203 lines) — the self-edge routing group: the
  five `SELF_LOOP_*` constants, `SelfLoopSlot`, `selfLoopSlots`, `loopsByNode`,
  `plateTopOf`, `selfLoop`. Carries D34's and D37's reasoning in its module
  comment.
- **`src/lib/normaliseDrawing.ts`** (115 lines) — the margin offset and the
  canvas: `DRAWING_MARGIN`, `offsetToMargin`, `shiftBox`, `shiftEdge`,
  `canvasFor`.
- **`src/lib/layout.types.ts`** (90 lines) — the shared vocabulary:
  `LayoutPoint`, `LayoutBox`, `LayoutNode`, `LayoutEdge`, `DesignLayout`,
  `EdgeLabelPlate`, `PreparedEdge`.
- **`src/lib/layout.ts`** (346 lines) — still the single public door.
  `layoutDesign` and everything else Tasks 05 to 08 import is importable
  from `./layout` exactly as before; anything that moved is re-exported,
  never re-declared.

This was a pure refactor with no behaviour change, verified rather than
asserted: `layoutDesign`'s output is byte-identical to `main` over 19 designs
including a 300-node/900-edge stress case, and thirteen deliberate mutations
of the extracted modules each turn a test red — most caught by the untouched
`layout.test.ts`, three (7, 10, 12) caught only by the new `selfLoops.test.ts`
/ `normaliseDrawing.test.ts`, closing real gaps that existed in the net on
`main` too. No user-facing behaviour changed, so no user-facing doc needed a
behaviour update; `README.md`'s `## Layout` section describes `src/lib/` by
what it holds rather than file by file and is still true, confirmed rather
than assumed.

Choose a JSON file, with the picker or by dropping it on the page — the rest
of the app is exactly as Task 04 left it: validated against
`src/lib/design.schema.ts`, syntax and schema errors explained beside the
upload control, a loaded design laid out with `@dagrejs/dagre` and drawn as
an SVG. Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Start Task 05** (`docs/tasks/05-export-markdown.md`) from `main`, on a
   branch named `feature/export-markdown`. Unblocked — Tasks 01 and 03 are
   done; `layout.ts`'s chore is done, so the module has the fewest readers
   it will have again before this task adds the first exporter to the four.
   **The Mermaid question is already settled — do not re-ask it.** The user
   was asked how the drawing should appear inside the `.md` file and chose a
   fenced ```` ```mermaid ```` flowchart block over a linked image or both:
   self-contained, renders natively on GitHub and GitLab, which is where "a
   repo or wiki" points. Start the cycle with that decided.
2. **Carried forward, not blocking Task 05:**
   - **`straightLine` at `src/lib/layout.ts:329` falls back to dagre's
     *centres* while every other route runs border to border.** An arrowhead
     drawn on that path would land inside a box. Unreachable today — none of
     19 designs tried against it, including the 300-node one, reached it —
     and byte-identical to `main`, so it is not a regression from the split.
     **Worth a look when an exporter starts drawing arrowheads, which starts
     with this task.**
   - **`describeDrawing.test.ts:5` is a fifth consumer of `layout.ts`**, not
     counted in the chore's assignment (which named four). No action needed,
     just keep the consumer count right when Task 05 adds a fifth reader of
     its own.
   - **Firefox/SpiderMonkey wording fault**, `src/lib/describeLoadError.ts:191`
     and `:193` — Jared said he'd route this to its own small cycle after
     Task 05. Still queued, still not this task's to fix.
   - **`loadDesign.ts`'s doc comment** still lags D38/D44 by one sentence.
     Same small cycle as above.
   - **`loadDesign.test.ts:146`'s conditional assertion** — rides with the
     same cycle, same module family.
   - **The page outside the drawing still has no styling.** Task 09 adds a
     second page and makes the decision worth taking once.
3. Update `README.md` or `CLAUDE.md` if a command changes.
4. When Task 05 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-05-*.md`.

## Suggested skills for the next session

From Task 05's file, now that the Mermaid question is settled:

- `mermaid`: the diagram block — build against the fenced ```` ```mermaid ````
  flowchart the user chose.
- `tdd-workflow`: the renderer test before the renderer.
- `e2e-testing`: extending the Playwright walk with a download assertion.
