# IcePanel Custom MCP Tools

## Why this exists alongside the official IcePanel MCP

IcePanel's official MCP (`https://mcp.icepanel.io/mcp`, OAuth, paid plans only; checked 2026-11-05) covers model objects, connections, domains, diagram/flow contents, teams, technologies, tags and ADRs. It does **not** expose draft, version or comment tools, and its writes have no evidence gate or audit ledger.

This server fills those gaps: drafts, versions, comments, organizations, and governance-gated, ledgered writes. It talks to the REST API with an API key, so it also works without OAuth.

All tools are defined in one table, `src/tools/catalog.ts`. Input schemas (path ids, query params) and write-body validation are derived from the IcePanel OpenAPI spec index in `src/generated/icepanel-spec.json`.

## Common arguments

- `landscapeId`: optional. Defaults to `ICEPANEL_LANDSCAPE_ID`.
- `organizationId`: optional. Defaults to `ICEPANEL_ORGANIZATION_ID`.
- `versionId`: optional. Defaults to `"latest"`.
- Query params (`filter`, `expand`, `cursor`, `limit`, ...) are whatever the spec defines for that endpoint.

## Read tools

| Area | Tools |
|---|---|
| Org / landscape / version | `organizations_list`, `organization_landscapes_list`, `versions_list` |
| Model | `model_objects_list`, `model_object_get`, `model_connections_list`, `model_connection_get`, `model_dependencies_list`, `landscape_search` |
| Diagrams / flows | `diagrams_list`, `diagram_get`, `diagram_content_get`, `flows_list`, `flow_get`, `flow_export_mermaid` |
| Domains / tags / teams / tech | `domains_list`, `domain_get`, `tags_list`, `tag_groups_list`, `teams_list`, `team_model_objects_list`, `organization_technologies_list` |
| Decision records | `adrs_list`, `adr_get` |
| Drafts / comments | `drafts_list`, `draft_get`, `comments_list`, `comment_get`, `comment_replies_list` |

## Write tools (governance-gated)

| Kind | Tools |
|---|---|
| Create | `organization_create`, `landscape_create`, `version_create`, `draft_create`, `diagram_create`, `model_object_create`, `model_connection_create`, `adr_create`, `comment_create`, `comment_reply_create` |
| Update | `model_object_update`, `model_connection_update`, `diagram_content_update`, `adr_update`, `draft_update`, `comment_resolve` |
| Action | `draft_merge` |
| Delete | `model_object_delete`, `model_connection_delete`, `adr_delete`, `comment_delete` |

How a write call runs, in order:

1. Path ids are resolved (args, then env defaults).
2. Deletes only: `confirm` must equal the target id (e.g. `adrId`).
3. `body` is validated against the endpoint's OpenAPI request schema. Invalid bodies are rejected here, before the gate, and are not ledgered.
4. Governance gate validates `evidence`. A ledger record is always written.
5. Blocked: return the reason. `dryRun: true`: return the would-be request. Otherwise forward to IcePanel.

Every write tool requires an `evidence` object with:

- `requestedBy`, `validatedBy`
- `operationIntent`
- `impactedResources[]`
- `skillsExecuted[]`
- `reviewers[]`, each `{ role, reviewer, decision, summary, timestamp }`

Default required atlas stages (`requiredSkills`):

- `spec` (the change was specified: `atlas-spec` or `atlas-ship` step 2)
- `review` (it was reviewed: `atlas-review` or `atlas-ship` step 4)

Default required reviewer roles (`requiredReviewerRoles`):

- `plan-validator` (checks intent and impacted resources against the live model)
- `security-reviewer` (checks for gate bypass, secrets and destructive effect)

Both lists come from `.governance/policies/write-gate-policy.json`; roles are plain strings.

Trust checks (policy):

- `requireSeparationOfDuties` (default `true`): `validatedBy` must differ from `requestedBy`, and an approval whose `reviewer` equals `requestedBy` is ignored.
- `reviewerAllowlist` (optional, per role): only listed reviewer names count as approvals for that role.

Evidence is still self-declared by the calling agent. These checks make forged approvals harder, not impossible. Signed approvals are the next step.

Policy source: `.governance/policies/write-gate-policy.json`  
Ledger output: `.governance/reviews/*.json` (gitignored). A record stores the evidence, the validation result, the `target` (method and resolved path, e.g. `DELETE /landscapes/l1/versions/latest/adrs/adr-1`) and a SHA-256 of request+evidence. It never stores the request body or query.

## Keeping up with IcePanel API changes

```bash
npm run openapi:check   # fetch live spec, regenerate index, run drift test, show diff
```

`test/catalog.test.ts` fails, naming the tool, if any catalog entry points at an endpoint the spec no longer has. CI runs this weekly.
