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

## Phase 2 — go live

Task 10 is the record of this work. The steps are written out here because they
need a person with the accounts, the same way Phase 0 did. Phase 0 is already
done: `origin` points at `IBatsios/map-data-structures` and CI runs on every
pull request. Nothing below changes application code.

### 2.1 Create the site and link the repository

With the CLI:

```
netlify login
netlify init
```

Choose to create a new site and link it to the GitHub repository
`IBatsios/map-data-structures`. Without the CLI: in the Netlify console,
**Add new site → Import an existing project → GitHub**, then pick that
repository.

Either way the two settings that matter are:

| Setting | Value |
|---|---|
| Build command | `bun run build` |
| Publish directory | `dist` |

`dist` is where Astro writes the static site; `astro.config.mjs` takes the
default, so nothing overrides it.

### 2.2 Pin the toolchain

Netlify installs dependencies with Bun when it finds `bun.lock`, which is
committed. The Node version is the part worth pinning: Astro 7 needs Node 22 or
newer, and Netlify's default depends on when the site was created. Rather than
set it in the console, where the repository cannot see it, commit a
`netlify.toml` at the root:

```toml
[build]
  command = "bun run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

That file is then the whole configuration, so a rebuild from a fresh clone
behaves the same way. Read the first build log and confirm it installs with Bun
and builds on Node 22 before trusting it — that is the one step here that is
worth watching rather than assuming.

### 2.3 Environment variables: none

`.env.example` holds no variables and the site reads nothing from the
environment. There is no backend and no integration, so there is no production
secret to put in the site's settings. Netlify holds build settings only.

### 2.4 Walk the live site

A green build is not the test. Open the URL Netlify assigns and check by hand:

- **Upload JSON get a drawing back**, the path that matters. Use
  `public/sample.json`, or the **Load the sample design** link.
- Each of the four exports downloads and opens: Markdown, HTML, PDF, Word.
- `/schema` renders, and its copy button and download link work.
- A file that is not JSON, and a JSON file that fails validation, are both still
  refused with a readable message.

The Playwright walk already covers all of this against `dist/` locally, so
anything that fails here is a hosting problem rather than a code one.

### 2.5 Write the procedure into the README

`README.md` says deployment is still to come. Replace that with what is by then
true: a merge to `main` triggers a Netlify build, and the console shows the log.
Netlify also builds a deploy preview for each pull request, which gives a real
URL to click before merging.

### 2.6 A domain, when there is one

The intake names no domain, so the site lives at the URL Netlify assigns. When a
domain exists, attach it in the site's domain settings, create the DNS record
Netlify shows, then add it to `docs/intake.md` so it survives a regenerate.

## Done

v1 is done when the last task's acceptance criteria, which are the intake's definition of done, are all checked.
