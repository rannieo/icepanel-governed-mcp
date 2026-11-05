# atlas: the engineering loop for this repository

The atlas loop, set up for a TypeScript MCP server: vitest, no tracker. It joins two ideas. **Compound engineering**: the agent drives, and each change leaves the next one
easier. **Coding-dojo**: the human writes the decision-bearing code and the agent coaches.

```
/atlas-ship (default)   spec → build test-first → check → reviewer → learning + explain-back → PR

/atlas-assess ─► spec ─► plan ─► build ─► review ─► feedback ─► prune      (full loop, for big or risky work)
                                   ├─ agent mode: agent writes, you review
                                   └─ dev mode:   you write, agent coaches
/atlas-yolo   incidents and hotfixes: skips ceremony, never safety
```

## Which path

- **`/atlas-ship`**: almost everything. One context reads, decides and builds, so the rule you read is still in front
  of you when you write the code. You see two things: the spec and the PR.
- **Full loop**: a change to the governance contract, a new subsystem, more than ~8 files, or anything you want
  researched and reviewed by a panel before code.
- **`/atlas-yolo`**: production is broken now.

## How it is enforced (`.claude/hooks/`, Node, tested in `test/atlas-hooks.test.ts`)

- **Phase gate** (`atlas-phase-gate.mjs`, PreToolUse Skill): the full loop runs in order, +1 forward or any step back.
  `assess`, `feedback`, `prune`, `ship` and `yolo` may start on their own.
- **Push gate** (`atlas-push-gate.mjs`, PreToolUse Bash): an atlas branch cannot `git push` or `gh pr create` until it
  reached `feedback` and, for a code change, carries the author's explain-back (seven labels, a `KILLS` test file that
  exists, a `SOURCE` spec that exists or `none: <reason>`). Docs-only branches skip the explain-back. A branch with no
  atlas task is not gated.
- **State** (`atlas-state.mjs`): per branch in `.claude/atlas-state.json` (gitignored). A task parked on `main`
  follows you onto the feature branch. Entries idle for 21 days are dropped.
- **Clear reminder** (`atlas-clear-reminder.mjs`, Stop): when a slice closes, refresh `docs/HANDOFF.md` (local,
  gitignored) and `/clear`.
- Every gate **fails closed**: a corrupt state file or a git error blocks rather than allows.
- Hooks are Claude Code only. Codex reads these skills and `AGENTS.md`, but nothing enforces the gates there; follow
  them by hand.

Advance state from any skill:

```bash
node .claude/hooks/atlas-state.mjs <phase> [checkpoint|-] [agent|dev]
# a note with backticks or $ goes on stdin, single-quoted heredoc:
node .claude/hooks/atlas-state.mjs build - agent <<'NOTE'
...
NOTE
```

## The checks (the same in every path)

```bash
npm run test:coverage        # tsc --noEmit + vitest, 100% on src/**
npm run openapi:check        # only when a tool, the catalog or the spec index changed
npm run test:e2e             # live IcePanel, needs .env; say so in the PR when it could not run
```

A change to the server path also needs a stdio smoke test: pipe `initialize`, `tools/list` and one `tools/call` into
`npm run --silent mcp:start` and confirm every stdout line is JSON-RPC.

## Due diligence: claims, not evidence

Every step consumes claims and produces them. Verify the one you are about to act on.

| Step | The claim you must not take on faith |
|---|---|
| assess / ship | The request's framing. Re-read the code before accepting "X is broken because Y". |
| spec | A criterion promising behaviour IcePanel, the MCP SDK or the client delivers, not our code. |
| plan | Every cited symbol, endpoint and API behaviour. An IcePanel endpoint is checked in `src/generated/icepanel-spec.json`, never from memory: three tools broke on 2026-11-05 because `/model_objects` became `/model/objects`. |
| build | The plan's assumptions. If one is false, stop and say so. |
| review | Every agent finding. A P1 is a hypothesis formatted as a conclusion. |
| feedback | Your own new claim. Mark measured versus intended; date any env claim. |
| prune | Zero references, from the LSP or `tsc` (rename the symbol, read the errors, revert), not a text search alone. |

- **Your memory is the weakest source.** Library APIs (`@modelcontextprotocol/server`, zod 4, vitest,
  `@cfworker/json-schema`) are looked up with context7 (`npx ctx7@latest`), IcePanel's API in the spec index, and
  behaviour in `node_modules/<pkg>` source.
- **A count carries its window.** "4 in the last 300 commits", never a bare "4". Test a sweep against a case you know
  is in the set.
- **Never cite a code comment as evidence.** Cite behaviour, a test, or the logic's `file:line`.

## The reviewers (`.agents/agents/`, linked as `.claude/agents/`)

`security-reviewer` · `test-reviewer` · `ts-type-safety-reviewer` · `plan-validator` · `learnings-researcher`.

The governance gate uses the same names: an MCP write needs evidence that atlas stages `spec` and `review` ran and that
`plan-validator` and `security-reviewer` approved (`.governance/policies/write-gate-policy.json`).

## Docs the loop writes

`docs/specs/` (WHAT, committed) · `docs/plans/` (HOW, committed) · `docs/learnings/` (gotchas, patterns, decisions with
alternatives) · `docs/HANDOFF.md` (local only).

## When the skill is the problem

The second time you work around an atlas skill, fix it with `/skill-creator:skill-creator` instead.

Roots: compound engineering (every.to/guides/compound-engineering) · coding-dojo (github.com/rannieo/coding-dojo).
