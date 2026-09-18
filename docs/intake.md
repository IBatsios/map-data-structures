---
# kickoff intake. Fill this in, then run /kickoff in the project folder.
# The block between the --- lines is for the developer. Everyone else: skip to "Section 1" below.
# Options are listed after each # sign. Write the option exactly as shown. Leave a field blank if you do not know.
# If your answer is not in the list, write your own. It is recorded as-is and gets the generic setup instead of a stack-specific one.

kickoff_version: 0.1.0

project:
  name: "MapDataStructures"
  slug: "map-data-structures"  # lowercase-with-hyphens; blank derives it from name
  type: "web app"          # web app | API only | command-line tool | desktop app | mobile app | library | other

data:
  sensitive: [none]  # personal details | payment data | health data | data about minors | none

features:
  auth: false              # true if anyone signs in (Section 6)
  auth_methods: []         # email and password | magic link | Google | GitHub | Apple | Microsoft | single sign-on | other

stack:                     # (developer) Section 8
  language: "TypeScript"  # TypeScript | JavaScript | Python | Go | Rust | other
  frontend: "Astro"  # Next.js | React with Vite | Astro | Vue or Nuxt | SvelteKit | none | other
  backend: "none"  # Next.js route handlers | Express | Fastify | NestJS | FastAPI | Django | none | other
  database: "none"  # PostgreSQL | SQLite | MySQL | MongoDB | none | other
  data_layer: "none"  # Prisma | Drizzle | SQLAlchemy | Django ORM | raw driver | none | other
  styling: "CSS Modules"  # Tailwind | CSS Modules | plain CSS | styled-components | none | other
  tests: [Vitest, Playwright]  # Vitest | Jest | Playwright | pytest | Go test | other
  package_manager: "bun"  # pnpm | npm | yarn | bun | uv | pip | cargo | Go modules | other

environment:               # (developer) Sections 8 and 10
  os: "Windows"  # Windows | macOS | Linux
  shell: "bash"  # PowerShell | bash | zsh | fish
  dev_database: ""         # Docker Compose | already installed on localhost | hosted connection string   (required if database is not none)

git:                       # (developer) Section 9
  host: "GitHub"  # GitHub | GitLab | Gitea | other | local only
  host_url: ""             # only for GitLab, Gitea, other. Example: https://gitlab.example.com
  owner: "IBatsios"  # the user or group the repository is created under
  visibility: "public"  # public | private
  license: "MIT"  # only if public: MIT | Apache-2.0 | GPL-3.0 | Unlicense | other
  existing_repo_url: ""    # only if the repository already exists

deployment:                # (developer) Section 10
  target: "Netlify"  # Vercel | Netlify | Cloudflare | Fly.io | Railway | Docker on a server I control | desktop packaging | local only | other
  domain: ""
  environments: [production]  # development | staging | production

conventions:               # (developer) Section 9. Asked in the walkthrough. Blank means "use kickoff's default, or my saved default".
  protect_default_branch: false  # true | false     work on branches, merge via MR or PR
  branch_prefixes: [feature, fix, chore]  # default: feature, fix, chore
  commit_style: conventional  # conventional | free
  env_example: true  # true | false
  db_backup_before_migrate: false  # true | false
  handoff_docs: true  # true | false
---

# Intake: MapDataStructures

How to fill this in:

- Answer under each question, after the `>` mark. Write as much or as little as you like.
- "I don't know" is a real answer for any optional question. It is recorded as something to find out. A blank is recorded as something nobody considered. Prefer "I don't know".
- Sections marked **(developer)** can be left for the developer.
- Sections marked **required** must be answered before the build can run. Inside them, every question not marked (optional) is required. Everything else is optional; blanks become open questions in the plan.
- The build never edits this file. To change the plan later, change this file and run `/kickoff` again.

## Section 1 — Project identity (required)

Fill `project.name`, `project.slug`, and `project.type` at the top, then answer here.

### 1.3 One-line pitch: "<name> is a <thing> for <who> that <does what>."

_If this is hard to write, the project is not defined yet. That is worth knowing now._

