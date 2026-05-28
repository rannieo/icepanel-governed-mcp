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
- Unit/integration tests: `npm test`
- Coverage gate: `npm run test:coverage`
- Live E2E (opt-in): `npm run test:e2e`
- Live E2E with real writes: `npm run test:e2e:write`

## MCP/stdio Requirements

- Keep stdout protocol-safe for MCP JSON-RPC.
- Do not add startup/runtime logs to stdout for the MCP server path.
- Use stderr for diagnostics.

## Governance Rules

### Required skill stages (`requiredSkills`)

- `solution-architect`
- `network-engineer`
- `security-auditor`
- `grill-me`
- `brainstorming`
- `writing-plans`
- `test-driven-development`
- `verification-before-completion`

### Required reviewer roles (`requiredReviewerRoles`)

- `solutions-architect`
- `network-engineer`
- `security-auditor`
- `grill-me`

### Evidence contract

Write operations require evidence with:

- `requestedBy`, `validatedBy`
- `operationIntent`
- `impactedResources[]`
- `skillsExecuted[]`
- `reviewers[]`

Policy file:

- `.governance/policies/write-gate-policy.json`

Ledger output:

- `.governance/reviews/*.json` (or `GOVERNANCE_LEDGER_DIR` override)

## Skills Convention

- Local skills live under `.agents/skills/<skill-name>/SKILL.md`.
- Use frontmatter fields `name` and `description`.
- Prefer concise `SKILL.md` + optional `references/` files for long content.

## Implementation Guardrails

- Preserve compatibility with both Claude and Codex MCP clients.
- Update docs and fixtures whenever governance contracts change.
- Keep test coverage at 100% for `src/**`.
