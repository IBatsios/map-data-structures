# MapDataStructures

Turn a JSON description of a system into an architectural design document. You
choose a JSON file, the app draws its nodes and edges, and hands the same design
back as a file — Markdown, HTML, PDF or Word.

Everything runs in your browser. There is no backend and no database, the site
ships as static files, and no file you choose is ever uploaded anywhere.

## Requirements

- [bun](https://bun.sh) 1.4 or newer. Every command below is bun; there is no
  npm lockfile in this repository.

## Run, test, build

```
bun install
bun run dev       # start the app on http://localhost:4321
bun run test      # run the Vitest suite once
bun run test:e2e  # run the Playwright walk in a real browser
bun run check     # type-check with astro check
bun run build     # build the static site into dist/
bun run schema    # regenerate public/design.schema.json from the Zod schema

bun run docx:libreoffice  # opt-in, local: open the Word exports in LibreOffice
```

`bun run test` runs Vitest. Plain `bun test` runs bun's own test runner instead
and will quietly skip the suite, so always include `run`.

`bun run test:e2e` is separate on purpose: the pre-commit hook runs `bun run
test`, and a hook that starts a browser on every commit is a hook nobody runs.
It needs a browser once — `bunx playwright install chromium` — and then builds
the site and serves `dist/` itself, so it tests what Netlify would serve.

`bun run schema` writes `public/design.schema.json` from `src/lib/design.schema.ts`.
Run it whenever the schema changes; `bun run test` fails until you do.

### `bun run docx:libreoffice`

An opt-in local check on the Word export. It exports five fixtures through the
app's own Export Word button, converts each one with the LibreOffice installed
on your machine, and reads the converted file back to confirm the design's
title and every node and edge label are still in it. A conversion that exits
cleanly and loses the document is a failure, not a pass.

Nothing else runs it. `bun run test` does not, `bun run test:e2e` does not, and
CI does not — it has its own Playwright config, `playwright.libreoffice.config.ts`,
with its own `testDir`, so `playwright test` cannot reach it. Its pure half —
what an exit code means, where the binary is, what text has to survive — is in
`bun run test` like everything else, and needs no LibreOffice to run.

It finds LibreOffice by looking at `MAPDS_SOFFICE` first, and then at the usual
install locations:

- **`MAPDS_SOFFICE`**, when it is set: the full path of the binary. If it is set
  and nothing is there, the check says so and stops rather than falling back —
  which is also how you rehearse the no-LibreOffice case on a machine that has
  one.
- **Windows:** `%ProgramFiles%\LibreOffice\program\soffice.com`, then the
  `Program Files (x86)` equivalent. The `.com`, never the `.exe`: the `.exe` is
  the GUI binary, has no console attached, and anything it prints goes nowhere.
- **macOS:** `/Applications/LibreOffice.app/Contents/MacOS/soffice`
- **Linux:** `/usr/bin/soffice`, `/usr/local/bin/soffice`,
  `/opt/libreoffice/program/soffice`, `/snap/bin/soffice`

With no LibreOffice anywhere it prints one line saying so and exits 0. It is a
check you can run, not a check you have to have.

**What it buys, and what it does not.** A `.docx` is a zip of XML and every way
it can go wrong is on the way out, so a second, unrelated implementation being
able to open the file is worth knowing. **It is not a verified Word export.**
LibreOffice is an independent implementation of OOXML, not Word's renderer: a
file it opens cleanly can still behave differently in Word, and the reverse.
Opening a produced `.docx` in real Microsoft Word, once, remains an open item
and belongs to the owner — no machine that has touched this project has Word on
it.

Astro 7 runs `bun run dev` and `bun run preview` as background servers, whether
or not `--background` is passed. `bunx astro dev status`, `bunx astro dev logs`
and `bunx astro dev stop` control the dev one; `astro preview` has the same
three.

## What works today

Two pages. On the first, choose a JSON design with the file input or drag one
onto the page, and it is validated, its name and its node and edge counts
appear, and a laid-out drawing appears below: a shape per node, an arrow per
edge, and every label on it. **Load the sample design** draws the design the
site ships without you having to find a file first.

Six kinds of node have a silhouette of their own — `service`, `database`,
`queue`, `external`, `user` and `decision`, each with a handful of aliases
(`db`, `actor`, `topic` and so on). `type` is free text, so anything else draws
as a plain grey dashed rectangle rather than disappearing, and every node prints
its own type under its label.

A file that is not a design says why, in a panel beside the upload control.
Before anything is read, its name and browser-reported type are checked
against JSON — a name ending in `.json`, or a JSON media type — and a file
that is neither, whether picked or dropped, is refused unread with a message
asking you to rename it if it really holds JSON. A syntax error names the line
and column when the browser gives a position to count from and says plainly
that it does not know when it gives none — it never guesses one. A schema
error gets one message per problem, each naming the field at fault, such as
`nodes[0].label is missing. It has to be text.` The panel clears when a good
file loads, and no drawing is left behind that nothing is describing.

Once a design is drawn, **Export Markdown** downloads it as `<design>.md`: the
title as a heading, a table of every node, a table of every edge, and the drawing
itself as a fenced ` ```mermaid ` flowchart, which GitHub and GitLab render where
the file is pasted. Node ids in the diagram are the app's own — `n0`, `n1` —
because a design's ids may hold characters Mermaid will not take; yours stay in
the table.

**Export HTML** downloads the same design as `<design>.html`: one standalone
page holding the drawing itself, as the preview drew it, above the same two
tables. It opens in any browser from any folder with nothing beside it — every
style travels inside the file and nothing is fetched from anywhere — and it is
laid out to print. A label that happens to be markup is shown as the text it
says rather than run or removed.

**Export PDF** downloads `<design>.pdf`: the title, the drawing, and the same
two tables, running onto as many pages as the design needs. The drawing goes in
as vector rather than as a picture, so its text stays selectable and searchable
and nothing blurs however far you zoom in. The file carries the one font it
draws with, so it opens the same everywhere — including a label in Greek or
Cyrillic, which the PDF standard fonts cannot spell.

No font of a sensible size covers every character, so where that one has no
glyph — an arrow such as `→`, or a label in Chinese, Arabic, Hebrew or an Indic
script — the PDF draws a `■` in its place and the page says how many characters
that was. The mark is there so that nothing goes missing quietly: `Gateway →
Queue` comes out as `Gateway ■ Queue` rather than as `Gateway  Queue`. The
Markdown and HTML exports carry every character as it was written.

A tab, or any other control character a label happens to carry, is marked the
same way, because a PDF stops the line it is in at one. A label's own line break
is still a line break. One consequence of a mark per character is worth knowing
before sending a file: two labels or ids that differ only in characters the font
cannot draw read alike in the PDF — `東` and `京` are both `■` — and the Markdown
and HTML exports are the ones that still tell them apart.

**Export Word** downloads `<design>.docx`: the title, the drawing, and the same
two tables — as real Word tables, so you can open the file and type in a cell.
It is US Letter portrait with an inch of margin, and it opens in Word and in
LibreOffice. The drawing goes in as a picture rather than as vector, because a
`.docx` has no reliable way to carry a drawing any other way; it is painted at
three times the size it is placed at, so it stays crisp in print.

A Word file names the font it wants rather than carrying one, so your reader's
own machine draws the characters and nothing is marked for a font's sake: an
arrow, a Greek label or a Chinese one arrives as itself. The one thing that
cannot go in is a control character — a `.docx` is XML, and Word refuses to open
a file holding one — so those are replaced with the same `■` and the page says
how many. A tab is kept as a tab and a label's own line break as a real line
break.

Every button is disabled until there is something to export, and goes back to
disabled the moment a file fails, so none of them ever saves the design before
last.

One thing to know before sending a large design: the drawing in the PDF and in
the Word file is never printed smaller than 6 pt for its smallest text, so a
design too large to fit one page at that size is spread over as many sheets as
it needs — three for a fifteen-node design, twelve or fourteen for a forty-node
one — each captioned with its place in the whole. Sixteen sheets is the limit; a
design larger than that prints smaller than 6 pt and the document says so. The
two tables under the drawing carry every label at full size whatever it does,
and the Markdown and HTML exports do not shrink anything.

The second page, **/schema**, publishes the format: every field with its type,
whether it is required and what it is for, the two rules the schema file has no
way to state, and the sample itself with a copy button and a download link. The
field list is derived from the JSON Schema the app generates from its own Zod
schema, so the page cannot describe a rule the app does not keep. The schema
file is served as [`/design.schema.json`](public/design.schema.json), draft
2020-12; point a validator at it and it will accept exactly what this app
accepts.

Still to come: deployment. The task list in `docs/RUNBOOK.md` says what comes
next.

The JSON it reads looks like this:

```json
{
  "title": "Order intake",
  "nodes": [
    { "id": "api", "label": "Public API", "type": "service" },
    { "id": "queue", "label": "Order queue", "type": "queue" }
  ],
  "edges": [{ "from": "api", "to": "queue", "label": "publishes order" }]
}
```

Every field is required and no string may be blank — a label of three spaces is
refused, because it draws the same empty box a missing one would, though a label
with spaces around it keeps them. Node ids have to be unique,
and an edge's `from` and `to` have to name nodes the file defines. A key the
schema does not name is ignored, and a design with no nodes and no edges is
valid. `src/lib/design.schema.ts` is the definition, and `/schema` is where it
is published, with `public/sample.json` beside it.

## Layout

```
src/lib/      the design core: types, the schema, the loader, the layout,
              the shape vocabulary, the SVG renderer, the exporters and the
              download helper they share, the modules that turn a failed
              load into messages, and the published schema the /schema page
              renders
src/lib/fonts/ the font the PDF export embeds, generated from its source,
              with its licence beside it
src/layouts/  the `<head>`, masthead and frame both pages share
src/pages/    the Astro pages
src/styles/   CSS Modules, and the tests that measure their contrast
scripts/      one-off generators run by hand; today, the published schema
public/       what the site serves as-is: the sample design, the generated
              JSON Schema, and the icons
e2e/          the Playwright walk, its fixtures, the server it runs against,
              and the readers that open an exported PDF or `.docx` back up
docs/         PRD, architecture, decisions, runbook, and one file per task
```

## Configuration

None. MapDataStructures reads nothing from the environment, so `.env.example`
holds no variables. Add any new variable there with a placeholder before the
code reads it.

One variable exists outside that rule and is deliberately not in
`.env.example`: `MAPDS_SOFFICE`, which points `bun run docx:libreoffice` at a
LibreOffice install. It is read by that command and by nothing the site ships,
so listing it beside the app's variables would say the browser reads an
environment it never sees. It is documented above instead.

## Contributing

Branch as `feature/<description>`, `fix/<description>`, or
`chore/<description>`, write conventional commit messages, and open a pull
request — that is what runs CI. Conventions live in `CLAUDE.md`, decisions in
`docs/DECISIONS.md`.

## License

MIT. See `LICENSE`.

`src/lib/fonts/robotoRegular.ts` holds Roboto Regular, which the PDF export
embeds in the files it produces. Roboto is licensed under the SIL Open Font
License 1.1, whose text is in `src/lib/fonts/Roboto-LICENSE.txt`.
