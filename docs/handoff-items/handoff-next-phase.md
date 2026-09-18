# Handoff — after Task 04

**Date:** 2026-09-18
**Phase finished:** Task 04: Validation errors
**Next phase:** Task 05: Export as Markdown

## Where things stand

`main` has Tasks 01 to 04, merged from `feature/validation-errors` (squashed as
`b0f8210`, PR #7, two rounds of Jahmyr's testing — two round-1 defects found
and fixed, both verified closed by mutating the source rather than trusting
the report). `bun install`, `bun run dev`, `bun run test`, `bun run test:e2e`,
`bun run check`, and `bun run build` all work. CI (`.github/workflows/ci.yml`)
runs typecheck, 179 Vitest, and 31 Playwright on every push and pull request,
and is green. `gitleaks detect` finds nothing.

Choose a JSON file, with the picker or by dropping it on the page. Before
anything is read, its name and browser-reported type are checked against JSON
(`src/lib/jsonFile.ts`, D40) — a file that is neither named `.json` nor
reports a JSON media type is refused unread, which is what stops a dropped
image's raw bytes from reaching the parser. A file that passes is validated
against the Zod schema in `src/lib/design.schema.ts`: every field required,
no string blank — `"   "` is refused, `"  Public API  "` keeps its spaces
(D39) — duplicate node ids and edges naming undefined nodes refused (D20). A
file that fails to parse or to validate says why in a two-region live panel
beside the upload control (D41): a syntax error names the line and column
only when the engine's message carries its own anchored clause and says so
plainly, never guessing, when it does not (D38, D44); a schema error names
the field at fault, one message per problem, capped at ten with a remainder
count (D42); nothing the app did not write reaches the screen unbounded
(D43). A loaded design draws as before: `layoutDesign` (`src/lib/layout.ts`)
lays it out with `@dagrejs/dagre`, an SVG draws below the status line, six
node kinds in their own silhouette, self-edges looped in their own lanes,
`<title>` and `<desc>` for accessibility.

Not live anywhere yet — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **`src/lib/layout.ts`'s `chore/` cycle, before Task 05 proper.** It is 625
   lines, inside the 800-line ceiling but past the 200-400 that is meant to
   be typical, and Jared already routed it to its own cycle. It is due now
   because Task 05 is the first task to read `layoutDesign` in earnest — all
   four exporters do. The self-edge routing (`selfLoop`, its slots, its four
   constants, about 130 lines answering to one idea, consumed through one
   call) is the seam both Amon and Jahmyr flagged independently, across two
   tasks now.
2. **Then start Task 05** (`docs/tasks/05-export-markdown.md`) from `main`, on
   a branch named `feature/export-markdown`. Unblocked — Tasks 01 and 03 are
   done. Its own note: confirm with the user whether a Mermaid block is
   acceptable for the drawing inside the `.md` file (it is what renders
   inside GitHub and GitLab, where "a repo or wiki" points); otherwise link an
   image the user places beside the file. Build this exporter first among the
   four — the download helper and the node/edge tables are shared pieces the
   other three exporters need.
3. **Carried forward, not blocking either task:**
   - **Firefox wording fault, `src/lib/describeLoadError.ts:191` and `:193`.**
     On SpiderMonkey (`JSON.parse: unexpected character at line 3 column 3 of
     the JSON data`) the panel renders "That file is not valid JSON, and this
     browser did not say where in it. It reported: …" — the "did not say
     where" clause is contradicted by the clause right after it, because
     SpiderMonkey names a line and column with no character index, and
     `positionIn` can only yield an index, so `atPosition` is unreachable.
     Not a regression, never a wrong pointer (D32 already scopes non-V8
     browsers in). **Jahmyr passed criterion 2 despite this and explicitly
     invited Sam to override; Sam did not** — it does not affect the
     Chromium/Node path CI actually tests, it was disclosed rather than
     buried, and it is already scoped: a second clause yielding a
     `LineAndColumn` directly from SpiderMonkey's own line and column,
     sharing D44's end-anchor approach. Same four lines: "not valid JSON"
     appears twice on the no-position path, now the common case — ride the
     same small cycle.
   - **`loadDesign.ts`'s doc comment is still half a step behind.** It says V8
     "names a position and often a line and column," which is true but
     incomplete since D38's measurement showed the no-position path is V8's
     ordinary path, not a corner. One sentence, whenever that file is next
     open.
   - **The page outside the drawing still has no styling** — default serif
     body copy beside a sans-serif drawing. Task 09 adds a second page and
     will make this decision worth taking once.
   - **Edges have no `id` in the schema**, so the runbook's "duplicate edge
     ids" case is an ignored extra key by design, not a bug — confirmed by
     Jahmyr's adversarial pass in round 2.
4. Update `README.md` or `CLAUDE.md` if a command changes.
5. When Task 05 ends, write the next handoff doc here, in this shape, and
   append its own detail to a new `docs/handoff-items/handoff-task-05-*.md`.

## Suggested skills for the next session

- `mermaid`: the diagram block, if Mermaid is chosen for the drawing.
- `tdd-workflow`: the renderer test before the renderer.
- `e2e-testing`: extending the Playwright walk with a download assertion.
- `front-refactor`: for the `layout.ts` chore cycle, simplifying without
  changing behavior.
