# AGENTS.md

Project-level instructions for agents working in this repository.

## Project Overview

- This repo provides:
  - a custom **IcePanel MCP server** over stdio
  - an **OpenAPI modularization workflow**
- MCP writes are governance-gated and ledgered.

## Primary Commands

- Install: `npm install`
- Start MCP server: `npm run mcp:start`
- Dev/watch MCP server: `npm run mcp:dev`
- Unit/integration tests (type-checks first): `npm test`
- Refresh IcePanel spec + drift check: `npm run openapi:check`
- Coverage gate: `npm run test:coverage`
- Live E2E (opt-in): `npm run test:e2e`
- Live E2E with real writes: `npm run test:e2e:write`

## MCP/stdio Requirements

- Keep stdout protocol-safe for MCP JSON-RPC.
- Do not add startup/runtime logs to stdout for the MCP server path.
- Use stderr for diagnostics.

## Governance Rules

### Required atlas stages (`requiredSkills`)

- `spec` (the change was specified: `atlas-spec` or `atlas-ship` step 2)
- `review` (it was reviewed: `atlas-review` or `atlas-ship` step 4)

### Required reviewer roles (`requiredReviewerRoles`)

- `plan-validator` (checks intent and impacted resources against the live model)
- `security-reviewer` (checks for gate bypass, secrets and destructive effect)

Roles are plain strings; the policy decides which are required. The reviewers are the atlas agents in `.agents/agents/`.

### Evidence contract

Write operations require evidence with:

- `requestedBy`, `validatedBy`
- `operationIntent`
- `impactedResources[]`
- `skillsExecuted[]`
- `reviewers[]`

Trust checks (policy fields):

- `requireSeparationOfDuties` (default `true`): requester cannot validate or approve their own write.
- `reviewerAllowlist` (optional): per-role list of reviewer names whose approvals count.

Deletes also require `confirm` equal to the target id. `dryRun: true` runs the gate and ledger without calling IcePanel.

Policy file:

- `.governance/policies/write-gate-policy.json`

Ledger output:

- `.governance/reviews/*.json` (or `GOVERNANCE_LEDGER_DIR` override)

## Workflow: atlas

- Every change goes through atlas. Start with `.agents/skills/atlas-README.md`.
- Default path: `/atlas-ship`. Full loop for big or risky work: `/atlas-assess` → `spec` → `plan` → `build` →
  `review` → `feedback` → `prune`. Incidents: `/atlas-yolo`.
- Gates live in `.claude/hooks/` (Node, tested by `test/atlas-hooks.test.ts`): phase order, and no push or PR before
  `feedback` plus the author's seven-label explain-back for code changes. They run in Claude Code only; under Codex,
  follow them by hand.
- Skills: `.agents/skills/<name>/SKILL.md` (frontmatter `name`, `description`), linked as `.claude/skills`.
  Agents: `.agents/agents/`, linked as `.claude/agents`. Change a skill with `/skill-creator:skill-creator`.
- Docs the loop writes: `docs/specs/`, `docs/plans/`, `docs/learnings/`. `docs/HANDOFF.md` is local and gitignored.

## Adding or changing tools

- Tools are one entry each in `src/tools/catalog.ts`; do not hand-write per-tool handlers.
- After an IcePanel API change: `npm run openapi:check`, then fix any tool named by `test/catalog.test.ts`.

## Implementation Guardrails

- Preserve compatibility with both Claude and Codex MCP clients.
- Update docs and fixtures whenever governance contracts change.
- Keep test coverage at 100% for `src/**`.
