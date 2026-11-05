---
name: atlas-assess
description: >-
  Step 1 of the full atlas loop: interrogate a request until it is concrete, re-read the code behind its framing, size
  it, and pick the path (ship, full loop, or split into slices). Starts an atlas task on the branch. Use when the user
  says "assess", "/atlas-assess", "scope this", "is this worth doing", "how big is this", "start the full loop", or
  brings a large, vague or risky change (governance contract, new subsystem, many files) that should be understood
  before anyone writes a spec.
---

# Assess: kill vague before it costs anything

`node .claude/hooks/atlas-state.mjs assess` — starts the task and clears any previous explain-back on this branch.

## 1. Interrogate

Ask until each of these has a one-line answer. One question at a time, each with your recommended answer, so the user
can say "yes" instead of composing.

- **Outcome:** what is observably different when this is done? Who notices (an agent calling tools, the user reading
  the ledger, CI)?
- **Why now:** what breaks or stays slow if we do nothing?
- **Boundary:** what is explicitly out?
- **Done:** which command proves it (`npm run test:coverage`, a stdio call, `npm run openapi:check`)?

## 2. Re-read the framing against the code

The request was written at a point in time. Its "root cause" may be a guess, its file may have moved, its premise may
already be fixed. Open the code it points at. Check IcePanel endpoint claims in `src/generated/icepanel-spec.json`.
Search `docs/learnings/` and `docs/specs/` for prior work on the same terms. Report what you found that changes the
framing before going further.

## 3. Size and choose the path

| Size | Signal | Path |
|---|---|---|
| Quick | ≤3 files, behaviour-preserving or one criterion | `/atlas-ship` (stop the full loop here) |
| Standard | one coherent change, ≤8 files | continue: `/atlas-spec` |
| Large | >8 files, or several independent outcomes | split into ordered slices, each one branch + PR that leaves `main` green; run the loop per slice |

Any change to the governance gate, evidence contract or a destructive write is at least Standard, whatever its size.

## 4. Output

Reply with: the outcome sentence, what the code check changed (or "framing confirmed"), the size, the path, and for
Large the ordered slice list. Record it:

```bash
node .claude/hooks/atlas-state.mjs assess - <<'NOTE'
<outcome> · <size> · <path>
NOTE
```

Next: `/atlas-spec`.
