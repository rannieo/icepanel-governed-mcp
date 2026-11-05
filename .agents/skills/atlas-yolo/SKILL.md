---
name: atlas-yolo
description: >-
  Escape hatch for incidents, hotfixes and hard deadlines: suspend the atlas ceremony (spec file, plan, panel) but keep
  every safety rail (tests, coverage, the governance gate, stdout discipline, no force-push). Use when the user says
  "yolo", "/atlas-yolo", "hotfix", "prod is down", "the MCP server won't start", "urgent", "no time for the loop", or
  a client is broken right now.
---

# Yolo: skip ceremony, never safety

Use sparingly. Say out loud that the loop is suspended and why.

## Skipped

The spec file, the plan, the review panel, the phase order.

## Kept, always

- A failing test that reproduces the break, before the fix.
- `npm run test:coverage` green (types, tests, 100%).
- The governance gate and its policy are not loosened to get a write through. If the gate is the thing broken, the fix
  makes it stricter or equal, never more permissive.
- stdout stays JSON-RPC only.
- No `--force` push, no rewriting `main`.

## Steps

1. Reproduce: the exact error, the command that shows it.
2. Smallest fix, with its test.
3. Checks; a stdio smoke test if the server path changed.
4. Ship: branch, PR titled `fix: ...`, body says "yolo: <reason>" and what was skipped.
5. **Within a day:** run `/atlas-feedback` for the learning, and file the follow-up the ceremony would have caught.

No atlas task is started, so the push gate does not gate this branch. That is the point, and why step 5 is owed.
