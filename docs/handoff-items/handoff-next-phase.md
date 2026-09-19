# Handoff — after the export-furniture dedup cycle

**Date:** 2026-09-18
**Phase finished:** Chore: one copy of the export furniture, and one meaning
per fixture name (unnumbered; no `docs/tasks/` file — see "Why this has no
task file" in the handoff doc — merged as PR #25)
**Next phase:** Task 10: Deploy to Netlify

## Where things stand

`main` is at `4718d91`, PR #25 squashed in (round 1, no defects found). CI
green on both jobs, re-confirmed independently by Sam at the release gate
rather than taken on report: `bun run test` 449 passed across 27 files,
`gh pr checks` both `pass`, `gitleaks detect --source . --no-banner` no leaks
found, re-run after Sam's own verification commit and green again before the
merge.

**The whole warrant of this cycle was that nothing changed, and that was
independently established three separate ways** — Amon's byte-identical
capture across 11 fixtures, Jahmyr's own independent harness over the same 11
plus an adversarial set and a 400-node design, all byte-identical against
`main` under their own MD5s. Nothing here moves any exported `.md`, `.html`,
`.pdf` or `.docx`.

**What shipped, structurally:**

1. **D51's empty-design sentence**, `'This design has no nodes, so there is
   nothing to draw.'`, was written four times — once per export — held
   together by one Vitest assertion covering two of the four copies. It is now
   declared once in the new `src/lib/exportFurniture.ts`; `pdfPlan.ts`
   re-exports `NOTHING_TO_DRAW` under that name rather than declaring a second
   one, so `pdfPlan.test.ts` is untouched, and `toHtml.ts`/`toMarkdown.ts`/
   `docxPlan.ts` import it.
2. **The four exports' column headings and shares**, duplicated across two
   `as const` tuples and two identical `Column` interfaces (checked by
   nothing), are now one `NODE_COLUMNS`/`EDGE_COLUMNS` declaration in the same
   module, heading and share together. `toHtml.ts` and `toMarkdown.ts` derive
   their headings through a tuple-preserving `headingsOf` rather than
   re-typing the words, verified not to have widened the type both by Amon's
   probe and independently by Jahmyr's.
3. **`e2e/fixtures/empty.json`**, a 0-byte file, was also the name
   `describeUpload.test.ts` used to mean a *valid design with 0 nodes and 0
   edges* — the opposite case. It is now `empty-file.json` (`git mv`, recorded
   as `R100`, history intact), and the unit test uses `empty-design.json`,
   which already meant that.
4. **Two comment corrections**: `loadDesign.ts`'s module header no longer
   dates Task 04 as pending, and `layout.ts`'s `readPlacedNodes` throw comment
   now accounts for `placeWithDagre`'s `isWhollyPlaced` gate (D98), which runs
   stricter and ahead of it.

**A wording question was raised and settled at the release gate**: the
criterion read "the *private* `Column` interface exists in one file, not
two," but the merged interface has to be `export`ed since both planners import
the type. The reading that stands is "one declaration, not two" — the
criterion described where the duplicate lived, not a constraint on the merged
result — and Jahmyr's check is correct under that reading. Recorded in Sam's
section of the handoff doc so a later reader does not mistake it for a fudged
box.

Full detail, both agents' reports and Sam's verification:
`docs/handoff-items/handoff-chore-dedup-export-furniture.md`. Decisions:
D102–D103 in `docs/DECISIONS.md` — D102 also corrects D66's reasoning in
place: its claim that "a third literal copy cannot drift" rested on a test
comparing three copies and never `docxPlan`'s fourth, so the guarantee was
thinner than it read; it is now structural rather than asserted.

**Not live anywhere yet** — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Task 10** (`docs/tasks/10-deploy.md`) is the frontier, and it needs a
   person before an agent can do anything else on it — this is the important
   forward note. Its own "Blocked by" list names only Task 01, but nothing in
   this repository can create a hosting account or authenticate one, and
   `.claude/settings.json` denies agents from creating the GitHub remote or
   editing the repo, so Phase 0-style account setup is a human step by
   construction:
   - **Create the Netlify site.** Either `netlify login` then `netlify init`
     in the repository, choosing to link a new site to the GitHub repository
     `IBatsios/map-data-structures`; or, without the CLI, the Netlify
     console's "add a new site" → import from GitHub → pick that repository.
   - **Build command:** `bun run build`. **Publish directory:** `dist` (Astro's
     static output folder).
   - **Confirm on the first build log** that Netlify installs bun because it
     finds the committed `bun.lock` — this is the one thing to watch on the
     first deploy, not assume.
   - `.env.example` still declares no variables, so there is nothing to set in
     the site's environment settings; production secrets: none needed.
   - Once live, deploy once from the default branch and walk "Upload JSON get
     a drawing back" on the live URL — that walk is Task 10's own acceptance
     criterion, not optional verification.
   - Write the deploy procedure into `README.md`: a merge to `main` triggers a
     Netlify build, and the console shows the log. This is Task 10's step 4
     and its own acceptance criterion; do it as part of the task, not after.
   - No domain was given in the intake (`docs/tasks/10-deploy.md`'s own note).
     When one exists, attach it in Netlify's domain settings, create the DNS
     record it shows, then add the domain to `docs/intake.md` and regenerate.
2. The standing Playwright trap — `playwright.config.ts`'s
   `reuseExistingServer: !process.env.CI` — still hasn't bitten, only because
   every agent so far has checked port 4321 before trusting a local e2e run.
   CI is unaffected. Worth closing opportunistically.
3. **Cosmetic, routed to Task 11's v2 handoff doc as a v2 candidate, per
   Jared — nobody touches it before then:** at 1280px the content column is
   capped and left-aligned, leaving roughly 40% of the width empty on the
   right, and `/schema`'s table runs wider than its prose. Reads fine; a
   design-pass question, not a defect.
4. `PARALLEL_ROUTE_SPREAD = 18` and `PARALLEL_LABEL_GAP = 4` in
   `src/lib/parallelEdges.ts` are chosen rather than designed — legible at
   twelve duplicates, but worth a look in a design pass, not urgent.
5. Minor, not acted on this cycle or the last, left deliberately: `loadDesign.ts`
   has two more Task-04 references outside this cycle's scoped header (lines
   24 and 74) — both present-tense statements about code that exists, so
   neither carries the fault the header had; a two-line follow-up if the file
   is ever wanted free of task numbers entirely. `describeLoadError.ts` still
   imports `layout.ts` for `DesignLayoutError` — no bundle cost today, since
   only `index.astro` imports it as a value and already imports `layout`; the
   only available fix is structural (move the type or split it out), which is
   why it has been carried forward rather than acted on twice now.
6. Still open for a person: Microsoft Word is unverified against the `.docx`
   export — no machine that has touched this project has Word installed. The
   dedup cycle's `.docx` output is byte-identical to `main`'s across every
   fixture checked, so nothing since the last time this was noted has changed
   what Word would see.
7. Optional, not blocking: dagre's ordering-pass bug (merges two parallel
   dummy chains when one is a reversed edge) is upstream in `@dagrejs/dagre`
   3.1.1 and reportable; the app no longer needs it fixed.
8. When Task 10 ends, write the next handoff doc here, in this shape, and
   append its own detail to `docs/handoff-items/handoff-task-10-deploy.md`.
   Task 10 is not Task 11, so v1 is not complete when it merges — Task 11 is
   still blocked on it and becomes the frontier after.

## Suggested skills for the next session

Task 10 (`docs/tasks/10-deploy.md`) names no skills in its own task file — it
is an infrastructure task that needs a person for the Netlify/GitHub account
linkage before any agent step is possible. Once the site exists and an agent
picks up the remaining steps (the live walk, the README update), no skill
beyond ordinary verification is called for; `e2e-testing` is the nearest fit
if the live-URL walk is scripted rather than done by hand.
