---
name: atlas-feedback
description: >-
  The compound step: capture what this change taught in docs/learnings, fix AGENTS.md or a skill when a mistake
  repeats, refresh the local handoff, and record the explain-back. Required before push (the push gate reads it). Use
  when the user says "feedback", "/atlas-feedback", "capture learnings", "compound", "what did we learn", "write a
  learning", or before pushing an atlas branch.
---

# Feedback: teach the system back

`node .claude/hooks/atlas-state.mjs feedback` — reaching this phase opens the push gate's first check.

## 1. Capture the learning

A gotcha, a wrong assumption, a pattern worth reusing, or a decision with alternatives a future reader would
re-litigate: write `docs/learnings/YYYY-MM-DD__slug.md`.

```markdown
---
type: learning | gotcha | pattern | decision
created: YYYY-MM-DD
files_touched: ['src/...']
key_tokens: ['searchable', 'terms']
---

## What        one line
## Why it matters
## How to apply   the rule, the check, the command
```

For `decision`, add Alternatives considered and Consequences.

- **Mark measured versus intended.** Write what you checked and how ("ran `npm run openapi:check` 2026-11-05: 79
  paths"), and label the rest as intent.
- **An API fact names its source and version** (context7 output, the spec index, `node_modules/<pkg>@x.y`).
- **Never cite a code comment.** Cite behaviour, a test, or `file:line`.
- Nothing worth recording: say so. Never invent one.

Search first: `grep -ril '<term>' docs/learnings`. A match is a **recurrence**; amend that file with a dated
`## Recurrence`, and treat it as crossing step 2's bar.

## 2. Fix the source when it happened twice

The same correction twice (this change, or across changes) means the instruction is wrong, not the instance:

- a convention missing from `AGENTS.md` (read by Claude via `CLAUDE.md` and by Codex) → propose the edit;
- an atlas skill silent or wrong → propose the fix; for more than a line or two use `/skill-creator:skill-creator`;
- a rule a machine could enforce → propose a test, a hook or a CI step instead of prose.

Show the diff; the user approves.

## 3. Refresh the handoff (local, gitignored)

`docs/HANDOFF.md`: where we are and the next action, so a cleared session resumes cheaply. Every status claim is
checkable in one command: "merged `abc1234` (PR #12)", not "merged"; "not pushed — `git ls-remote --heads origin
<branch>`", not "not pushed". When you correct a stale line, say it was stale.

## 4. Record the explain-back

If `atlas-build` already recorded it, it is kept. Otherwise the author writes the seven labels now (never drafted for
them):

```bash
node .claude/hooks/atlas-state.mjs feedback - <<'NOTE'
WHAT: ...
NOTE
```

Summarise: learning written or "none", source fixes proposed, handoff refreshed. Then push, or `/atlas-prune` first.
