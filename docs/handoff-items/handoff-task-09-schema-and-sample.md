# Handoff — Task 09: Schema and sample file

**Date:** 2026-09-18
**Branch:** feature/schema-and-sample
**Task file:** docs/tasks/09-schema-and-sample.md
**Round:** 1

## Assignment from Jared

### Scope

Publish the format. Everything the app has been enforcing privately since
Tasks 02 and 04 becomes something a user can read, copy, and try:

1. **`sample.json`** — one shipped sample design that uses every node kind
   `src/lib/shapes.ts` draws (service, database, queue, external, user,
   decision) and carries labelled edges. It must pass validation, draw with
   every node and edge visible, and be the *only* copy of itself in the repo
   (see "Watch out for", item 3).
2. **A published JSON Schema**, generated from `src/lib/design.schema.ts`
   rather than written a second time by hand, with a test that fails the
   moment the two drift.
3. **A `/schema` page** listing every field with its type, whether it is
   required, and what it means; the sample in a code block with a labelled
   copy button and a download link.
4. **A "Load sample" link on the upload page** that loads the sample into the
   preview, through the same `loadDesign` path every other file takes.
5. **The page styling parked since Task 03.** This task adds the second page,
   which is why the decision was parked here — take it once, for both. See
   item 6 below.
6. `README.md` and `CLAUDE.md` updated where they now describe something
   else (both currently say the schema page is still to come).

**Explicitly out of scope — do not bundle these in:**

- The four small fixes scheduled for the cycle immediately after this one:
  the loader wording (`describeLoadError.ts:191`/`:193`, `loadDesign.ts`'s
  doc comment, `loadDesign.test.ts:146`), the dagre `intersectRect` crash,
  D51's empty-design sentence in four files, and the four exports' column
  headings in four copies. Leave all of them exactly as they are.
- Task 10's Netlify deploy.
- The exported HTML's print-scaling gap (the printing cousin of the
  label-size fix), logged and accepted.
- D41's parked question about announcing a finished download, and the status
  region saying one thing at a time. "Load sample" writes an ordinary
  success line and nothing more; it does not reopen that question.
- `e2e/fixtures/empty.json`'s misnaming. It is its own chore. If your sample
  work happens to land inside `validation.spec.ts` anyway, say so in your
  handback and leave the call to Jahmyr rather than taking it silently.

### Acceptance criteria

