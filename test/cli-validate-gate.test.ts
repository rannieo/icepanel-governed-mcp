import { describe, expect, it, vi } from "vitest";

import {
  defaultValidateGateCliIo,
  runValidateGateCli,
  startValidateGateCli,
  type ValidateGateCliDeps,
  type ValidateGateCliIo,
} from "../src/cli/validateGate.js";

function makeDeps(
  validationApproved: boolean,
  readJson = '{"requestedBy":"r","validatedBy":"v"}',
): ValidateGateCliDeps {
  return {
    loadConfigFn: () => ({
      apiBaseUrl: "https://api.example.test",
      governancePolicyPath: "/tmp/policy.json",
      governanceLedgerDir: "/tmp/ledger",
    }),
    loadGovernancePolicyFn: async () => ({
      requiredSkills: [],
      requiredReviewerRoles: [],
      requireValidationActors: false,
      maxRiskFlagsBeforeBlock: 0,
    }),
    validateGovernanceEvidenceFn: vi.fn(() => ({
      approved: validationApproved,
      missingSkills: [],
      missingReviewerRoles: [],
      rejectionReasons: [],
      riskFlags: [],
    })),
    readFileFn: vi.fn(async () => readJson),
  };
}

function makeIo(): ValidateGateCliIo & {
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

describe("validateGate cli", () => {
  it("returns usage when evidence file is not provided", async () => {
    const result = await runValidateGateCli(["node", "script"]);
    expect(result.code).toBe(2);
    expect(result.stream).toBe("stderr");
    expect(result.output).toContain("Usage:");
  });

  it("returns success code for approved validation", async () => {
    const deps = makeDeps(true);
    const result = await runValidateGateCli(
      ["node", "script", "/tmp/evidence.json"],
      deps,
    );
    expect(result.code).toBe(0);
    expect(result.stream).toBe("stdout");
    expect(result.output).toContain('"approved": true');
    expect(deps.readFileFn).toHaveBeenCalledWith("/tmp/evidence.json", "utf8");
  });

  it("returns failure code for rejected validation", async () => {
    const deps = makeDeps(false);
    const result = await runValidateGateCli(
      ["node", "script", "/tmp/evidence.json"],
      deps,
    );
    expect(result.code).toBe(1);
    expect(result.stream).toBe("stdout");
    expect(result.output).toContain('"approved": false');
  });

  it("writes stdout and exits with provided code in startValidateGateCli", async () => {
    const io = makeIo();
    await startValidateGateCli(
      ["node", "script"],
      makeDeps(true),
      io,
      async () => ({
        code: 0,
        output: "ok\n",
        stream: "stdout",
      }),
    );

    expect(io.writesOut).toEqual(["ok\n"]);
    expect(io.writesErr).toEqual([]);
    expect(io.exitCodes).toEqual([0]);
  });

  it("writes stderr stream and exits with provided code", async () => {
    const io = makeIo();
    await startValidateGateCli(
      ["node", "script"],
      makeDeps(true),
      io,
      async () => ({
        code: 2,
        output: "usage\n",
        stream: "stderr",
      }),
    );

    expect(io.writesOut).toEqual([]);
    expect(io.writesErr).toEqual(["usage\n"]);
    expect(io.exitCodes).toEqual([2]);
  });

  it("handles thrown errors from runner", async () => {
    const io = makeIo();
    await startValidateGateCli(
      ["node", "script"],
      makeDeps(true),
      io,
      async () => {
        throw new Error("runner-failed");
      },
    );

    expect(io.writesErr[0]).toContain("runner-failed");
    expect(io.exitCodes).toEqual([1]);
  });

  it("handles thrown non-Error values from runner", async () => {
    const io = makeIo();
    await startValidateGateCli(
      ["node", "script"],
      makeDeps(true),
      io,
      async () => {
        throw "raw-failure";
      },
    );

    expect(io.writesErr[0]).toContain("raw-failure");
    expect(io.exitCodes).toEqual([1]);
  });

  it("uses error message when Error.stack is unavailable", async () => {
    const io = makeIo();
    await startValidateGateCli(
      ["node", "script"],
      makeDeps(true),
      io,
      async () => {
        const error = new Error("stackless validate");
        error.stack = undefined as unknown as string;
        throw error;
      },
    );

    expect(io.writesErr[0]).toContain("stackless validate");
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

    defaultValidateGateCliIo.writeStdout("stdout");
    defaultValidateGateCliIo.writeStderr("stderr");
    defaultValidateGateCliIo.exit(0);

    expect(stdoutSpy).toHaveBeenCalledWith("stdout");
    expect(stderrSpy).toHaveBeenCalledWith("stderr");
    expect(exitSpy).toHaveBeenCalledWith(0);

    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
