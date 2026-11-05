import type { McpServer } from "@modelcontextprotocol/server";

import type { IcepanelClient } from "../icepanel/client.js";
import { buildInputSchema, buildRequest, type ToolDefaults } from "./build.js";
import { READ_TOOLS } from "./catalog.js";
import { executeReadRequest, toolError } from "./common.js";
import { outputResultSchema } from "./schemas.js";

export type ReadToolContext = {
  client: IcepanelClient;
  defaults?: ToolDefaults;
};

export function registerReadTools(server: McpServer, ctx: ReadToolContext): void {
  for (const def of READ_TOOLS) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: buildInputSchema(def, "read"),
        outputSchema: outputResultSchema,
        annotations: { readOnlyHint: true, idempotentHint: true },
      },
      async (args: Record<string, unknown>) => {
        const built = buildRequest(def, args, ctx.defaults ?? {});
        if (!built.ok) {
          return toolError(built.error, { ok: false, error: built.error });
        }
        return executeReadRequest(ctx.client, built.request);
      },
    );
  }
}
