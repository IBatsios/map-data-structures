---
description: Run the Jared → Amon → Jahmyr → Sam pipeline for the next task. Pass "all" to keep cycling until v1 is done.
argument-hint: "[all]"
allowed-tools: ["Agent", "Read", "Bash", "Grep", "Glob"]
---

Drive the MapDataStructures build pipeline. Subagents cannot call each other, so you are the router: you spawn one agent, read the `HANDOFF` block it returns, and spawn whoever that block addresses.

Argument: `$ARGUMENTS`. Empty means run one task through the pipeline and stop. `all` means keep cycling until v1 is complete or something blocks.

## The relay

1. Spawn **jared**. He picks the next task, creates the branch, and writes `docs/handoff-items/handoff-task-<NN>-<slug>.md`.
2. Read the `HANDOFF` block from his report. Spawn the agent named in `to:`, and pass it the task number, the branch, the handoff doc path, the round, and his `summary`.
3. Repeat. The normal path is jared → amon → jahmyr → sam → jared. Jahmyr returning `to: amon` is the expected repair loop, not a failure.
4. Each agent reads the handoff doc for the full picture, so your prompt to it only needs to be the pointer plus what changed.

## Stop conditions

Stop and report to the user, without spawning anything further, when:

- Any block returns `status: blocked` or `to: human`.
- Jahmyr reports a third failed round on the same task.
- A secret scan hits anywhere outside a placeholder in `.env.example`. Say that the value needs rotating with whoever issued it.
- `status: v1-complete`.
- The argument was empty and Sam returned `status: merged`.

## What you do not delegate

- Phase 0 of `docs/RUNBOOK.md` needs a person. If there is no git remote, say which commands the user must run and stop. Do not create the repository.
- Do not merge, push, or check an acceptance criterion yourself. Those belong to Sam, Jahmyr, and Jahmyr respectively.
- Do not fabricate a handoff block. If an agent's report has none, say so and stop.

## Report

After each agent returns, tell the user in one line who ran and what came back. At the end, give a short recap: the task, what shipped, the pull request, and what the next frontier is.
