<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 07: Export as PDF

**What to build:** As a user, I can export the design as PDF, so that it can be attached to an email or ticket. From the user's side: an "Export PDF" button downloads a `.pdf` that opens in any viewer and shows the drawing and the tables.

**Blocked by:** 01, 03, 05.

**Status:** in progress

## Steps, a vertical slice in this order

1. Data: nothing new.
2. Logic: `toPdf(design, layout)` producing PDF bytes in the browser, since there is no backend, with its test written first. The intake names no PDF library. Two open-source routes fit a static site: draw the SVG into a PDF as vector with a library such as svg2pdf.js on jsPDF, or rasterize the SVG to an image and place it with pdf-lib. Confirm the route and the library with the user before adding either.
3. Interface: the export button, using the download helper from Task 05, producing `<design>.pdf`.
4. Walk the story the way the user would, end to end: export, open the PDF, compare it with the preview.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [x] As a user, I can export the design as PDF: demonstrated end to end.
- [ ] The PDF shows the same nodes and edges as the preview, with every label readable (5.2).
- [x] The download finishes within a few seconds for a design the size of the owner's use cases (11.1).
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright walk checks this download.
- [x] Every earlier test still passes; CI is green.
- [x] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `anthropic-skills:pdf`: PDF structure and pitfalls while choosing the route.
- `tdd-workflow`: test the bytes for the page count and the text before the button exists.
- `e2e-testing`: the download assertion.

## Notes

Whichever route is chosen, record it in `docs/DECISIONS.md` with its trade-off: vector output keeps text selectable and small, raster output is simpler but blurs when zoomed.
