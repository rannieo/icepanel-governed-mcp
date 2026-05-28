import type {
  GovernanceEvidence,
  GovernanceValidationResult,
  ReviewRole,
} from "../types.js";
import type { GovernancePolicy } from "./policy.js";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function validateGovernanceEvidence(
  evidence: GovernanceEvidence,
  policy: GovernancePolicy,
): GovernanceValidationResult {
  const skills = unique(evidence.skillsExecuted);
  const missingSkills = policy.requiredSkills.filter((skill) => !skills.includes(skill));

  const approvedRoles = unique(
    evidence.reviewers
      .filter((reviewer) => reviewer.decision === "approved")
      .map((reviewer) => reviewer.role),
  );

  const missingReviewerRoles = policy.requiredReviewerRoles.filter(
    (role) => !approvedRoles.includes(role),
  ) as ReviewRole[];

  const rejectionReasons = evidence.reviewers
    .filter((reviewer) => reviewer.decision === "rejected")
    .map((reviewer) => `${reviewer.role}: ${reviewer.summary}`);

  const riskFlags = evidence.riskFlags ?? [];
  const missingActors =
    policy.requireValidationActors &&
    (!evidence.requestedBy.trim() || !evidence.validatedBy.trim());

  const blockedByRisk = riskFlags.length > policy.maxRiskFlagsBeforeBlock;
  const approved =
    !missingActors &&
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
  };
}
