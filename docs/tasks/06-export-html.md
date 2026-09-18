<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 06: Export as HTML

**What to build:** As a user, I can export the design as HTML, so that it can be shared as a standalone page. From the user's side: an "Export HTML" button downloads one `.html` file that opens in any browser with no other files beside it.

**Blocked by:** 01, 03, 05.

**Status:** done

## Steps, a vertical slice in this order

1. Data: nothing new.
2. Logic: `toHtml(design, layout)` returning a complete page with the title, the inline SVG drawing from Task 03, and the node and edge tables from Task 05, with its styles inline and no external assets, and with its test written first.
3. Interface: the export button, using the download helper from Task 05, producing `<design>.html`.
4. Walk the story the way the user would, end to end: export, move the file to another folder, open it, see the same drawing as the preview.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [x] As a user, I can export the design as HTML: demonstrated end to end.
- [x] The page shows the same nodes and edges as the preview, with nothing dropped or mislabeled (5.2).
- [x] The file works alone: no stylesheet, script, font, or image is fetched from anywhere.
- [x] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download.
- [x] Every earlier test still passes; CI is green.
- [x] Best-effort accessibility: the exported page has a title, headings, and the SVG title from Task 03.
- [x] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `front-review`: review the exported page's markup as you would a component.
- `front-a11y`: check the standalone page.
- `tdd-workflow`: the renderer test before the renderer.
- `e2e-testing`: the download assertion.

## Notes

Reusing the preview's SVG verbatim is the cheapest way to keep the export identical to the preview. If Task 07 generates its PDF from this page, build this one to be printable too.
