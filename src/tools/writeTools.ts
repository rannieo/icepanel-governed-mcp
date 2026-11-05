import type { McpServer } from "@modelcontextprotocol/server";

import { validateRequestBody } from "../icepanel/spec.js";
import type { GovernanceEvidence } from "../types.js";
import { buildInputSchema, buildRequest, pathParams } from "./build.js";
import { WRITE_TOOLS, type ToolDef } from "./catalog.js";
import type { WriteExecutionContext } from "./common.js";
import { executeGovernedWrite, toolError } from "./common.js";
import { outputResultSchema } from "./schemas.js";

function writeAnnotations(def: ToolDef) {
  const additive = def.method === "POST";
  return {
    readOnlyHint: false,
    destructiveHint: !additive,
    idempotentHint: !additive,
  };
}

export function registerWriteTools(
  server: McpServer,
  ctx: WriteExecutionContext,
): void {
  for (const def of WRITE_TOOLS) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: `${def.description} Requires governance evidence (see evidence schema).`,
        inputSchema: buildInputSchema(def, "write"),
        outputSchema: outputResultSchema,
        annotations: writeAnnotations(def),
      },
      async (args: Record<string, unknown>) => {
        const built = buildRequest(def, args, ctx.defaults ?? {});
        if (!built.ok) {
          return toolError(built.error, { ok: false, error: built.error });
        }

        if (def.method === "DELETE") {
          const target = pathParams(def.path).at(-1)!;
          if (args.confirm !== args[target]) {
            const error = `confirm must equal ${target} (${String(args[target])}) to delete.`;
            return toolError(error, { ok: false, error });
          }
        }

        // Reject malformed bodies before the gate: a governance decision on an
        // invalid payload is noise in the ledger.
        const bodyErrors =
          built.request.body === undefined
            ? []
            : validateRequestBody(def.method, def.path, built.request.body);
        if (bodyErrors.length) {
          const error = `body does not match IcePanel schema: ${bodyErrors.join("; ")}`;
          return toolError(error, { ok: false, error });
        }

        return executeGovernedWrite(ctx, {
          operation: def.name,
          request: built.request,
          evidence: args.evidence as GovernanceEvidence,
          dryRun: args.dryRun === true,
        });
      },
    );
  }
}
