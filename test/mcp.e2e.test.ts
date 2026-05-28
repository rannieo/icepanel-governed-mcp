import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { access, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type JsonRpcErrorObject = {
  code: number;
  message: string;
  data?: unknown;
};

type JsonRpcResponse = {
  id?: number | string;
  result?: unknown;
  error?: JsonRpcErrorObject;
};

type ToolDefinition = {
  name: string;
};

type ToolListResult = {
  tools: ToolDefinition[];
};

type ToolCallResult = {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

const filePath = fileURLToPath(import.meta.url);
const testDir = dirname(filePath);
const projectRoot = resolve(testDir, "..");
const fixturesDir = join(testDir, "fixtures");
const e2eLedgerDir = join(tmpdir(), `icepanel-mcp-e2e-ledger-${Date.now()}`);

dotenv.config({ quiet: true });

const runE2E = process.env.RUN_E2E === "true";
const hasIcepanelCredentials = Boolean(
  process.env.ICEPANEL_API_KEY || process.env.ICEPANEL_BEARER_TOKEN,
);
const enableWrites = process.env.E2E_ALLOW_WRITES === "true";

class McpStdioClient {
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private readonly stdoutNoise: string[] = [];
  private readonly stderrLogs: string[] = [];
  private nextId = 1;
  private stdoutBuffer = "";

  constructor(private readonly processRef: ChildProcessWithoutNullStreams) {
    this.processRef.stdout.on("data", (chunk: Buffer) => {
      this.handleStdoutChunk(chunk.toString("utf8"));
    });
    this.processRef.stderr.on("data", (chunk: Buffer) => {
      this.stderrLogs.push(chunk.toString("utf8"));
    });
    this.processRef.on("exit", (code, signal) => {
      const pendingEntries = [...this.pending.entries()];
      this.pending.clear();
      for (const [, pending] of pendingEntries) {
        clearTimeout(pending.timeout);
        pending.reject(
          new Error(
            `MCP process exited before response (code=${String(code)}, signal=${String(
              signal,
            )})`,
          ),
        );
      }
    });
  }

  getLogs(): { stdoutNoise: string[]; stderrLogs: string[] } {
    return {
      stdoutNoise: [...this.stdoutNoise],
      stderrLogs: [...this.stderrLogs],
    };
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: {
        name: "icepanel-e2e-client",
        version: "1.0.0",
      },
    });
    this.notify("notifications/initialized", {});
  }

  async request<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs = 45_000,
  ): Promise<T> {
    const id = this.nextId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for MCP response to ${method}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });
    });

    this.writeLine(JSON.stringify(payload));
    return promise;
  }

  notify(method: string, params: Record<string, unknown> = {}): void {
    const payload = {
      jsonrpc: "2.0",
      method,
      params,
    };
    this.writeLine(JSON.stringify(payload));
  }

  async shutdown(): Promise<void> {
    if (this.processRef.exitCode !== null) {
      return;
    }

    this.processRef.kill("SIGTERM");
    const exited = await Promise.race([
      once(this.processRef, "exit").then(() => true),
      new Promise<boolean>((resolveTimeout) => {
        setTimeout(() => resolveTimeout(false), 2_000);
      }),
    ]);

    if (!exited && this.processRef.exitCode === null) {
      this.processRef.kill("SIGKILL");
      await once(this.processRef, "exit");
    }
  }

  private writeLine(line: string): void {
    if (!this.processRef.stdin.writable) {
      throw new Error("MCP process stdin is not writable");
    }
    this.processRef.stdin.write(`${line}\n`);
  }

  private handleStdoutChunk(chunk: string): void {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split("\n");
    this.stdoutBuffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      try {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        this.handleMessage(parsed);
      } catch {
        this.stdoutNoise.push(rawLine);
      }
    }
  }

  private handleMessage(message: JsonRpcResponse): void {
    const id = message.id;
    if (typeof id !== "number" || !this.pending.has(id)) {
      return;
    }

    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(id);

    if (message.error) {
      const dataSuffix =
        message.error.data === undefined
          ? ""
          : ` data=${JSON.stringify(message.error.data)}`;
      pending.reject(
        new Error(`MCP JSON-RPC error ${message.error.code}: ${message.error.message}${dataSuffix}`),
      );
      return;
    }

    pending.resolve(message.result);
  }
}

