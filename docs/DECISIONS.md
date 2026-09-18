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
