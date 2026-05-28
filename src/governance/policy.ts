import { readFile } from "node:fs/promises";

import type { ReviewRole } from "../types.js";

export type GovernancePolicy = {
  requiredSkills: string[];
  requiredReviewerRoles: ReviewRole[];
  requireValidationActors: boolean;
  maxRiskFlagsBeforeBlock: number;
};

export const defaultPolicy: GovernancePolicy = {
  requiredSkills: [
    "solution-architect",
    "network-engineer",
    "security-auditor",
    "grill-me",
    "brainstorming",
    "writing-plans",
    "test-driven-development",
    "verification-before-completion",
  ],
  requiredReviewerRoles: [
    "solutions-architect",
    "network-engineer",
    "security-auditor",
    "grill-me",
  ],
  requireValidationActors: true,
  maxRiskFlagsBeforeBlock: 0,
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
    };
  } catch {
    return defaultPolicy;
  }
}
