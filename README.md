# MapDataStructures

Turn a JSON description of a system into an architectural design document. You
choose a JSON file, the app draws its nodes and edges, and — once the exporters
land — hands the same design back as Word, PDF, HTML, or Markdown.

Everything runs in your browser. There is no backend and no database, the site
ships as static files, and no file you choose is ever uploaded anywhere.

## Requirements

- [bun](https://bun.sh) 1.4 or newer. Every command below is bun; there is no
  npm lockfile in this repository.

## Run, test, build

```
bun install
bun run dev     # start the app on http://localhost:4321
bun run test    # run the Vitest suite once
bun run build   # build the static site into dist/
```

`bun run test` runs Vitest. Plain `bun test` runs bun's own test runner instead
and will quietly skip the suite, so always include `run`.

Astro 7 runs `bun run dev` as a background server. `bunx astro dev status`,
`bunx astro dev logs`, and `bunx astro dev stop` control it.

## What works today

One page. Choose a JSON design with the file input or drag one onto the page,
and it is validated, its name and its node and edge counts appear, and a box
per node and a line per edge is drawn. Layout is still a single row, the
validation messages are still one blunt line, and there are no exports yet. The
task list in `docs/RUNBOOK.md` says what comes next.

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

Every field is required and no string may be empty. Node ids have to be unique,
and an edge's `from` and `to` have to name nodes the file defines. A key the
schema does not name is ignored, and a design with no nodes and no edges is
valid. `src/lib/design.schema.ts` is the definition; Task 09 publishes it as a
page with a sample file.

## Layout

```
src/lib/      the design core: types, the schema, and the loader
src/pages/    the Astro pages
src/styles/   CSS Modules
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