function createMcpProcess(): ChildProcessWithoutNullStreams {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(npmCommand, ["run", "mcp:start"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DOTENV_CONFIG_QUIET: "true",
      GOVERNANCE_LEDGER_DIR: e2eLedgerDir,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function loadFixture(name: string): Promise<Record<string, unknown>> {
  const file = join(fixturesDir, name);
  const text = await readFile(file, "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

const suite = describe.skipIf(!runE2E || !hasIcepanelCredentials);

suite("MCP stdio E2E", () => {
  let client: McpStdioClient;

  beforeAll(async () => {
    client = new McpStdioClient(createMcpProcess());
    await client.initialize();
  }, 60_000);

  afterAll(async () => {
    await client.shutdown();
    await rm(e2eLedgerDir, { recursive: true, force: true });
  });

  it("completes initialize + tools/list lifecycle and exposes expected tools", async () => {
    const listResult = await client.request<ToolListResult>("tools/list", {});

    expect(Array.isArray(listResult.tools)).toBe(true);
    expect(listResult.tools.length).toBeGreaterThan(0);

    const names = listResult.tools.map((tool) => tool.name);
    expect(names).toContain("organizations_list");
    expect(names).toContain("organization_create");
  });

  it("executes a live read tool call", async () => {
    const result = await client.request<ToolCallResult>("tools/call", {
      name: "organizations_list",
      arguments: {},
    });

    if (result.isError) {
      const status = result.structuredContent?.status;
      const baseUrl = process.env.ICEPANEL_API_BASE_URL ?? "https://api.icepanel.io";
      const hint =
        status === 404 && !baseUrl.endsWith("/v1")
          ? " Hint: ICEPANEL_API_BASE_URL may need a /v1 suffix."
          : "";
      throw new Error(
        `Live read tool call failed (status=${String(status)}). Check ICEPANEL credentials and base URL.${hint} Response: ${JSON.stringify(
          result.structuredContent ?? result.content,
        )}`,
      );
    }
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.ok).toBe(true);
    expect(typeof result.structuredContent?.status).toBe("number");
  }, 60_000);

  it("blocks write calls with invalid governance evidence and records ledger output", async () => {
    const invalidEvidence = await loadFixture("governance-evidence.invalid.json");

    const result = await client.request<ToolCallResult>("tools/call", {
      name: "organization_create",
      arguments: {
        body: {
          name: `e2e-blocked-${Date.now()}`,
        },
        evidence: invalidEvidence,
      },
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent?.ok).toBe(false);
    expect(result.structuredContent?.blocked).toBe(true);

    const ledgerPath = result.structuredContent?.ledgerPath;
    expect(typeof ledgerPath).toBe("string");
    await access(resolve(projectRoot, String(ledgerPath)));
  }, 60_000);

  it.runIf(enableWrites)(
    "executes a real write call when E2E_ALLOW_WRITES=true",
    async () => {
      const validEvidence = await loadFixture("governance-evidence.valid.json");
      const orgNamePrefix = process.env.E2E_WRITE_ORG_NAME_PREFIX ?? "mcp-e2e-org";

      const result = await client.request<ToolCallResult>("tools/call", {
        name: "organization_create",
        arguments: {
          body: {
            name: `${orgNamePrefix}-${Date.now()}`,
          },
          evidence: validEvidence,
        },
      });

      if (result.isError) {
        const logs = client.getLogs();
        throw new Error(
          `Expected real write success but got error: ${JSON.stringify(
            result.structuredContent ?? result.content,
          )}\nSTDERR:\n${logs.stderrLogs.join("")}`,
        );
      }

      expect(result.structuredContent?.ok).toBe(true);
      expect(typeof result.structuredContent?.status).toBe("number");
      expect(result.structuredContent?.ledgerPath).toBeDefined();
    },
    60_000,
  );
});
