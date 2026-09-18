<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 08: Export as a Word document

**What to build:** As a user, I can export the design as a Word document, so that non-developers can edit it. From the user's side: an "Export Word" button downloads a `.docx` that opens in Word or LibreOffice with the title, the drawing, and editable tables.

**Blocked by:** 01, 03, 05.

**Status:** ready

## Steps, a vertical slice in this order

1. Data: nothing new.
2. Logic: `toDocx(design, layout)` producing the document bytes in the browser, with its test written first. The intake names no library; the open-source `docx` package on npm builds `.docx` files in the browser and is the usual choice, so confirm it with the user. The drawing goes in as an image: rasterize the preview SVG to PNG through a canvas, since not every Word version renders SVG, and keep the tables as real Word tables so they stay editable.
3. Interface: the export button, using the download helper from Task 05, producing `<design>.docx`.
4. Walk the story the way the user would, end to end: export, open the file in Word or LibreOffice, edit a table cell, see the drawing.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [ ] As a user, I can export the design as a Word document: demonstrated end to end.
- [ ] The document shows the same nodes and edges as the preview, and the tables are editable text (5.2).
- [ ] The download finishes within a few seconds for a design the size of the owner's use cases (11.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk now clicks all four export buttons and checks all four downloads (14.1).
- [ ] Every earlier test still passes; CI is green.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `anthropic-skills:docx`: document structure, tables, and image embedding.
- `tdd-workflow`: unzip the bytes in the test and assert on `document.xml` before the button exists.
- `e2e-testing`: the final four-download walk.

## Notes

A `.docx` is a zip of XML files, so a unit test can open the bytes and look for the title and the node labels without Word installed.
