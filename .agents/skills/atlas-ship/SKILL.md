---
name: atlas-ship
description: >-
  The default single-loop path for a change in this repository: read the code yourself, write the spec and stop for
  "Criteria complete?", build test-first, run the checks, send a security reviewer when the risk questions say the
  change touches governance, writes, auth, stdout or request building and a test reviewer when it adds or changes
  tests, record a learning and the author's explain-back, then open the PR. No research agents, no plan file, no
  review panel. Use when the user says "atlas-ship", "/atlas-ship", "ship", "ship it", "build this", "add a tool",
  "fix this bug", "just build it", "go straight to code", or asks to implement, change or fix anything in this MCP
  server, unless they name another /atlas-* skill.
---

# Atlas ship: strict about the result, loose about the process

One loop, one context. You read, decide and build yourself, so nothing is lost in handoffs. The user sees the spec and
the PR. The full loop (`/atlas-assess` onward) is still there for large or risky work; `atlas-README.md` says when.

## 1. Read

- **The request is the contract**, and there is no tracker: if it has no checkable outcome, ask for one before
  anything else.
- **Read it yourself.** The files you will change, their tests, the sibling code you will copy, and
  `grep -ril '<term>' docs/learnings docs/specs`. Delegate only a wide sweep to an Explore agent.
- **Settle facts with a tool, not memory.** An IcePanel endpoint or body schema: `src/generated/icepanel-spec.json`
  (refresh with `npm run openapi:check`). A library API: context7. Behaviour: `node_modules/<pkg>` source.
- **Ambiguity** (request vs code vs docs, an open design choice): explore first, then ask one question at a time with
  your recommendation.
- **Branch** from an up-to-date `main`: `git switch -c <type>/<slug>`. Then
  `node .claude/hooks/atlas-state.mjs spec` (the push gate gates this branch from here on).

## 2. Spec, always

Write `docs/specs/YYYY-MM-DD__slug.md`. It says WHAT, never HOW; size sets its length, not whether it exists.

```markdown
# Spec: <title>

## What we're building      two or three plain sentences
## Why
## Acceptance criteria      - [ ] observable and testable, one test each
## Edge cases and failure modes
## Scope                    In / Out
## Risk answers             the six questions below, each yes or no
## Open questions           facts nobody here can answer, and what we assume meanwhile
```

- **A criterion becomes a test**, so a criterion that wrong code could pass is a broken defence. Attack each on scope
  (*every* tool? count them in `catalog.ts`), direction (approved, blocked, dry run), and failure (IcePanel 4xx, network
  error, malformed body).
- **A number carries the command that reproduces it.**
- **The risk questions** decide the reviewers:

  | # | Question |
  |---|---|
  | 1 | Changes the governance gate, the policy shape, the evidence schema or the ledger? |
  | 2 | Adds or changes a write tool, especially a destructive one (PATCH, DELETE, merge)? |
  | 3 | Touches the API key, bearer token, env loading or what reaches IcePanel's headers? |
  | 4 | Could write to stdout on the server path, or changes startup? |
  | 5 | Changes how paths, queries or bodies are built from tool arguments? |
  | 6 | Adds a dependency, or changes CI or a script that fetches remote content? |

  Any yes → `security-reviewer`. Adds or changes tests → `test-reviewer`. More than about 8 files: say so; switch to
  the full loop or split, and never drop a criterion to make it smaller.

Then give a short **How** in the reply, not a file: the seam you reuse (a `catalog.ts` entry, `buildRequest`,
`executeGovernedWrite`), the files, one test per criterion, and each risk as "swap X → test Z goes red".

**Stop and show the spec: "Criteria complete?"** It is the only checkpoint before code.

## 3. Build

`node .claude/hooks/atlas-state.mjs build "" agent` (or `dev` if the user is writing; see `atlas-build`).

- **Test first**, one per criterion, each seen to fail for the right reason before the code goes in.
- **A new IcePanel tool is one `catalog.ts` entry.** Do not hand-write a handler; if the catalog cannot express it,
  that is the change, and it needs its own criterion.
- **stdout belongs to JSON-RPC.** Diagnostics go to stderr.
- **Stay in the spec.** Anything else you find is a "Not done" line in the PR; a real bug in what you touched is fixed.
- A scripted edit asserts its anchor occurs once before replacing it. No bare `git stash`.

## 4. Check

`node .claude/hooks/atlas-state.mjs review`, then run the checks in `atlas-README.md`. "No test files found" is not a
pass. A check that could not run is said so in the PR.

- **Reviewers, only as the risk answers say:** `security-reviewer` and/or `test-reviewer`, read-only. Brief them with
  the spec path and `git diff main...HEAD`; forbid `git stash`, `checkout`, `reset`, `restore` and `clean` by name.
  Before your next edit, confirm `git status --porcelain` is unchanged. Verify each finding against the code before
  acting; P0–P2 are fixed here, P3+ go in the PR's "Not done".
- **Prune:** what did this change make dead? Diff against the merge base. Confirm zero references with `tsc` or the LSP.

## 5. Learn, explain back, PR

1. **A learning** when the change taught something: `docs/learnings/YYYY-MM-DD__slug.md` (format in `atlas-feedback`).
   Nothing learned: say so, never invent one.
2. **The explain-back, written by the author** (the seven labels in `atlas-build`, *The explain-back*). Never draft
   them; run the push gate's rules over their draft and name the label that fails. Record:
   ```bash
   node .claude/hooks/atlas-state.mjs feedback - <<'NOTE'
   WHAT: ...
   NOTE
   ```
3. **The PR:** what changed, the spec path, the risk answers, the checks and their output, each reviewer's verdict or
   "no reviewer: all no", the seven explain-back lines, "Not done". Then `node .claude/hooks/atlas-state.mjs complete`
   once it merges.
