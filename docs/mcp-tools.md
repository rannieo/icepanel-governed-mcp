# IcePanel Custom MCP Tools

## Read tools

- `organizations_list`
- `organization_landscapes_list`
- `versions_list`
- `model_objects_list`
- `diagrams_list`
- `comments_list`
- `landscape_search`

## Write tools (governance-gated)

- `diagram_create`
- `draft_create`
- `version_create`
- `comment_create`
- `comment_resolve`
- `model_object_create`
- `model_connection_create`
- `organization_create`

Every write tool requires an `evidence` object with:

- `requestedBy`, `validatedBy`
- `operationIntent`
- `impactedResources[]`
- `skillsExecuted[]`
- `reviewers[]` with required roles:
  - `solutions-architect`
  - `network-engineer`
  - `security-auditor`
  - `grill-me`

Default required skill stages (`requiredSkills`):

- `solution-architect`
- `network-engineer`
- `security-auditor`
- `grill-me`
- `brainstorming`
- `writing-plans`
- `test-driven-development`
- `verification-before-completion`

Policy source: `.governance/policies/write-gate-policy.json`  
Ledger output: `.governance/reviews/*.json`
