# Handoff — after the layout-crash-and-loader-wording fix

**Date:** 2026-09-18
**Phase finished:** Fix: a valid design that will not draw, and a message
that contradicts itself (unnumbered; no `docs/tasks/` file — see "Why this
has no task file" in the handoff doc — merged as PR #23)
**Next phase:** the three-chore cycle (unnumbered; D51's sentence, the export
column headings/shares, the `empty.json` name collision) — then Task 10:
Deploy to Netlify

## Where things stand

`main` is at `a153962`, PR #23 squashed in (round 1, one defect found and
fixed in place — a flaky test clock, not a claim). CI green on both jobs
(push event and pull_request event), re-confirmed independently by Sam at the
release gate rather than taken on report: `bun run test` 441 passed across 26
files, `gh pr checks` both green, `gitleaks detect --source . --no-banner` no
leaks found, re-run twice (before and after Sam's own doc-fix commit).

**Two defects closed, both "the app told a user something untrue about a file
they wrote":**

1. **A valid design that crashed dagre instead of drawing.** A design
   carrying both a two-cycle and a parallel duplicate edge between the same
   pair of nodes made dagre's ordering pass merge two parallel dummy chains,
   leaving one dummy without a position (`NaN`). That surfaced two ways:
   `assignNodeIntersects` throwing `Not possible to find intersection inside
   of the rectangle`, or — the worse half, found by fuzzing, announced
   nowhere — dagre returning normally with a void SVG path, silently dropping
   an edge, sometimes with a whole node box coming back `x: NaN, y: NaN`.
   `layoutDesign` now asks dagre twice: once keyed one dagre edge per file
   edge (provably unchanged — every existing drawing lays out
   byte-identical to `main`), and only if that does not come back *whole*
   (every coordinate finite, stricter than "did not throw"), again keyed one
   dagre edge per node pair, with the new `src/lib/parallelEdges.ts` fanning
   duplicates back apart. Zero failures across 60,000 fuzzed graphs on two
   independently written generators (D98, D100). If a design still cannot be
   placed, `DesignLayoutError` gives the app's own sentence, never dagre's.
2. **Firefox's syntax-error message denied a position, then quoted one.**
   `positionIn` could only yield a character index, and SpiderMonkey's
   `JSON.parse` gives a line and column with no index, so its message fell
   through to the no-position branch while `engineDetail` still echoed the
   line and column back. `describeSyntaxFault` now reads a second,
   end-anchored engine clause that yields a `LineAndColumn` directly; both
   clauses live in one ordered list so the position that's printed and the
   position that's stripped from the detail can never disagree (D99).
   SpiderMonkey message text was read verbatim out of Firefox 156.0 over
   Marionette, not invented or taken from documentation.

Full diagnosis, measurements and both agents' reports:
`docs/handoff-items/handoff-fix-layout-crash-and-loader-wording.md`.
Decisions: D98–D101 in `docs/DECISIONS.md` — D100 reconciles Amon's
36-in-60,000 against Jahmyr's independent 581-in-60,000 (different
generators, not a contradiction); D101 records the first flaky-CI finding in
this project (a 2500-graph fuzz test needed its own timeout).

**Not live anywhere yet** — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **The three-chore cycle**, split out of this one deliberately by Jared —
   pure dedup and renaming, pinned by tests that already exist, verified by
   *nothing changing*:
   - D51's empty-design sentence, still in four copies — `pdfPlan.ts`
     (exported), `toHtml.ts` (private), `toMarkdown.ts`, `docxPlan.ts`.
   - The four exports' column headings, still four copies
     (`Id | Label | Type`, `From | To | Label`), and the column *shares*
     duplicated between `pdfPlan.ts` and `docxPlan.ts`.
   - `e2e/fixtures/empty.json`'s name collision: the file is 0 bytes and
     `validation.spec.ts:84` correctly uses it to mean *a file with no
     bytes*, but `describeUpload.test.ts:50` uses the same name to mean *a
     valid design with 0 nodes and 0 edges*, and `export.spec.ts:182` needs a
     comment to disambiguate the two.
2. **Then Task 10** (`docs/tasks/10-deploy.md`), from `main`. Its own
   Blocked-by is 01 only, so it is technically unblocked already — Jared's
   carry-forward note is what makes the three-chore cycle above a hard gate
   in front of it, not the task file's own dependency list.
   - Needs a person for the Netlify/GitHub account linkage, a Phase-0-style
     step: `netlify login` + `netlify init` (or the Netlify console import),
     build command `bun run build`, publish directory `dist`, and confirm on
     the first build log that Netlify installs bun when it finds the
     lockfile.
   - `.env.example` has no variables, so there is nothing to set in
     Netlify's environment settings.
3. The standing Playwright trap — `playwright.config.ts`'s
   `reuseExistingServer: !process.env.CI` — still hasn't bitten, only because
   every agent so far has checked port 4321 before trusting a local e2e run.
   CI is unaffected. Worth closing opportunistically.
4. **Cosmetic, routed to Task 11's v2 handoff doc as a v2 candidate, per
   Jared — nobody touches it before then:** at 1280px the content column is
   capped and left-aligned, leaving roughly 40% of the width empty on the
   right, and `/schema`'s table runs wider than its prose. Reads fine; a
   design-pass question, not a defect.
5. `PARALLEL_ROUTE_SPREAD = 18` and `PARALLEL_LABEL_GAP = 4` in
   `src/lib/parallelEdges.ts` are chosen rather than designed — legible at
   twelve duplicates, but worth a look in a design pass, not urgent.
6. Minor comment drift, not acted on this cycle, left by Amon: `loadDesign.ts`'s
   module header (one line above the comment this cycle scoped) still speaks
   of "whatever evidence Task 04 has to work with"; `readPlacedNodes`'s throw
   comment in `layout.ts` will read as the only guard now that
   `placeWithDagre` gates ahead of it; `describeLoadError.ts` now imports
   `layout.ts` (no bundle cost today, since only `index.astro` imports it as
   a value and already imports `layout`).
7. Still open for a person: Microsoft Word is unverified against the
   `.docx` export — no machine that has touched this project has Word
   installed.
8. Optional, not blocking: dagre's ordering-pass bug (merges two parallel
   dummy chains when one is a reversed edge) is upstream in `@dagrejs/dagre`
   3.1.1 and reportable; the app no longer needs it fixed.
9. When the next phase ends, write the next handoff doc here, in this shape,
   and append its own detail to a new `docs/handoff-items/handoff-chore-*.md`
   (for the three-chore cycle) or `docs/handoff-items/handoff-task-10-*.md`.

## Suggested skills for the next session

For the three-chore cycle (no task file; pure dedup/rename):

- `front-refactor`: dedup D51's sentence and the export column
  headings/shares across `pdfPlan.ts`, `docxPlan.ts`, `toHtml.ts`,
  `toMarkdown.ts` without changing behavior.
- `coding-standards`: naming and structure before the first file, especially
  for the `empty.json` rename.
- `tdd-workflow`: the existing tests pin behavior; run them red-then-green
  around each rename to prove nothing moved.

For Task 10 (`docs/tasks/10-deploy.md`), once the three-chore cycle is done —
no skills are named in the task file itself; it is an infrastructure task
that needs a person for the Netlify/GitHub account linkage.
