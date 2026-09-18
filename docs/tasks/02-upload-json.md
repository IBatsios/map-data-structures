<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 02: Upload a JSON file

**What to build:** As a user, I can upload a JSON file describing a system, so that I do not have to draw it by hand. From the user's side: they open the page, choose a file or drag one onto the page, and the file becomes a Design in the browser, with its name and its node and edge counts shown.

**Blocked by:** 01.

**Status:** in progress

## Steps, a vertical slice in this order

1. Data: define the Design, Node, and Edge types from the intake as TypeScript types and a Zod schema (Zod is the Projects-root default for validation; confirm). A Node has an id, a label, and a type; an Edge names two Node ids and has a label; a Design has a title and the two lists. There is no database and no migration. Record the JSON shape in `docs/DECISIONS.md`, because Task 09 publishes it.
2. Logic: `loadDesign(text): Design`, which parses the text and validates it against the schema, with its test written first. Task 04 turns its failures into messages; here a failure may simply throw.
3. Interface: the file input from Task 01, plus drag-and-drop onto the page. After a file loads, show its name and how many nodes and edges it holds, and hand the Design to the drawing from Task 01.
4. Walk the story the way the user would, end to end: choose a file, drop a file, see the counts and the drawing.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [ ] As a user, I can upload a JSON file describing a system: demonstrated end to end.
- [ ] Tests cover the behavior, as a user would observe it, and pass.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the file input is reachable by keyboard and labeled, and drag-and-drop is an addition to it, not a replacement.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `error-handling`: shape the failures of `loadDesign` so Task 04 can name the line or field.
- `tdd-workflow`: schema and loader tests first.
- `front-review`: review the upload component before the pull request.

## Notes

Nothing leaves the browser. The file is read with the File API and never posted anywhere, which is what "nothing is stored server-side" in the intake means.