> MapDataStructures is a web app for software architects and technical leads that turns a JSON description of a system into a formatted architectural design document as Word, PDF, HTML, or Markdown.

## Section 2 — The problem (required)

### 2.1 What problem does this solve? Describe it from the point of view of the person who has it.

> I want to quickly create drawings based on data. Json is an easy data model that should be able to quickly create drawings that employees understand.

### 2.2 Who has this problem today, and how do they cope now?

_A spreadsheet, a competitor, doing nothing. Name the thing you are replacing._

> I'm the one with the problem. Anytime I want to explain how things work, I have to open draw.io to create a design. I'd rather write it in json and have it built for me.

### 2.3 Why build it now? (optional)

> To make my job easier. I have at least three use cases for it already.

### 2.4 What happens if it is never built? (optional)

> I'll waste time scouring the internet for a product that doesn't quite fit what I want

## Section 3 — Users and roles (required)

### 3.1 Who uses it? One line per type of user: who they are and what they want from it.

> Anyone that wants to upload json. I'll probably put it on my website.

### 3.2 Do different users get to do different things? List the roles, or write "one role".

_For example: admin, member, visitor._

> Nope. Simple. Upload a correctly formatted json and it architects the data model based on the shapes/drawings/model people want.

### 3.3 How many users at launch, and a year later? A rough guess is fine. (optional)

> One

### 3.4 How technical are they? Choose one: not at all / comfortable with apps / developers.

> developers

## Section 4 — Core features (required)

### 4.1 Must have for v1. One per line: "As a <role>, I can <do something>, so that <benefit>."

_The task list is generated from this list. Vague lines make vague tasks._

> As a user, I can upload a JSON file describing a system, so that I do not have to draw it by hand.
> As a user, I can see validation errors when the JSON is malformed or missing required fields, so that I can fix it quickly.
> As a user, I can preview the generated drawing in the browser, so that I can check it before exporting.
> As a user, I can export the design as Markdown, so that it drops into a repo or wiki.
> As a user, I can export the design as HTML, so that it can be shared as a standalone page.
> As a user, I can export the design as PDF, so that it can be attached to an email or ticket.
> As a user, I can export the design as a Word document, so that non-developers can edit it.
> As a user, I can read the JSON schema and a sample file, so that I know the format the app expects.

### 4.2 Should have. Same shape. (optional)

_Built after the must-haves. First to be cut if the plan is too big._

>

### 4.3 Could have. Same shape. (optional)

_Recorded, not scheduled._

>

### 4.4 The single most important thing a user does with it.

_This is the first path that gets built end to end._

> Upload JSON get a drawing back

## Section 5 — Data (optional)

Fill `data.sensitive` at the top, then answer here.

### 5.1 The main things the app keeps track of. One per line: what it is and what it is connected to.

_For example: "Invoice, belongs to a Customer, has many Line Items."_

> Design, uploaded as one JSON file, has many Nodes and many Edges.
> Node, belongs to a Design, is a box or shape with a label and a type.
> Edge, belongs to a Design, connects two Nodes and has a label.
> Export, produced from a Design, is one file in Markdown, HTML, PDF, or Word.

### 5.2 What must never be lost or wrong?

> The drawing must faithfully show every node and edge in the JSON, with nothing dropped or mislabeled.
> Every export format must show the same content as the browser preview.

### 5.3 Does anything need to be deleted, or kept for a fixed time?

> Nothing is stored server-side. Uploaded JSON and generated files live only for the request, or in the browser, and are discarded afterward.

## Section 6 — Sign-in and permissions (optional)

Set `features.auth` at the top. If it is `false`, skip this section. If `true`, fill `features.auth_methods` and answer here.

### 6.3 Who can do what? A short list: the role, then the things that role can do.

>

### 6.4 Can visitors who are not signed in see anything? What?

>

### 6.5 Is there an admin who manages other users? yes / no

>

## Section 7 — Integrations (optional)

### 7.1 External services this depends on. One per line: name, what it is for, and whether you already have an account.

_Think payments, email, file storage, maps, analytics, AI, calendars. Each one becomes a setup step._

