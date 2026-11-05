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
      role: "architect",
      reviewer: "sa",
      decision: "approved",
      summary: "ok",
      timestamp: "t1",
    },
    {
      role: "plan-validator",
      reviewer: "ne",
      decision: "approved",
      summary: "ok",
      timestamp: "t2",
    },
    {
      role: "security-reviewer",
      reviewer: "sec",
      decision: "approved",
      summary: "ok",
      timestamp: "t3",
    },
    {
      role: "test-reviewer",
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
        skillsExecuted: ["architect", "architect"],
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
          reviewer.role === "plan-validator"
            ? { ...reviewer, decision: "rejected" as const }
            : reviewer,
        ),
      },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
    expect(result.missingReviewerRoles).toContain("plan-validator");
    expect(result.rejectionReasons[0]).toContain("plan-validator");
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

describe("validateGovernanceEvidence trust checks", () => {
  const fullEvidence: GovernanceEvidence = {
    ...baseEvidence,
    reviewers: defaultPolicy.requiredReviewerRoles.map((role) => ({
      role,
      reviewer: `${role}-bot`,
      decision: "approved" as const,
      summary: "ok",
      timestamp: "t",
    })),
  };

  it("approves complete evidence under the default policy", () => {
    expect(validateGovernanceEvidence(fullEvidence, defaultPolicy)).toMatchObject({
      approved: true,
      untrustedApprovals: [],
      actorIssues: [],
    });
  });

  it("ignores self-approvals and self-validation when separation of duties is on", () => {
    const result = validateGovernanceEvidence(
      {
        ...fullEvidence,
        validatedBy: "req",
        reviewers: fullEvidence.reviewers.map((r) =>
          r.role === "security-reviewer" ? { ...r, reviewer: "req" } : r,
        ),
      },
      defaultPolicy,
    );
    expect(result.approved).toBe(false);
    expect(result.actorIssues).toEqual(["validatedBy must differ from requestedBy"]);
    expect(result.untrustedApprovals).toEqual([
      "security-reviewer: req cannot approve their own request",
    ]);
    expect(result.missingReviewerRoles).toEqual(["security-reviewer"]);
  });

  it("allows self-approval when separation of duties is off", () => {
    const result = validateGovernanceEvidence(
      { ...fullEvidence, validatedBy: "req" },
      { ...defaultPolicy, requireSeparationOfDuties: false },
    );
    expect(result.approved).toBe(true);
  });

  it("only counts approvals from allowlisted reviewers for a role", () => {
    const result = validateGovernanceEvidence(fullEvidence, {
      ...defaultPolicy,
      reviewerAllowlist: { "security-reviewer": ["alice"], "plan-validator": ["plan-validator-bot"] },
    });
    expect(result.approved).toBe(false);
    expect(result.untrustedApprovals).toEqual(["security-reviewer: security-reviewer-bot is not on the allowlist"]);
    expect(result.missingReviewerRoles).toEqual(["security-reviewer"]);
  });

  it("flags missing actors", () => {
    const result = validateGovernanceEvidence(
      { ...fullEvidence, requestedBy: " ", validatedBy: "" },
      defaultPolicy,
    );
    expect(result.actorIssues).toEqual(["requestedBy and validatedBy are required"]);
  });
});
