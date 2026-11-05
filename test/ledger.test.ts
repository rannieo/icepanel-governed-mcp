import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getLedgerFileName,
  readLedgerRecords,
  summarizeLedger,
  writeLedgerRecord,
} from "../src/governance/ledger.js";
import type { GovernanceLedgerRecord } from "../src/types.js";

function makeRecord(overrides: Partial<GovernanceLedgerRecord> = {}): GovernanceLedgerRecord {
  return {
    id: "id-1",
    operation: "op",
    timestamp: "2026-05-29T00:00:00.000Z",
    approved: true,
    reason: "approved",
    payloadHash: "hash",
    evidence: {
      requestedBy: "a",
      validatedBy: "b",
      operationIntent: "intent",
      impactedResources: ["r"],
      skillsExecuted: ["solutions-architect"],
      reviewers: [
        {
          role: "solutions-architect",
          reviewer: "x",
          decision: "approved",
          summary: "ok",
          timestamp: "t",
        },
      ],
    },
    validation: {
      approved: true,
      missingSkills: [],
      missingReviewerRoles: [],
      rejectionReasons: [],
      riskFlags: [],
      untrustedApprovals: [],
      actorIssues: [],
    },
    ...overrides,
  };
}

describe("governance ledger", () => {
  it("writes and reads ledger records", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ledger-"));
    const r1 = makeRecord();
    const r2 = makeRecord({
      id: "id-2",
      timestamp: "2026-05-29T00:00:01.000Z",
      approved: false,
      reason: "blocked",
    });

    await writeLedgerRecord(dir, r1);
    await writeLedgerRecord(dir, r2);
    await writeFile(join(dir, "ignore.txt"), "x", "utf8");

    const records = await readLedgerRecords(dir);
    expect(records).toHaveLength(2);
    expect(records[0]?.id).toBe("id-1");
    expect(records[1]?.id).toBe("id-2");
  });

  it("summarizes records", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ledger-"));
    const record = makeRecord({
      id: "id-9",
      operation: "diagram_create",
      reason: "approved",
    });
    await writeLedgerRecord(dir, record);

    const summary = await summarizeLedger(dir);
    expect(summary).toEqual([
      {
        file: "2026-05-29T00:00:00.000Z-id-9.json",
        timestamp: "2026-05-29T00:00:00.000Z",
        operation: "diagram_create",
        approved: true,
        reason: "approved",
      },
    ]);
  });

  it("returns a deterministic ledger file name helper", () => {
    const name = getLedgerFileName(
      makeRecord({
        id: "abc",
        timestamp: "2026-05-29T03:04:05.000Z",
      }),
    );
    expect(name).toBe("2026-05-29T03:04:05.000Z-abc.json");
  });
});
