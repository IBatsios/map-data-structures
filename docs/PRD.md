<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# MapDataStructures — Product Requirements

MapDataStructures is a web app for software architects and technical leads that turns a JSON description of a system into a formatted architectural design document as Word, PDF, HTML, or Markdown.

## Problem

I want to quickly create drawings based on data. Json is an easy data model that should be able to quickly create drawings that employees understand.

**Today:** I'm the one with the problem. Anytime I want to explain how things work, I have to open draw.io to create a design. I'd rather write it in json and have it built for me.

**Why now:** To make my job easier. I have at least three use cases for it already.

**If it is never built:** I'll waste time scouring the internet for a product that doesn't quite fit what I want

## Users

| User | Wants | Role |
|---|---|---|
| Anyone that wants to upload json | To upload JSON and get back a drawing that employees understand (inferred from 2.1 and 4.4) | one role |

The app will probably live on the owner's website (3.1). Scale: One. Technical comfort: developers.

## User stories

### Must have for v1

1. As a user, I can upload a JSON file describing a system, so that I do not have to draw it by hand.
2. As a user, I can see validation errors when the JSON is malformed or missing required fields, so that I can fix it quickly.
3. As a user, I can preview the generated drawing in the browser, so that I can check it before exporting.
4. As a user, I can export the design as Markdown, so that it drops into a repo or wiki.
5. As a user, I can export the design as HTML, so that it can be shared as a standalone page.
6. As a user, I can export the design as PDF, so that it can be attached to an email or ticket.
7. As a user, I can export the design as a Word document, so that non-developers can edit it.
8. As a user, I can read the JSON schema and a sample file, so that I know the format the app expects.

## The most important path

Upload JSON get a drawing back

This is the path Task 01, the walking skeleton, proves end to end before any other feature is built.

## Data

- Design, uploaded as one JSON file, has many Nodes and many Edges.
- Node, belongs to a Design, is a box or shape with a label and a type.
- Edge, belongs to a Design, connects two Nodes and has a label.
- Export, produced from a Design, is one file in Markdown, HTML, PDF, or Word.

Must never be lost or wrong: the drawing must faithfully show every node and edge in the JSON, with nothing dropped or mislabeled; every export format must show the same content as the browser preview. Retention: nothing is stored server-side. Uploaded JSON and generated files live only for the request, or in the browser, and are discarded afterward. Sensitive categories: none.

## Sign-in and permissions

Nobody signs in. Every visitor sees the same thing.

## Integrations

External services: None. Drawing, layout, and file generation all run inside the app with open-source libraries, so no third-party API keys are needed.

Imports and exports: Imports one JSON file per design, matching a published schema. Exports the same design as Markdown (.md), HTML (.html), PDF (.pdf), and Word (.docx).

## Non-functional requirements

- Load and speed: one person at a time. The drawing appears within a second of choosing a file, and each export downloads within a few seconds.
- Accessibility: best effort.
- Devices and browsers: desktop.
- Offline: no.
- Languages: English only.
- Security and compliance: none known. Nothing is stored and no personal data is handled.
- Uptime: hobby.

## Constraints

- Budget: free tiers only
- Team: Ioannis Batsios, owner and sole developer, developer.
- Existing assets: the personal website built with Astro, where the app may be linked or embedded; the existing draw.io designs as reference for what the drawings should look like.
- Must use or avoid: open-source libraries only, per Section 7. No paid services.

## Out of scope

- Save designs between visits or keep a history of uploads.
- User accounts, sign-in, or sharing links.
- Editing the drawing by dragging shapes in the browser. The JSON is the only editor.
- Importing draw.io, Mermaid, or other diagram formats.
- Generating the JSON from a prose description with AI.
- "Let me nudge the layout by hand." No, because the JSON is the source of truth and hand edits would vanish on the next upload.
- "Save my diagrams here." No, because storing designs means accounts, a database, and privacy questions, and a repo or wiki already keeps the JSON.
- "Read my existing draw.io files." No, because the tool replaces draw.io rather than reading its format.

## Definition of done for v1

- [ ] A sample JSON file ships in the repo and, when uploaded, renders a drawing with every node and edge visible.
- [ ] Malformed JSON and missing required fields each show a message naming the line or field.
- [ ] Markdown, HTML, PDF, and Word exports all download from the same design and show the same nodes and edges as the preview.
- [ ] The JSON schema and the sample file are readable from the site.
- [ ] Unit tests cover the schema and each exporter, and one Playwright test walks upload, preview, and all four downloads.
- [ ] The site is live on Netlify, deployed from the main branch of the public GitHub repo.

**Success signal, one month after launch:** All three of the use cases you already have were drawn with it instead of draw.io.

## Open questions

**Unknown, to find out:**

- 12.1 Deadline or first milestone.

**Skipped, never considered:**

- 4.2 Should-have features.
- 4.3 Could-have features.
- 8.11 Must-use or must-avoid libraries and pinned versions.
