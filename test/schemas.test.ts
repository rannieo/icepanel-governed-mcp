import { describe, expect, it } from "vitest";

import {
  baseWriteInputSchema,
  governanceEvidenceSchema,
  outputResultSchema,
  reviewerSchema,
} from "../src/tools/schemas.js";

describe("tool schemas", () => {
  it("parses valid reviewer and evidence payloads", () => {
    const reviewer = reviewerSchema.parse({
      role: "grill-me",
      reviewer: "peer",
      decision: "approved",
      summary: "good",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
    expect(reviewer.role).toBe("grill-me");

    const evidence = governanceEvidenceSchema.parse({
      requestedBy: "ai-agent",
      validatedBy: "developer",
      operationIntent: "update diagram",
      impactedResources: ["diagram:d1"],
      skillsExecuted: ["solutions-architect"],
      reviewers: [reviewer],
      riskFlags: ["none"],
    });
    expect(evidence.reviewers).toHaveLength(1);

    const writeInput = baseWriteInputSchema.parse({
      evidence,
      dryRunOnly: true,
    });
    expect(writeInput.dryRunOnly).toBe(true);
  });

  it("parses output payload and rejects invalid evidence", () => {
    const output = outputResultSchema.parse({
      ok: false,
      blocked: true,
      reason: "missing reviewers",
      ledgerPath: "/tmp/ledger.json",
      status: 403,
      error: "forbidden",
      data: { detail: "blocked" },
    });
    expect(output.blocked).toBe(true);

    expect(() =>
      governanceEvidenceSchema.parse({
        requestedBy: "",
        validatedBy: "",
        operationIntent: "",
        impactedResources: [],
        skillsExecuted: [],
        reviewers: [],
      }),
    ).toThrow();
  });
});
