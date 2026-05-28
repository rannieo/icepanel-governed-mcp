export type ReviewRole =
  | "solutions-architect"
  | "network-engineer"
  | "security-auditor"
  | "grill-me";

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
};

export type IcepanelRequestArgs = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
};
