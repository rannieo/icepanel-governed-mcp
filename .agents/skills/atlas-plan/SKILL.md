---
name: atlas-plan
description: >-
  Step 3 of the full atlas loop: decide HOW to meet an approved spec — approach, files, seams reused, one test per
  criterion, risks with the test that catches each — grounded in the real code and IcePanel spec, then validated by
  the plan-validator agent before it is shown. Use when the user says "plan", "/atlas-plan", "how should we build
  this", "design the approach", or after a spec is approved.
---

# Plan: how, grounded in what exists

`node .claude/hooks/atlas-state.mjs plan`

## 1. Ground it

Read before you design. Dispatch `learnings-researcher` (prior learnings and specs on the same terms) and, for a wide
sweep, an Explore agent. Read the seams yourself:

- Tools: `src/tools/catalog.ts` (data), `build.ts` (schemas + request), `readTools.ts` / `writeTools.ts`
  (registration), `common.ts` (read and governed-write execution).
- Governance: `src/governance/gate.ts`, `policy.ts`, `ledger.ts`; contract in `src/tools/schemas.ts`.
- IcePanel: `src/icepanel/client.ts`, `spec.ts`, and the endpoint itself in `src/generated/icepanel-spec.json`.
- Wiring: `src/server.ts` (injected deps, which is how tests reach 100%).

Every symbol, endpoint and library behaviour the plan cites is looked up now (context7, the spec index,
`node_modules` source), and the plan cites what the tool returned.

## 2. Write `docs/plans/YYYY-MM-DD__slug.md`

```markdown
# Plan: <title>
Spec: docs/specs/<file>.md

## Approach            the shape, and the alternative rejected with its reason
## Files               path — what changes
## Tests               criterion → test file → what it asserts
## Risks               "swap X → <test> goes red", one per risk
## Checks              the commands from atlas-README, plus any extra (openapi:check, stdio smoke, e2e)
## Build mode          agent or dev, and why
```

Build mode default: decision-heavy or long-lived code (the gate, the policy, the catalog builder) → **dev**;
mechanical (a catalog entry, docs) → **agent**. The user decides.

## 3. Validate before showing

Dispatch `plan-validator` with the spec and plan paths. It checks the premise the planner cannot audit: cited symbols
exist at the cited lines, endpoints exist in the spec index, each criterion has a test, nothing in Out sneaks in. Fix
BLOCKERs, then show the plan with the validator's verdict.

**Stop: "Plan approved?"** Next: `/atlas-build`.
