import { describe, expect, it, vi } from "vitest";

import {
  defaultInspectLedgerCliIo,
  runInspectLedgerCli,
  startInspectLedgerCli,
  type InspectLedgerCliDeps,
  type InspectLedgerCliIo,
} from "../src/cli/inspectLedger.js";

function makeDeps(): InspectLedgerCliDeps {
  return {
    loadConfigFn: () => ({
      apiBaseUrl: "https://api.example.test",
      governancePolicyPath: "/tmp/policy.json",
      governanceLedgerDir: "/tmp/ledger",
    }),
    readLedgerRecordsFn: async () => [
      {
        id: "r1",
        operation: "op",
        timestamp: "2026-01-01T00:00:00.000Z",
        approved: true,
        reason: "approved",
        payloadHash: "hash",
        evidence: {
          requestedBy: "a",
          validatedBy: "b",
          operationIntent: "intent",
          impactedResources: ["x"],
          skillsExecuted: [],
          reviewers: [],
          riskFlags: [],
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
      },
    ],
    summarizeLedgerFn: async () => [
      {
        file: "r1.json",
        timestamp: "2026-01-01T00:00:00.000Z",
        operation: "op",
        approved: true,
        reason: "approved",
        target: "POST /organizations",
      },
    ],
  };
}

function makeIo(): InspectLedgerCliIo & {
  writesOut: string[];
  writesErr: string[];
  exitCodes: number[];
} {
  const writesOut: string[] = [];
  const writesErr: string[] = [];
  const exitCodes: number[] = [];
  return {
    writesOut,
    writesErr,
    exitCodes,
    writeStdout: (text) => {
      writesOut.push(text);
    },
    writeStderr: (text) => {
      writesErr.push(text);
    },
    exit: (code) => {
      exitCodes.push(code);
    },
  };
}

describe("inspectLedger cli", () => {
  it("returns summary output by default", async () => {
    const output = await runInspectLedgerCli(["node", "script"], makeDeps());
    expect(output).toContain('"file": "r1.json"');
    expect(output).not.toContain('"payloadHash"');
  });

  it("returns full records output when --full is provided", async () => {
    const output = await runInspectLedgerCli(
      ["node", "script", "--full"],
      makeDeps(),
    );
    expect(output).toContain('"payloadHash": "hash"');
    expect(output).toContain('"id": "r1"');
  });

  it("writes output in startInspectLedgerCli", async () => {
    const io = makeIo();
    await startInspectLedgerCli(
      ["node", "script"],
      makeDeps(),
      io,
      async () => "ok\n",
    );
    expect(io.writesOut).toEqual(["ok\n"]);
    expect(io.writesErr).toEqual([]);
    expect(io.exitCodes).toEqual([]);
  });

  it("handles thrown errors in startInspectLedgerCli", async () => {
    const io = makeIo();
    await startInspectLedgerCli(
      ["node", "script"],
      makeDeps(),
      io,
      async () => {
        throw new Error("inspect failed");
      },
    );
    expect(io.writesErr[0]).toContain("inspect failed");
    expect(io.exitCodes).toEqual([1]);
  });

  it("handles thrown non-Error values in startInspectLedgerCli", async () => {
    const io = makeIo();
    await startInspectLedgerCli(
      ["node", "script"],
      makeDeps(),
      io,
      async () => {
        throw "inspect raw";
      },
    );
    expect(io.writesErr[0]).toContain("inspect raw");
    expect(io.exitCodes).toEqual([1]);
  });

  it("uses error message when Error.stack is unavailable", async () => {
    const io = makeIo();
    await startInspectLedgerCli(
      ["node", "script"],
      makeDeps(),
      io,
      async () => {
        const error = new Error("stackless inspect");
        error.stack = undefined as unknown as string;
        throw error;
      },
    );
    expect(io.writesErr[0]).toContain("stackless inspect");
    expect(io.exitCodes).toEqual([1]);
  });

  it("default io delegates to process streams and exit", () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined as never) as never);

    defaultInspectLedgerCliIo.writeStdout("stdout");
    defaultInspectLedgerCliIo.writeStderr("stderr");
    defaultInspectLedgerCliIo.exit(0);

    expect(stdoutSpy).toHaveBeenCalledWith("stdout");
    expect(stderrSpy).toHaveBeenCalledWith("stderr");
    expect(exitSpy).toHaveBeenCalledWith(0);

    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
