# MapDataStructures

Turn a JSON description of a system into an architectural design document. You
choose a JSON file, the app draws its nodes and edges, and hands the same design
back as a file — Markdown, HTML and PDF today, with Word still to come.

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
```

`bun run test` runs Vitest. Plain `bun test` runs bun's own test runner instead
and will quietly skip the suite, so always include `run`.

`bun run test:e2e` is separate on purpose: the pre-commit hook runs `bun run
test`, and a hook that starts a browser on every commit is a hook nobody runs.
It needs a browser once — `bunx playwright install chromium` — and then builds
the site and serves `dist/` itself, so it tests what Netlify would serve.

Astro 7 runs `bun run dev` and `bun run preview` as background servers, whether
or not `--background` is passed. `bunx astro dev status`, `bunx astro dev logs`
and `bunx astro dev stop` control the dev one; `astro preview` has the same
three.

## What works today

One page. Choose a JSON design with the file input or drag one onto the page,
and it is validated, its name and its node and edge counts appear, and a
laid-out drawing appears below: a shape per node, an arrow per edge, and every
label on it.

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

Every button is disabled until there is something to export, and goes back to
disabled the moment a file fails, so none of them ever saves the design before
last.

Still to come: Word. The task list in `docs/RUNBOOK.md` says what comes next.

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
valid. `src/lib/design.schema.ts` is the definition; Task 09 publishes it as a
page with a sample file.

## Layout

```
src/lib/      the design core: types, the schema, the loader, the layout,
              the shape vocabulary, the SVG renderer, the exporters and the
              download helper they share, and the modules that turn a failed
              load into messages
src/lib/fonts/ the font the PDF export embeds, generated from its source,
              with its licence beside it
src/pages/    the Astro pages
src/styles/   CSS Modules, and the tests that measure their contrast
e2e/          the Playwright walk, its fixtures, and the server it runs against
docs/         PRD, architecture, decisions, runbook, and one file per task
```

## Configuration

None. MapDataStructures reads nothing from the environment, so `.env.example`
holds no variables. Add any new variable there with a placeholder before the
code reads it.

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
