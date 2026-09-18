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

The walking skeleton only: one page with a file input that reads a JSON design
and draws a box per node and a line per edge. Layout is a single row, there is
no validation yet, and there are no exports yet. The task list in
`docs/RUNBOOK.md` says what comes next.

The JSON it reads looks like this. The shape is provisional until Task 02
publishes the schema:

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

## Layout

```
src/lib/      the design core: types and the parser
src/pages/    the Astro pages
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
