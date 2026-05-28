import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { defaultPolicy } from "../src/governance/policy.js";
import { validateGovernanceEvidence } from "../src/governance/gate.js";
import { executeGovernedWrite } from "../src/tools/common.js";
import type { GovernanceEvidence } from "../src/types.js";

const approvedEvidence: GovernanceEvidence = {
  requestedBy: "ai-agent",
  validatedBy: "dev-reviewer",
  operationIntent: "Create new diagram for service map update",
  impactedResources: ["landscape:l1", "version:v1", "diagram:new"],
  skillsExecuted: [...defaultPolicy.requiredSkills],
  reviewers: [
    {
      role: "solutions-architect",
      reviewer: "architect",
      decision: "approved",
      summary: "Looks good",
      timestamp: "2026-05-28T10:00:00.000Z",
    },
    {
      role: "network-engineer",
      reviewer: "network",
      decision: "approved",
      summary: "No networking concerns",
      timestamp: "2026-05-28T10:01:00.000Z",
    },
    {
      role: "security-auditor",
      reviewer: "security",
      decision: "approved",
      summary: "No security concerns",
      timestamp: "2026-05-28T10:02:00.000Z",
    },
    {
      role: "grill-me",
      reviewer: "challenge",
      decision: "approved",
      summary: "Stress test passed",
      timestamp: "2026-05-28T10:03:00.000Z",
    },
  ],
  riskFlags: [],
};

describe("governance gate", () => {
  it("rejects evidence with missing required skill", () => {
    const result = validateGovernanceEvidence(
      {
        ...approvedEvidence,
        skillsExecuted: approvedEvidence.skillsExecuted.filter(
          (skill) => skill !== "grill-me",
        ),
      },
      defaultPolicy,
    );

    expect(result.approved).toBe(false);
    expect(result.missingSkills).toContain("grill-me");
  });

  it("approves evidence when all policy requirements are satisfied", () => {
    const result = validateGovernanceEvidence(approvedEvidence, defaultPolicy);
    expect(result.approved).toBe(true);
    expect(result.missingReviewerRoles).toHaveLength(0);
    expect(result.missingSkills).toHaveLength(0);
  });

  it("blocks write operations and writes ledger record when approvals are missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "icepanel-governance-"));
    const blockingEvidence: GovernanceEvidence = {
      ...approvedEvidence,
      reviewers: approvedEvidence.reviewers.filter(
        (reviewer) => reviewer.role !== "security-auditor",
      ),
    };

    const response = await executeGovernedWrite(
      {
        governancePolicy: defaultPolicy,
        governanceLedgerDir: dir,
        client: {
          request: async () => ({
            ok: true,
            status: 200,
            data: { ok: true },
          }),
        } as never,
      },
      {
        operation: "diagram_create",
        request: {
          method: "POST",
          path: "/landscapes/l1/versions/v1/diagrams",
          body: { name: "new diagram" },
        },
        evidence: blockingEvidence,
      },
    );

    expect(response.isError).toBe(true);
    const files = await readdir(dir);
    expect(files.length).toBe(1);

    const ledger = JSON.parse(await readFile(join(dir, files[0]!), "utf8")) as {
      approved: boolean;
      validation: { missingReviewerRoles: string[] };
    };
    expect(ledger.approved).toBe(false);
    expect(ledger.validation.missingReviewerRoles).toContain("security-auditor");
  });
});
