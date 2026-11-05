import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { GovernancePolicy } from "../src/governance/policy.js";
import { WRITE_TOOLS } from "../src/tools/catalog.js";
import { registerWriteTools } from "../src/tools/writeTools.js";
import type { GovernanceEvidence } from "../src/types.js";
import { FakeMcpServer, getTool, type MockClient, textOf } from "./helpers.js";

const openPolicy: GovernancePolicy = {
  requiredSkills: [],
  requiredReviewerRoles: [],
  requireValidationActors: false,
  maxRiskFlagsBeforeBlock: 0,
  requireSeparationOfDuties: false,
};

const evidence: GovernanceEvidence = {
  requestedBy: "ai",
  validatedBy: "dev",
  operationIntent: "write to icepanel",
  impactedResources: ["landscape:l1"],
  skillsExecuted: [],
  reviewers: [],
  riskFlags: [],
};

async function setup(policy: GovernancePolicy = openPolicy) {
  const ledgerDir = await mkdtemp(join(tmpdir(), "write-tools-"));
  const server = new FakeMcpServer();
  const client = {
    request: vi.fn(async () => ({ ok: true, status: 200, data: { ok: true } })),
  } as unknown as MockClient;
  registerWriteTools(server as never, {
    client,
    governancePolicy: policy,
    governanceLedgerDir: ledgerDir,
    defaults: { landscapeId: "l1" },
  });
  return { server, client, ledgerDir };
}

describe("registerWriteTools", () => {
  it("registers every catalog write tool with method-appropriate hints", async () => {
    const { server } = await setup();

    expect(server.tools.map((tool) => tool.name)).toEqual(WRITE_TOOLS.map((def) => def.name));
    expect(getTool(server, "adr_create").config).toMatchObject({
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    });
    expect(getTool(server, "adr_delete").config).toMatchObject({
      annotations: { destructiveHint: true, idempotentHint: true },
    });
  });

  it("forwards approved writes with mapped path, query and body", async () => {
    const { server, client } = await setup();

    await getTool(server, "diagram_content_update").handler({
      diagramId: "d1",
      updateViewedAt: true,
      body: {},
      evidence,
    });
    await getTool(server, "comment_resolve").handler({
      versionId: "v1",
      commentId: "c1",
      evidence,
    });
    await getTool(server, "draft_merge").handler({ draftId: "dr1", evidence });

    const calls = client.request.mock.calls.map((call) => call[0]);
    expect(calls[0]).toEqual({
      method: "PATCH",
      path: "/landscapes/l1/versions/latest/diagrams/d1/content",
      query: { updateViewedAt: true },
      body: {},
    });
    expect(calls[1]).toMatchObject({
      method: "PATCH",
      path: "/landscapes/l1/versions/v1/comments/c1",
      body: { status: "resolved" },
    });
    // merge has no request body in the spec, so none is sent
    expect(calls[2]).toEqual({
      method: "POST",
      path: "/landscapes/l1/versions/latest/drafts/dr1/merge",
      query: undefined,
    });
  });

  it("rejects bodies that do not match the IcePanel schema, before the gate", async () => {
    const { server, client, ledgerDir } = await setup();

    const result = await getTool(server, "model_object_create").handler({
      body: { name: "orphan" },
      evidence,
    });

    expect(result).toMatchObject({ isError: true, structuredContent: { ok: false } });
    expect(textOf(result)).toContain('required property "parentId"');
    expect(client.request).not.toHaveBeenCalled();
    expect(await readdir(ledgerDir)).toHaveLength(0);
  });

  it("requires confirm to equal the target id for deletes", async () => {
    const { server, client } = await setup();

    const wrong = await getTool(server, "adr_delete").handler({
      adrId: "adr-1",
      confirm: "adr-2",
      evidence,
    });
    expect(wrong).toMatchObject({ isError: true });
    expect(textOf(wrong)).toContain("confirm must equal adrId (adr-1)");
    expect(client.request).not.toHaveBeenCalled();

    await getTool(server, "adr_delete").handler({ adrId: "adr-1", confirm: "adr-1", evidence });
    expect(client.request.mock.calls[0]?.[0]).toMatchObject({
      method: "DELETE",
      path: "/landscapes/l1/versions/latest/adrs/adr-1",
    });
  });

  it("returns a tool error when a path id cannot be resolved", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "write-tools-nodefault-"));
    const server = new FakeMcpServer();
    const client = { request: vi.fn() } as unknown as MockClient;
    registerWriteTools(server as never, {
      client,
      governancePolicy: openPolicy,
      governanceLedgerDir: ledgerDir,
    });

    const result = await getTool(server, "adr_create").handler({
      body: { name: "x", status: "draft" },
      evidence,
    });
    expect(textOf(result)).toBe("landscapeId is required (or set ICEPANEL_LANDSCAPE_ID).");

    const noId = await getTool(server, "adr_update").handler({ landscapeId: "l1", body: {}, evidence });
    expect(textOf(noId)).toBe("adrId is required.");
    expect(client.request).not.toHaveBeenCalled();
  });

  it("explains actor and trust problems in the block reason", async () => {
    const { server, client } = await setup({ ...openPolicy, requireSeparationOfDuties: true });

    const result = await getTool(server, "organization_create").handler({
      body: { name: "Org A" },
      evidence: {
        ...evidence,
        validatedBy: "ai",
        reviewers: [
          { role: "test-reviewer", reviewer: "ai", decision: "approved", summary: "self", timestamp: "t" },
        ],
      },
    });

    expect(result).toMatchObject({ isError: true, structuredContent: { blocked: true } });
    expect(textOf(result)).toContain("actor issues: validatedBy must differ from requestedBy");
    expect(textOf(result)).toContain("untrusted approvals: test-reviewer: ai cannot approve their own request");
    expect(client.request).not.toHaveBeenCalled();
  });

  it("dry run goes through the gate and ledger without calling IcePanel", async () => {
    const { server, client, ledgerDir } = await setup();

    const result = await getTool(server, "organization_create").handler({
      body: { name: "Org A" },
      evidence,
      dryRun: true,
    });

    expect(result).toMatchObject({
      structuredContent: {
        ok: true,
        dryRun: true,
        data: { request: { method: "POST", path: "/organizations" } },
      },
    });
    expect(client.request).not.toHaveBeenCalled();
    expect(await readdir(ledgerDir)).toHaveLength(1);
  });
});

