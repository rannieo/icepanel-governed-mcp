import { describe, expect, it, vi } from "vitest";

import {
  formatErrorMessage,
  handleServerFatalError,
  handleServerFatalErrorWithIo,
  runServer,
  startServerCli,
} from "../src/server.js";

describe("server", () => {
  it("runs server with injected dependencies and connects transport", async () => {
    const readToolsCalls: unknown[] = [];
    const writeToolsCalls: unknown[] = [];

    class FakeClient {
      public readonly config: Record<string, unknown>;

      constructor(config: Record<string, unknown>) {
        this.config = config;
      }
    }

    class FakeTransport {}

    class FakeServer {
      public readonly metadata: unknown;
      public readonly options: unknown;
      public connectedTransport: unknown | undefined;

      constructor(metadata: unknown, options: unknown) {
        this.metadata = metadata;
        this.options = options;
      }

      async connect(transport: unknown): Promise<void> {
        this.connectedTransport = transport;
      }
    }

    const config = {
      apiBaseUrl: "https://api.example.test",
      apiKey: "k",
      bearerToken: "b",
      organizationId: "org-1",
      landscapeId: "land-1",
      governancePolicyPath: "/tmp/policy.json",
      governanceLedgerDir: "/tmp/ledger",
    };

    const policy = {
      requiredSkills: ["a"],
      requiredReviewerRoles: ["solutions-architect"],
      requireValidationActors: true,
      maxRiskFlagsBeforeBlock: 0,
    };

    await runServer({
      loadConfigFn: () => config,
      loadGovernancePolicyFn: async (path) => {
        expect(path).toBe("/tmp/policy.json");
        return policy;
      },
      createClient: FakeClient as never,
      createServer: FakeServer as never,
      createTransport: FakeTransport as never,
      registerReadToolsFn: (server, ctx) => {
        readToolsCalls.push({ server, ctx });
      },
      registerWriteToolsFn: (server, ctx) => {
        writeToolsCalls.push({ server, ctx });
      },
    });

    expect(readToolsCalls).toHaveLength(1);
    expect(writeToolsCalls).toHaveLength(1);

    const readCall = readToolsCalls[0] as {
      server: FakeServer;
      ctx: { client: FakeClient; defaultOrganizationId: string };
    };
    const writeCall = writeToolsCalls[0] as {
      server: FakeServer;
      ctx: { client: FakeClient; governancePolicy: typeof policy; governanceLedgerDir: string };
    };

    expect(readCall.server).toBe(writeCall.server);
    expect(readCall.ctx.defaultOrganizationId).toBe("org-1");
    expect(readCall.ctx.client.config).toMatchObject({
      apiBaseUrl: "https://api.example.test",
      apiKey: "k",
      bearerToken: "b",
    });
    expect(writeCall.ctx.governancePolicy).toEqual(policy);
    expect(writeCall.ctx.governanceLedgerDir).toBe("/tmp/ledger");
    expect(readCall.server.connectedTransport).toBeInstanceOf(FakeTransport);
  });

  it("formats errors from Error and non-Error values", () => {
    const err = new Error("boom");
    err.stack = undefined as unknown as string;
    expect(formatErrorMessage(err)).toBe("boom");
    expect(formatErrorMessage({ code: 123 })).toBe("[object Object]");
  });

  it("writes to io and exits in handleServerFatalErrorWithIo", () => {
    const writes: string[] = [];
    const io = {
      writeStderr: (text: string) => {
        writes.push(text);
      },
      exit: (code: number) => {
        throw new Error(`exit:${code}`);
      },
    };

    expect(() => handleServerFatalErrorWithIo("fatal", io)).toThrow("exit:1");
    expect(writes).toEqual(["fatal\n"]);
  });

  it("writes to process stderr and exits in handleServerFatalError", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code}`);
      }) as never);

    expect(() => handleServerFatalError(new Error("fatal-error"))).toThrow("exit:1");
    expect(writeSpy).toHaveBeenCalledTimes(1);

    writeSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("startServerCli completes for successful server start", async () => {
    const onFatal = vi.fn((error: unknown) => {
      throw new Error(`should-not-fail:${String(error)}`);
    });

    class NoopClient {
      constructor(_: unknown) {}
    }
    class NoopTransport {}
    class NoopServer {
      constructor(_: unknown, __: unknown) {}
      async connect(_: unknown): Promise<void> {}
    }

    await startServerCli(
      {
        loadConfigFn: () => ({
          apiBaseUrl: "https://api.example.test",
          governancePolicyPath: "/tmp/policy",
          governanceLedgerDir: "/tmp/ledger",
        }),
        loadGovernancePolicyFn: async () => ({
          requiredSkills: [],
          requiredReviewerRoles: [],
          requireValidationActors: false,
          maxRiskFlagsBeforeBlock: 0,
        }),
        createClient: NoopClient as never,
        createServer: NoopServer as never,
        createTransport: NoopTransport as never,
        registerReadToolsFn: () => undefined,
        registerWriteToolsFn: () => undefined,
      },
      onFatal as never,
    );

    expect(onFatal).not.toHaveBeenCalled();
  });

  it("startServerCli forwards failures to fatal handler", async () => {
    const deps = {
      loadConfigFn: () => {
        throw new Error("config-fail");
      },
      loadGovernancePolicyFn: async () => ({
        requiredSkills: [],
        requiredReviewerRoles: [],
        requireValidationActors: false,
        maxRiskFlagsBeforeBlock: 0,
      }),
      createClient: class {
        constructor(_: unknown) {}
      } as never,
      createServer: class {
        constructor(_: unknown, __: unknown) {}
        async connect(_: unknown): Promise<void> {}
      } as never,
      createTransport: class {} as never,
      registerReadToolsFn: () => undefined,
      registerWriteToolsFn: () => undefined,
    };
    const onFatal = vi.fn(() => {
      throw new Error("fatal-called");
    });

    await expect(startServerCli(deps as never, onFatal as never)).rejects.toThrow(
      "fatal-called",
    );
    expect(onFatal).toHaveBeenCalledTimes(1);
  });
});