> None. Drawing, layout, and file generation all run inside the app with open-source libraries, so no third-party API keys are needed.

### 7.2 Anything it must import from or export to? Files, other systems, formats.

> Imports one JSON file per design, matching a published schema.
> Exports the same design as Markdown (.md), HTML (.html), PDF (.pdf), and Word (.docx).

## Section 8 — Stack (required) (developer)

Fill the `stack` and `environment` blocks at the top. Every field is asked every time; saved defaults are only suggestions.

### 8.11 Anything the menus cannot capture: must-use libraries, must-avoid ones, pinned versions. (optional)

>

## Section 9 — Git host, visibility, and conventions (required) (developer)

Fill the `git` block at the top. Fill the `conventions` block too, or leave it blank to use the defaults. Nothing to answer here.

## Section 10 — Deployment, hosting, and dev environment (optional) (developer)

Fill the `deployment` block and `environment.dev_database` at the top. `dev_database` is required if a database was chosen.

### 10.5 Where do secrets live in production?

_Platform environment variables, a vault, a file on the server._

> None needed. The site is static with no backend and no integrations, so there are no production secrets. Netlify holds only build settings.

## Section 11 — Non-functional needs (optional)

### 11.1 How many people use it at once, and how fast must it feel?

> One person at a time. The drawing should appear within a second of choosing a file, and each export should download within a few seconds.

### 11.2 Accessibility target. Choose one: WCAG 2.2 AA / best effort / not a priority.

> best effort

### 11.3 Devices and browsers that must work.

> desktop

### 11.4 Must it work offline? yes / no

> no

### 11.5 Languages the interface must support. (default: English only)

> English only.

### 11.6 Security or compliance requirements you know of. (GDPR, HIPAA, SOC 2, none known)

> None known. Nothing is stored and no personal data is handled.

### 11.7 Uptime expectation. Choose one: hobby / business hours / always on.

> hobby

## Section 12 — Constraints (optional)

### 12.1 Deadline or first milestone.

> I don't know

### 12.2 Budget for paid services. Choose one: free tiers only / some / not a concern.

> free tiers only

### 12.3 Who is working on it? One per line: name, role, developer or not.

> Ioannis Batsios, owner and sole developer, developer.

### 12.4 Existing assets to reuse: designs, brand, domain, content, code.

> The personal website built with Astro, where the app may be linked or embedded.
> The existing draw.io designs as reference for what the drawings should look like.

### 12.5 Must-use or must-avoid technology, vendors, or licenses.

> Open-source libraries only, per Section 7. No paid services.

## Section 13 — Out of scope (optional, strongly encouraged)

### 13.1 Things this will explicitly not do in v1.

> Save designs between visits or keep a history of uploads.
> User accounts, sign-in, or sharing links.
> Editing the drawing by dragging shapes in the browser. The JSON is the only editor.
> Importing draw.io, Mermaid, or other diagram formats.
> Generating the JSON from a prose description with AI.

### 13.2 Things people will ask for that you are saying no to, and why.

> "Let me nudge the layout by hand." No, because the JSON is the source of truth and hand edits would vanish on the next upload.
> "Save my diagrams here." No, because storing designs means accounts, a database, and privacy questions, and a repo or wiki already keeps the JSON.
> "Read my existing draw.io files." No, because the tool replaces draw.io rather than reading its format.

## Section 14 — Definition of done for v1 (optional)

### 14.1 What must be true to call v1 done? Checkable statements, one per line.

> A sample JSON file ships in the repo and, when uploaded, renders a drawing with every node and edge visible.
> Malformed JSON and missing required fields each show a message naming the line or field.
> Markdown, HTML, PDF, and Word exports all download from the same design and show the same nodes and edges as the preview.
> The JSON schema and the sample file are readable from the site.
> Unit tests cover the schema and each exporter, and one Playwright test walks upload, preview, and all four downloads.
> The site is live on Netlify, deployed from the main branch of the public GitHub repo.

### 14.2 A month after launch, how will you know it worked?

> All three of the use cases you already have were drawn with it instead of draw.io.
