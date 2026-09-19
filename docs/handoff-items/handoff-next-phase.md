# Handoff — after the LibreOffice-check chore

**Date:** 2026-09-19
**Phase finished:** Chore: a repeatable LibreOffice check for the `.docx`
export (unnumbered; no `docs/tasks/` file — see "Why this has no task file"
in the handoff doc — merged as PR #27)
**Next phase:** Task 10: Deploy to Netlify

## Where things stand

`main` is at `60c4de2`, PR #27 squashed in (round 2 — round 1 came back with
one defect, which round 2 closed). CI green on both jobs, re-confirmed
independently by Sam at the release gate rather than taken on report:
`bun run test` 491 passed across 32 files, `gh pr checks` both `pass`,
`gitleaks detect --source . --no-banner` — the real gate, not the grep
fallback — no leaks found across 40 commits, re-run after Sam's own
documentation-sync commit and green again before the merge.

**What shipped:** one opt-in command, `bun run docx:libreoffice`. It exports
five fixtures (`order-intake`, `control-labels`, `empty-design`,
`markup-labels`, `estate-sweep`) through the app's own Export Word button in a
real browser, converts each with the LibreOffice installed on the machine, and
reads the result back to confirm the title and every node and edge label
survived. It lives in its own Playwright config
(`playwright.libreoffice.config.ts`), so `bun run test`, the default
`bun run test:e2e`, and CI are untouched by construction — not by a skip that
has to fire correctly. It finds the binary itself (`MAPDS_SOFFICE` override,
then per-platform known paths — on Windows, `soffice.com`, never
`soffice.exe`) and exits 0 with one clear line when LibreOffice is absent.
`scripts/libreoffice/` holds `check.ts` (entry), the pure modules
`soffice.ts`, `verdict.ts`, `survivingText.ts` and `failureMessage.ts`, the
impure `convert.ts`, and `docxRoundTrip.spec.ts`, each pure module tested
beside it. D104–D111 in `docs/DECISIONS.md`.

**It does not verify the export against Microsoft Word.** LibreOffice is an
independent OOXML implementation, not Word's renderer — both the module
comment and `README.md` say so. Opening `order-intake.docx` in real Word once
remains open and belongs to the user; no machine that has touched this project
has Word installed.

**Two corrections the round-2 verification made to the written record, not to
any shipped code:**

1. **Amon's round-1 note that the `docx` library refuses to serialise a raw
   control character does not hold.** Jahmyr measured it directly: an
   identical construction, one clean and one carrying a raw U+0001, both
   serialise through `Packer` — the dirty one at 8,494 bytes, no refusal — and
   only LibreOffice then refuses the dirty one, with
   `Error: source file could not be loaded`. So D76 (the control-character
   marking) has no second independent guard underneath it, a `safeDocxText`
   regression does reach LibreOffice and is caught, and `control-labels`
   earns its fixture slot in full. The withdrawal is recorded inline in
   `docs/handoff-items/handoff-chore-libreoffice-docx-check.md`'s round-2
   section, directly under the original claim, so a later reader hits the
   correction first.
2. **`gitleaks` is installed on this machine** (WinGet package path). Both
   agents' rounds 1 and 2 reported it absent and used `docs/RUNBOOK.md`
   section 0.2's grep fallback; Jahmyr found and ran the real gate in round 2
   (no leaks, 38 commits at the time), and Sam re-ran it twice more at the
   release gate (40 commits, clean both times). `docs/RUNBOOK.md` itself was
   never wrong — it already documents gitleaks as the primary gate and the
   grep as the weaker fallback — the correction is only to the "no gitleaks
   here" claim written into the handoff doc, and it is now recorded there.

**A follow-on named but deliberately not built this cycle:** `exitPhrase`
still reads "was killed before it finished" for a binary that could not
start at all — corrected three lines below by
`Executable not found in $PATH`, which Jahmyr judged sufficient for a reader.
Making it precise costs a fourth fact (`startFailed`) on
`ConversionAttempt`'s contract and a rewrite of a verdict test that pins real
behaviour. Whoever next opens `verdict.ts` for a reason of its own can fold
it in; it is not a bug.

