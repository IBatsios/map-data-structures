<!-- Generated from docs/intake.md by kickoff v0.1.0. Edit the intake, not this file. -->

# 04: Validation errors

**What to build:** As a user, I can see validation errors when the JSON is malformed or missing required fields, so that I can fix it quickly. From the user's side: a bad file produces a short list of messages next to the upload control, each naming the line or the field, and no drawing until a good file is loaded.

**Blocked by:** 01, 02.

**Status:** done

## Steps, a vertical slice in this order

1. Data: nothing new. The Zod schema from Task 02 is the source of every rule.
2. Logic: a function that turns a JSON syntax error into a message with its line and column, and a schema failure into one message per problem naming the field path and what was expected, with its tests written first against a set of broken files (missing `nodes`, an edge pointing at an unknown node id, a node without a label, a trailing comma).
3. Interface: an error panel beside the upload control that lists the messages, clears when a good file loads, and is announced to assistive technology.
4. Walk the story the way the user would, end to end: load each broken file, read the message, fix the file, load it again.
5. Update `README.md` or `CLAUDE.md` if a command changed.

## Acceptance criteria

- [x] As a user, I can see validation errors when the JSON is malformed or missing required fields: demonstrated end to end.
- [x] Malformed JSON shows the line; a missing required field shows the field (14.1).
- [x] Tests cover the behavior, as a user would observe it, and pass.
- [x] Every earlier test still passes; CI is green.
- [x] Best-effort accessibility: the error panel is a live region and its text is readable.
- [x] Any new environment variable is in `.env.example` with a placeholder.

## Suggested skills

- `error-handling`: typed failures from the loader, user-facing messages in the panel.
- `tdd-workflow`: one broken file per test, written first.
- `front-a11y`: the live region and the message contrast.

## Notes

An edge that names a node id not in the list is a schema error, not a drawing problem; catch it here so Task 03 never draws a dangling edge (5.2).
