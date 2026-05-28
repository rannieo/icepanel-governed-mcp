import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { registerWriteTools } from "../src/tools/writeTools.js";
import type { GovernanceEvidence } from "../src/types.js";
import { FakeMcpServer, getTool } from "./helpers.js";

function approvedEvidence(): GovernanceEvidence {
  return {
    requestedBy: "ai",
    validatedBy: "dev",
    operationIntent: "write to icepanel",
    impactedResources: ["landscape:l1"],
    skillsExecuted: [],
    reviewers: [],
    riskFlags: [],
  };
}

describe("registerWriteTools", () => {
  it("registers all write tools and maps each to governed write request", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "write-tools-"));
    const server = new FakeMcpServer();
    const client = {
      request: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { ok: true },
      })),
    } as never;

    registerWriteTools(server as never, {
      client,
      governancePolicy: {
        requiredSkills: [],
        requiredReviewerRoles: [],
        requireValidationActors: false,
        maxRiskFlagsBeforeBlock: 0,
      },
      governanceLedgerDir: ledgerDir,
    });

    expect(server.tools.map((tool) => tool.name)).toEqual([
      "diagram_create",
      "draft_create",
      "version_create",
      "comment_create",
      "comment_resolve",
      "model_object_create",
      "model_connection_create",
      "organization_create",
    ]);

    const evidence = approvedEvidence();

    const diagram = await getTool(server, "diagram_create").handler({
      landscapeId: "l1",
      versionId: "v1",
      updateViewedAt: true,
      body: { name: "diag" },
      evidence,
    });
    expect(diagram).toMatchObject({ structuredContent: { ok: true, status: 200 } });

    await getTool(server, "draft_create").handler({
      landscapeId: "l1",
      versionId: "v1",
      body: { name: "draft" },
      evidence,
    });
    await getTool(server, "version_create").handler({
      landscapeId: "l1",
      body: { name: "v2" },
      evidence,
    });
    await getTool(server, "comment_create").handler({
      landscapeId: "l1",
      versionId: "v1",
      body: { text: "hello" },
      evidence,
    });
    await getTool(server, "comment_resolve").handler({
      landscapeId: "l1",
      versionId: "v1",
      commentId: "c1",
      body: { status: "resolved", updatedBy: "qa" },
      evidence,
    });
    await getTool(server, "model_object_create").handler({
      landscapeId: "l1",
      versionId: "v1",
      body: { name: "service-a" },
      evidence,
    });
    await getTool(server, "model_connection_create").handler({
      landscapeId: "l1",
      versionId: "v1",
      body: { from: "a", to: "b" },
      evidence,
    });
    await getTool(server, "organization_create").handler({
      body: { name: "Org A" },
      evidence,
    });

    expect(client.request).toHaveBeenCalledTimes(8);

    const calls = client.request.mock.calls.map((call) => call[0]);
    expect(calls[0]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions/v1/diagrams",
      query: { updateViewedAt: true },
      body: { name: "diag" },
    });
    expect(calls[1]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions/v1/drafts",
      body: { name: "draft" },
    });
    expect(calls[2]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions",
      body: { name: "v2" },
    });
    expect(calls[3]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions/v1/comments",
      body: { text: "hello" },
    });
    expect(calls[4]).toMatchObject({
      method: "PUT",
      path: "/landscapes/l1/versions/v1/comments/c1",
      body: { status: "resolved", updatedBy: "qa" },
    });
    expect(calls[5]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions/v1/model_objects",
      body: { name: "service-a" },
    });
    expect(calls[6]).toMatchObject({
      method: "POST",
      path: "/landscapes/l1/versions/v1/model_connections",
      body: { from: "a", to: "b" },
    });
    expect(calls[7]).toMatchObject({
      method: "POST",
      path: "/organizations",
      body: { name: "Org A" },
    });
  });
});
