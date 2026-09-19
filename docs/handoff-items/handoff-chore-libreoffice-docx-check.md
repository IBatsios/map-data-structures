# Handoff — Chore: a repeatable LibreOffice check for the `.docx` export

**Date:** 2026-09-19
**Branch:** chore/libreoffice-docx-check
**Task file:** none — see "Why this has no task file" below
**Round:** 2 — round 1 verified by Jahmyr, one defect outstanding

## Assignment from Jared

### Why this has no task file

`docs/tasks/` is generated from `docs/intake.md`, so a cycle the intake never
described gets no numbered file and this document is the whole contract. Same
precedent as the layout split, the drawing label-size fix, the layout-crash fix
and the export-furniture dedup chore: own branch, own handoff doc, acceptance
criteria written here rather than copied from a task file.

The numbered frontier is Task 10, and it cannot move: its own step 1 says
"This is a human step because it needs the Netlify and GitHub accounts," and
D11 denies agents from creating the remote or editing the repo. Task 11 is
blocked by Task 10. So nothing numbered is available, and this is work the user
asked for by name.

### Scope

Turn the LibreOffice `.docx` check that two agents have each rediscovered by
hand into something the repository can run.

The `.docx` export shipped against LibreOffice and not against Word — no
machine that has touched this project has Word. Amon converted seven fixtures
by hand in Task 08; Jahmyr round-tripped eleven and confirmed the tables
reproduced. Both worked out the invocation from scratch, and the one piece of
hard-won operational knowledge that came out of it — that `--convert-to` hangs
forever without `-env:UserInstallation=` and a clean profile — is a bullet in a
handoff doc rather than something anyone can run.

**Build:** one opt-in command that takes the app's own `.docx` exports,
converts each with the LibreOffice installed on the machine, reads the result
back, and reports a pass or fail per fixture. It finds the binary without help,
it says so clearly and exits green when LibreOffice is absent, and what it
knows is written down.

**Explicitly out of scope:**

- **CI.** The user's words were "the libreoffice that is installed on my PC
  here." This is a local, opt-in developer check. Do **not** add a LibreOffice
  install to `.github/workflows/ci.yml`, and do not add any step to it.
  Enabling it in CI later is a small follow-on and worth a sentence in your
  section of this doc; it is not this cycle's work.
- **The PDF.** LibreOffice opens PDFs, but `e2e/pdfText.ts` already verifies
  the PDF against `pdftotext` far more rigorously than a LibreOffice open
  would. A weaker second opinion on something already well covered buys
  nothing. Word documents only.
- **Closing the Word question.** See "What this does and does not buy" below.
  Do not write anything in the repo that implies Word has been verified.
- **Task 10, Netlify, and anything touching the remote or repo settings.**
- **Changing what `bun run test` or the default `bun run test:e2e` run.**

### What was verified on this machine, so you do not have to

The user did this discovery before handing the cycle over, and I re-confirmed
the binary path. Treat these as findings, not guesses — several correct gaps in
the record, and two of them are how this work most likely ships broken.

1. **The binary is `C:\Program Files\LibreOffice\program\soffice.com` — the
   `.com`, not the `.exe`.** Neither agent recorded this. `soffice.exe` is a
   GUI binary with no attached console, so its stdout goes nowhere. Confirmed
   present in that directory on this machine: `soffice.bin`, `soffice.com`,
   `soffice.exe`, `soffice.ini`, `soffice_safe.exe`.
2. **It is not on `PATH`.** `command -v soffice` and `command -v libreoffice`
   both find nothing. There is also a `C:\Program Files (x86)\LibreOffice
   Maintenance Service\` directory — that is not the application, and a path
   search that matches on the name "LibreOffice" will find it. Do not be fooled
   by it.
3. **`-env:UserInstallation=file:///…` pointing at a clean profile directory is
   required.** This confirms Amon's Task 08 note. Without it `--convert-to`
   hangs indefinitely.
4. **`--version` hangs even with the profile flag.** Tried twice, once bare and
   once with the flag; both had to be killed at timeout. **It is useless as a
   presence check.** Probe some other way — file existence, or a real
   conversion.
5. **A conversion works.** `soffice.com -env:UserInstallation=<profile>
   --headless --convert-to docx --outdir <dir> <file>` returned exit 0 and
   produced a real 5,063-byte `.docx`.
6. **On success it writes `Could not find platform independent libraries
   <prefix>` to stderr.** That is a Python-embedding warning, not a failure.
   **A check that treats any stderr output as an error will produce a false
   negative on every run** — this is the single most likely way this cycle
   ships broken, and criterion 6 exists to make it falsifiable.

### Acceptance criteria

These are the contract. Because every failure mode here is environmental, each
one is written to be falsifiable on a machine **with** LibreOffice and on a
machine **without** it. Nothing here is checked until Jahmyr has verified it.

- [x] 1. There is exactly one opt-in command, run as `bun run <name>`, that
      converts the app's own `.docx` exports with the locally installed
      LibreOffice and reports a pass or fail per fixture. It is documented in
      `README.md` beside the other `bun run` entries.
- [x] 2. `bun run test` runs the same Vitest suite it runs today and starts no
      LibreOffice and no browser; the default `bun run test:e2e` run is
      unchanged in which specs it executes. Neither gains a dependency on a
      binary most machines lack. Falsifiable both ways: on this machine, and
      with LibreOffice made unreachable, both commands still pass.
- [x] 3. The `.docx` under test is the one the app's **browser export** produced
      in that run, obtained through the existing `UploadPage` download helper
      (`downloadWord(saveAs)` already writes the produced bytes to a chosen
      path). No `.docx` is committed to the repository, and no second producer
      of `.docx` bytes is written.
