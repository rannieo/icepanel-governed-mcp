import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { WriteExecutionContext } from "./common.js";
import { executeGovernedWrite } from "./common.js";
import {
  governanceEvidenceSchema,
  outputResultSchema,
} from "./schemas.js";

function writeAnnotations() {
  return {
    destructiveHint: true,
    idempotentHint: false,
    readOnlyHint: false,
  };
}

export function registerWriteTools(
  server: McpServer,
  ctx: WriteExecutionContext,
): void {
  server.registerTool(
    "diagram_create",
    {
      title: "Create Diagram",
      description:
        "Create a diagram in a version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        updateViewedAt: z.boolean().optional(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, updateViewedAt, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "diagram_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions/${versionId}/diagrams`,
          query: { updateViewedAt },
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "draft_create",
    {
      title: "Create Draft",
      description:
        "Create a draft under a version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "draft_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions/${versionId}/drafts`,
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "version_create",
    {
      title: "Create Version",
      description:
        "Create a new landscape version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "version_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions`,
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "comment_create",
    {
      title: "Create Comment",
      description:
        "Create a comment on a version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "comment_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions/${versionId}/comments`,
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "comment_resolve",
    {
      title: "Resolve Comment",
      description:
        "Resolve/update a comment by id. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        commentId: z.string(),
        body: z.record(z.string(), z.unknown()).default({ status: "resolved" }),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, commentId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "comment_resolve",
        request: {
          method: "PUT",
          path: `/landscapes/${landscapeId}/versions/${versionId}/comments/${commentId}`,
          body: {
            status: "resolved",
            ...body,
          },
        },
        evidence,
      }),
  );

  server.registerTool(
    "model_object_create",
    {
      title: "Create Model Object",
      description:
        "Create a model object in a version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "model_object_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions/${versionId}/model_objects`,
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "model_connection_create",
    {
      title: "Create Model Connection",
      description:
        "Create a model connection in a version. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ landscapeId, versionId, body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "model_connection_create",
        request: {
          method: "POST",
          path: `/landscapes/${landscapeId}/versions/${versionId}/model_connections`,
          body,
        },
        evidence,
      }),
  );

  server.registerTool(
    "organization_create",
    {
      title: "Create Organization",
      description:
        "Create an organization. Requires governance approvals and review evidence.",
      inputSchema: z.object({
        body: z.record(z.string(), z.unknown()),
        evidence: governanceEvidenceSchema,
      }),
      outputSchema: outputResultSchema,
      annotations: writeAnnotations(),
    },
    async ({ body, evidence }) =>
      executeGovernedWrite(ctx, {
        operation: "organization_create",
        request: {
          method: "POST",
          path: "/organizations",
          body,
        },
        evidence,
      }),
  );
}
