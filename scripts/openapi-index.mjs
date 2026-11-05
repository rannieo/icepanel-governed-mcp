#!/usr/bin/env node
// Builds src/generated/icepanel-spec.json from openapi/source/openapi.json:
//   operations: { "POST /path/{id}": { query: [{ name, type, required }], body: <request JSON schema> | null } }
//   components: { schemas: <only the schemas reachable from request bodies> }
// The MCP server uses it to validate write bodies; tests use it to catch endpoint drift.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, process.argv[2] ?? "openapi/source/openapi.json");
const target = resolve(root, "src/generated/icepanel-spec.json");

const spec = JSON.parse(readFileSync(source, "utf8"));
const METHODS = ["get", "post", "patch", "put", "delete"];
const operations = {};
const needed = new Set();

function collectRefs(node) {
  if (Array.isArray(node)) return node.forEach(collectRefs);
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string") {
      const name = value.replace("#/components/schemas/", "");
      if (!needed.has(name)) {
        needed.add(name);
        collectRefs(spec.components.schemas[name]);
      }
    } else {
      collectRefs(value);
    }
  }
}

// Coarse type so the MCP input schema can be built without hand-typing every param.
function queryType(schema) {
  if (schema.$ref) return queryType(spec.components.schemas[schema.$ref.split("/").pop()]);
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (["boolean", "array", "object"].includes(schema.type)) return schema.type;
  return "string";
}

for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of METHODS) {
    const op = item[method];
    if (!op) continue;
    const body = op.requestBody?.content?.["application/json"]?.schema ?? null;
    if (body) collectRefs(body);
    const query = [...(item.parameters ?? []), ...(op.parameters ?? [])]
      .filter((param) => param.in === "query")
      .map((param) => ({
        name: param.name,
        type: queryType(param.schema ?? {}),
        required: Boolean(param.required),
      }));
    operations[`${method.toUpperCase()} ${path}`] = { query, body };
  }
}

const schemas = Object.fromEntries(
  [...needed].sort().map((name) => [name, spec.components.schemas[name]]),
);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `${JSON.stringify({ openapi: spec.openapi, operations, components: { schemas } }, null, 2)}\n`,
);
process.stderr.write(
  `Wrote ${target}: ${Object.keys(operations).length} operations, ${needed.size} schemas\n`,
);
