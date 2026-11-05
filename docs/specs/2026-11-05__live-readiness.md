# Spec: live readiness — /v1 base URL, empty env values, landscape_create

## What we're building

The server works against live IcePanel with a `.env` copied from `.env.example`. The default base URL becomes
`https://api.icepanel.io/v1`, empty env values fall back to their defaults, and a governed `landscape_create` tool lets
an agent make a scratch landscape instead of writing into a real one.

## Why

- IcePanel's spec declares its server as `https://api.icepanel.io/v1` (`jq -c '.servers' openapi/source/openapi.json`),
  but `src/config.ts` defaults to `https://api.icepanel.io`, so every call 404s unless the user sets the URL.
- `.env.example` ships `ICEPANEL_API_BASE_URL=` with no value. dotenv sets it to `""`, and `??` keeps `""`, so the base
  URL is blank. Found 2026-11-05 on the first live run.
- The only landscape in the test org is a real company model. A governed write test needs somewhere safe to land.

## Acceptance criteria

- [ ] With `ICEPANEL_API_BASE_URL` unset, the config base URL is `https://api.icepanel.io/v1`.
- [ ] With `ICEPANEL_API_BASE_URL=""`, the base URL is also `https://api.icepanel.io/v1`; the same empty-falls-back rule
      holds for `GOVERNANCE_POLICY_PATH` and `GOVERNANCE_LEDGER_DIR`.
- [ ] An empty `ICEPANEL_API_KEY`, `ICEPANEL_BEARER_TOKEN`, `ICEPANEL_ORGANIZATION_ID` or `ICEPANEL_LANDSCAPE_ID`
      counts as unset (`undefined`), so id defaults are never `""`. (An empty key was already never sent as a header:
      `src/icepanel/client.ts` only sets `X-API-Key` when the value is truthy. Corrected after security review.)
- [ ] `.env.example` sets `ICEPANEL_API_BASE_URL=https://api.icepanel.io/v1`.
- [ ] `landscape_create` exists as a governed write: `POST /organizations/{organizationId}/landscapes`, body validated
      against IcePanel's schema (`name` required), `organizationId` defaulting to `ICEPANEL_ORGANIZATION_ID`, blocked
      without evidence like every write.
- [ ] The drift test covers `landscape_create` (it is in the catalog, so `test/catalog.test.ts` checks it).

## Edge cases and failure modes

- A base URL given with a trailing slash (`.../v1/`) would produce `//organizations`; out of scope, see below.

## Scope

- **In:** `src/config.ts`, `src/tools/catalog.ts` (one entry), `.env.example`, `README.md` env block,
  `docs/mcp-tools.md` tool table, tests.
- **Out:** trailing-slash normalisation · `landscape_delete` (cleanup is done in the app) · the E2E hint text.

## Risk answers

| # | Question | Answer |
|---|---|---|
| 1 | Governance gate, policy, evidence schema or ledger? | no (policy *path* default only) |
| 2 | Adds or changes a write tool? | **yes**: `landscape_create` |
| 3 | API key, bearer token, env loading, headers? | **yes**: env loading, empty key no longer sent |
| 4 | stdout on the server path, or startup? | no |
| 5 | How paths, queries or bodies are built? | no (catalog entry reuses `buildRequest`) |
| 6 | Dependency, CI, remote-fetching script? | no |

Reviewers: `security-reviewer` (2, 3), `test-reviewer`.

## Open questions

- None.