- [ ] As a user, I can read the JSON schema and a sample file: demonstrated end to end.
- [ ] The sample uploads without errors and renders a drawing with every node and edge visible (14.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the schema page reads in order with headings, and the copy button is labeled.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

### Files expected to change

A guide, not a cage.

- `src/pages/schema.astro` — new, the published page.
- `src/pages/index.astro` — the "Load sample" link and its wiring.
- A new module under `src/lib/` for the schema generation and the field
  list the page renders, plus its `.test.ts`. Name it for what it does.
- The sample itself, in one place — `public/sample.json` is the obvious home
  since the page has to offer it for download, but see item 3.
- The generated JSON Schema artifact, wherever you decide it lives, plus the
  drift test that regenerates and compares it.
- `src/styles/` — the page-level styling decision. Likely a shared layout or
  token stylesheet plus a module for the schema page; `upload.module.css`
  and `exports.module.css` may both shed the "deliberately plain, Task 09
  decides" comments they carry today.
- `src/layouts/` — does not exist yet. Two pages is where one `<head>`
  written twice starts to cost.
- `e2e/` — a spec covering the walk in step 4 of the task file, plus
  whatever `e2e/pages/uploadPage.ts` needs for the sample link. Note that
  `choose()` resolves names against `e2e/fixtures` today.
- `README.md`, `CLAUDE.md`, `docs/DECISIONS.md` (append only — never edit a
  row; amend by reference, the way D89 amends D84).

### Skills to load

From the task file:

- `front-review` — the schema page and the copy control, before the PR.
- `frontend-design-direction` — the schema page is documentation; make it
  read like the product, not a dump. Also the page-styling decision in
  item 6.
- `front-a11y` — headings, reading order, and the copy button.
- `front-comments` — the schema module, which the page and the validator
  both depend on.

From `CLAUDE.md`, also relevant here:

- `coding-standards` — before the first file.
- `tdd-workflow` — every task writes its test before its function.
- `error-handling` — the copy button's failure path (item 7).
- `make-interfaces-feel-better` — spacing, labels and controls, once both
  screens work.
- `e2e-testing` — the Playwright walk.

### Watch out for

**1. The generation method is a confirmation gate — open it with the user
before you write the generator.** The task file says so in step 1, and this
project has a standing pattern for it: D24 (dagre), D62 (jsPDF/svg2pdf) and
D73 (docx) were all confirmed with the user before anything was added. What I
found, so the question is cheap to ask rather than open-ended:

- Zod is `4.6.5` and already ships the generator. `z.toJSONSchema()` is
  exported from `zod/v4/classic/external.d.ts`. **No new dependency is
  needed**, which is the best possible answer against D7 and D8.
- I ran it against this repo's own schema shape. It produces clean draft
  2020-12 output, with `minLength: 1` and `pattern: "\\S"` on every string —
  so D39's blank-string rule *does* survive into the published schema.

Two things do not survive, and both change what the page has to say:

- **Both `superRefine` rules vanish.** The generated output says nothing
  about unique node ids or edges naming defined nodes — I checked the
  serialised output for any trace and there is none. So the generated
  artifact under-publishes the contract. The page must carry those two rules
  in prose beside the generated schema, along with D20's two-pass reality:
  Zod reaches the cross-field rules only once every field has passed, so a
  file with both kinds of fault reports its fields first and its cross-field
  faults on the next pass. D42 already made that a promise the app keeps to
  users; publishing the schema without it would make the page quietly less
  honest than the error panel.
- **`additionalProperties: false` is emitted by default, and that
  contradicts D19.** Zod's default is `io: "output"`, which reports the
  stripped object; `io: "input"` omits `additionalProperties` entirely. D19
  says a property the schema does not name is **ignored, not rejected** — and
  that is what actually happens: parsing `{title, nodes, edges, extra}`
  returns the three keys and loads fine. So the default output would publish
  a promise the app does not keep, and any external validator pointed at it
  would refuse files this app accepts. Whichever way you go, it is a decision
  to record in `docs/DECISIONS.md` with its reason, because the published
  schema is a promise about what the app takes.

**2. The drift test is the point of step 2, not a formality.** The precedent
is `exportStyles.test.ts` (D57), which reads `drawing.module.css` off disk to
keep two copies of a palette identical. Do the same shape here: regenerate
from the live Zod schema and compare against the artifact on disk. Heed D61
while you are next to that pattern — under this project's Vitest
(`css: false`) a `?raw` import comes back as a CSS-Modules proxy stub rather
than text, and a test that asserts against it passes while measuring nothing.
Reading the file with `node:fs` is the proven route.

**3. One sample, exactly one copy.** The sample has to be three things at
once: downloadable from the site, loadable by the "Load sample" link, and the
fixture the Playwright walk uses. Static assets live in `public/` and
fixtures live in `e2e/fixtures/`, so the lazy answer is two files with the
same bytes — and two files with the same bytes is precisely the class of
problem the *next* cycle exists to clean up (D51's sentence in four files,
the column headings in four). Do not open a new one. Pick one home and have
the other reference it.

**4. The sample must draw every kind, and it is also an example people
copy.** `shapes.ts` resolves aliases, so `worker` draws as a service and `db`
as a database; the six canonical kinds are service, database, queue,
external, user, decision. `e2e/fixtures/order-intake.json` is *not* the
sample — it deliberately carries `worker` and `widget-factory` and has no
`decision`. One judgement call worth making deliberately and writing down:
whether the sample also demonstrates the grey dashed fallback for an
unrecognised type. It is a thing Task 03 draws, which argues for it; it is
also an example a user will copy, which argues against teaching them to write
a type the app does not recognise. Either answer is defensible. Pick one and
say why.

**5. "Load sample" is the first design the page reads from anywhere but a
`File`.** Two routes — fetch the shipped asset at runtime, or import it at
build time. Constraints either way:

- It must go through `loadDesign` and the same schema as everything else. A
  sample that skipped validation could ship broken and the page would draw it
  anyway; a sample that fails validation is a bug the page should surface
  loudly, not route around.
- D40's file-kind check takes a name and a media type and exists because a
  *dropped* file bypasses the input's `accept`. A same-origin asset the site
  itself ships is not that case. Do not route the sample through
  `looksLikeJsonFile` for symmetry's sake, and do not remove it either.
- D41 governs what the page says: two polite regions that take turns, a
  success line and an empty panel, or the reverse. A loaded sample is an
  ordinary success. Call it `sample.json` in the status line.
- D53 and D33 are the traps: `drawn` must be set and the four export buttons
  enabled exactly as the upload path does it, and a previous file's name,
  drawing or panel must not survive the sample being loaded. A stale drawing
  under a fresh status line is the quiet wrongness intake 5.2 rules out.
- `index.astro` promises "The file is read in your browser and is never sent
  anywhere." Fetching the site's own asset does not break that, but if the
  sentence starts to strain, fix the sentence rather than leaving it to be
  read charitably.

**6. The page styling parked since Task 03 comes due here, and it is a real
decision, not a coat of paint.** Today there is no global stylesheet, no
`:root`, no shared layout, and no page-level type — default serif body copy
sitting beside a sans-serif drawing. Both `upload.module.css` and
`exports.module.css` say in their own comments that they are deliberately
plain *because Task 09 makes this decision once, for both pages*;
`exports.module.css` goes further and declares no colour at all so that
nothing here would have to be undone. Constraints:

- D1 names CSS Modules. That is settled; do not reopen it.
- D27's `drawing.module.test.ts` measures every colour band against WCAG AA,
  and `upload.module.test.ts` measures the error panel against both its own
  surface and the bare page. A new page background changes what "the bare
  page" means. If those tests need to move with it, move them — what is not
  acceptable is a contrast test that still passes while measuring a colour
  the page no longer has.
- Two pages means one `<head>` written twice unless a layout is introduced.
- Load `frontend-design-direction` before choosing a direction, not after.

**7. The copy button has a failure path.** The Clipboard API can be absent or
refused. A button that silently does nothing is worse than no button —
`error-handling` is in `CLAUDE.md` for exactly this. Note also that "Copied"
is an announcement, and D41's two live regions belong to the upload page; the
schema page needs its own answer rather than borrowing theirs.

**8. The standing Playwright trap, in every assignment from here.**
`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a
local `bun run test:e2e` can silently test a stale `dist/` if anything is
holding port 4321. It cost Amon ten minutes last cycle and nearly caught
Jahmyr — a leftover `e2e/staticServer.ts` was holding the port (PID 8076). CI
is unaffected. Before trusting a local e2e run, confirm nothing is already
listening on 4321, or build first. Leave the config alone unless you are
closing it deliberately and saying so.

**9. Criterion 6 should not be left ambiguous.** There are no environment
variables in this project and this task should add none. If it adds none, say
so explicitly in your handback so Jahmyr can check the box on a fact rather
than an absence.

**10. Commands.** `bun run test` runs Vitest. Plain `bun test` runs Bun's own
runner and is wrong. Write `bun run test` every time, and correct it if you
find it wrong anywhere.

### Process for this cycle

- **Amon:** build on `feature/schema-and-sample`, commit there, and hand back.
  **Do not push and do not open the pull request** — the push and the PR are
  Jahmyr's, by name. Do not check any acceptance-criteria box yourself; only
  Jahmyr's verification earns a check.
- **Sam's documentation refresh** at the end of the cycle routes through its
  own `chore/…` branch and its own pull request, not this one.
- Nobody edits agent configuration this cycle. That proposal is still with
  the user.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test`
passes, and CI is green on the pull request.
---

## Work completed by Amon — round 1

### What was built

**The format is published.** `/schema` is a new page that lists every field of a
design with its type, whether it is required, what the published file allows in
it and what it is for; carries the two rules the schema file has no way to state
in prose beside it, with D20's two-pass reality; shows `public/sample.json` in a
code block with a labelled copy button and a download link; and links the
generated schema file itself.

**The schema is generated, not written twice.** `src/lib/publishedSchema.ts`
runs `z.toJSONSchema(designSchema, { io: 'input' })` — Zod's own generator,
already in the project, so no new dependency. `bun run schema` writes
`public/design.schema.json`, and a drift test regenerates and compares. The
`/schema` field table is derived from the generated document as well, so the
page cannot describe a field the schema does not have or miss one it does; only
the prose is hand-written, and `designFields()` throws if a field has no meaning
or a meaning names no field.

**One sample, exactly one copy.** `public/sample.json` is the site's static
asset, the text the schema page prints, the file the new button fetches, and the
fixture the Playwright walk chooses off disk. `e2e/pages/schemaPage.ts` exports
`shippedSamplePath()` and everything comes there for it; there is no second copy
under `e2e/fixtures/`.

**"Load the sample design"** on the upload page fetches `/sample.json` and hands
it to `loadDesign` like any other design: same validation, same status line
(`sample.json is drawn below: 7 nodes, 8 edges.`), same `holdDrawing` so all four
export buttons follow it, same emptying of the panel.

**The page styling parked since Task 03.** Both pages now share
`src/layouts/PageLayout.astro` (one `<head>`, a masthead with `aria-current`, a
skip link, a footer) and `src/styles/page.module.css` (surface, ink, quiet ink,
accent, plate, hairline, a type scale, two font stacks, one focus ring). Both
`upload.module.css` and `exports.module.css` have shed their "Task 09 decides"
comments and now borrow the page's tokens.

### Files added or changed

Added:

- `src/lib/publishedSchema.ts` — generates the JSON Schema and derives the field
  list, the two rules the file cannot state, and the two notes the page prints.
- `src/lib/publishedSchema.test.ts` — what the generator emits, what the page
  renders, and the drift test against `public/design.schema.json`.
- `src/lib/sampleDesign.ts` — the sample's name and URL, said once.
- `src/lib/sampleDesign.test.ts` — the sample loads, draws every kind, teaches
  no unrecognised type, labels every edge.
- `scripts/publishSchema.ts` — writes the artifact; `bun run schema`.
- `public/sample.json` — the shipped sample: 7 nodes, 8 edges, all six kinds.
- `public/design.schema.json` — the generated draft 2020-12 document.
- `src/layouts/PageLayout.astro` — the `<head>`, masthead and frame both pages
  share.
- `src/pages/schema.astro` — the published page and its copy control.
- `src/styles/page.module.css` — the page-level decision: tokens, type, frame.
- `src/styles/page.module.test.ts` — every ink measured against both surfaces.
- `src/styles/schema.module.css` — the field ledger and the sample's file block.
- `src/styles/stylesheetColours.ts` — `declaredColour`, shared by two tests.
- `e2e/pages/schemaPage.ts` — the schema page, plus `shippedSamplePath`.
- `e2e/schema.spec.ts` — the walk, in four parts.

Changed:

- `src/pages/index.astro` — adopts the layout; the "Load the sample design"
  button, its note and its wiring; `h1` is now "Draw a design from JSON"
  (the wordmark moved to the masthead); "The file" became "Your file", to keep
  the never-sent-anywhere sentence exactly true beside a button that fetches the
  site's own asset.
- `src/styles/upload.module.css` — the sample row; borrows the page's tokens.
- `src/styles/upload.module.test.ts` — the bare-page contrast measurement now
  reads `--page-surface` out of `page.module.css` instead of `#ffffff`.
- `src/styles/exports.module.css` — comment updated; `--page-quiet` for the row
  label; radius matched to the new sample control.
- `e2e/pages/uploadPage.ts` — `loadSample`, `loadTheSample()`,
  `chooseShippedSample()`.
- `e2e/staticServer.ts` — answers a directory with its own `index.html`, which
  is what made `/schema` reachable in the walk.
- `package.json` — the `schema` script.
- `README.md`, `CLAUDE.md`, `docs/DECISIONS.md`.

### Tests written

Unit (`bun run test`, 14 new):

- `publishedSchema.test.ts` — the document is draft 2020-12 and describes an
  object; `required` is `['title', 'nodes', 'edges']`; every string field
  publishes the blank-string rule; **nothing anywhere in the document mentions
  `additionalProperties`** (D19, and the whole reason for `io: 'input'`);
  **nothing mentions the two cross-field rules** — the honest gap pinned as a
  fact rather than an observation; the field list is the nine paths in reading
  order, with the types the schema gave and every one required; every field has
  a meaning; both prose rules are present and `TWO_PASS_NOTE` says what it has
  to; and `public/design.schema.json` on disk equals a fresh generation.
- `sampleDesign.test.ts` — the sample loads through `loadDesign`; it draws at
  least one node of every kind in `KNOWN_SHAPES`; no node falls to the default
  shape; every edge is labelled; the URL and the file name agree.
- `page.module.test.ts` — the stylesheet names all five colours; ink, quiet and
  accent each clear WCAG AA against the page *and* against the plate; links are
  underlined and not only recoloured; reduced motion is honoured.

End to end (`bun run test:e2e`, 13 new in `e2e/schema.spec.ts`):

- The page reads in order: one `h1`, then `h2`s, at least four headings.
- Every field is listed with its type and "Required", in the same nine-path
  order the unit test pins.
- Both rules the file cannot state are on the page, and so is the two-pass
  sentence.
- The sample shown is byte-for-byte `public/sample.json`.
- The schema file is linked at `/design.schema.json`.
- The download link saves `sample.json`, and its bytes are the sample's.
- The copy button is named by its own words, copies the sample, and says so.
- **When the clipboard is refused it says so and names the download** — the
  failure path, driven by an `addInitScript` that replaces
  `navigator.clipboard.writeText` with a rejection.
- The whole walk: read the page, copy the sample, upload the copy as a file,
  find every node and edge in the drawing.
- Uploading the shipped sample draws every node and edge, with no problems.
- The button draws it too and names `sample.json` in the status line.
- The button enables all four export buttons (D53).
- Loading the sample after a failed file leaves nothing of the failure behind
  (D41, intake 5.2).

### Local results

`bun run test`: **pass** — 25 files, 416 tests (402 before this work).
`bun run test:e2e`: **pass** — 123 tests (110 before this work). Port 4321 was
confirmed free before each run; a leftover server from a screenshot script did
hold it once mid-task and was killed (PID 33224) before the suite was trusted.
`bun run check`: **pass** — 0 errors, 0 warnings, 0 hints across 78 files.
`bun run build`: **pass** — 2 pages.

### Decisions recorded

Eight rows appended to `docs/DECISIONS.md`, D90 to D97:

- **D90** — generated by Zod's own `z.toJSONSchema`, no new dependency; artifact
  at `public/design.schema.json`, written by `bun run schema`, held by a drift
  test that compares parsed JSON.
- **D91** — `io: 'input'`, so `additionalProperties` is omitted and the
  published file agrees with D19. Both alternatives the user rejected are
  recorded with them.
- **D92** — neither `superRefine` rule survives generation, so both are carried
  in prose on the page with D20's two-pass reality, and the artifact is never
  hand-edited.
- **D93** — one sample, one copy, and no unrecognised `type` in it.
- **D94** — the page-level styling decision, including the tokens living on the
  body's module class rather than `:root` so D1 is not reopened, and the
  contrast test moving with the colour it measures.
- **D95** — "Load the sample design" is a button, fetched at run time, through
  `loadDesign`, not through `looksLikeJsonFile`.
- **D96** — the page inlines the sample with `?raw`, because `import.meta.url`
  resolves against the built chunk.
- **D97** — the walk's static server answers a directory with its own
  `index.html`.

### Known gaps

- **No new environment variable, and none was needed.** `.env.example` is
  unchanged and still holds no variables. Criterion 6 can be checked on that
  fact rather than on an absence.
- **The field table's "Required" column says "Required" nine times.** Every
  field is required (D19), so the column is a constant today. It is there
  because the criterion asks for it and because the day a field becomes
  optional the column is already saying the right thing — but it is visual
  noise, and worth revisiting if the format ever grows.
- **The copy status never clears.** Deliberate: a live region emptied on a timer
  can be announced twice, and there is nothing on that page to contradict a
  stale "Copied". It is a judgement, not an oversight.
- **The clipboard walk is Chromium-only**, because `playwright.config.ts` runs
  one project. The failure path is driven by replacing `navigator.clipboard`, so
  it is not browser-specific; the success path leans on Chromium's
  `clipboard-read` permission. Line endings are normalised in
  `SchemaPage.clipboardText` because Windows' clipboard hands back `\r\n` for
  the `\n` the page wrote — that is the operating system, not the app.
- **`front-refactor` was not needed.** No module in this task passed a screen;
  `publishedSchema.ts` is the largest new one at roughly 290 lines including its
  comments.

### Out-of-scope notes for Jared

- **`e2e/fixtures/empty.json`'s misnaming was not touched, and my work did not
  land in `validation.spec.ts` at all.** The sample walk went into a new
  `e2e/schema.spec.ts`, so the call stays entirely yours and Jahmyr's. Reporting
  it here as asked rather than taking it.
- **`e2e/staticServer.ts` changed, which I flagged as a decision (D97) rather
  than a quiet fix.** `/schema` was a 404 in the walk before it, so the walk
  could not have reached the page. It is a directory index, not the SPA fallback
  the file still refuses; worth your eye anyway since the file's comment makes a
  point of that refusal.
- **`scripts/` is a new top-level directory** holding one generator. It is
  type-checked by `astro check` and formatted by lint-staged like everything
  else. If the project would rather generators lived elsewhere, this is the
  moment to say so — there is exactly one.
- **The masthead is the first navigation this site has had**, and it changed the
  upload page's `h1` from "MapDataStructures" to "Draw a design from JSON", with
  the wordmark moving up into the header. No test asserted the old `h1` (the one
  `h1` assertion in `e2e/export.spec.ts:396` is about the *exported* HTML page,
  which is untouched), but it is a visible change to a page nobody asked me to
  re-word.
- **The exported HTML's print-scaling gap and D41's parked download
  announcement** were both left exactly as they are, as instructed. So were the
  loader wording, the dagre `intersectRect` crash, D51's sentence in four files
  and the export column headings in four.
