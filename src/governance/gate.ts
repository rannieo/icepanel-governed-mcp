import type {
  GovernanceEvidence,
  GovernanceValidationResult,
  ReviewerRecord,
  ReviewRole,
} from "../types.js";
import type { GovernancePolicy } from "./policy.js";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// Evidence is self-declared by the calling agent; these checks make a forged
// approval harder, not impossible. Signed approvals are the next step up.
function distrustReason(
  reviewer: ReviewerRecord,
  evidence: GovernanceEvidence,
  policy: GovernancePolicy,
): string | undefined {
  if (policy.requireSeparationOfDuties && reviewer.reviewer === evidence.requestedBy) {
    return `${reviewer.role}: ${reviewer.reviewer} cannot approve their own request`;
  }
  const allowed = policy.reviewerAllowlist?.[reviewer.role];
  if (allowed && !allowed.includes(reviewer.reviewer)) {
    return `${reviewer.role}: ${reviewer.reviewer} is not on the allowlist`;
  }
  return undefined;
}

function checkActors(evidence: GovernanceEvidence, policy: GovernancePolicy): string[] {
  const issues: string[] = [];
  if (
    policy.requireValidationActors &&
    (!evidence.requestedBy.trim() || !evidence.validatedBy.trim())
  ) {
    issues.push("requestedBy and validatedBy are required");
  }
  if (
    policy.requireSeparationOfDuties &&
    evidence.requestedBy.trim() &&
    evidence.requestedBy === evidence.validatedBy
  ) {
    issues.push("validatedBy must differ from requestedBy");
  }
  return issues;
}

export function validateGovernanceEvidence(
  evidence: GovernanceEvidence,
  policy: GovernancePolicy,
): GovernanceValidationResult {
  const skills = unique(evidence.skillsExecuted);
  const missingSkills = policy.requiredSkills.filter((skill) => !skills.includes(skill));

  const untrustedApprovals: string[] = [];
  const trustedRoles: ReviewRole[] = [];
  for (const reviewer of evidence.reviewers) {
    if (reviewer.decision !== "approved") continue;
    const reason = distrustReason(reviewer, evidence, policy);
    if (reason) {
      untrustedApprovals.push(reason);
    } else {
      trustedRoles.push(reviewer.role);
    }
  }

  const missingReviewerRoles = policy.requiredReviewerRoles.filter(
    (role) => !trustedRoles.includes(role),
  );

  const rejectionReasons = evidence.reviewers
    .filter((reviewer) => reviewer.decision === "rejected")
    .map((reviewer) => `${reviewer.role}: ${reviewer.summary}`);

  const riskFlags = evidence.riskFlags ?? [];
  const actorIssues = checkActors(evidence, policy);
  const blockedByRisk = riskFlags.length > policy.maxRiskFlagsBeforeBlock;

  const approved =
    actorIssues.length === 0 &&
    missingSkills.length === 0 &&
    missingReviewerRoles.length === 0 &&
    rejectionReasons.length === 0 &&
    !blockedByRisk;

  return {
    approved,
    missingSkills,
    missingReviewerRoles,
    rejectionReasons,
    riskFlags,
    untrustedApprovals,
    actorIssues,
  };
}
