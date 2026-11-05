import { z } from "zod";

export const reviewerSchema = z.object({
  // Any role name; the policy decides which ones a write needs.
  role: z.string().min(1),
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

export const outputResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().optional(),
  blocked: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  reason: z.string().optional(),
  error: z.string().optional(),
  ledgerPath: z.string().optional(),
  data: z.unknown().optional(),
});
