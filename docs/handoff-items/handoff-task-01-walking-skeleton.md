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
