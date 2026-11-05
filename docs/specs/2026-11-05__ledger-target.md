# Spec: ledger records name the endpoint a write targeted

## What we're building

Every governance ledger record says which IcePanel endpoint the write was aimed at: the HTTP method and the resolved
path (ids filled in). The request body is still never stored. `governance:inspect` shows that target in its summary.

## Why

Today a record holds the evidence, the validation result and a SHA-256 of request + evidence
(`src/tools/common.ts`, `payloadHash`). An auditor reading a blocked `adr_delete` record cannot tell *which* ADR, in
*which* landscape, without re-deriving the hash from a request they don't have. The evidence's `impactedResources` is
self-declared by the agent, so it is not a substitute: the target should come from the request the server actually
built.

## Acceptance criteria

- [ ] An approved write's record has `target: { method, path }`, where `path` is the resolved path sent to IcePanel
      (e.g. `DELETE /landscapes/l1/versions/latest/adrs/adr-1`).
- [ ] A blocked write's record has the same `target`, even though IcePanel was never called.
- [ ] A dry-run record has the same `target`.
- [ ] No record contains the request body or query: a body field value used in the test does not appear anywhere in
      the written record file.
- [ ] `governance:inspect` (summary mode) prints `target` as `"<METHOD> <path>"` for each record.
- [ ] A record written before this change (no `target`) still summarises: `target` is `null`, and nothing throws.

## Edge cases and failure modes

- Writes rejected before the gate (bad body, wrong `confirm`, missing id) write no record today; that does not change.
- Path ids are already URL-encoded by `buildRequest`; the record stores the encoded path exactly as sent.

## Scope

- **In:** the record shape (`src/types.ts`), writing it (`src/tools/common.ts`), the summary (`src/governance/ledger.ts`),
  docs (`docs/mcp-tools.md` ledger line), tests.
- **Out:** storing the query string (it can carry filter data; later slice if needed) · ledger retention or signing
  (separate) · changing `payloadHash`.

## Risk answers

| # | Question | Answer |
|---|---|---|
| 1 | Governance gate, policy, evidence schema or ledger? | **yes**: ledger record shape |
| 2 | Adds or changes a write tool? | no |
| 3 | API key, bearer token, env, headers? | no |
| 4 | stdout on the server path, or startup? | no |
| 5 | How paths, queries or bodies are built from arguments? | no (reads the built request, does not change building) |
| 6 | Dependency, CI, remote-fetching script? | no |

Reviewers: `security-reviewer` (risk 1), `test-reviewer` (tests change).

## Open questions

- None. Assumption: `path` alone (no host) is enough to identify the target, since the base URL is fixed per server
  config.