describe("ledger target", () => {
  const MARKER = "body-marker-7f3a";

  async function onlyRecord(ledgerDir: string) {
    const files = await readdir(ledgerDir);
    expect(files).toHaveLength(1);
    const raw = await readFile(join(ledgerDir, files[0]!), "utf8");
    return { raw, record: JSON.parse(raw) as Record<string, unknown> };
  }

  it("records the resolved method and path of an approved write, from the built request", async () => {
    const { server, ledgerDir } = await setup();

    await getTool(server, "adr_create").handler({
      body: { name: MARKER, status: "draft" },
      evidence,
    });

    const { raw, record } = await onlyRecord(ledgerDir);
    // landscapeId came from the env default and versionId from "latest", not from the args
    expect(record.target).toEqual({ method: "POST", path: "/landscapes/l1/versions/latest/adrs" });
    expect(raw).not.toContain(MARKER);
  });

  it("records the target of a blocked write", async () => {
    const { server, client, ledgerDir } = await setup({ ...openPolicy, requiredSkills: ["spec"] });

    await getTool(server, "model_object_update").handler({
      modelObjectId: "a/b c",
      body: { name: MARKER },
      evidence,
    });

    expect(client.request).not.toHaveBeenCalled();
    const { raw, record } = await onlyRecord(ledgerDir);
    expect(record.approved).toBe(false);
    // the encoded path exactly as it would be sent, never decoded or rebuilt from args
    expect(record.target).toEqual({
      method: "PATCH",
      path: "/landscapes/l1/versions/latest/model/objects/a%2Fb%20c",
    });
    expect(raw).not.toContain(MARKER);
  });

  it("records the target of a dry run", async () => {
    const { server, ledgerDir } = await setup();

    await getTool(server, "organization_create").handler({
      body: { name: MARKER },
      evidence,
      dryRun: true,
    });

    const { raw, record } = await onlyRecord(ledgerDir);
    expect(record.dryRun).toBe(true);
    expect(record.target).toEqual({ method: "POST", path: "/organizations" });
    expect(raw).not.toContain(MARKER);
  });

  it("never records the query", async () => {
    const { server, ledgerDir } = await setup();

    await getTool(server, "diagram_content_update").handler({
      diagramId: "d1",
      updateViewedAt: true,
      body: {},
      evidence,
    });

    const { raw, record } = await onlyRecord(ledgerDir);
    expect(record.target).toEqual({
      method: "PATCH",
      path: "/landscapes/l1/versions/latest/diagrams/d1/content",
    });
    expect(raw).not.toContain("updateViewedAt");
  });
});

describe("landscape_create", () => {
  it("posts to the default organization's landscapes with a validated body", async () => {
    const ledgerDir = await mkdtemp(join(tmpdir(), "landscape-create-"));
    const server = new FakeMcpServer();
    const client = {
      request: vi.fn(async () => ({ ok: true, status: 200, data: {} })),
    } as unknown as MockClient;
    registerWriteTools(server as never, {
      client,
      governancePolicy: openPolicy,
      governanceLedgerDir: ledgerDir,
      defaults: { organizationId: "org-1" },
    });

    const invalid = await getTool(server, "landscape_create").handler({ body: {}, evidence });
    expect(textOf(invalid)).toContain('required property "name"');

    await getTool(server, "landscape_create").handler({ body: { name: "MCP sandbox" }, evidence });
    expect(client.request.mock.calls.map((call) => call[0])).toEqual([
      { method: "POST", path: "/organizations/org-1/landscapes", query: undefined, body: { name: "MCP sandbox" } },
    ]);
  });

  it("is blocked by the governance gate like every write", async () => {
    const { server, client } = await setup({ ...openPolicy, requiredReviewerRoles: ["security-reviewer"] });

    const result = await getTool(server, "landscape_create").handler({
      organizationId: "org-1",
      body: { name: "MCP sandbox" },
      evidence,
    });

    expect(result).toMatchObject({ isError: true, structuredContent: { blocked: true } });
    expect(client.request).not.toHaveBeenCalled();
  });
});
