import { describe, expect, it, vi } from "vitest";

import { READ_TOOLS } from "../src/tools/catalog.js";
import { registerReadTools } from "../src/tools/readTools.js";
import { FakeMcpServer, getTool, type MockClient, textOf } from "./helpers.js";

function makeClient(): MockClient {
  return {
    request: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true } })),
  } as unknown as MockClient;
}

describe("registerReadTools", () => {
  it("registers every catalog read tool as read-only", () => {
    const server = new FakeMcpServer();
    registerReadTools(server as never, { client: makeClient() });

    expect(server.tools.map((tool) => tool.name)).toEqual(READ_TOOLS.map((def) => def.name));
    for (const tool of server.tools) {
      expect(tool.config).toMatchObject({
        annotations: { readOnlyHint: true, idempotentHint: true },
      });
    }
  });

  it("maps args to path, query and defaults", async () => {
    const server = new FakeMcpServer();
    const client = makeClient();
    registerReadTools(server as never, {
      client,
      defaults: { organizationId: "org-default", landscapeId: "land-default" },
    });

    await getTool(server, "organizations_list").handler({ admin: true });
    await getTool(server, "organizations_list").handler({});
    await getTool(server, "organization_landscapes_list").handler({});
    await getTool(server, "model_objects_list").handler({
      landscapeId: "l1",
      versionId: "v1",
      limit: 25,
      filter: { type: "system" },
      expand: ["parent"],
    });
    await getTool(server, "adrs_list").handler({});
    await getTool(server, "model_object_get").handler({ modelObjectId: "a/b" });

    const calls = client.request.mock.calls.map((call) => call[0]);
    expect(calls[0]).toEqual({ method: "GET", path: "/organizations", query: { admin: true } });
    expect(calls[1]).toEqual({ method: "GET", path: "/organizations", query: undefined });
    expect(calls[2]).toMatchObject({ path: "/organizations/org-default/landscapes" });
    expect(calls[3]).toEqual({
      method: "GET",
      path: "/landscapes/l1/versions/v1/model/objects",
      query: { filter: { type: "system" }, expand: ["parent"], limit: 25 },
    });
    // landscapeId from env default, versionId defaults to "latest"
    expect(calls[4]).toMatchObject({ path: "/landscapes/land-default/versions/latest/adrs" });
    // ids are URL-encoded so they cannot escape their path segment
    expect(calls[5]).toMatchObject({
      path: "/landscapes/land-default/versions/latest/model/objects/a%2Fb",
    });
  });

  it("returns a tool error when a defaultable id is missing", async () => {
    const server = new FakeMcpServer();
    const client = makeClient();
    registerReadTools(server as never, { client });

    const result = await getTool(server, "organization_landscapes_list").handler({});

    expect(result).toMatchObject({
      isError: true,
      structuredContent: { ok: false },
    });
    expect(textOf(result)).toBe(
      "organizationId is required (or set ICEPANEL_ORGANIZATION_ID).",
    );
    expect(client.request).not.toHaveBeenCalled();
  });

  it("validates input with schemas derived from the spec", () => {
    const server = new FakeMcpServer();
    registerReadTools(server as never, { client: makeClient() });
    const schema = (getTool(server, "model_object_get").config as {
      inputSchema: { safeParse: (v: unknown) => { success: boolean } };
    }).inputSchema;

    expect(schema.safeParse({ modelObjectId: "x" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
