<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 05: Export as Markdown

**What to build:** As a user, I can export the design as Markdown, so that it drops into a repo or wiki. From the user's side: an "Export Markdown" button next to the preview downloads a `.md` file named after the design.

**Blocked by:** 01, 03.

**Status:** done

## Steps, a vertical slice in this order

1. Data: nothing new. An Export is produced in memory and handed to the browser as a download.
2. Logic: `toMarkdown(design, layout)` returning the design title, a table of nodes, a table of edges, and the drawing, with its test written first. For the drawing, a Mermaid block is the form that renders inside GitHub and GitLab, which is where "a repo or wiki" points; confirm with the user that Mermaid is acceptable, otherwise link an image the user places beside the file.
3. Interface: the export button, which builds the text, wraps it in a Blob, and triggers a download of `<design>.md`.
4. Walk the story the way the user would, end to end: load the sample, export, open the file in a Markdown viewer.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [x] As a user, I can export the design as Markdown: demonstrated end to end.
- [x] The file lists every node and edge the preview shows, with the same labels (5.2).
- [x] Tests cover the behavior, as a user would observe it, and pass; the Playwright test from Task 03 now also clicks this button and checks the download.
- [x] Every earlier test still passes; CI is green.
- [x] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `mermaid`: the diagram block, if Mermaid is chosen for the drawing.
- `tdd-workflow`: the renderer test before the renderer.
- `e2e-testing`: extending the Playwright walk with a download assertion.

## Notes

This is the simplest exporter. Build it first among the four so the shared pieces, the download helper and the node and edge tables, exist before HTML, PDF, and Word need them.
