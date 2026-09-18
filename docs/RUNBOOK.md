<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# MapDataStructures — Runbook

Phase 0 is for a person: it needs accounts, passwords, and judgement. Phase 1 is for whoever builds, agent or human, one task at a time.

Every command below is written for bash on Windows (Git Bash).

## Phase 0 — before any code

### 0.1 Create the remote

```
gh auth login
gh repo create IBatsios/map-data-structures --public --source=. --remote=origin
```

The login command is where the token is entered; it is never written into a file.

If the CLI is not installed: create the repository at `https://github.com/new` with the name `map-data-structures`, visibility public, no README, then:

```
git remote add origin https://github.com/IBatsios/map-data-structures.git
```

### 0.2 Scan for secrets

The gate sits immediately before the first push, public or private alike. Install gitleaks on Windows:

```
winget install gitleaks
```

Or download the release binary from `https://github.com/gitleaks/gitleaks/releases` and put it on the PATH. Then run:

```
gitleaks detect --source . --no-banner
```

"No leaks found" means push. Anything else means remove the value from the file, rotate it with the provider that issued it, and run the scan again. Rotation matters even though nothing was pushed, because the value has been in a file on disk.

If gitleaks is not installed, a weaker check with no install, for bash:

```
grep -rInE --exclude-dir=.git --exclude-dir=node_modules -e 'AKIA[0-9A-Z]{16}' -e 'sk-[A-Za-z0-9]{20,}' -e 'ghp_[A-Za-z0-9]{36}' -e 'glpat-[A-Za-z0-9_-]{20,}' -e 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' -e '(password|secret|token|api_key)\s*[=:]\s*["'"'"'][^"'"'"']{8,}' .
```

No output means nothing matched. A match in `.env.example` with a placeholder value is fine; a match anywhere else is not.

`.env` is in `.gitignore` and must stay there. `.env.example` holds names and placeholder values only; today it holds no variables at all, because the site reads nothing from the environment.

### 0.3 Install the ECC rules for this stack

Run `/project-init` in this directory and accept the plan it proposes.

### 0.4 Push

```
git push -u origin main
```

The first pull request comes with Task 01, from its branch to `main`. `main` is not protected in this project, by the intake's choice, so no branch protection is set up.

## Phase 1 — build

Pick the next task from the **frontier**: any task whose "Blocked by" list is entirely done. Finish it to its acceptance criteria before starting another. Each task lives in `docs/tasks/`. Every task starts on its own branch from `main` and ends in a pull request; `main` is unprotected, so a direct commit is allowed, but the pull request is what gives CI a run.

| # | Task | Blocked by | Delivers |
|---|---|---|---|
| 01 | Walking skeleton | none | Upload JSON get a drawing back works end to end in the thinnest form, one test, CI green |
| 02 | Upload a JSON file | 01 | File picker and drag-and-drop; the JSON becomes a validated Design in the browser |
| 03 | Preview the generated drawing | 01, 02 | Laid-out SVG of every node and edge; the first Playwright test and its CI step |
| 04 | Validation errors | 01, 02 | Malformed JSON shows the line; a missing field shows the field |
| 05 | Export as Markdown | 01, 03 | Download of `<design>.md` matching the preview; the shared download helper |
| 06 | Export as HTML | 01, 03, 05 | Download of a standalone `<design>.html` |
| 07 | Export as PDF | 01, 03, 05 | Download of `<design>.pdf` generated in the browser |
| 08 | Export as a Word document | 01, 03, 05 | Download of `<design>.docx`; the Playwright walk covers all four downloads |
| 09 | Schema and sample file | 01, 02, 04 | A schema page, a shipped `sample.json`, and a "Load sample" link |
| 10 | Deploy to Netlify | 01 | The site live at Netlify's URL from `main`, repeatable by merge |
| 11 | Definition of done for v1 | 01 to 10 | v1 verified against the intake's definition of done |

## Done

v1 is done when the last task's acceptance criteria, which are the intake's definition of done, are all checked.
