# Handoff — Chore: a repeatable LibreOffice check for the `.docx` export

**Date:** 2026-09-19
**Branch:** chore/libreoffice-docx-check
**Task file:** none — see "Why this has no task file" below
**Round:** 1

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

- [ ] 1. There is exactly one opt-in command, run as `bun run <name>`, that
      converts the app's own `.docx` exports with the locally installed
      LibreOffice and reports a pass or fail per fixture. It is documented in
      `README.md` beside the other `bun run` entries.
- [ ] 2. `bun run test` runs the same Vitest suite it runs today and starts no
      LibreOffice and no browser; the default `bun run test:e2e` run is
      unchanged in which specs it executes. Neither gains a dependency on a
      binary most machines lack. Falsifiable both ways: on this machine, and
      with LibreOffice made unreachable, both commands still pass.
- [ ] 3. The `.docx` under test is the one the app's **browser export** produced
      in that run, obtained through the existing `UploadPage` download helper
      (`downloadWord(saveAs)` already writes the produced bytes to a chosen
      path). No `.docx` is committed to the repository, and no second producer
      of `.docx` bytes is written.
- [ ] 4. At minimum these five fixtures are converted and all pass on this
      machine: `order-intake` (the ordinary case), `control-labels` (D76's
      XML-forbidden characters — the fixture whose *unfixed* form LibreOffice
      refused with `Error: source file could not be loaded`, so it is what
      gives this check teeth), `empty-design` (D51's sentence), `markup-labels`
      (D56) and `estate-sweep` (the large one). The command's own output goes
      in your section of this doc.
- [ ] 5. Each converted file is read back and asserted to still carry the
      design's **title, every node label and every edge label**. A conversion
      that returns exit 0 and loses content is a **fail**, not a pass.
- [ ] 6. A conversion that succeeds while writing `Could not find platform
      independent libraries <prefix>` to stderr is reported as a **success**.
      There is a test that fails if stderr alone is ever treated as a failure,
      and **that test passes on a machine with no LibreOffice installed** —
      i.e. the verdict logic is a pure function of (exit code, stderr, whether
      the output file was written) and is unit-tested in Vitest, so it is
      checkable in CI where no LibreOffice exists.
- [ ] 7. Presence is never probed by running `soffice --version`, or by any
      other bare invocation that finding 4 shows hangs. Every invocation that
      could hang is bounded by a timeout, and a timeout is reported **as a
      timeout, naming the command that was run**, distinct from a conversion
      failure.
- [ ] 8. Every invocation passes `-env:UserInstallation=` pointing at a profile
      directory the run owns, outside the repository. If such a directory could
      ever land inside the working tree, `.gitignore` covers it; `git status`
      after a full run is clean.
- [ ] 9. The binary is located by an environment-variable override first, then
      known install locations for Windows, macOS and Linux, so a teammate on
      another platform is not locked out. On Windows it resolves to
      `soffice.com` and never `soffice.exe`. The override's name and the search
      order are documented in `README.md`.
- [ ] 10. With LibreOffice absent — falsifiable on this machine by pointing the
      override at a path that does not exist — the command **exits 0**, prints
      one clear line saying LibreOffice was not found, where it looked, and how
      to point it at an install, and turns no suite red. Demonstrate it exactly
      that way and paste the output.
- [ ] 11. `.github/workflows/ci.yml` is unchanged: no LibreOffice install, no
      new step.
- [ ] 12. What this buys and does not buy is written where a later reader finds
      it — in the new code's own module comment and in `README.md`. It must say
      that LibreOffice is an independent OOXML implementation and not Word's
      renderer, and that opening a produced `.docx` in real Microsoft Word once
      remains open and belongs to the user.
- [ ] 13. New decisions are recorded in `docs/DECISIONS.md`, starting at
      **D104** (D103 is the highest today), in the existing table's shape and
      voice.
- [ ] 14. `bun run test` passes, `bun run check` passes, and CI is green on the
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
