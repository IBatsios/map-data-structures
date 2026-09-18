<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# MapDataStructures — Decisions

One line per decision. Newest at the bottom. Reasons come from the intake; where it gave none, the reason is "chosen in intake" and can be filled in later.

| # | Decision | Why | Source |
|---|---|---|---|
| D1 | Stack: TypeScript, Astro, no backend, no database, no data layer, CSS Modules, tests with Vitest and Playwright, bun | chosen in intake | Section 8 |
| D2 | Code lives on GitHub, public, licensed MIT | chosen in intake | Section 9 |
| D3 | Runs on Netlify; environments: production | chosen in intake | Section 10 |
| D4 | Default branch protected: false (differs from the default true) | chosen in intake | Section 9 |
| D5 | Database backup before every migration: false (differs from the default true) | chosen in intake | Section 9 |
| D6 | Handoff docs: true (differs from the default false) | chosen in intake | Section 9 |
| D7 | Must use: open-source libraries only | per Section 7: drawing, layout, and file generation run inside the app with open-source libraries | Section 12 |
| D8 | Must avoid: paid services | budget is free tiers only | Section 12 |

---

## Added after the build

| # | Decision | Why | Source |
|---|---|---|---|
| D9 | Phase 0.3 resolved to settings only: no ECC files installed for this project | ECC is already installed at user level, all 20 rule families and every skill this project's CLAUDE.md names; a project-local install would have duplicated 359 files and added about 60 unrelated agents | `/project-init`, 2026-09-18 |
| D10 | Permissions live in `.claude/settings.json`, shaped for bun, not npm | the ECC stack mapping's allowlist assumes npm and npx; this project runs bun, so the mapping's entries would never match | `/project-init`, 2026-09-18 |
| D11 | Creating the GitHub remote and editing the repo are denied to agents | the runbook reserves Phase 0 for a person because it needs account decisions; the deny list makes that instruction enforceable rather than advisory | `/project-init`, 2026-09-18 |
| D12 | Scaffolded with `bun create astro@latest . -- --template minimal --no-git`, but into a temporary subdirectory whose files were then moved into the root; package name `map-data-structures` | the scaffolder refuses a non-empty directory and, run non-interactively, invents a new folder rather than using `.`; moving the files in is what keeps `docs/`, `CLAUDE.md`, `LICENSE` and the existing `.gitignore` intact. Astro's generated `.gitignore` was merged into the existing one, not substituted. Confirms the flags the task file flagged as a guess | Task 01, 2026-09-18 |
| D13 | CI is `oven-sh/setup-bun@v2` with `bun install --frozen-lockfile` and `bun run test`, triggered on push to any branch but `main` and on every pull request | the task file's proposal, confirmed as written: it is the action Oven publishes, and the frozen install is what makes the committed `bun.lock` load-bearing. `bun run test` never `bun test`, which would run bun's own runner and skip Vitest | Task 01, 2026-09-18 |
| D14 | Provisional JSON shape: `{ title, nodes: [{ id, label, type }], edges: [{ from, to, label }] }` | the data model in `docs/ARCHITECTURE.md` names the fields but not the edge's two endpoints; `from` and `to` read as the direction the line is drawn. Provisional on purpose — Task 02 owns the Zod schema and the published shape, and is free to rename before anything is public | Task 01, 2026-09-18 |
| D15 | The design core's types live in `src/lib/design.types.ts` and are named `Design`, `DesignNode`, `DesignEdge` | the types outlive `parseDesign`, which Task 02 replaces with a validating `loadDesign`; keeping them in their own module means the schema, the layout and the four exporters share one definition. The prefix is because `Node` is a DOM global and a page module importing both would silently get the wrong one | Task 01, 2026-09-18 |
| D16 | Prettier is configured to the Astro scaffold's own style (2 spaces, single quotes, width 90) with `prettier-plugin-astro`, and does not format `docs/` or `.claude/` | the `setup-pre-commit` skill's defaults (tabs off, double quotes, width 80) would have rewritten every file the scaffold wrote; the plugin is the only way Prettier can read `.astro` at all. `docs/` is generated from the intake and `.claude/` is owned by the pipeline, so formatting either would churn files that get rewritten anyway | Task 01, 2026-09-18 |
| D17 | TypeScript itself is not a dependency yet, so nothing type-checks: no `astro check`, and no typecheck step in the pre-commit hook | Task 01 was to keep the dependency list to Astro, Vitest and the formatter, and Vitest transpiles without checking types. `tsconfig.json` does extend `astro/tsconfigs/strict`, so the settings are in place for whichever later task adds `typescript` and `@astrojs/check` | Task 01, 2026-09-18 |