**CLAUDE.md was out of sync with README.md** at the release gate — the run
block and status snapshot had not picked up `bun run docx:libreoffice`, which
README's had carried since round 1. Sam fixed this on the branch before
merging (one commit, `a7c8058`, CI re-confirmed green before the squash).

Full detail, both agents' two rounds each, and Sam's verification:
`docs/handoff-items/handoff-chore-libreoffice-docx-check.md`.

**Not live anywhere yet** — Task 10 is what deploys to Netlify.

## What to do next, in order

1. **Task 10** (`docs/tasks/10-deploy.md`) is still the frontier, and it still
   needs a person before an agent can do anything else on it — unchanged from
   the last handoff. Its own "Blocked by" list names only Task 01, but nothing
   in this repository can create a hosting account or authenticate one, and
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
     (`MAPDS_SOFFICE`, added this cycle, is a local developer-only variable —
     see `README.md`'s Configuration section and D110 — and has no bearing on
     the deployed site.)
   - Once live, deploy once from the default branch and walk "Upload JSON get
     a drawing back" on the live URL — that walk is Task 10's own acceptance
     criterion, not optional verification.
   - Write the deploy procedure into `README.md`: a merge to `main` triggers a
     Netlify build, and the console shows the log. This is Task 10's step 4
     and its own acceptance criterion; do it as part of the task, not after.
   - No domain was given in the intake (`docs/tasks/10-deploy.md`'s own note).
     When one exists, attach it in Netlify's domain settings, create the DNS
     record it shows, then add the domain to `docs/intake.md` and regenerate.
2. **The CI follow-on for the LibreOffice check, its own cycle, named and not
   started:** one job with `libreoffice-writer` installed and
   `bun run docx:libreoffice` as its step — but the check exits 0 when the
   binary is absent, so a misconfigured runner would be silently green. A CI
   version wants `MAPDS_SOFFICE` set explicitly so a missing install fails
   loudly instead. Not this cycle's work; worth its own decision.
3. The standing Playwright trap — `playwright.config.ts`'s
   `reuseExistingServer: !process.env.CI` — still hasn't bitten, only because
   every agent so far has checked port 4321 before trusting a local e2e run.
   CI is unaffected. Worth closing opportunistically.
4. **Cosmetic, routed to Task 11's v2 handoff doc as a v2 candidate, per
   Jared — nobody touches it before then:** at 1280px the content column is
   capped and left-aligned, leaving roughly 40% of the width empty on the
   right, and `/schema`'s table runs wider than its prose. Reads fine; a
   design-pass question, not a defect.
5. Still open for a person: Microsoft Word is unverified against the `.docx`
   export — no machine that has touched this project has Word installed. This
   cycle built a repeatable LibreOffice check, which is real signal, but it is
   explicitly not a substitute for opening a file in Word.
6. Minor, carried forward unacted on: `PARALLEL_ROUTE_SPREAD = 18` and
   `PARALLEL_LABEL_GAP = 4` in `src/lib/parallelEdges.ts` are chosen rather
   than designed; `loadDesign.ts` has two Task-04 references outside any
   cycle's scoped header; `describeLoadError.ts` still imports `layout.ts` for
   `DesignLayoutError` with no bundle cost today. `e2e/exportWord.spec.ts` is
   731 lines against the 800-line ceiling — unchanged, still true, the next
   thing added to the Word export needs a new home. The rooms a red
   `docx:libreoffice` run keeps (`mapds-libreoffice-*` under the system
   temporary directory, ~3 MB per failed `estate-sweep` attempt) are never
   cleaned up later; documented intent, costs nothing but disk.
7. When Task 10 ends, write the next handoff doc here, in this shape, and
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
