# IcePanel Custom MCP + OpenAPI Workflow

This repo has two deliverables:

1. A **custom MCP server** for IcePanel API access with governance-enforced writes (49 tools; see `docs/mcp-tools.md`).
2. An **OpenAPI workflow** for fetch/split/bundle/size operations, plus a generated spec index that drives tool schemas and body validation.

Why not just the official IcePanel MCP? It has no draft, version or comment tools, and no evidence gate or audit ledger on writes. See `docs/mcp-tools.md`.

## How It Works

### MCP flow

1. MCP client connects via `stdio`.
2. Server loads config and governance policy.
3. Tools are registered from one table (`src/tools/catalog.ts`); path/query inputs come from the OpenAPI spec index.
4. Read tools proxy to IcePanel API.
5. Write tools:
   - validate `body` against the endpoint's OpenAPI schema,
   - validate evidence against policy (incl. separation of duties / reviewer allowlist),
   - always write a ledger record,
   - block, dry-run (`dryRun: true`), or forward to IcePanel.
   - Deletes also require `confirm` equal to the target id.

### Governance gate behavior

Write tools require an `evidence` object with:

- `requestedBy`, `validatedBy`
- `operationIntent`
- `impactedResources[]`
- `skillsExecuted[]`
- `reviewers[]`

Default required atlas stages (`requiredSkills`):

- `spec` (the change was specified: `atlas-spec` or `atlas-ship` step 2)
- `review` (it was reviewed: `atlas-review` or `atlas-ship` step 4)

Default required reviewer roles (`requiredReviewerRoles`):

- `plan-validator` (checks intent and impacted resources against the live model)
- `security-reviewer` (checks for gate bypass, secrets and destructive effect)

Policy is loaded from `.governance/policies/write-gate-policy.json`.  
Ledger records are written to `.governance/reviews` (or `GOVERNANCE_LEDGER_DIR`).

### OpenAPI flow

`openapi:index` regenerates `src/generated/icepanel-spec.json` (operations + request-body schemas) from `openapi/source/openapi.json`. `openapi:check` fetches the live spec, regenerates the index, and runs the drift test.

`openapi:build` runs:

1. fetch source spec
2. split into modular files
3. bundle full spec
4. bundle slim spec (`--remove-unused-components`)
5. print size report

## Workflow (atlas)

Changes to this repo go through the atlas loop: `/atlas-ship` by default, the full `/atlas-assess` → `prune` loop for big or risky work. Claude Code hooks in `.claude/hooks/` gate phase order and pushes. See `.agents/skills/atlas-README.md`.

## Local Setup

### Prerequisites

- Node.js 20+ (Node 24 is fine)
- `npm`
- `jq`

### Install

```bash
npm install
```

### Configure environment

Create `.env` from `.env.example`:

```bash
ICEPANEL_API_BASE_URL=https://api.icepanel.io
ICEPANEL_API_KEY=your_api_key_here
ICEPANEL_BEARER_TOKEN=
ICEPANEL_ORGANIZATION_ID=
ICEPANEL_LANDSCAPE_ID=
GOVERNANCE_POLICY_PATH=.governance/policies/write-gate-policy.json
GOVERNANCE_LEDGER_DIR=.governance/reviews
E2E_ALLOW_WRITES=false
E2E_WRITE_ORG_NAME_PREFIX=mcp-e2e-org
```

Use either `ICEPANEL_API_KEY` or `ICEPANEL_BEARER_TOKEN`.

## Run MCP Locally

Start server (stdio):

```bash
npm run mcp:start
```

Dev/watch mode:

```bash
npm run mcp:dev
```

### Compatibility (Claude + Codex)

This server uses the official MCP TypeScript server SDK and stdio transport, so it is compatible with standard MCP clients including Claude and Codex.

Important for stdio clients: server stdout must only contain JSON-RPC messages.  
This repo config suppresses dotenv runtime logs to keep stdio protocol-safe.

### Connect from Claude Code / Claude Desktop

Project-scoped Claude setup:

```bash
claude mcp add --transport stdio --scope project icepanel-custom-mcp -- npm run mcp:start
```

This repo also includes a ready `.mcp.json`:

```json
{
  "mcpServers": {
    "icepanel-custom-mcp": {
      "type": "stdio",
      "command": "npm",
      "args": ["run", "mcp:start"],
      "env": {}
    }
  }
}
```

Verify:

```bash
claude mcp list
```

### Connect from Codex CLI / Codex IDE

Add a stdio MCP server in `~/.codex/config.toml`:

```toml
[mcp_servers.icepanel-custom-mcp]
command = "npm"
args = ["run", "mcp:start"]
cwd = "/absolute/path/to/icepanel"
```

Optional forwarded env vars:

```toml
[mcp_servers.icepanel-custom-mcp]
command = "npm"
args = ["run", "mcp:start"]
cwd = "/absolute/path/to/icepanel"
env_vars = ["ICEPANEL_API_KEY", "ICEPANEL_BEARER_TOKEN", "ICEPANEL_ORGANIZATION_ID"]
```

After connecting from either client, run `tools/list` and verify expected tools from `docs/mcp-tools.md`.

## Governance Utilities

Validate an evidence payload:

```bash
npm run governance:validate -- examples/governance-evidence.sample.json
```

Ledger summary:

```bash
npm run governance:inspect
```

Full ledger records:

```bash
npm run governance:inspect -- --full
```

## OpenAPI Commands

Full pipeline:

```bash
npm run openapi:build
```

Individual commands:

```bash
npm run openapi:fetch
npm run openapi:split
npm run openapi:bundle
npm run openapi:bundle:slim
npm run openapi:size
npm run openapi:index
npm run openapi:check
```

Output artifacts:

- `openapi/source/openapi.json`
- `openapi/src/*`
- `dist/openapi.bundle.json`
- `dist/openapi.slim.json`

## Testing

Unit + integration tests:

```bash
npm test
```

Both `npm test` and `npm run test:coverage` type-check first (`tsc --noEmit`).

Coverage (strict 100% on `src/**`):

```bash
npm run test:coverage
```

### MCP E2E tests (live IcePanel)

E2E suite runs real MCP lifecycle over stdio:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

Read + blocked-write E2E:

```bash
npm run test:e2e
```

Opt-in real write E2E:

```bash
npm run test:e2e:write
```

Notes:

- E2E requires credentials in `.env`.
- Real writes run only when `E2E_ALLOW_WRITES=true`.
- E2E writes use `E2E_WRITE_ORG_NAME_PREFIX` for created org names.
