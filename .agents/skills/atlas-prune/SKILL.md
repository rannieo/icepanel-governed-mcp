---
name: atlas-prune
description: >-
  The anti-bloat step: delete what this change made dead — orphaned exports, unused helpers, stale tests, fixtures,
  docs, scripts and dependencies — after proving zero references with tsc or the LSP, then close the atlas task. Use
  when the user says "prune", "/atlas-prune", "clean up", "remove dead code", "what did this make dead", or after
  feedback on an atlas branch.
---

# Prune: compounding that only adds is what rots codebases

`node .claude/hooks/atlas-state.mjs prune`

## 1. Find candidates from the diff

`git diff $(git merge-base main HEAD)...HEAD`, then for every removed or replaced thing ask what used to depend on it:

- exports no longer imported (a replaced helper, a removed schema like the old `baseWriteInputSchema`);
- tests, fixtures and `examples/` written for behaviour that is gone;
- docs naming tools, env vars, policy keys or scripts that no longer exist (`README.md`, `docs/mcp-tools.md`,
  `AGENTS.md`);
- `package.json` scripts and dependencies nothing calls.

## 2. Prove zero references

A text search cannot tell a call from a comment, and a zero from a broken pattern. For a TypeScript symbol: rename
it (or delete it) on a scratch edit, run `npx tsc --noEmit`, read the errors, revert. For a dependency: `grep -rn
"<pkg>" src test scripts` *and* check it is not a peer of something used. Say which method produced each zero.

## 3. Delete, check, close

Delete in one commit (`chore: prune ...`), run `npm run test:coverage`, and confirm coverage did not drop because a
deleted test was the only one covering a live branch.

```bash
node .claude/hooks/atlas-state.mjs complete
```

The Stop hook will remind you once to refresh `docs/HANDOFF.md` and `/clear` before the next slice. Nothing dead:
say so and close.
