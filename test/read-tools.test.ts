import { describe, expect, it, vi } from "vitest";

import { registerReadTools } from "../src/tools/readTools.js";
import { FakeMcpServer, getTool } from "./helpers.js";

describe("registerReadTools", () => {
  it("registers all read tools and executes request mappings", async () => {
    const server = new FakeMcpServer();
    const client = {
      request: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { ok: true },
      })),
    } as never;

    registerReadTools(server as never, {
      client,
      defaultOrganizationId: "org-default",
    });

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "organizations_list",
      "organization_landscapes_list",
      "versions_list",
      "model_objects_list",
      "diagrams_list",
      "comments_list",
      "landscape_search",
    ]);

    await getTool(server, "organizations_list").handler({ admin: true });
    await getTool(server, "organizations_list").handler({});
    await getTool(server, "organization_landscapes_list").handler({});
    await getTool(server, "versions_list").handler({
      landscapeId: "l1",
      versionId: "v1",
      cursor: "c1",
      limit: 10,
      filter: { status: "draft" },
    });
    await getTool(server, "model_objects_list").handler({
      landscapeId: "l1",
      versionId: "v1",
      cursor: "c2",
      limit: 25,
      filter: { type: "service" },
      expand: ["parent", "edges"],
    });
    await getTool(server, "diagrams_list").handler({
      landscapeId: "l1",
      versionId: "v1",
      filter: { name: "overview" },
    });
    await getTool(server, "comments_list").handler({
      landscapeId: "l1",
      versionId: "v1",
      status: ["open", "resolved"],
    });
    await getTool(server, "landscape_search").handler({
      landscapeId: "l1",
      versionId: "v1",
      search: "payment",
      includeData: true,
      maxResults: 20,
      filter: { type: "service" },
    });

    expect(client.request).toHaveBeenCalledTimes(8);

    const firstCall = client.request.mock.calls[0]?.[0];
    expect(firstCall).toMatchObject({
      method: "GET",
      path: "/organizations",
      query: { admin: true },
    });

    const secondCall = client.request.mock.calls[1]?.[0];
    expect(secondCall).toMatchObject({
      method: "GET",
      path: "/organizations",
      query: undefined,
    });

    const thirdCall = client.request.mock.calls[2]?.[0];
    expect(thirdCall).toMatchObject({
      method: "GET",
      path: "/organizations/org-default/landscapes",
    });

    const lastCall = client.request.mock.calls[7]?.[0];
    expect(lastCall).toMatchObject({
      method: "GET",
      path: "/landscapes/l1/versions/v1/search",
      query: {
        search: "payment",
        includeData: true,
        maxResults: 20,
        filter: { type: "service" },
      },
    });
  });

  it("returns tool error when organization id is missing", async () => {
    const server = new FakeMcpServer();
    const client = {
      request: vi.fn(),
    } as never;

    registerReadTools(server as never, {
      client,
    });

    const result = await getTool(server, "organization_landscapes_list").handler({});

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        ok: false,
        error: "missing organizationId",
      },
    });
    expect(client.request).not.toHaveBeenCalled();
  });
});
