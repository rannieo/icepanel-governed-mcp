---
name: atlas-review
description: >-
  Step 5 of the full atlas loop: run the checks, dispatch the read-only reviewer panel in parallel, verify every
  finding against the code before acting, fix P0–P2, and record a verdict. Use when the user says "review",
  "/atlas-review", "check my work", "run the reviewers", "is this ready", or a build is done.
---

# Review: CI first, then readers who did not write it

`node .claude/hooks/atlas-state.mjs review`

## 1. Checks

Run the checks in `atlas-README.md`. Red stops the review: fix, rerun, then continue. Paste the summary lines
(`Tests N passed`, the coverage table's `All files` row), not "it passed".

## 2. Fence the tree

Reviewers are read-only, and one that runs `git stash` or `checkout` destroys work. Before dispatching:

```bash
git status --porcelain -uall | tee /dev/stderr | shasum   # print the count and the hash
```

Brief every reviewer that it is read-only and forbid `git stash`, `checkout`, `reset`, `restore`, `clean` and any
write by name. After they return, rerun the line and compare before your first edit.

## 3. The panel (parallel, one message)

Brief each with the spec path, the plan path, and `git diff main...HEAD`. Send only who the change needs:

| Reviewer | When |
|---|---|
| `security-reviewer` | any risk answer yes (atlas-ship step 2) |
| `test-reviewer` | tests added or changed (always, in practice) |
| `ts-type-safety-reviewer` | new types, generics, casts, `as`, `unknown` handling, zod schemas |

Ask each for findings as `P0`–`P4` with `file:line`, the failing input, and the consequence.

## 4. Verify, then act

A finding is a hypothesis that arrives formatted as a conclusion. For each: open the `file:line`, reproduce the
failing input in a test or a one-off script, or read the constraint that makes it impossible. Then:

- **confirmed P0–P2:** fix now, with a test that was red first;
- **confirmed P3–P4:** a "Not done" line for the PR, with its reason;
- **refuted:** one line saying what disproved it.

## 5. Verdict

```bash
node .claude/hooks/atlas-state.mjs review - <<'NOTE'
checks green (N tests, 100%) · security: 0 open · tests: 1 fixed · types: n/a · not done: <list>
NOTE
```

Dev mode: also read the explain-back for correctness, starting with `UNSURE`; a wrong `KILLS` (breaking that line
leaves the test green) sends it back to the author.

Next: `/atlas-feedback`.
