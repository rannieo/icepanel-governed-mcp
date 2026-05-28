import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";

import { loadConfig } from "./config.js";
import { loadGovernancePolicy } from "./governance/policy.js";
import { IcepanelClient } from "./icepanel/client.js";
import { registerReadTools } from "./tools/readTools.js";
import { registerWriteTools } from "./tools/writeTools.js";

export type ServerRunnerDeps = {
  loadConfigFn: typeof loadConfig;
  loadGovernancePolicyFn: typeof loadGovernancePolicy;
  createClient: typeof IcepanelClient;
  createServer: typeof McpServer;
  createTransport: typeof StdioServerTransport;
  registerReadToolsFn: typeof registerReadTools;
  registerWriteToolsFn: typeof registerWriteTools;
};

export const defaultServerRunnerDeps: ServerRunnerDeps = {
  loadConfigFn: loadConfig,
  loadGovernancePolicyFn: loadGovernancePolicy,
  createClient: IcepanelClient,
  createServer: McpServer,
  createTransport: StdioServerTransport,
  registerReadToolsFn: registerReadTools,
  registerWriteToolsFn: registerWriteTools,
};

export async function runServer(
  deps: ServerRunnerDeps = defaultServerRunnerDeps,
): Promise<void> {
  const config = deps.loadConfigFn();
  const governancePolicy = await deps.loadGovernancePolicyFn(
    config.governancePolicyPath,
  );
  const client = new deps.createClient({
    apiBaseUrl: config.apiBaseUrl,
    apiKey: config.apiKey,
    bearerToken: config.bearerToken,
  });

  const server = new deps.createServer(
    {
      name: "icepanel-custom-mcp",
      version: "0.1.0",
    },
    {
      instructions:
        "Use read tools for architecture exploration. For any write tool, provide full governance evidence with required roles and skill stages.",
      capabilities: {
        logging: {},
      },
    },
  );

  deps.registerReadToolsFn(server, {
    client,
    defaultOrganizationId: config.organizationId,
  });

  deps.registerWriteToolsFn(server, {
    client,
    governancePolicy,
    governanceLedgerDir: config.governanceLedgerDir,
  });

  const transport = new deps.createTransport();
  await server.connect(transport);
}

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

export function handleServerFatalError(error: unknown): never {
  const message = formatErrorMessage(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

export async function startServerCli(
  deps: ServerRunnerDeps = defaultServerRunnerDeps,
  onFatalError: (error: unknown) => never = handleServerFatalError,
): Promise<void> {
  await runServer(deps).catch((error) => {
    onFatalError(error);
  });
}

export function handleServerFatalErrorWithIo(
  error: unknown,
  io: {
    writeStderr: (text: string) => void;
    exit: (code: number) => never;
  },
): never {
  const message = formatErrorMessage(error);
  io.writeStderr(`${message}\n`);
  return io.exit(1);
}
