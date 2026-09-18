# Handoff — Task 01: Walking skeleton

**Date:** 2026-09-18
**Branch:** feature/walking-skeleton
**Task file:** docs/tasks/01-walking-skeleton.md
**Round:** 1

## Assignment from Jared

### Scope

Build the thinnest end-to-end version of the most important path: **Upload JSON get a drawing back**. When this is done, a person can run the app locally, land on one page, choose a JSON file with two nodes and one edge, and see two boxes and a line.

There is no project yet. This task creates it. Concretely:

1. **Scaffold the project in place.** `bun create astro@latest . -- --template minimal --no-git`, run from the repository root. The directory is not empty and that is expected: `docs/`, `CLAUDE.md`, `LICENSE`, `.claude/`, `.env.example`, and `.gitignore` are already here and must survive. Confirm `tsconfig.json` extends Astro's strict config.
2. **Test runner before feature code.** `bun add -d vitest`, a `vitest.config.ts` built on Astro's `getViteConfig` helper, and `"test": "vitest run"` in the `package.json` scripts.
3. **The one pure function, test first.** `parseDesign(json)` takes an already-parsed JSON object and returns a list of nodes and a list of edges. Write its test before the function. No browser, no DOM, no library — CI must need nothing but bun to run it.
4. **CI.** `.github/workflows/ci.yml` as the task file spells it out, with `actions/checkout@v4`, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`, and `bun run test`.
5. **The one page.** `src/pages/index.astro` with a labeled file input. On choosing a file, read it in the browser, `JSON.parse` it, feed the result to `parseDesign`, and render one SVG with a box per node and a line per edge. Static placement — boxes in a row — is enough. Nothing is posted anywhere.
6. **README.md** with the run and test commands, checked against `CLAUDE.md`.
7. **Pre-commit** via the `setup-pre-commit` skill, once the project exists: formatting plus the test run on commit.

**Explicitly out of scope.** Do not build any of this, even if it feels one line away:

- Drag-and-drop, file name display, node and edge counts — that is Task 02.
- A Zod schema or typed validation — that is Task 02. `parseDesign` may assume well-formed input; a bad file may simply throw.
- Validation messages, error panels, line or field names — Task 04.
- A real layout engine (ELK, dagre), node shapes by type, arrowheads, edge labels — Task 03.
- Any export button, download helper, Markdown, HTML, PDF, or Word — Tasks 05 to 08.
- Playwright, a `test:e2e` script, or a browser-install CI step — Task 03 adds those.
- A `/schema` page or a shipped `sample.json` — Task 09.
- Netlify — Task 10. Do not configure a site or add `netlify.toml`.
- Styling beyond browser defaults. CSS Modules is the project's choice, but this task has no design work in it.

Use a small throwaway fixture (two nodes, one edge) for the demonstration. It is not `sample.json` and does not need to ship as one; if you commit a fixture, keep it beside the test so Task 09 stays free to author the real sample.

### Acceptance criteria

- [ ] `bun run dev` starts the app with no errors.
- [ ] `bun run test` passes with at least one test.
- [ ] "Upload JSON get a drawing back" can be demonstrated in its thinnest form: choose a JSON file with two nodes and one edge, and two boxes and a line appear.
- [ ] CI is green on GitHub for this branch.
- [ ] `.env.example` lists every variable the code reads, and no secret is in the repository.

### Files expected to change

A guide, not a cage.

- `package.json`, `bun.lock` — new, from the scaffold. **Commit the lockfile.**
- `astro.config.mjs`, `tsconfig.json` — new, from the scaffold.
- `vitest.config.ts` — new.
- `src/pages/index.astro` — the one page: file input plus SVG rendering.
- `src/lib/parseDesign.ts` (or the equivalent the `coding-standards` skill points to) — the pure function.
- `src/lib/parseDesign.test.ts` — written first.
- `.github/workflows/ci.yml` — new.
- `README.md` — new.
- `.gitignore` — the scaffold will want to write its own. Merge Astro's entries into the existing file rather than replacing it; the current one is generated from the intake and already covers `node_modules/`, `dist/`, `.astro/`, `.env`, and test artifacts.
- `.env.example` — only if the code actually reads a variable. It should read none.
- `docs/tasks/01-walking-skeleton.md` — Jahmyr checks the boxes, not you.

Do not touch `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`, or `docs/intake.md`. They are generated from the intake and hand edits are lost on regenerate. `docs/DECISIONS.md` is the one doc that is appended to by hand — add a row there for anything you decide that the intake did not.

### Skills to load

- `coding-standards` — before the first file, for naming and structure. This task sets the conventions every later task inherits.
- `tdd-workflow` — the `parseDesign` test before the `parseDesign` function.
- `setup-pre-commit` — once `package.json` exists, to add formatting and the test run on commit.

### Watch out for

- **`bun run test`, never `bun test`.** Plain `bun test` runs Bun's own runner instead of Vitest and will quietly not run the Vitest suite. Every script, README line, CI step, and commit message says `bun run test`. If you find it written wrong anywhere, fix it.
- **The lockfile is load-bearing.** CI runs `bun install --frozen-lockfile`, which fails if `bun.lock` is missing or out of step with `package.json`. Commit it, and re-commit it whenever you add a dependency.
- **The scaffold is running into an occupied directory.** Accept the non-empty-folder prompt and keep the existing files. Afterwards run `git status` and confirm nothing tracked got clobbered — especially `.gitignore` and `LICENSE` (MIT, per D2).
- **CI trigger shape.** The workflow is `branches-ignore: [main]` on push plus `pull_request`. Pushing `feature/walking-skeleton` gives it a run. The acceptance criterion says green **on GitHub**, so the work is not done until a run has actually passed there. `main` is unprotected (D4), but the pull request is what gives CI its run — open one.
- **Pushing and PRs are yours; repo administration is not.** `.claude/settings.json` allows `git push -u origin feature/...` and `gh pr create`; it denies `gh repo create`, `gh repo edit`, force pushes, and `git push origin main` (D11). Do not merge — Sam merges.
- **Open-source libraries only, no paid services** (D7, D8). Keep the dependency list to Astro, Vitest, and the formatter. The skeleton test must stay free of the browser and of any library so CI needs nothing but bun.
- **Nothing leaves the browser, ever.** No backend, no database, no data layer (D1). The file is read with the File API. This is not only architecture, it is the PRD's retention promise.
- **No environment variables exist today** and the site reads nothing from the environment. If that stays true, `.env.example` needs no edit; say so rather than inventing a placeholder.
- **Confirm the choices the task file flags as unconfirmed** before committing to them: the exact `bun create astro` flags, the `oven-sh/setup-bun@v2` action with `--frozen-lockfile`, and the `bun run test` script name. If you resolve one on your own judgement, record it as a row in `docs/DECISIONS.md` with the reason.
- **`parseDesign`'s shape outlives this task.** Task 02 replaces its innards with a Zod-validated `loadDesign`, and Task 03's layout function consumes its output. Keep it pure, and keep its return shape honest to the data model in `docs/ARCHITECTURE.md`: a Design has a title, many Nodes (id, label, type), and many Edges (two node ids, label). Do not build the validation now — just do not design a shape that fights it later.

### Definition of done for this cycle

Every acceptance criterion above is checked in the task file, `bun run test` passes, and CI is green on the pull request.

---

## Work completed by Amon — round 1

### What was built

There is a project where there was none. `bun install`, `bun run dev`, `bun run test`
and `bun run build` all work. One page at `/` has a labelled file input; choosing a
JSON file reads it in the browser with the File API, parses it, hands it to
`parseDesign`, and draws one SVG with a box per node and a line per edge. Nothing is
posted anywhere and nothing is stored. Vitest runs four tests over the one pure
function, GitHub Actions runs them on every push and pull request, and a pre-commit
hook formats staged files and runs the suite before a commit lands.

The scaffolder would not write into a non-empty directory, so it was run into a
temporary subdirectory and its files moved into the root. `docs/`, `CLAUDE.md`,
`LICENSE`, `.claude/` and `.env.example` are byte-for-byte untouched, and Astro's
`.gitignore` entries were merged into the existing file rather than replacing it —
only five dependency-manager log patterns were actually new.

### Files added or changed

- `package.json` — new. Name `map-data-structures`, `"test": "vitest run"`, `"prepare": "husky"`.
- `bun.lock` — new, committed. CI installs with `--frozen-lockfile`, so it is load-bearing.
- `astro.config.mjs`, `tsconfig.json` — new, from the scaffold. `tsconfig.json` extends `astro/tsconfigs/strict`.
- `vitest.config.ts` — new. Built on Astro's `getViteConfig`, so a test resolves imports the way a page does.
- `src/lib/design.types.ts` — new. `Design`, `DesignNode`, `DesignEdge`: the data model from `docs/ARCHITECTURE.md`.
- `src/lib/parseDesign.ts` — new. The one pure function; no validation, by design.
- `src/lib/parseDesign.test.ts` — new, written first. Holds the two-node one-edge fixture inline.
- `src/pages/index.astro` — the one page: file input, status line, SVG drawing.
- `public/favicon.ico`, `public/favicon.svg` — from the scaffold.
- `.github/workflows/ci.yml` — new, the task file's YAML verbatim.
- `README.md` — new. Run, test and build commands, checked against `CLAUDE.md`.
- `.gitignore` — merged, not replaced. Added only the `npm/yarn/pnpm/bun-debug.log*` patterns.
- `.husky/pre-commit`, `.lintstagedrc`, `.prettierrc`, `.prettierignore` — new, the pre-commit setup.
- `docs/DECISIONS.md` — appended D12 to D17.
- `docs/tasks/01-walking-skeleton.md` — untouched. The boxes are yours.
- `.env.example` — untouched, deliberately. See the notes at the end.

### Tests written

Four, all in `src/lib/parseDesign.test.ts`, all pure: no browser, no DOM, no library
beyond Vitest, so CI needs nothing but bun.

1. _returns the title, nodes and edges of a two-node, one-edge design_ — pins the whole
   return shape, field by field. This is the contract Task 02's `loadDesign` has to keep.
2. _keeps every node and every edge, in the order the file lists them_ — the PRD's rule
   that the drawing shows everything in the JSON, with nothing dropped or mislabeled.
3. _returns empty lists for a design that has no nodes and no edges_ — the empty case
   returns empty lists rather than throwing.
4. _does not mutate the object it was given_ — pins purity, and that the result is a copy
   rather than a view onto the parsed file, which is what lets Task 03's layout and the
   exporters hold it safely.

### Local results

`bun run test`: pass — 1 file, 4 tests, about 200ms.
`bun run build`: pass — 1 page built, static output to `dist/`.
`bun run dev`: pass — server up on 4321, `GET /` returned 200, and `astro dev logs` shows
no errors or warnings.

### Decisions recorded

Six rows appended to `docs/DECISIONS.md`:

- **D12** the scaffold flags, and why the files were moved in from a temporary folder.
- **D13** confirms `oven-sh/setup-bun@v2`, `--frozen-lockfile` and `bun run test` — the three
  things the task file flagged as unconfirmed guesses.
- **D14** the provisional JSON shape, including `from` and `to` as the edge's endpoints,
  explicitly marked as Task 02's to rename before anything is published.
- **D15** the types module and the `Design`-prefixed names, because `Node` is a DOM global.
- **D16** the Prettier configuration and why it differs from the `setup-pre-commit` defaults.
- **D17** that TypeScript is not installed, so nothing type-checks today.

### Known gaps

- **The drawing was not verified in a real browser.** Playwright is Task 03's, and this task
  is told to keep the suite free of the browser. What I did instead: served the page and read
  the markup back, then ran the page's own client script under a throwaway DOM stub in the
  scratch directory and inspected the SVG it produced — two `rect`s at x=24 and x=240, a
  `line` from x=184 to x=240 at y=56, both labels centred, and the `title` element present.
  That is strong evidence, not a demonstration. **Please open it in a browser and choose a
  real file**; the JSON block in `README.md` is a fixture you can paste into a file and use.
- **The page's client script has no automated test.** Testing it needs a DOM environment
  (jsdom or happy-dom), which this task's dependency limit excludes. It stays uncovered until
  Task 03's Playwright walk.
- **Nothing type-checks.** See D17. `tsconfig.json` is strict, but no `tsc` and no
  `astro check` runs anywhere, so a type error — particularly inside the `<script>` block in
  `index.astro`, which Vitest never loads — would go unseen. The code is written so that it
  needs no cast anywhere, but that is care, not a gate.
- **CI green on GitHub is not demonstrated, and I did not push.** The assignment's "Watch
  out for" section says pushing and opening the pull request are mine; my operating limits
  say the opposite in as many words — no pushing, no pull requests, no merging, Jahmyr
  pushes for CI. Faced with the two, I kept to the narrower one and left the branch local.
  Everything CI needs is committed: `.github/workflows/ci.yml` triggers on push to any
  branch but `main` and on every pull request, and `bun.lock` is committed and in step with
  `package.json`, so `bun install --frozen-lockfile` will resolve. **Jahmyr: the first push
  of this branch gives the workflow a run, and the pull request gives it another.** If that
  division was not what was meant, it is worth settling in the assignment template rather
  than per task, because it will come up again on every task from here.

### Out-of-scope notes for Jared

Real things I found and left alone:

1. **No typecheck gate anywhere (D17).** Worth a task of its own, or a line in an existing
   one: add `typescript` and `@astrojs/check`, an `astro check` script, a CI step, and the
   typecheck line the `setup-pre-commit` skill wanted in the hook. The blind spot is the
   `<script>` block in every `.astro` page, which no test ever imports.
2. **Astro 7 changed `astro dev` into a detached background server.** It prints a pid and
   returns immediately; it is controlled with `astro dev status`, `astro dev logs` and
   `astro dev stop`. Task 03's Playwright `webServer` config, and anything else that expects
   `bun run dev` to block, will need to account for that.
3. **The pre-commit hook runs the whole suite.** That is 200ms today. Once Task 03 adds
   Playwright, make sure the hook keeps running only Vitest — if `bun run test` grows into the
   end-to-end walk, every commit will start a browser.
4. **`husky init` writes `bun test` into the hook** — bun's own runner, not Vitest. I fixed it,
   but anyone re-running `husky init` gets it back. It is the exact trap the assignment warned
   about, and a tool generates it.
5. **The Astro scaffold ships its own `AGENTS.md` and `CLAUDE.md`.** I brought neither into the
   repo, since the repo's `CLAUDE.md` is authoritative and the pipeline owns the agent files.
   If anyone wants Astro's framework notes for agents, that is a choice to make deliberately,
   not an oversight to correct.
6. **A malformed file currently shows one line of text** in the status region and clears the
   drawing. That is an error boundary, not the validation feature — leaving the exception
   uncaught would have meant a bad file silently doing nothing at all. Task 04 should replace
   that line wholesale; please do not read it as validation already half-built.
7. **`.env.example` was deliberately not edited.** Nothing in `src/`, `astro.config.mjs` or
   `vitest.config.ts` reads `import.meta.env` or `process.env` — verified by grep — so there is
   no variable to list. A pattern scan for keys and private keys over the working tree found
   nothing.

---

## Test report from Jahmyr — round 1

### Verdict

**Pass.** Every acceptance criterion was exercised and holds. CI is green on the pull
request. No defects to hand back, nothing fixed in place, no secret in the repository.

### Criterion by criterion

| Criterion | Result | Evidence |
|---|---|---|
| `bun run dev` starts the app with no errors | pass | Server came up on 4321 (pid 32476). `astro dev status` reported it running; `astro dev logs` showed `astro v7.3.3 ready in 1030 ms` and nothing above info. `curl http://localhost:4321/` returned 200 with the page's markup. Stopped afterwards. |
| `bun run test` passes with at least one test | pass | 1 file, **4 tests**, 187ms, all passing. Not a vacuous zero-test exit — the run names `src/lib/parseDesign.test.ts (4 tests)`. |
| Two nodes and one edge draw two boxes and a line | pass | Driven in **real Chrome** via Playwright against the dev server, using the README's JSON block written to a file and handed to the real file input. Result: 2 `rect` (160×64 at x=24 and x=240, both with non-zero rendered size), 1 `line` (184,56 → 240,56), labels `Public API` and `Order queue`, `<title>Order intake</title>`, `aria-label="Drawing of Order intake"`, empty status line, zero console errors, zero uncaught page errors. Screenshot confirms two labelled boxes joined by a line. |
| CI is green on GitHub for this branch | pass | Two green runs: [35318087818](https://github.com/IBatsios/map-data-structures/actions/runs/35318087818) from the push and [35318113943](https://github.com/IBatsios/map-data-structures/actions/runs/35318113943) from the pull request, 7s and 8s. Log confirms `bun install --frozen-lockfile` resolved against the committed `bun.lock` and `bun run test` ran `vitest run` to `4 passed (4)`. |
| `.env.example` lists every variable the code reads, and no secret is in the repository | pass | `git grep` for `import.meta.env`, `process.env`, `getEnv` and `PUBLIC_` across the tracked tree outside `docs/` returns nothing, so there is no variable to list and the untouched `.env.example` is correct. `gitleaks detect --source . --no-banner` scanned 12 commits / 206 KB: **no leaks found**. |

### Command results

`bun run test`: 1 file, 4 tests, 4 passed, 187ms.
`bun run build`: pass — 1 page, static output to `dist/`, 349ms, no warnings.
Secret scan: `gitleaks` — no leaks found across 12 commits.
CI: green, both the push run and the pull request run.

### Beyond the checklist

**Adversarial inputs.** Ten files through the real file input. Every failure is caught,
writes one line to the status region, clears the drawing, and leaves no uncaught error;
every success draws. Recovery works — a good file after ten bad ones still draws.

| Input | Result |
|---|---|
| empty file (0 bytes) | caught: "Unexpected end of JSON input" |
| malformed JSON (`{`) | caught: "Expected property name or '}'…" |
| parses but has no `nodes` | caught: "Cannot read properties of undefined (reading 'map')" |
| top-level array `[]` | caught, same |
| `null` | caught: "Cannot read properties of null (reading 'title')" |
| `nodes` is a string | caught: "raw.nodes.map is not a function" |
| edge naming an undefined node | caught: "an edge names a node the file does not define" |
| duplicate node ids | draws; both edges resolve to the later box (see observation 1) |
| label containing `<script>` / `<img onerror>` | drawn as **text**, no dialog fired — `textContent` is doing its job |
| 5000 nodes, 4999 edges, 476 KB | drew all 5000 boxes and 4999 lines, no hang, no crash |

**Accessibility (best effort, `front-a11y` rule set).** Zero Critical, zero Major, zero
Minor against the rule set. `<html lang="en">`, a `<main>` landmark, one `h1`, and the
file input is properly associated with `<label for="design-file">`. At runtime the first
Tab stop is that input with accessible name "Design JSON file"; the status paragraph is
`role="status"`, so a failure is announced; the generated SVG carries `role="img"`, an
`aria-label`, and a `<title>` child, so it is not an unlabelled graphic.

**Type health.** There is no typecheck script and TypeScript is not installed, exactly as
D17 records, so the criterion has no gate in the repo. To get real signal on the blind
spot Amon named, I extracted the 165-line `<script>` block from `index.astro` into a
`.ts` file in a scratch directory alongside copies of `src/lib`, and ran `tsc --noEmit`
under `astro/tsconfigs/strict`: **exit 0, zero errors**. The `.astro` script block is
type-clean today. Nothing in the repository enforces that it stays so — that is the gap,
and it is a real one, but it is not a defect in this task's work.

### Defects for Amon

None.

### Fixed in place

None. Nothing needed correcting.

### Observations, for Jared to route — not defects in Task 01

1. **Duplicate node ids silently collapse.** `originsByNodeId` in `src/pages/index.astro`
   builds a `Map` keyed by node id, so two nodes sharing an id both draw their boxes but
   every edge touching that id resolves to the later box. Correct behaviour for a task
   that was told to assume well-formed input; it is precisely the kind of thing Task 02's
   Zod schema should reject, so it is worth naming in that task's assignment as a case to
   cover rather than leaving it to be rediscovered.
2. **A successful drawing is announced to nobody.** On success the status line is cleared
   and `#drawing` is not a live region, so a screen reader user gets silence where a
   sighted user gets a picture. Out of scope here — Task 03 or Task 04 owns the status
   messaging, and it is a one-line fix when they do.
3. **Amon's pushing contradiction is settled, in his favour.** `.claude/settings.json`
   allows `git push -u origin feature/…`, `gh pr create` and `gh pr checks` and denies
   force pushes, `git push origin main`, and `gh repo create|edit`. Pushing and opening
   the pull request are Jahmyr's; Amon was right to stop at the branch. The assignment
   template's "Watch out for" section addresses that paragraph to the builder, which is
   what misled him — worth correcting in the template, as he suggested, since it recurs
   every task.
4. **`bun test` versus `bun run test` is clean.** The only occurrence of the bare form in
   the tracked tree is Amon's own warning about it in this document. The husky hook runs
   `bun run test`.

### Pull request

https://github.com/IBatsios/map-data-structures/pull/1 — open as a **draft**, both CI
runs green. Sam marks it ready and merges; I do not.
