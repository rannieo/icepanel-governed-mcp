import { describe, expect, it } from "vitest";

import { operationSpec, validateRequestBody } from "../src/icepanel/spec.js";
import { buildInputSchema, buildRequest } from "../src/tools/build.js";
import { READ_TOOLS, WRITE_TOOLS } from "../src/tools/catalog.js";

// Drift guard: run `npm run openapi:check` to refresh the spec index; if IcePanel
// renamed or removed an endpoint, this test names the broken tool.
describe("tool catalog vs IcePanel OpenAPI spec", () => {
  it.each([...READ_TOOLS, ...WRITE_TOOLS].map((def) => [def.name, def] as const))(
    "%s points at an endpoint that exists",
    (_name, def) => {
      expect(operationSpec(def.method, def.path), `${def.method} ${def.path}`).toBeDefined();
    },
  );

  it("has unique tool names", () => {
    const names = [...READ_TOOLS, ...WRITE_TOOLS].map((def) => def.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("fails fast for an endpoint the spec does not have", () => {
    const ghost = { name: "ghost", title: "", description: "", method: "GET" as const, path: "/nope" };
    expect(() => buildInputSchema(ghost, "read")).toThrow("ghost: GET /nope is not in the IcePanel OpenAPI spec");
    expect(() => buildRequest(ghost, {}, {})).toThrow("is not in the IcePanel OpenAPI spec");
  });
});

describe("validateRequestBody", () => {
  const adrs = "/landscapes/{landscapeId}/versions/{versionId}/adrs";

  it("accepts a body matching the spec", () => {
    expect(validateRequestBody("POST", adrs, { name: "Use Postgres", status: "accepted" })).toEqual([]);
  });

  it("reports leaf errors with their location", () => {
    const errors = validateRequestBody("POST", adrs, { name: 5 });
    expect(errors).toContain('#: Instance does not have required property "status".');
    expect(errors.some((error) => error.startsWith("#/name:"))).toBe(true);
  });

  it("treats operations without a body schema as valid", () => {
    expect(validateRequestBody("GET", adrs, { anything: true })).toEqual([]);
  });
});
