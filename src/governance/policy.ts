import { readFile } from "node:fs/promises";

import type { ReviewRole } from "../types.js";

export type GovernancePolicy = {
  requiredSkills: string[];
  requiredReviewerRoles: ReviewRole[];
  requireValidationActors: boolean;
  maxRiskFlagsBeforeBlock: number;
  /** Requester cannot validate or approve their own write. */
  requireSeparationOfDuties: boolean;
  /** If set for a role, only these reviewer names count as approvals for it. */
  reviewerAllowlist?: Partial<Record<ReviewRole, string[]>>;
};

export const defaultPolicy: GovernancePolicy = {
  // atlas stages that must have run before a write: the change was specified, then reviewed.
  requiredSkills: ["spec", "review"],
  // atlas reviewer agents (.agents/agents/) that must approve it.
  requiredReviewerRoles: ["plan-validator", "security-reviewer"],
  requireValidationActors: true,
  maxRiskFlagsBeforeBlock: 0,
  requireSeparationOfDuties: true,
};

export async function loadGovernancePolicy(
  policyPath: string,
): Promise<GovernancePolicy> {
  try {
    const content = await readFile(policyPath, "utf8");
    const raw = JSON.parse(content) as Partial<GovernancePolicy>;
    return {
      requiredSkills: raw.requiredSkills ?? defaultPolicy.requiredSkills,
      requiredReviewerRoles:
        raw.requiredReviewerRoles ?? defaultPolicy.requiredReviewerRoles,
      requireValidationActors:
        raw.requireValidationActors ?? defaultPolicy.requireValidationActors,
      maxRiskFlagsBeforeBlock:
        raw.maxRiskFlagsBeforeBlock ?? defaultPolicy.maxRiskFlagsBeforeBlock,
      requireSeparationOfDuties:
        raw.requireSeparationOfDuties ?? defaultPolicy.requireSeparationOfDuties,
      reviewerAllowlist: raw.reviewerAllowlist,
    };
  } catch {
    return defaultPolicy;
  }
}
