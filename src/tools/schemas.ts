import { z } from "zod";

export const reviewerSchema = z.object({
  role: z.enum([
    "solutions-architect",
    "network-engineer",
    "security-auditor",
    "grill-me",
  ]),
  reviewer: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  summary: z.string().min(1),
  timestamp: z.string().min(1),
});

export const governanceEvidenceSchema = z.object({
  requestedBy: z.string().min(1),
  validatedBy: z.string().min(1),
  operationIntent: z.string().min(1),
  impactedResources: z.array(z.string()).min(1),
  skillsExecuted: z.array(z.string()).min(1),
  reviewers: z.array(reviewerSchema).min(1),
  riskFlags: z.array(z.string()).optional(),
});

export const baseWriteInputSchema = z.object({
  evidence: governanceEvidenceSchema,
  dryRunOnly: z.boolean().optional(),
});

export const outputResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().optional(),
  blocked: z.boolean().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
  ledgerPath: z.string().optional(),
  data: z.unknown().optional(),
});
