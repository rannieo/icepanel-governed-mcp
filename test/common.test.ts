import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { executeGovernedWrite, executeReadRequest } from "../src/tools/common.js";
import type { GovernanceEvidence } from "../src/types.js";
import { type MockClient, textOf } from "./helpers.js";

describe("executeReadRequest", () => {
  it("returns success result when API request succeeds", async () => {
    const client = {
      request: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { id: "x" },
      })),
    } as unknown as MockClient;

    const result = await executeReadRequest(client, {
      method: "GET",
      path: "/things",
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      ok: true,
      status: 200,
      data: { id: "x" },
    });
  });

  it("returns error result when API request fails", async () => {
    const client = {
      request: vi.fn(async () => ({
        ok: false,
        status: 500,
        error: undefined,
        data: { raw: "x" },
      })),
    } as unknown as MockClient;

    const result = await executeReadRequest(client, {
      method: "GET",
      path: "/things",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(textOf(result)).toContain("unknown error");
    expect(result.structuredContent).toEqual({
      ok: false,
      status: 500,
      error: undefined,
      data: { raw: "x" },
    });
  });
});

function baseEvidence(overrides: Partial<GovernanceEvidence> = {}): GovernanceEvidence {
  return {
    requestedBy: "requester",
    validatedBy: "validator",
    operationIntent: "do write",
    impactedResources: ["res:1"],
    skillsExecuted: ["skill-1"],
    reviewers: [
      {
        role: "solutions-architect",
        reviewer: "sa",
        decision: "approved",
        summary: "ok",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ],
    riskFlags: [],
    ...overrides,
  };
}

describe("executeGovernedWrite", () => {
  it("blocks writes and combines rejection reasons in ledger output", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "common-blocked-"));
    const client = {
      request: vi.fn(async () => ({
        ok: true,
        status: 200,
      })),
    } as unknown as MockClient;

    const result = await executeGovernedWrite(
      {
        client,
        governancePolicy: {
          requiredSkills: ["required-skill"],
          requiredReviewerRoles: ["security-reviewer"],
          requireValidationActors: false,
          maxRiskFlagsBeforeBlock: 0,
          requireSeparationOfDuties: false,
        },
        governanceLedgerDir: ledgerDir,
      },
      {
        operation: "operation",
        request: {
          method: "POST",
          path: "/x",
          body: { a: 1 },
        },
        evidence: baseEvidence({
          skillsExecuted: ["different-skill"],
          reviewers: [
            {
              role: "plan-validator",
              reviewer: "net",
              decision: "rejected",
              summary: "need more detail",
              timestamp: "2026-01-01T00:00:01.000Z",
            },
          ],
          riskFlags: ["high-risk"],
        }),
      },
    );

    expect(client.request).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      ok: false,
      blocked: true,
    });
    const reason = String((result.structuredContent as Record<string, unknown>).reason);
    expect(reason).toContain("missing skills: required-skill");
    expect(reason).toContain("missing reviewer roles: security-reviewer");
    expect(reason).toContain("review rejections: plan-validator: need more detail");
    expect(reason).toContain("risk flags: high-risk");

    const files = await readdir(ledgerDir);
    expect(files).toHaveLength(1);
  });

  it("falls back to blocked when validation is false and no detail reasons exist", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "common-fallback-"));

    const result = await executeGovernedWrite(
      {
        client: {
          request: vi.fn(async () => ({
            ok: true,
            status: 200,
          })),
        } as unknown as MockClient,
        governancePolicy: {
          requiredSkills: [],
          requiredReviewerRoles: [],
          requireValidationActors: false,
          maxRiskFlagsBeforeBlock: -1,
          requireSeparationOfDuties: false,
        },
        governanceLedgerDir: ledgerDir,
      },
      {
        operation: "operation",
        request: {
          method: "POST",
          path: "/x",
          body: {},
        },
        evidence: baseEvidence({
          skillsExecuted: [],
          reviewers: [],
          riskFlags: [],
        }),
      },
    );

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Write blocked by governance gate: blocked.");
    expect((result.structuredContent as Record<string, unknown>).reason).toBe("blocked");
  });

  it("returns API error details when governance approves but write call fails", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "common-api-fail-"));
    const client = {
      request: vi.fn(async () => ({
        ok: false,
        status: 409,
        error: undefined,
        data: { message: "conflict" },
      })),
    } as unknown as MockClient;

    const result = await executeGovernedWrite(
      {
        client,
        governancePolicy: {
          requiredSkills: [],
          requiredReviewerRoles: [],
          requireValidationActors: false,
          maxRiskFlagsBeforeBlock: 0,
          requireSeparationOfDuties: false,
        },
        governanceLedgerDir: ledgerDir,
      },
      {
        operation: "operation",
        request: {
          method: "POST",
          path: "/x",
          body: { a: 1 },
        },
        evidence: baseEvidence({
          skillsExecuted: [],
          reviewers: [],
        }),
      },
    );

    expect(client.request).toHaveBeenCalledTimes(1);
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("unknown error");
    expect(result.structuredContent).toMatchObject({
      ok: false,
      blocked: false,
      status: 409,
    });
  });

  it("returns success details when governance and write both pass", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "common-ok-"));
    const client = {
      request: vi.fn(async () => ({
        ok: true,
        status: 201,
        data: { id: "created" },
      })),
    } as unknown as MockClient;

    const result = await executeGovernedWrite(
      {
        client,
        governancePolicy: {
          requiredSkills: [],
          requiredReviewerRoles: [],
          requireValidationActors: false,
          maxRiskFlagsBeforeBlock: 0,
          requireSeparationOfDuties: false,
        },
        governanceLedgerDir: ledgerDir,
      },
      {
        operation: "operation",
        request: {
          method: "POST",
          path: "/x",
          body: { a: 1 },
        },
        evidence: baseEvidence({
          skillsExecuted: [],
          reviewers: [],
        }),
      },
    );

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("Write succeeded.");
    expect(result.structuredContent).toMatchObject({
      ok: true,
      status: 201,
      data: { id: "created" },
    });
  });
});
