<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 01: Walking skeleton

**What to build:** The thinnest version of "Upload JSON get a drawing back" that works end to end. The app starts, a user can reach the one page that path needs, choose a JSON file, and see a drawing of its nodes and edges. No styling beyond defaults, no validation messages, no export, no second feature.

**Blocked by:** None. Phase 0 of the runbook must be complete first: remote created, secrets scanned, first push done. There is no database, and `.env` has no variables.

**Status:** in progress

## Steps, in order

1. Initialize the project with the standard tool for TypeScript and Astro, in this directory: `bun create astro@latest . -- --template minimal --no-git` (confirm the flags with the user). The directory already holds `docs/`, `CLAUDE.md`, and the other kickoff files, so accept the prompt about a non-empty folder and keep them. Confirm `tsconfig.json` extends Astro's strict config.
2. Add the test runner (Vitest) and one test that needs no browser and no database: a pure function, for example `parseDesign(json)` that turns a parsed JSON object into a list of nodes and edges. Install with `bun add -d vitest`, configure `vitest.config.ts` with Astro's `getViteConfig` helper, and add `"test": "vitest run"` to the `scripts` in `package.json`. Run it with `bun run test`. Plain `bun test` runs Bun's own test runner instead of Vitest, so every command and document says `bun run test` (confirm).
3. Add the CI file for GitHub at `.github/workflows/ci.yml`:

   ```yaml
   name: ci
   on:
     push:
       branches-ignore: [main]
     pull_request:
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v2
         - name: Install
           run: bun install --frozen-lockfile
         - name: Test
           run: bun run test
   ```

   The `oven-sh/setup-bun@v2` step and the `--frozen-lockfile` flag are the generic set's guess for a bun project; confirm them with the user. `main` is not protected in this project, so if you commit to `main` directly, add `main` to the push trigger so CI still runs.
4. Wire the single page the most important path needs: `src/pages/index.astro` with a labeled file input. On choosing a file, read it in the browser, `JSON.parse` it, pass the result through the function from step 2, and render one SVG with a box per node and a line per edge. Static placement, such as boxes in a row, is enough. Nothing is sent to a server.
5. Write the run and test commands into `README.md` and check they match `CLAUDE.md`.
6. Before writing code, start the branch `feature/walking-skeleton` from `main`; commit there, and open the pull request when the criteria pass. `main` is not protected, so a direct commit is allowed, but the pull request is what gives CI a run.

## Acceptance criteria

- [ ] `bun run dev` starts the app with no errors.
- [ ] `bun run test` passes with at least one test.
- [ ] "Upload JSON get a drawing back" can be demonstrated in its thinnest form: choose a JSON file with two nodes and one edge, and two boxes and a line appear.
- [ ] CI is green on GitHub for this branch.
- [ ] `.env.example` lists every variable the code reads, and no secret is in the repository.

## Suggested skills

- `coding-standards`: before the first file, for naming and structure.
- `tdd-workflow`: write the `parseDesign` test before the function.
- `setup-pre-commit`: after the project exists, to add formatting and the test run on commit.

## Notes

Keep the skeleton test free of the browser and of any library, so CI needs nothing but bun. Playwright is not needed here; Task 03 adds the first end-to-end test and the CI step that installs the browsers.
