---
name: atlas-spec
description: >-
  Step 2 of the full atlas loop: write WHAT will be built as testable acceptance criteria, edge cases, scope and risk
  answers in docs/specs/, and stop for "Criteria complete?". Never HOW. Use when the user says "spec", "/atlas-spec",
  "write the spec", "acceptance criteria", "define done", or after /atlas-assess on a standard or large change.
---

# Spec: the contract, not the design

`node .claude/hooks/atlas-state.mjs spec`

Write `docs/specs/YYYY-MM-DD__slug.md` with the template in `atlas-ship` step 2 (What, Why, Acceptance criteria, Edge
cases and failure modes, Scope, Risk answers, Open questions). The risk questions and the rules for criteria are the
same; this skill does not restate them so the two cannot drift.

What the full loop adds:

- **Every criterion is checked for buildability.** If it promises behaviour that something other than our code
  delivers (IcePanel's response, the MCP SDK's validation, a client's permission prompt), rewrite it as what *we*
  do, or move it to Open questions. An unbuildable criterion fails a correct implementation and reads as a code bug.
- **Name the test file each criterion will live in.** That is what `plan` and `build` hang off.
- **Out rows say where they live** ("signed approvals: later slice"), so "out" is never silently "forgotten".
- **Governance contract changes** (evidence fields, policy keys, reviewer roles) get a criterion for the docs and
  fixtures too: `README.md`, `docs/mcp-tools.md`, `AGENTS.md`, `examples/`, `test/fixtures/`. `AGENTS.md` requires it.

**Stop: "Criteria complete?"** Do not plan past an unanswered question that changes a criterion.

Quick fast-path: for ≤3 files, behaviour-preserving, you may put a five-line How under the spec and take one approval
for both. The spec is still committed.

Next: `/atlas-plan`.
