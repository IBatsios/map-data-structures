<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 11: Definition of done for v1

**What to build:** Nothing new. Verify that v1 is what the intake said it would be.

**Blocked by:** every other task.

**Status:** ready

## Acceptance criteria

- [ ] A sample JSON file ships in the repo and, when uploaded, renders a drawing with every node and edge visible.
- [ ] Malformed JSON and missing required fields each show a message naming the line or field.
- [ ] Markdown, HTML, PDF, and Word exports all download from the same design and show the same nodes and edges as the preview.
- [ ] The JSON schema and the sample file are readable from the site.
- [ ] Unit tests cover the schema and each exporter, and one Playwright test walks upload, preview, and all four downloads.
- [ ] The site is live on Netlify, deployed from the main branch of the public GitHub repo.
- [ ] Every task from 01 to 10 has all of its acceptance criteria checked.
- [ ] `README.md` explains how to run, test, and deploy.
- [ ] `docs/DECISIONS.md` records every decision made during the build that the intake did not.
- [ ] A handoff doc in `docs/handoff-items/` says what v2 should start with.

**Success signal, one month after launch:** All three of the use cases you already have were drawn with it instead of draw.io.
