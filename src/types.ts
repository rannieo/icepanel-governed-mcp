/** A reviewer role, e.g. an atlas reviewer agent name. The policy lists which are required. */
export type ReviewRole = string;

export type Decision = "approved" | "rejected";

export type ReviewerRecord = {
  role: ReviewRole;
  reviewer: string;
  decision: Decision;
  summary: string;
  timestamp: string;
};

export type GovernanceEvidence = {
  requestedBy: string;
  validatedBy: string;
  operationIntent: string;
  impactedResources: string[];
  skillsExecuted: string[];
  reviewers: ReviewerRecord[];
  riskFlags?: string[];
};

export type GovernanceValidationResult = {
  approved: boolean;
  missingSkills: string[];
  missingReviewerRoles: ReviewRole[];
  rejectionReasons: string[];
  riskFlags: string[];
  /** Approvals ignored: self-approval or reviewer not on the role's allowlist. */
  untrustedApprovals: string[];
  /** Actor problems: missing requestedBy/validatedBy, or self-validation. */
  actorIssues: string[];
};

export type GovernanceLedgerRecord = {
  id: string;
  operation: string;
  timestamp: string;
  approved: boolean;
  reason: string;
  payloadHash: string;
  evidence: GovernanceEvidence;
  validation: GovernanceValidationResult;
  dryRun?: boolean;
};

export type IcepanelRequestArgs = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
};
