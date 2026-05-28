import { describe, expect, it } from "vitest";

import { validateGovernanceEvidence } from "../src/governance/gate.js";
import type { GovernanceEvidence } from "../src/types.js";
import { defaultPolicy } from "../src/governance/policy.js";

const baseEvidence: GovernanceEvidence = {
  requestedBy: "req",
  validatedBy: "val",
  operationIntent: "intent",
  impactedResources: ["landscape:l1"],
  skillsExecuted: [...defaultPolicy.requiredSkills],
  reviewers: [
    {
      role: "solutions-architect",
      reviewer: "sa",
      decision: "approved",
      summary: "ok",
      timestamp: "t1",
    },
    {
      role: "network-engineer",
      reviewer: "ne",
      decision: "approved",
      summary: "ok",
      timestamp: "t2",
    },
    {
      role: "security-auditor",
      reviewer: "sec",
      decision: "approved",
      summary: "ok",
      timestamp: "t3",
    },
    {
      role: "grill-me",
      reviewer: "gm",
      decision: "approved",
      summary: "ok",
      timestamp: "t4",
    },
  ],
  riskFlags: [],
};

describe("validateGovernanceEvidence", () => {
  it("approves when requirements are met", () => {
    const result = validateGovernanceEvidence(baseEvidence, defaultPolicy);
    expect(result.approved).toBe(true);
    expect(result.missingSkills).toEqual([]);
    expect(result.missingReviewerRoles).toEqual([]);
    expect(result.rejectionReasons).toEqual([]);
  });

  it("rejects when required actors are missing", () => {
    const result = validateGovernanceEvidence(
      { ...baseEvidence, requestedBy: " ", validatedBy: "" },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
  });

  it("rejects missing skills with deduped input", () => {
    const result = validateGovernanceEvidence(
      {
        ...baseEvidence,
        skillsExecuted: ["solutions-architect", "solutions-architect"],
      },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
    expect(result.missingSkills.length).toBeGreaterThan(0);
  });

  it("rejects when required reviewer role is not approved", () => {
    const result = validateGovernanceEvidence(
      {
        ...baseEvidence,
        reviewers: baseEvidence.reviewers.map((reviewer) =>
          reviewer.role === "network-engineer"
            ? { ...reviewer, decision: "rejected" as const }
            : reviewer,
        ),
      },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
    expect(result.missingReviewerRoles).toContain("network-engineer");
    expect(result.rejectionReasons[0]).toContain("network-engineer");
  });

  it("rejects when risk flags exceed policy limit", () => {
    const result = validateGovernanceEvidence(
      {
        ...baseEvidence,
        riskFlags: ["high-risk"],
      },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
    expect(result.riskFlags).toEqual(["high-risk"]);
  });

  it("defaults risk flags to empty and ignores missing actors when disabled by policy", () => {
    const result = validateGovernanceEvidence(
      {
        ...baseEvidence,
        requestedBy: " ",
        validatedBy: "",
        riskFlags: undefined,
      },
      {
        ...defaultPolicy,
        requireValidationActors: false,
      },
    );
    expect(result.approved).toBe(true);
    expect(result.riskFlags).toEqual([]);
  });
});
