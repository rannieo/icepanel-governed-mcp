---
name: atlas-build
description: >-
  Step 4 of the full atlas loop: execute an approved plan test-first in agent mode (agent writes, user reviews) or dev
  mode (user writes the decision-bearing code, agent coaches and does mechanics), and collect the author's seven-label
  explain-back that the push gate requires. Use when the user says "build", "/atlas-build", "implement the plan",
  "start coding", "dev mode", "agent mode", "let me write it", or a plan has been approved.
---

# Build: test-first, to the plan

`node .claude/hooks/atlas-state.mjs build "" <agent|dev>` — the mode is required and recorded.

## Both modes

- **One criterion at a time:** write its test, run it, see it fail *for the right reason*, then the code, then green.
- **Follow the plan.** If a step rests on something untrue, stop and say so; do not improvise around it quietly.
- **The repo's rules bind every line:** stdout is JSON-RPC only; a new IcePanel tool is a `catalog.ts` entry; `src/**`
  stays at 100% coverage with real branches tested, not `/* v8 ignore */`; `tsc --noEmit` is clean in `test/` too.
- Run `npm run test:coverage` before calling the build done.

## Agent mode

You write to the plan. After each criterion, show the diff and the green test. The user reviews design and risk, not
syntax.

## Dev mode (dojo)

The user writes the decision-bearing code: the branch in the gate, the shape of the schema, the error path. You:

- set up the mechanics (test scaffold, fixtures, wiring), and say exactly where their code goes;
- coach with questions before answers ("what should happen when `confirm` is missing?");
- review their code against the criterion and the risks, and name the failing case rather than fixing it.

## The explain-back

Every code push carries it, in both modes; the push gate refuses without it. **The author writes it.** In agent mode
it is the only proof they understood what shipped. Never draft a label, reword one or suggest wording: check their
draft and name the label that fails and why.

```
WHAT: the behaviour that changed, in a sentence a user of the MCP server would understand
WHY-THIS-SHAPE: the decision taken, and the alternative rejected
KILLS: the line to break, and the test file that goes red when you break it
UNSURE: the thing you are least sure about
RULE: the rule this change protects (governance, safety, compatibility), in plain words
SOURCE: docs/specs/<file>.md, or none: <reason> when no spec applies
PRINCIPLE: the design or TypeScript concept the change relies on, and why it applies here
```

The gate checks all seven exist, `KILLS` names an existing test file, and `SOURCE` resolves. Whether they are *right*
is the reviewer's job, starting with `UNSURE`. Record them:

```bash
node .claude/hooks/atlas-state.mjs build - <agent|dev> <<'NOTE'
WHAT: ...
NOTE
```

Next: `/atlas-review`.
