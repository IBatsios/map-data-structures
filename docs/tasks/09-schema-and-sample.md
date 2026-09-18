<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 09: Schema and sample file

**What to build:** As a user, I can read the JSON schema and a sample file, so that I know the format the app expects. From the user's side: a page on the site explains every field of the JSON, shows a complete sample they can copy or download, and the upload page offers a "Load sample" link.

**Blocked by:** 01, 02, 04.

**Status:** ready

## Steps, a vertical slice in this order

1. Data: a `sample.json` in the repo that uses every node type Task 03 draws and at least one labeled edge (14.1), and the published schema. Generate the JSON Schema from the Zod schema in Task 02 rather than writing it twice; confirm the generation method with the user, since it depends on the Zod version.
2. Logic: a test that the sample passes validation, and a test that the published schema is regenerated from the current Zod schema, so the two cannot drift, written first.
3. Interface: a `/schema` page listing each field with its type, whether it is required, and what it means; the sample shown in a code block with a copy button and a download link; and a "Load sample" link on the upload page that loads it into the preview.
4. Walk the story the way the user would, end to end: read the page, copy the sample, upload it, see every node and edge.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [ ] As a user, I can read the JSON schema and a sample file: demonstrated end to end.
- [ ] The sample uploads without errors and renders a drawing with every node and edge visible (14.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the schema page reads in order with headings, and the copy button is labeled.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `front-review`: review the schema page and the copy control.
- `frontend-design-direction`: the schema page is documentation; make it read like the product, not a dump.
- `front-a11y`: headings and the copy button.
- `front-comments`: document the schema module, since the page and the validator both depend on it.

## Notes

Users are developers (3.4), so the field list can use JSON terms directly. The sample doubles as the fixture for the Playwright walk in Tasks 03 to 08.
