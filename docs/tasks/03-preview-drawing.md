<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 03: Preview the generated drawing

**What to build:** As a user, I can preview the generated drawing in the browser, so that I can check it before exporting. From the user's side: as soon as a file loads, a laid-out drawing appears on the page, with every node drawn in the shape its type implies, every edge drawn between the right nodes, and every label readable.

**Blocked by:** 01, 02.

**Status:** ready

## Steps, a vertical slice in this order

1. Data: the Node type from Task 02 decides the node's shape. Decide the set of types v1 draws and what each looks like, guided by the owner's existing draw.io designs (12.4), and record it in `docs/DECISIONS.md`.
2. Logic: a layout function that takes a Design and returns a position and size for every node and a route for every edge, with its test written first on a small design. The intake names no layout engine; ELK and dagre are the common open-source choices for this, so confirm one with the user before adding it.
3. Interface: replace the skeleton's row of boxes with an SVG rendered from the layout: shapes, labeled edges with arrowheads, and a drawing that fits the page. Give the SVG a title naming the design.
4. Walk the story the way the user would, end to end: load a file and see the drawing within a second (11.1).
5. Add the first Playwright test: load a small JSON file, then assert the SVG contains every node label and every edge label. Add `bunx playwright install --with-deps` before the Test step in `.github/workflows/ci.yml`, and a `"test:e2e"` script that runs it.
6. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [ ] As a user, I can preview the generated drawing in the browser: demonstrated end to end.
- [ ] Every node and edge in the JSON is visible in the drawing, with nothing dropped or mislabeled (5.2).
- [ ] The drawing appears within one second of choosing the file, for a design the size of the owner's use cases.
- [ ] Tests cover the behavior, as a user would observe it, and pass; the Playwright test runs in CI.
- [ ] Every earlier test still passes; CI is green.
- [ ] Best-effort accessibility: the SVG has a title, and label text has readable contrast against its shape.
- [ ] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `frontend-design-direction`: decide how the drawing should look before styling it; this is the product's face.
- `make-interfaces-feel-better`: spacing, label sizes, and arrowheads once the layout works.
- `front-a11y`: check the SVG title and contrast.
- `tdd-workflow`: the layout test before the layout function.
- `e2e-testing`: the first Playwright test and its CI step.

## Notes

The layout result is the one input every exporter in Tasks 05 to 08 takes, so the preview and the four files show the same nodes and edges by construction. Keep the layout function pure, with no DOM access, so its tests need no browser.
