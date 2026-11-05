import { z } from "zod";

import { operationSpec, type QueryParamSpec } from "../icepanel/spec.js";
import type { IcepanelRequestArgs } from "../types.js";
import type { ToolDef } from "./catalog.js";
import { governanceEvidenceSchema } from "./schemas.js";

export type ToolDefaults = {
  organizationId?: string;
  landscapeId?: string;
};

const ENV_DEFAULTS: Record<string, string> = {
  organizationId: "ICEPANEL_ORGANIZATION_ID",
  landscapeId: "ICEPANEL_LANDSCAPE_ID",
};

const DEFAULT_HINTS: Record<string, string> = {
  organizationId: `Defaults to ${ENV_DEFAULTS.organizationId}.`,
  landscapeId: `Defaults to ${ENV_DEFAULTS.landscapeId}.`,
  versionId: 'Defaults to "latest".',
};

const bodySchema = z.record(z.string(), z.unknown());

export function pathParams(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
}

function specFor(def: ToolDef) {
  const op = operationSpec(def.method, def.path);
  if (!op) {
    // Fail at startup rather than at call time; test/catalog.test.ts catches this earlier.
    throw new Error(`${def.name}: ${def.method} ${def.path} is not in the IcePanel OpenAPI spec`);
  }
  return op;
}

function queryField(param: QueryParamSpec): z.ZodType {
  const field = {
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
    array: z.array(z.string()),
    object: z.record(z.string(), z.unknown()),
  }[param.type];
  return param.required ? field : field.optional();
}

export function buildInputSchema(def: ToolDef, kind: "read" | "write") {
  const op = specFor(def);
  const shape: Record<string, z.ZodType> = {};

  for (const name of pathParams(def.path)) {
    const hint = DEFAULT_HINTS[name];
    shape[name] = hint ? z.string().min(1).optional().describe(hint) : z.string().min(1);
  }
  for (const param of op.query) {
    shape[param.name] = queryField(param);
  }
  if (op.body) {
    shape.body = def.bodyDefaults
      ? bodySchema.optional().describe(`Merged over ${JSON.stringify(def.bodyDefaults)}.`)
      : bodySchema.describe("Request body; validated against the IcePanel OpenAPI schema.");
  }
  if (kind === "write") {
    shape.evidence = governanceEvidenceSchema;
    shape.dryRun = z
      .boolean()
      .optional()
      .describe("Run the governance gate and write the ledger, but do not call IcePanel.");
  }
  if (def.method === "DELETE") {
    shape.confirm = z
      .string()
      .min(1)
      .describe(`Must equal ${pathParams(def.path).at(-1)} to confirm the delete.`);
  }
  return z.object(shape);
}

export type BuiltRequest =
  | { ok: true; request: IcepanelRequestArgs }
  | { ok: false; error: string };

export function buildRequest(
  def: ToolDef,
  args: Record<string, unknown>,
  defaults: ToolDefaults,
): BuiltRequest {
  const op = specFor(def);
  let path = def.path;

  for (const name of pathParams(def.path)) {
    const value =
      (args[name] as string | undefined) ??
      (name === "versionId" ? "latest" : defaults[name as keyof ToolDefaults]);
    if (!value) {
      const env = ENV_DEFAULTS[name];
      return { ok: false, error: `${name} is required${env ? ` (or set ${env})` : ""}.` };
    }
    path = path.replace(`{${name}}`, encodeURIComponent(value));
  }

  const queryEntries = op.query
    .filter((param) => args[param.name] !== undefined)
    .map((param) => [param.name, args[param.name]] as const);

  const request: IcepanelRequestArgs = {
    method: def.method,
    path,
    query: queryEntries.length ? Object.fromEntries(queryEntries) : undefined,
  };
  if (op.body) {
    request.body = { ...def.bodyDefaults, ...(args.body as Record<string, unknown> | undefined) };
  }
  return { ok: true, request };
}