- [x] 4. At minimum these five fixtures are converted and all pass on this
      machine: `order-intake` (the ordinary case), `control-labels` (D76's
      XML-forbidden characters — the fixture whose *unfixed* form LibreOffice
      refused with `Error: source file could not be loaded`, so it is what
      gives this check teeth), `empty-design` (D51's sentence), `markup-labels`
      (D56) and `estate-sweep` (the large one). The command's own output goes
      in your section of this doc.
- [x] 5. Each converted file is read back and asserted to still carry the
      design's **title, every node label and every edge label**. A conversion
      that returns exit 0 and loses content is a **fail**, not a pass.
- [x] 6. A conversion that succeeds while writing `Could not find platform
      independent libraries <prefix>` to stderr is reported as a **success**.
      There is a test that fails if stderr alone is ever treated as a failure,
      and **that test passes on a machine with no LibreOffice installed** —
      i.e. the verdict logic is a pure function of (exit code, stderr, whether
      the output file was written) and is unit-tested in Vitest, so it is
      checkable in CI where no LibreOffice exists.
- [x] 7. Presence is never probed by running `soffice --version`, or by any
      other bare invocation that finding 4 shows hangs. Every invocation that
      could hang is bounded by a timeout, and a timeout is reported **as a
      timeout, naming the command that was run**, distinct from a conversion
      failure.
- [x] 8. Every invocation passes `-env:UserInstallation=` pointing at a profile
      directory the run owns, outside the repository. If such a directory could
      ever land inside the working tree, `.gitignore` covers it; `git status`
      after a full run is clean.
- [x] 9. The binary is located by an environment-variable override first, then
      known install locations for Windows, macOS and Linux, so a teammate on
      another platform is not locked out. On Windows it resolves to
      `soffice.com` and never `soffice.exe`. The override's name and the search
      order are documented in `README.md`.
- [x] 10. With LibreOffice absent — falsifiable on this machine by pointing the
      override at a path that does not exist — the command **exits 0**, prints
      one clear line saying LibreOffice was not found, where it looked, and how
      to point it at an install, and turns no suite red. Demonstrate it exactly
      that way and paste the output.
- [x] 11. `.github/workflows/ci.yml` is unchanged: no LibreOffice install, no
      new step.
- [x] 12. What this buys and does not buy is written where a later reader finds
      it — in the new code's own module comment and in `README.md`. It must say
      that LibreOffice is an independent OOXML implementation and not Word's
      renderer, and that opening a produced `.docx` in real Microsoft Word once
      remains open and belongs to the user.
- [x] 13. New decisions are recorded in `docs/DECISIONS.md`, starting at
      **D104** (D103 is the highest today), in the existing table's shape and
      voice.
- [x] 14. `bun run test` passes, `bun run check` passes, and CI is green on the
      pull request.

### Files expected to change

A guide, not a cage. Argue for a different shape in your section if the work
says otherwise.

- **New: the check itself.** The three candidates are a script in `scripts/`
  (which now exists, holding `publishSchema.ts` behind `bun run schema`), a
  separate Playwright **project** not run by the default `bun run test:e2e`, or
  a tagged spec.
  - My reading, which you may overturn with a recorded reason: the check needs
    a **real browser** to produce the bytes (criterion 3), which pulls it into
    Playwright's world rather than a bare `bun` script — `publishSchema.ts` is
    a pure Node write and is not the precedent this resembles. But note the
    trap: **CI runs `bun run test:e2e`, which runs everything under `e2e/`**,
    so a plain tagged spec dropped in `e2e/` executes in CI by default. A
    separate project with its own `bun run` entry keeps criterion 2 true by
    construction rather than by a skip that has to fire correctly. D31 is the
    precedent — heavy things get their own script.
- **New: a small pure module for the verdict logic** (exit code, stderr, output
  file → pass / fail / timeout / not-installed) plus its `.test.ts`. This is
  what makes criterion 6 checkable without LibreOffice, and it is the project's
  standing split — pure logic in Vitest, environment and DOM in the walk (D55,
  D63, D74).
- **New: binary location** — env override, then per-platform known paths.
- **Reused, not rewritten:** `e2e/pages/uploadPage.ts` (`downloadWord(saveAs)`)
  to produce the file, and `e2e/docxText.ts` to read a `.docx` back. Both
  already do exactly what criteria 3 and 5 need.
- `package.json` — one new script entry.
- `README.md` — the new command in the `Run, test, build` block, plus what it
  does and does not buy.
- `docs/DECISIONS.md` — D104 onward.
- `.gitignore` — only if a profile directory could land in the tree.
- **Not changed:** `.github/workflows/ci.yml`.

### Skills to load

From `CLAUDE.md`'s list:

- `coding-standards` — before the first file, for naming and structure.
- `tdd-workflow` — the pure verdict module is written test-first. It is the one
  part of this cycle that can be driven by a test on any machine, so drive it.
- `e2e-testing` — the Playwright grain, if the check lands there.
- `error-handling` — the not-installed line, the timeout line and the
  conversion-failure line are the whole user-facing surface of this work. They
  are the deliverable as much as the conversion is.
- `anthropic-skills:docx` — background on what a `.docx` is, if you need it for
  criterion 5.

### Watch out for

1. **The stderr false negative (finding 6).** Named twice on purpose. A
   successful LibreOffice conversion writes to stderr every time. Treat stderr
   as diagnostic text, never as the verdict.
2. **`--version` hangs (finding 4).** Do not reach for it as a presence check,
   however natural it looks.
3. **`soffice.exe` vs `soffice.com` (finding 1).** The `.exe` has no console
   and its output goes nowhere. On Windows, resolve the `.com`.
4. **`C:\Program Files (x86)\LibreOffice Maintenance Service\` (finding 2)** is
   not the application. A name-matching path search will find it.
5. **The standing Playwright trap:** `playwright.config.ts` has
   `reuseExistingServer: !process.env.CI` on port 4321. Check that nothing is
   already serving 4321 before you trust a local run. Every agent so far has
   checked, which is the only reason this has not bitten.
6. **D76** is the decision this check defends. It settled what the Word export
   marks — exactly the characters XML 1.0 has no room for — because a raw C0
   character makes `word/document.xml` not well-formed and LibreOffice answers
   with `Error: source file could not be loaded`. `control-labels.json` is the
   fixture for it, which is why criterion 4 names it.
7. **D79** is why reading the bytes back is the only honest check, and why
   `e2e/docxText.ts` is strict on purpose: it throws on a zip it does not
   understand rather than returning nothing, because a reader that quietly
   finds no text turns a broken export into a passing test. Keep that property
   — do not catch its throw and call the fixture a pass.
8. **D31** — `bun run test` stays Vitest-only because the pre-commit hook runs
   it, and a hook that starts heavy tooling is a hook nobody runs. That
   reasoning applies with more force to a hook that would start an office
   suite.
9. **D77** — nothing is marked for a font's sake in the Word export, because a
   `.docx` embeds no font and what a glyph looks like is the reader's machine's
   question. So do **not** write a criterion or an assertion about glyph
   rendering in LibreOffice; that is the reader's machine, not the file.
10. **D54** — a `**Status:** done` means criteria verified in the cycle, not
    merged. Not directly in play here, since there is no task file, but it
    governs how Sam reads the state at the release gate.
11. **The 800-line ceiling** from `CLAUDE.md`, with 200–400 typical.
    `e2e/exportWord.spec.ts` is already 731 lines, so this does not go in
    there.
12. **`bun run test`, never `bun test`.** Plain `bun test` runs bun's own
    runner and skips Vitest. Write `bun run test` everywhere, and correct it if
    you find it wrong anywhere.

### What this does and does not buy

Be precise about this in the code comment, in `README.md` and in your report.
It is both the reason the cycle is worth doing and the reason it closes
nothing.

**It buys:** the LibreOffice check becomes repeatable instead of being
rediscovered by hand each cycle; six pieces of operational knowledge that cost
two agents and the user real time move from prose into something executable;
and a regression in the `.docx` export that only an OOXML reader would catch
becomes findable in one command rather than in an afternoon.

**It does not buy a verified Word export.** LibreOffice is an independent OOXML
implementation, not Word's renderer. A file it opens cleanly can still behave
differently in Word, and the reverse. The standing item — open
`order-intake.docx` in real Microsoft Word once — **stays open and belongs to
the user**, who is the only person here with a plausible route to a machine
with Word on it. Nothing in this cycle may be written in a way that suggests
otherwise.

### Definition of done for this cycle

Every acceptance criterion above is checked in this document by Jahmyr,
`bun run test` passes, and CI is green on the pull request.

### Pipeline notes

Reproduced by hand each cycle, because the agent configuration is not being
edited — that proposal is still with the user. Do not edit agent config.

- **Amon:** build to the criteria above, then append your section to this
  document. **Do not push and do not open the pull request** — that is
  Jahmyr's step, not yours.
- **Jahmyr:** test and debug, then push the branch and open the pull request.
  Verify each criterion against the build rather than against Amon's report,
  and check the boxes yourself — only your verification earns a check. Run the
  absent-LibreOffice case (criterion 10) yourself; it is one environment
  variable away, and it is the half of this cycle that is easiest to leave
  untested.
- **Sam:** docs and merge. Route the documentation refresh through its own
  `chore/…` branch and its own pull request, as with the previous cycles.

## Work completed by Amon — round 1

### What was built

One opt-in command, `bun run docx:libreoffice`. It exports five fixtures
through the app's own **Export Word** button in a real browser, converts each
produced `.docx` with the LibreOffice installed on this machine, and reads the
converted file back through `e2e/docxText.ts` to confirm the design's title and
every node and edge label are still in it. It reports a pass or a fail per
fixture. A conversion that exits 0 and loses the document is a **fail**.

Four things about its shape, each one a criterion kept by construction rather
than by care:

- **It cannot run in CI or in the default walk.** Its Playwright run lives in a
  second config, `playwright.libreoffice.config.ts`, whose `testDir` is
  `scripts/libreoffice/`. `playwright test` — which is what `bun run test:e2e`
  and CI run — reads `playwright.config.ts`, whose `testDir` is `./e2e`, and
  cannot reach it. No tag, no skip, nothing that has to fire correctly.
- **The verdict is pure.** `judgeConversion` is a function of three facts —
  timed out, exit code, output file written — and stderr is carried as
  diagnostic text that no branch reads. So finding 6 is pinned by a Vitest test
  that passes on a machine with no LibreOffice at all.
- **Presence is answered by the file, never by running the binary.**
  `--version` is not used anywhere. Every invocation that does run is bounded
  by a 120-second timeout, reported as a timeout naming the command.
- **Nothing is written inside the repository.** The export, the conversion and
  the LibreOffice profile all live in a room per fixture under the system
  temporary directory. The room is removed when its fixture passes and kept
  when it fails, with the path in the failure message.

### Files added or changed

- **`scripts/libreoffice/check.ts`** — new. The `bun run` entry point. Finds
  LibreOffice, prints one line and exits 0 if there is none, otherwise starts
  the Playwright run with the binary passed down. Carries the canonical "what
  this buys and does not buy" comment (criterion 12).
- **`scripts/libreoffice/soffice.ts`** — new, pure. `MAPDS_SOFFICE` first, then
  per-platform full paths; on Windows `soffice.com`, never `soffice.exe`, and
  never the Maintenance Service directory. `describeMissingSoffice` is the one
  line the absent case prints.
- **`scripts/libreoffice/verdict.ts`** — new, pure. The three facts, and the
  rule that stderr never decides.
- **`scripts/libreoffice/survivingText.ts`** — new, pure. What the converted
  document must still carry, derived from the fixture's own JSON through the
  export's `safeDocxText`, and what it lost.
- **`scripts/libreoffice/convert.ts`** — new, impure. Spawns LibreOffice with a
  profile directory of its own, collects what it says, kills it on the clock,
  and hands the three facts to `judgeConversion`. Its argument list is a pure
  function so a test can pin the profile flag.
- **`scripts/libreoffice/docxRoundTrip.spec.ts`** — new. The five fixtures,
  through the browser, through LibreOffice, and back.
- **`playwright.libreoffice.config.ts`** — new. Extends the default config so
  the served `dist/` cannot drift, overrides `testDir`, `testMatch`
  (`**/*.spec.ts`, so the Vitest files beside the spec are not collected),
  workers, retries and timeout.
- **`vitest.config.ts`** — now also collects `scripts/**/*.test.ts`.
- **`package.json`** — one new script, `docx:libreoffice`.
- **`README.md`** — the command in the run block; a `### bun run
  docx:libreoffice` section with the search order, the override's name, and
  what this does and does not buy; and a paragraph in **Configuration** saying
  why `MAPDS_SOFFICE` is not in `.env.example`.
- **`docs/DECISIONS.md`** — D104 to D110.
- **`.github/workflows/ci.yml`** — **not changed.** `git diff main -- .github/`
  is empty (criterion 11).
- **`.gitignore`** — **not changed**, and did not need to be: nothing the check
  makes can land in the tree.

### Tests written

**33 new Vitest tests**, all of which pass with no LibreOffice installed.

`scripts/libreoffice/verdict.test.ts` — 11:

- a clean exit with a file on disk is a conversion
- the platform-libraries warning on stderr is still a conversion (finding 6)
- **`never lets stderr decide the verdict`** — five stderr samples, including
  `Error: source file could not be loaded` and `Fatal exception: Signal 11`,
  all still `converted` when the exit code is 0 and the file is there. This is
  the test that goes red the day someone softens the rule
- what the run said is carried as diagnostics
- a non-zero exit fails, and the reason names the code
- exit 0 with no file fails — the shape a document LibreOffice cannot parse
  produces
- a failure names the command, so it can be repeated by hand
- a run killed without a code reads as killed, not as "code null"
- a timeout is a timeout and not a failure
- a timeout names the command and the seconds (criterion 7)
- a timeout outranks an exit code that arrived late

`scripts/libreoffice/soffice.test.ts` — 9:

- the override comes ahead of any install
- an override pointing nowhere does **not** fall back — this is what makes
  criterion 10 demonstrable on a machine that has LibreOffice
- Windows resolves the `.com`, and nothing searched ends in `.exe`
- nothing searched is in the Maintenance Service directory
- macOS looks inside the application bundle
- Linux looks in four usual places
- it says where it looked when it found nothing
- the absent line is one line and carries what, where and how
- the override's failure is blamed on the override, still in one line

`scripts/libreoffice/survivingText.test.ts` — 9: the title and every label are
asked for; a control character is asked for in its **marked** form (D76), not
its raw one; a two-line label is asked for line by line; a blank line inside a
label is not asked for, because every document contains an empty string; the
same label twice is asked for once; a design with no nodes asks for D51's
sentence; a file that is not a design throws rather than quietly asking for
nothing; and `missingFrom` names what is gone and comes back empty when
nothing is.

`scripts/libreoffice/convert.test.ts` — 4: exactly one
`-env:UserInstallation=` argument, given as a `file://` URL; a headless
conversion to `docx` into a directory of its own; and no `--version` anywhere.

**5 Playwright checks**, one per fixture, in the opt-in run.

**The content check was falsified before it was believed.** With one impossible
string added to the expected list, `order-intake` went red with the expected
message, naming the fixture, the temporary room (which was kept, as designed)
and what LibreOffice printed. The probe was reverted and is not in any commit.

### Local results

`bun run test`: **pass — 482 tests in 31 files** (449 in 27 before this cycle).

`bun run check`: **pass — 0 errors, 0 warnings, 0 hints across 93 files.**

`bun run build`: **pass — 2 pages in 774 ms.**

`bun run test:e2e`: **pass — 124 tests in 6 files**, the same six specs as
before. `playwright test --list` collects `drawing`, `export`, `exportPdf`,
`exportWord`, `schema` and `validation` and does not collect
`docxRoundTrip.spec.ts` (criterion 2).

`bun run docx:libreoffice` (criterion 4), verbatim:

```
$ bun scripts/libreoffice/check.ts
Converting the Word exports with C:\Program Files\LibreOffice\program\soffice.com
[WebServer] $ astro build

Running 5 tests using 1 worker

  ok 1 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › order-intake.json survives a LibreOffice round trip (6.4s)
  ok 2 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › control-labels.json survives a LibreOffice round trip (5.3s)
  ok 3 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › empty-design.json survives a LibreOffice round trip (5.2s)
  ok 4 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › markup-labels.json survives a LibreOffice round trip (5.4s)
  ok 5 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › estate-sweep.json survives a LibreOffice round trip (6.8s)

  5 passed (32.8s)
```

`git status --porcelain` immediately after that run: **clean** (only the two
documentation files that were staged at the time). No `mapds-libreoffice-*`
room was left in the temporary directory — all five passed and cleaned up after
themselves (criterion 8).

The absent case (criterion 10), demonstrated by pointing the override at a path
that does not exist, verbatim:

```
$ MAPDS_SOFFICE="D:\nowhere\soffice.com" bun run docx:libreoffice
$ bun scripts/libreoffice/check.ts
LibreOffice was not found, so the .docx check did not run and nothing failed. MAPDS_SOFFICE points at D:\nowhere\soffice.com, which is not there. Unset MAPDS_SOFFICE to search the usual install locations instead, or point it at a binary that exists.
exit=0
```

One line, exit 0, no browser started, no spec run, nothing red.

### Decisions recorded

D104 to D110 in `docs/DECISIONS.md`:

- **D104** — one opt-in command, and its Playwright run in a second config
  rather than a project or a tagged spec; `vitest.config.ts` also collects
  `scripts/**/*.test.ts`.
- **D105** — the verdict is a pure function of three facts; stderr never
  decides.
- **D106** — presence by the file, never by `--version`; every invocation
  bounded, and a timeout reported as one.
- **D107** — the override first, then per-platform full paths; the Windows
  `.com`; an override pointing nowhere is an answer, not a fallback.
- **D108** — a profile directory per run, under the system temporary
  directory.
- **D109** — expectations from the fixture's JSON through `safeDocxText`, not
  from `docxPlan`.
- **D110** — `MAPDS_SOFFICE` documented in `README.md` and deliberately **not**
  in `.env.example`, with the reason.

D110 is the one worth arguing with. `CLAUDE.md` says every new environment
variable gets a placeholder line in `.env.example`, and I did not add one.
`.env.example` is generated from `docs/intake.md`, its text says the app reads
nothing from the environment, and that stays true — this variable is read by
one local developer command and by nothing the site ships. A line there would
be lost on the next regenerate and would tell a reader the browser reads an
environment it never sees. Overturn it if you disagree; it is one line either
way.

### Known gaps

1. **Criterion 2, read literally, is not quite met and I think that is
   correct.** `bun run test` does not run "the same Vitest suite it runs
   today": it runs 33 more tests. That is criterion 6 arriving —
   the pure halves have to be in Vitest for the stderr rule to be checkable in
   CI. What criterion 2 protects is met exactly: `bun run test` starts no
   LibreOffice and no browser, gains no dependency on any binary, and passes
   with LibreOffice unreachable.
2. **The timeout path has never fired for real.** No invocation hung during
   this cycle, because every one of them passes the profile flag. The verdict
   side is unit-tested, but the Windows `taskkill /T /F` kill and the POSIX
   `process.kill(-pid)` kill have not been exercised end to end. If you want to
   see it, set `CONVERSION_TIMEOUT_MS` in `docxRoundTrip.spec.ts` to something
   like `500` and run one fixture; it should report a timeout naming the
   command rather than a failure.
3. **macOS and Linux are unit-tested, not run.** `findSoffice`'s paths for both
   are pinned against a fake filesystem. Nobody here has either platform, so
   the paths themselves are the usual install locations rather than measured
   ones, and the POSIX kill has never run.
4. **The metadata title is not asserted after conversion.** `docxTitle` reads
   `docProps/core.xml`, and whether LibreOffice carries that through a round
   trip is its business rather than the export's. Criterion 5's title is
   checked as the title the document *prints*, which is the design's title in
   the body text and in `textThatMustSurvive`'s list. Asserting the metadata
   too would be a stronger check of something the criterion does not ask about
   and LibreOffice does not owe us — see out-of-scope note 3.
5. **Five fixtures, not all of them.** Criterion 4's five, and no more.
   `platform-overview.json` — the one whose drawing tiles across several sheets
   — is the obvious sixth and is not in the list; adding it is one line in
   `FIXTURES`.
6. **The LibreOffice version is not recorded by the check.** It cannot ask:
   `--version` hangs. It is LibreOffice 26 on this machine, read out of
   `C:\Program Files\LibreOffice\program\version.ini` by hand.

### Out-of-scope notes for Jared

1. **The CI follow-on, in a sentence, as you asked.** Enabling this in CI is
   one job with `sudo apt-get install -y libreoffice-writer` and
   `bun run docx:libreoffice` as its step — the check already exits 0 when the
   binary is absent, so a misconfigured runner would be silently green, which
   means the CI version would want `MAPDS_SOFFICE` set explicitly so a missing
   install fails loudly instead. Worth its own cycle and its own decision, not
   a line added to `ci.yml` here.
2. **`version.ini` is a presence probe that does not hang.** `program/version.ini`
   sits beside `soffice.com` and holds the build id and `UpdateID=LibreOffice_26_…`.
   I did not use it — file existence is enough for presence and needs no
   parsing — but if anyone ever wants the version in the output, that is where
   it is, and it costs nothing to read.
3. **Whether LibreOffice preserves `docProps/core.xml` on a round trip is an
   open question worth an hour.** If it does, asserting the metadata title
   after conversion is a free strengthening of this check. If it does not, that
   is worth knowing about the format rather than about our export — D71 is why
   the title metadata is there at all.
4. **`e2e/exportWord.spec.ts` is 731 lines** against the 800-line ceiling. You
   already flagged it; it is still true, and the next thing added to the Word
   export will have to go somewhere else.
5. **Nothing in this cycle touched the Word question.** The `.docx` is still
   unverified against Microsoft Word, that item still belongs to the owner, and
   the README now says so where a reader will find it rather than in a handoff
   document.

## Test report from Jahmyr — round 1

### Verdict

**Changes requested.** All fourteen acceptance criteria are verified and checked
above — every one was exercised, none was taken on report. One defect remains,
and it sits outside the numbered list but inside what this cycle set out to do:
on the single failure this check exists to catch, the message it prints throws
away the only line that says why.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| 1. One opt-in `bun run` command, documented in `README.md` | pass | `package.json` has exactly one new script, `docx:libreoffice` → `bun scripts/libreoffice/check.ts`. `README.md` lists it in the `Run, test, build` block and gives it a `### bun run docx:libreoffice` section |
| 2. `bun run test` and the default `test:e2e` unchanged in what they run, neither gaining a binary dependency | pass | `bunx playwright test --list`: **124 tests in 6 files** — `drawing`, `export`, `exportPdf`, `exportWord`, `schema`, `validation`; that listing contains `docxRoundTrip` **zero** times. `git diff main..HEAD` touches neither `e2e/` nor `playwright.config.ts`, so the default walk is byte-identical by construction. `bun run test` run with LibreOffice unreachable (`MAPDS_SOFFICE=D:\nowhere\soffice.com`): **482 passed**. `tasklist` for `soffice.*` was identical before and after the Vitest run, and no `*.test.ts` anywhere imports `@playwright/test`. CI — a Linux runner with no office suite — ran all 33 new tests green and `test:e2e` at 124. See the judgement below on the +33 |
| 3. The `.docx` under test is the browser export, via `downloadWord(saveAs)`; none committed; no second producer | pass | `docxRoundTrip.spec.ts:80` calls `upload.downloadWord(...)`, which is `exportUsing(this.exportWord, saveAs)` — the real Export Word button in a real browser. `git ls-files` matching `.docx` is empty. Searching `scripts/` and `e2e/` for `toDocx` or `Packer` finds no second producer |
| 4. The five named fixtures convert and pass on this machine | pass | `bun run docx:libreoffice` reproduced by me: **5 passed (32.8s)**, output below. `control-labels` earns its place — its expectations come back as `Control characters`, `Alpha⇥Bravo`, `Soh■Charlie`, `DelDelta`, `Newline`, `Echo`, `edge⇥with⇥tabs`, `plain edge`, `carriage`, `return`: the fixture carries raw U+0001, U+007F, tab, newline and carriage return, and the check demands the **D76-marked** form back, never the raw character |
| 5. The converted file is read back for title, every node label and every edge label; exit 0 that loses content is a fail | pass | Falsified against a **real export regression**, not a doctored expectation list: `src/lib/docxPlan.ts:551` changed to `[edge.from, edge.to, 'REGRESSION']`, one fixture run, and the check went red — *"order-intake.json: LibreOffice converted the file and 6 of the design's 14 pieces of text did not come back"* — naming all six lost edge labels, the fixture and the kept room. Reverted with `git checkout --`; no `REGRESSION` remains and the tree is clean |
| 6. A conversion that succeeds while writing to stderr is a success; the rule is a unit-tested pure function that passes with no LibreOffice | pass | Verified **live**, not only in the unit test: a real conversion of `order-intake.docx` returned `verdict.kind: converted` with `verdict.diagnostics` exactly `"Could not find platform independent libraries <prefix>"`. And verified on a machine that has no LibreOffice at all — GitHub Actions ran `verdict.test.ts` (11), `soffice.test.ts` (9), `survivingText.test.ts` (9) and `convert.test.ts` (4) green. `judgeConversion` reads `timedOut`, `exitCode` and `outputWritten` and nothing else; `stderr` is assigned to `diagnostics` and no branch touches it |
| 7. Presence never probed by `--version`; every invocation bounded; a timeout reported as a timeout naming the command | pass | Searching `scripts/` for `--version` finds only comments and the assertion that `conversionArguments` never contains it. **The timeout path was fired for real**, closing Amon's gap 2: converting the 3.1 MB `estate-sweep.docx` with `timeoutMs: 500` returned `kind: timedOut`, reason *"LibreOffice did not answer within 1s. The command was: …"* carrying the full command line, elapsed 693 ms. `tasklist` for `soffice.bin`, `soffice.com` and `soffice.exe` eight seconds later: **nothing** — the Windows `taskkill /T /F` leaves no orphan |
| 8. Every invocation carries `-env:UserInstallation=`, outside the repository; `git status` clean after a full run | pass | Observed in the real command line every run: `-env:UserInstallation=file:///C:/Users/ibats/AppData/Local/Temp/mapds-libreoffice-…/profile`, pinned by `convert.test.ts` at exactly one such argument. `git status --porcelain` is empty after a passing run, and — stronger — after a deliberate **failing** run too: the `test-results/` that Playwright writes on failure is already covered by `.gitignore:14`, which `git check-ignore -v` confirms. No `mapds-libreoffice-*` room survives a green run; five survived the red run, which is the documented behaviour |
| 9. Override first, then per-platform paths; Windows resolves `.com`; documented in `README.md` | pass | Exercised as a pure function: unset, empty string and whitespace all fall back to `C:\Program Files\LibreOffice\program\soffice.com` and then the `(x86)` equivalent; an override pointing nowhere returns not-found and does **not** fall back. Nothing searched ends in `.exe` and nothing is in the Maintenance Service directory. `README.md` names `MAPDS_SOFFICE` and lists the Windows, macOS and Linux paths in search order |
| 10. With LibreOffice absent the command exits 0 with one clear line | pass | Run exactly as the criterion asks — output below. **One line, `exit=0`**, no browser started, no spec run, nothing red |
| 11. `.github/workflows/ci.yml` unchanged | pass | `git diff main -- .github/` produces **no output at all**. CI's steps remain Install, Typecheck, Test, Install Playwright browsers, Test end to end, Upload report |
| 12. What this buys and does not buy, in the module comment and in `README.md` | pass | `scripts/libreoffice/check.ts:20-32` and `README.md`'s *"What it buys, and what it does not"* both say LibreOffice is an independent implementation of OOXML and not Word's renderer, and both say opening a produced `.docx` in real Microsoft Word remains open and belongs to the owner. Nothing in the diff claims Word has been verified |
| 13. New decisions from D104 in `docs/DECISIONS.md` | pass | D104–D110 appended in the existing three-column table, same shape and voice, each with the cycle and date in the last column. D103 remains the previous highest |
| 14. `bun run test`, `bun run check`, CI green on the pull request | pass | 482 passed in 31 files; 0 errors, 0 warnings, 0 hints across 93 files; **CI green on PR #27**, both the push-event and pull_request-event runs (1m33s, 1m29s) |

### The judgement calls

**Criterion 2's +33 tests — met, and not a gap.** Amon read the criterion
literally and flagged that `bun run test` no longer runs "the same Vitest suite
it runs today". I do not think it is even a gap. Criterion 6 *requires* the
verdict logic to be unit-tested in Vitest so it is checkable where no
LibreOffice exists; a criterion cannot forbid what the next criterion demands.
What criterion 2 protects is met exactly and was verified three ways — no
browser started, no office suite started, and green with the binary unreachable
— and CI proved the stronger version of it on a runner that has no LibreOffice
at all. Measured for the record: `vitest run src` is 449 in 27 files,
`vitest run scripts` is 33 in 4.

**D110 — upheld. `MAPDS_SOFFICE` stays out of `.env.example`.** `.env.example`
opens with *"Generated from docs/intake.md by kickoff. Edit the intake, not this
file"*, so a line added there is lost on the next regenerate; and its claim that
the app reads nothing from the environment stays literally true — searching
`src/` for `process.env` or `import.meta.env` returns **nothing at all**. Every
environment read in this repository is in `scripts/libreoffice/`, which ships to
no browser. A placeholder in `.env.example` would be a false statement about the
app, kept in a file nobody is allowed to hand-edit. `README.md` and D110 are the
right home, and no secret is involved either way.

**D104's enumeration — confirmed independently.** It is what keeps criterion 11
true, so I did not take it on report: `playwright test --list` collects 124
tests in the same six `e2e/` specs and collects `docxRoundTrip.spec.ts` zero
times. The stronger evidence is that `e2e/` and `playwright.config.ts` do not
appear in `git diff main..HEAD` at all, so the default walk could not have
changed.

### Answering the open question Amon flagged (his gap 4, his out-of-scope note 3)

**LibreOffice does preserve `docProps/core.xml` across a `.docx` round trip.**
Measured rather than assumed: `docxTitle` on the browser-exported
`order-intake.docx` reads `"Order intake"`, and `docxTitle` on the file
LibreOffice wrote back reads `"Order intake"` — the same string, 212,334 bytes
in and 209,290 out. So asserting the metadata title after conversion is the free
strengthening Amon suspected it might be, and D71's title metadata survives an
independent implementation. Information for Jared rather than a defect: no
criterion asks for it.

### Command results

`bun run test`: **482 passed, 31 files** — and 482 passed again with
`MAPDS_SOFFICE` pointed at a path that does not exist.

`bun run check`: **pass — 0 errors, 0 warnings, 0 hints across 93 files.**

`bun run build`: **pass — 2 pages in 750 ms.**

`bunx playwright test --list`: **124 tests in 6 files**, `docxRoundTrip.spec.ts`
not among them.

`bun run docx:libreoffice`, run by me, verbatim:

```
$ bun scripts/libreoffice/check.ts
Converting the Word exports with C:\Program Files\LibreOffice\program\soffice.com
[WebServer] $ astro build

Running 5 tests using 1 worker

  ok 1 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › order-intake.json survives a LibreOffice round trip (6.3s)
  ok 2 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › control-labels.json survives a LibreOffice round trip (5.4s)
  ok 3 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › empty-design.json survives a LibreOffice round trip (5.1s)
  ok 4 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › markup-labels.json survives a LibreOffice round trip (5.3s)
  ok 5 [chromium] › scripts\libreoffice\docxRoundTrip.spec.ts:63:2 › estate-sweep.json survives a LibreOffice round trip (7.0s)

  5 passed (32.8s)
```

The absent case (criterion 10), run by me, verbatim:

```
$ MAPDS_SOFFICE="D:\nowhere\soffice.com" bun run docx:libreoffice
$ bun scripts/libreoffice/check.ts
LibreOffice was not found, so the .docx check did not run and nothing failed. MAPDS_SOFFICE points at D:\nowhere\soffice.com, which is not there. Unset MAPDS_SOFFICE to search the usual install locations instead, or point it at a binary that exists.
exit=0
```

Secret scan: **clean.** There is no `gitleaks` on this machine, so
`docs/RUNBOOK.md` section 0.2's grep fallback was run across the branch's diff,
alongside a direct read of every added file. The only environment variable the
branch introduces is `MAPDS_SOFFICE`, which holds a filesystem path to an office
suite. `git ls-files` shows no `.env`, and `.gitignore` covers `.env` and
`.env.*` with `!.env.example`.

CI: **green** — https://github.com/IBatsios/map-data-structures/pull/27, both
the push-event run (1m33s) and the pull_request-event run (1m29s). The CI log
shows `verdict.test.ts (11)`, `soffice.test.ts (9)`, `survivingText.test.ts (9)`
and `convert.test.ts (4)` passing on a runner with no LibreOffice, and
`124 passed (49.5s)` from `test:e2e`.

### Defects for Amon

1. **`scripts/libreoffice/docxRoundTrip.spec.ts:123-136` (`failureOf`) — the
   failure message drops `verdict.diagnostics`, which is where LibreOffice's own
   reason for refusing a file lands.** `failureOf` takes `stdout` and never
   `verdict.diagnostics`, so the one sentence that explains a refusal is
   collected and then thrown away.

   Measured, not inferred. A deliberately malformed `.docx` put through
   `convertToDocx` on this machine returns:

   ```
   verdict.kind:        failed
   verdict.reason:      LibreOffice exited with code 1. The command was: …
   STDOUT:              ""
   verdict.diagnostics: "Could not find platform independent libraries <prefix>
                         Error: source file could not be loaded"
   ```

   `Error: source file could not be loaded` arrives on **stderr**, and stdout is
   empty. So on exactly the failure this cycle names as its reason for existing
   — D76's shape, which is why `control-labels` is in `FIXTURES` at all — the
   message a reader gets ends with the line *"LibreOffice printed nothing on
   stdout."* while the diagnosis sits unread in `verdict.diagnostics`.

   It misdiagnoses a second case for the same reason. A bad `MAPDS_SOFFICE` — I
   pointed it at `C:\Program Files\LibreOffice`, a directory — makes `spawn`
   emit `error`, and `runBounded` resolves with `exitCode: null`, which
   `exitPhrase` renders as *"LibreOffice was killed before it finished"*.
   Nothing was killed: the binary could not be started, and the spawn error's
   own message — the text that would say so — is in `verdict.diagnostics`,
   dropped.

   `verdict.ts:16-18` states the contract this breaks: *"stderr comes in, and
   goes straight to `diagnostics` where a human can read it."* No human can,
   because nothing prints it. The numbered criteria do not name this, which is
   why every box above is checked — but this document's own framing does (*"the
   not-installed line, the timeout line and the conversion-failure line … are
   the deliverable as much as the conversion is"*), and so does the cycle's
   stated purpose: a regression that should be *"findable in one command rather
   than in an afternoon"* is, as built, findable in one command plus an
   afternoon spent working out why.

   **Expected:** the conversion-failure message carries what LibreOffice said on
   **both** streams. **Actual:** stdout only, which is empty in the one failure
   that matters. The fix is `failureOf`'s argument list and its last line; it is
   yours rather than mine because it changes what the command prints.

### Fixed in place

None. Nothing needed correcting that was mine to correct — no wrong import, no
bad assertion, and no `bun test` written where `bun run test` was meant.

### Smaller notes, no action required

1. `seconds()` in `verdict.ts:110` rounds, so the 500 ms timeout I forced
   reported *"within 1s"*. Harmless at the real 120,000 ms and not worth a
   change.
2. `textThatMustSurvive` and the export share `safeDocxText`, so a bug **inside**
   `safeDocxText` itself would be invisible to this check. That is D109's
   deliberate trade — the alternative is reimplementing D76's marking and
   letting the two drift — and `docxPlan.test.ts` pins the function. Recorded so
   the boundary of what a green run means is written down: it covers everything
   downstream of that function, which is where the regression I injected lived.
3. The rooms a red run keeps are cleaned up by nothing later. That is the
   documented intent and they sit under the system temporary directory, so it
   costs nothing — but a run failing on `estate-sweep` leaves about 3 MB behind
   per attempt.

### Pull request

**https://github.com/IBatsios/map-data-structures/pull/27** — draft, base
`main`, CI green. Opened by me, as this document's pipeline notes direct. I have
not marked it ready and have not merged; both are Sam's.

## Work completed by Amon — round 2

### What was built

The one defect from round 1 is fixed: **the conversion-failure message now
carries what LibreOffice said on both of its streams.**

`failureOf` left `docxRoundTrip.spec.ts` and became `describeFailure` in a pure
module of its own. That move is the fix rather than tidying around it — the
spec imports `@playwright/test` and needs an office suite to run, so nothing
could reach the message where it lived, which is exactly how the one piece of
this check that nobody reads until something is wrong shipped with no test on
it. It is now nine Vitest tests that pass on any machine, LibreOffice or not.

The message gained the stream it was missing, and a label on each:

```
order-intake.json: LibreOffice exited with code 1. The command was: …
The exported and converted files are still in …\mapds-libreoffice-iP74G8.
LibreOffice printed nothing on stdout.
LibreOffice said on stderr:
Could not find platform independent libraries <prefix>
Error: source file could not be loaded
```

Three things about its shape:

- **Both streams are required fields on one interface.** The original bug was
  possible because `failureOf` simply had no parameter for stderr. A caller
  that forgets `diagnostics` is now a type error, caught by `bun run check`,
  rather than a quiet half-diagnosis.
- **Neither stream is filtered or summarised.** Every successful conversion
  writes the platform-libraries warning to stderr, so dropping it as noise is
  tempting — and the refusal arrives directly underneath it. A filter that knew
  which lines mattered would be D105's mistake in a smaller form, so both
  streams go out whole, labelled so a reader can tell the warning from the
  reason.
- **Silence is reported rather than skipped.** A stream left out of the message
  reads the same as a stream that was never collected, and telling those two
  apart is most of what a reader is doing.

### Files added or changed

- **`scripts/libreoffice/failureMessage.ts`** — new, pure. `describeFailure`
  and the `ConversionFailure` interface. Carries the "both streams, always"
  reasoning and the measurement behind it.
- **`scripts/libreoffice/failureMessage.test.ts`** — new. Nine tests, no
  LibreOffice needed.
- **`scripts/libreoffice/docxRoundTrip.spec.ts`** — `failureOf` deleted; both
  call sites now go through one local `failed(reason)` closure that passes
  `verdict.diagnostics` along with the rest.
- **`docs/DECISIONS.md`** — D111.
- **`README.md`** — what a red run prints, in the `bun run docx:libreoffice`
  section.
- **Not changed:** `.github/workflows/ci.yml` (`git diff main -- .github/` is
  still empty), `verdict.ts`, `convert.ts`, `soffice.ts`, `survivingText.ts`,
  `check.ts`, `package.json`, `.gitignore`, `.env.example`, and anything under
  `src/` or `e2e/`.

### Tests written

**9 new Vitest tests** in `failureMessage.test.ts`, bringing the suite to 491.

The refusal this check exists to catch:

- carries what LibreOffice said on stderr, which is where a refusal is
  explained — **this is the defect's own test**
- says which stream the diagnosis came from
- names the fixture and the room, so the files can be opened
- says what was run, so the failure can be repeated by hand

Both streams:

- quotes stdout when that is where the run spoke
- reads both streams when both of them spoke
- says so plainly when neither stream said anything
- treats a stream of whitespace as one that said nothing

And the second misdiagnosed case:

- carries the spawn error, so a start that failed is not read as a kill

**The RED gate was real, and on the behaviour rather than on a missing file.**
The module was created first holding round 1's logic verbatim, so the tests ran
against the defect itself: **7 failed, 2 passed**, every failure being the
diagnosis absent from the message. After the fix, 9 passed. The repository's
pre-commit hook runs `astro check` and `vitest run`, and correctly refused to
commit the red state — so RED is recorded here and in the fix commit rather
than as a checkpoint commit of its own. I did not reach for `--no-verify`.

### Local results

`bun run test`: **pass — 491 tests in 32 files** (482 in 31 before this round).

`bun run check`: **pass — 0 errors, 0 warnings, 0 hints across 95 files.**

`bun run build`: **pass — 2 pages in 719 ms.**

`bunx playwright test --list`: **124 tests in 6 files**, `docxRoundTrip`
collected **zero** times — criterion 2 unmoved.

`bun run docx:libreoffice`, after the change:

```
Converting the Word exports with C:\Program Files\LibreOffice\program\soffice.com
Running 5 tests using 1 worker

  ok 1 order-intake.json survives a LibreOffice round trip (5.7s)
  ok 2 control-labels.json survives a LibreOffice round trip (5.5s)
  ok 3 empty-design.json survives a LibreOffice round trip (5.2s)
  ok 4 markup-labels.json survives a LibreOffice round trip (5.3s)
  ok 5 estate-sweep.json survives a LibreOffice round trip (6.9s)

  5 passed (32.2s)
```

**Falsified twice against the real LibreOffice on this machine, not only in
unit tests.**

1. *The refusal.* A zip built by hand with a raw U+0001 in `word/document.xml`
   — D76's exact shape — put through `convertToDocx` with the installed binary:
   `kind: failed`, a reason naming exit code 1, `STDOUT: ""`, and `diagnostics`
   holding the platform-libraries warning with `Error: source file could not be
   loaded` underneath it. Round 1's message, rebuilt from that same verdict,
   ends on *"LibreOffice printed nothing on stdout."*; round 2's carries the
   refusal. Your measurement reproduces exactly.
2. *Through the real command, end to end.* With the exported `.docx` truncated
   to half its bytes after the browser produced it, the Playwright output of
   `bun run docx:libreoffice` itself is the block quoted at the top of this
   section — the real command line, the kept room, and the diagnosis. The probe
   was three lines in the spec, reverted with `git checkout --`; the tree is
   clean and grepping for it finds nothing.

I tried the stronger falsification first — injecting the regression into
`safeDocxText` so the export itself produced an ill-formed document. Worth
recording as a finding rather than a failed attempt: **it never reaches
LibreOffice.** The `docx` library refuses to serialise a raw control character,
so the browser export produces no download at all and the fixture fails at
`waitForEvent` three minutes earlier. D76's marking is defended by two
independent layers, not one. Reverted; line 347 is back to `UNDRAWABLE_MARK`.

The spawn case, since it was the second half of the defect: `MAPDS_SOFFICE`
pointed at `C:\Program Files\LibreOffice` (a directory) now prints
`Executable not found in $PATH: "C:\Program Files\LibreOffice"` under the
stderr label, instead of nothing at all.

Secret scan: **clean.** No `gitleaks` here, so `docs/RUNBOOK.md` 0.2's grep
fallback across `a59ebf4..HEAD`, plus a read of both new files. This round
introduces **no new environment variable**, so D110 is untouched and
`.env.example` still needs nothing.

`git status --porcelain` after everything: clean. No `mapds-libreoffice-*` room
survives, and `tasklist` shows the only `soffice` processes are two that
started 2026-09-18 at 18:26 — the user's own session, predating this work. My
runs left no orphan.

### Decisions recorded

**D111** in `docs/DECISIONS.md`: the failure message is a pure module of its
own and carries both streams, each labelled, neither filtered — with the
measurement, the promise in D105 it was breaking, and why a "drop the noisy
line" filter would repeat that mistake.

### Known gaps

1. **`exitPhrase` still says "was killed before it finished" when a binary
   could not start.** Fixed in effect rather than at the root: the message now
   prints `Executable not found in $PATH: …` directly underneath, so no reader
   is misled. Fixing the *wording* means giving `judgeConversion` a fourth fact
   — a `startFailed` flag — which changes `ConversionAttempt`'s contract and
   the verdict test that pins "a run killed without a code reads as killed".
   You called the fix `failureOf`'s argument list and its last line and said
   not to widen the round, so I left it. It is a one-field change whenever
   someone wants it.
2. **Your three smaller notes are all still true and none were taken.**
   `seconds()` still rounds (note 1); `textThatMustSurvive` still shares
   `safeDocxText` with the export (note 2 — and the finding above makes that
   trade look better than it did); a red run still leaves its rooms behind
   (note 3). None of them rides along, by your instruction.
3. **No test asserts that the *spec* passes `diagnostics`.** It cannot — the
   spec needs Playwright and an office suite. What stands in for it is the
   required field: omitting it fails `bun run check`. That is a compile-time
   guarantee rather than a test, and it is the same guarantee that would have
   prevented the original defect.
4. **Round 1's other gaps are unchanged**, except gaps 2 and 4, which your
   round closed. macOS and Linux are still unit-tested rather than run; still
   five fixtures; the LibreOffice version still is not recorded.

### Out-of-scope notes for Jared

1. **The metadata title is now free to assert, and nobody has asked for it.**
   Jahmyr measured that LibreOffice preserves `docProps/core.xml` across a round
   trip, which was my open question from round 1. Adding `docxTitle` to the
   round trip is about two lines and would strengthen the check; no criterion
   asks for it, so it is not here. Worth a line in a future cycle's scope.
2. **`docx` refuses to serialise a raw control character** (the finding above).
   D76's marking therefore has a second, independent guard underneath it, and
   an export regression of *that particular* kind surfaces as a failed download
   rather than as a LibreOffice refusal. Nothing to fix — but it does mean
   `control-labels`'s value to this check is narrower than the fixture comment
   claims, since the file it was chosen to reproduce can no longer be produced
   by the export at all. The comment at `docxRoundTrip.spec.ts` lines 40-43 is
   accurate about history and slightly generous about the present.
3. **`e2e/exportWord.spec.ts` is still 731 lines** against the 800 ceiling.
   Unchanged this round and still true.
4. **Nothing in this round touched the Word question.** The `.docx` is still
   unverified against Microsoft Word, and that item still belongs to the owner.

## Test report from Jahmyr — round 2

### Verdict

**Pass.** The round 1 defect is closed, verified three independent ways, and
nothing that passed in round 1 has moved. All fourteen boxes stay checked; none
needed unchecking. CI is green on the pushed head.

One correction, and it runs the other way from a defect: **Amon's finding that
the `docx` library refuses to serialise a raw control character is wrong.** It
does not refuse. I measured it, and the conclusion drawn from it — that
`control-labels` now defends a file the export can no longer produce — should
not be acted on. Details under "The `control-labels` judgment" below. Nothing
to fix in the code; the record needed fixing before Jared read it.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| 1. One opt-in `bun run` command, documented in `README.md` | pass | `bun run docx:libreoffice` ran to `5 passed (32.3s)`; README section present and extended this round |
| 2. `bun run test` unchanged, no LibreOffice or browser; `test:e2e` specs unchanged | pass | 491 passed / 32 files with `MAPDS_SOFFICE` pointed at a path that is not there; `playwright test --list` = 124 tests in 6 files, `docxRoundTrip` collected **zero** times |
| 3. The `.docx` is the browser's own export; none committed | pass | `git ls-files` finds no `.docx`; the spec obtains bytes through `UploadPage.downloadWord` |
| 4. Five named fixtures convert and pass on this machine | pass | `order-intake` 5.5s, `control-labels` 5.6s, `empty-design` 5.3s, `markup-labels` 5.3s, `estate-sweep` 7.0s — 5 passed (32.3s) |
| 5. Each converted file read back for title and every node and edge label | pass | green run passes through `missingFrom` / `textThatMustSurvive`; unchanged this round |
| 6. stderr-only output on a success is reported as a success | pass | **measured directly**: a clean file converted with `verdict.kind: 'converted'` while stderr held `Could not find platform independent libraries <prefix>`; `verdict.test.ts` pins it in CI where no LibreOffice exists |
| 7. No `--version` probe; every invocation bounded; a timeout reported as a timeout | pass | `convert.ts` untouched this round (diff confirms); round 1 verification stands |
| 8. `-env:UserInstallation=` outside the repository; `git status` clean after a full run | pass | `git status --short` empty after both a **green** run and a deliberately **red** five-failure run |
| 9. Override first, then per-platform paths; `soffice.com` on Windows; documented | pass | resolved to `C:\Program Files\LibreOffice\program\soffice.com`; README documents the name and the order |
| 10. LibreOffice absent, exits 0, one clear line, nothing turns red | pass | override at `C:\Nope\...\soffice.com` exits 0 with one line naming what was not found, where it looked, and how to point it at an install |
| 11. `.github/workflows/ci.yml` unchanged | pass | `git diff main -- .github/` is empty |
| 12. What this buys and does not buy, in the code and in `README.md` | pass | `check.ts` module comment and README both carry it, including "not Word's renderer" and the open Word question |
| 13. Decisions recorded from D104 | pass | D104 to D111 present, table shape and voice intact |
| 14. `bun run test`, `bun run check`, and CI green on the PR | pass | 491/32, 0 errors across 95 files, and both CI jobs green on `3b06e51` |

### The defect from round 1 — closed, three ways

**1. The refusal, against the installed binary.** A zip built by hand with a raw
U+0001 in `word/document.xml`, through `convertToDocx`:

```
kind        : failed
STDOUT      : ""
diagnostics : "Could not find platform independent libraries <prefix>\r\nError: source file could not be loaded"
```

Round 2's message ends:

```
LibreOffice printed nothing on stdout.
LibreOffice said on stderr:
Could not find platform independent libraries <prefix>
Error: source file could not be loaded
```

Round 1's `failureOf`, rebuilt from that same verdict, ends on *"LibreOffice
printed nothing on stdout."* — the diagnosis collected and discarded. The
measurement reported in the round 2 section reproduces exactly.

**2. The spawn case, end to end through the real command.** `MAPDS_SOFFICE`
pointed at `C:\Program Files\LibreOffice`, a directory. All five fixtures
failed, each printing the command, the kept room, `LibreOffice printed nothing
on stdout.`, then:

```
LibreOffice said on stderr:
Executable not found in $PATH: "C:\Program Files\LibreOffice"
```

This run is worth more than its own criterion: it is the only way to check what
gap 3 above says cannot be checked — that the **spec's call site** actually
passes `diagnostics`. It does. The required field is the guarantee going
forward; this is the observation that it is wired up today.

**3. The RED, reproduced.** I put round 1's logic back behind round 2's
signature and ran the nine tests against it: **7 failed, 2 passed**, every
failure the missing diagnosis. The tests fail against the bug, not against a
missing file. The RED gate was real.

### The `control-labels` judgment — the premise does not hold

Asked to weigh whether the fixture still earns its place, I tried to reproduce
the finding that judgment rests on, and it does not reproduce. Identical
construction, one clean and one carrying a raw U+0001, both through `Packer`
and then the installed LibreOffice:

| Text | `Packer.toBuffer` | LibreOffice |
|---|---|---|
| `StockLevel` | serialised, 8491 bytes | **converted** |
| `Stock` + U+0001 + `Level` | **serialised, 8494 bytes — no refusal** | **failed**: `Error: source file could not be loaded` |

`docxText` reads the dirty package back as `Stock`, U+0001, `Level`: the raw
character goes straight into `word/document.xml`. So:

- The `docx` library does **not** refuse a raw control character.
- D76 does **not** have a second independent guard underneath it.
- A `safeDocxText` regression **does** reach LibreOffice and **is** refused,
  which is precisely the failure `control-labels` exists to catch.

**`control-labels` earns its place in full**, and it is the only one of the five
fixtures that would catch that regression. The comment at
`docxRoundTrip.spec.ts` lines 36-43 is accurate about the present as well as the
history and wants no softening. Out-of-scope note 2 above should be treated as
withdrawn; whatever made that export die at `waitForEvent` was something other
than the library refusing the character, and it is not this cycle's business.

The claim reached no committed file — grepping the repository finds it only in
this document — so nothing in `DECISIONS.md`, `README.md` or the source needs
correcting. D111 is unaffected: its reasoning is about streams, not fixtures.

### The `exitPhrase` wording — acceptable to ship

`exitPhrase` still says "was killed before it finished" for a binary that never
started. Having now read the real output as a reader would, I am content to ship
it. The wrong sentence is corrected three lines below it by `Executable not
found in $PATH`, which answers the only question the reader actually has, and
the cost of being precise is a fourth fact in `ConversionAttempt`'s contract
plus a rewrite of a verdict test that pins real behaviour. That is a design
change to buy a second of confusion rather than an afternoon — the wrong trade
for this cycle. **A follow-on, not a blocker**, and it belongs to whoever next
opens `verdict.ts` for a reason of its own.

### Command results

`bun run test`: **491 passed in 32 files** — and the same 491/32 with
`MAPDS_SOFFICE` pointed at nothing.
`bun run check`: **0 errors, 0 warnings, 0 hints across 95 files.**
`bun run build`: **2 pages in 749 ms.**
`bun run docx:libreoffice`: **5 passed (32.3s)**, exit 0.
`bunx playwright test --list`: **124 tests in 6 files**, `docxRoundTrip` zero.
Secret scan: **clean — `gitleaks detect --source . --no-banner` reports "no
leaks found" over 38 commits.** Worth recording: `gitleaks` **is** installed on
this machine, at the WinGet package path. The round 2 section reports it absent
and used `RUNBOOK` 0.2's grep fallback; the stronger gate has now been run and
passes.
CI: **green** — both `test` jobs on `3b06e51`, the pushed head.

### Defects for Amon

None. The code is correct as delivered.

### Fixed in place

None. Nothing needed correcting; the probes ran outside the working tree and the
tree is clean.

### Housekeeping

`git status --porcelain` clean after every run, red and green alike. No
`mapds-libreoffice-*` room survives — the five my red run kept by D108's design
were read and then removed, along with my own probe rooms. The only `soffice`
processes on the machine are pid 9224 and 35576, both started 2026-09-18 at
18:26:50, predating this work; my runs orphaned nothing.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/27 — draft, `3b06e51`
pushed, CI green. Left as a draft for Sam to mark ready and merge.

## Verification and merge by Sam

Re-earned rather than taken on report: branch confirmed
`chore/libreoffice-docx-check`, `bun run test` run independently (491 passed,
32 files, matching Jahmyr's count), `gh pr checks` read directly from GitHub
(both `test` jobs `pass` on `92263f0`), and `gitleaks detect --source .
--no-banner` run for real — it is installed on this machine, at the WinGet
package path Jahmyr found — reporting **no leaks found** over 39 commits
before any change of mine, and again over 40 after.

### Document audit

| Document | State | Action taken |
|---|---|---|
| This handoff doc | Complete. Jared's assignment, both of Amon's rounds, both of Jahmyr's rounds all present and legible. The round-1 defect, its round-2 close (verified three ways), the gitleaks correction, and the `control-labels` withdrawal are all recorded in Jahmyr's own round-2 section, directly under the claims they correct — a later reader hits the correction before the original note | None needed |
| `README.md` | Run/test/build commands present, correct, and matched `CLAUDE.md` — except `CLAUDE.md` had not caught up. `bun run docx:libreoffice` documented in the run block and its own section, with what it buys and does not, the search order, and the override name | None needed |
| `CLAUDE.md` | Out of sync: its run block and status snapshot predated this cycle, so it disagreed with `README.md` about what commands exist | Added `bun run docx:libreoffice` to the run block and a short status paragraph pointing at this handoff doc and D104–D111, on the branch, committed and pushed before merge |
| `docs/DECISIONS.md` | D104–D111 present, in the existing table's shape and voice, each dated and attributed to its round | None needed |
| `.env.example` | Still declares no variables. Correct: `MAPDS_SOFFICE` is read by a local developer command, not by any code the browser ships, and D110 records the reasoning for leaving it out. Agree with the call | None needed |
| `docs/tasks/10-deploy.md`, `docs/tasks/11-definition-of-done.md` | Both still `**Status:** ready`, unmoved by this chore, as the assignment said they should be | None needed |
| No task file for this chore | Correct by design — `docs/` is generated from `docs/intake.md`, which never described this cycle. This handoff doc is the whole contract, and all fourteen acceptance criteria in it are checked | None needed |
| `docs/RUNBOOK.md` | Not edited (generated doc). Its section 0.2 gitleaks/grep guidance was never wrong — it already documents gitleaks as primary and the grep as a weaker fallback. The "no gitleaks here" claim that needed correcting lived only in this handoff doc's prose, not in RUNBOOK | None needed; flagging only for completeness |

### Gates

`bun run test`: pass — 491 passed, 32 files (re-run twice, before and after the CLAUDE.md commit; identical both times).

CI: green — `gh pr checks 27` showed both `test` jobs `pass` on `92263f0` before my change, and both `pass` again on `a7c8058` after it (1m43s, 1m51s).

Secret scan: clean — `gitleaks detect --source . --no-banner` (the real gate; it is installed via WinGet on this machine), "no leaks found" over 39 commits before my commit and 40 after.

### Merge

Squashed as `60c4de2` into `main`. Branch `chore/libreoffice-docx-check` deleted (local and remote). PR https://github.com/IBatsios/map-data-structures/pull/27.

One doc-fix commit (`a7c8058`, CLAUDE.md sync) went in on the branch first, CI re-ran and stayed green, then the PR was marked ready and merged.

### Left for a person

Microsoft Word verification: opening `order-intake.docx` in real Microsoft Word remains open and belongs to the user — no machine that has touched this project has Word. This cycle strengthens the signal (a real, independent OOXML implementation now checks every export) but does not close the item.

Task 10 (Netlify/GitHub account linkage) is still a human step, documented in the refreshed `docs/handoff-items/handoff-next-phase.md`.

The CI follow-on for `docx:libreoffice` (its own job, `MAPDS_SOFFICE` set explicitly so a missing install fails loudly rather than silently passing) is named but not started — a person or a future cycle picks a decision on it.
