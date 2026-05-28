import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { IcepanelClient } from "../icepanel/client.js";
import { executeReadRequest } from "./common.js";
import { outputResultSchema } from "./schemas.js";

type ReadToolContext = {
  client: IcepanelClient;
  defaultOrganizationId?: string;
};

export function registerReadTools(server: McpServer, ctx: ReadToolContext): void {
  server.registerTool(
    "organizations_list",
    {
      title: "List Organizations",
      description: "List organizations visible to the API key/bearer.",
      inputSchema: z.object({
        admin: z.boolean().optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ admin }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: "/organizations",
        query: admin === undefined ? undefined : { admin },
      }),
  );

  server.registerTool(
    "organization_landscapes_list",
    {
      title: "List Organization Landscapes",
      description: "List landscapes under an organization.",
      inputSchema: z.object({
        organizationId: z.string().optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ organizationId }) => {
      const orgId = organizationId ?? ctx.defaultOrganizationId;
      if (!orgId) {
        return {
          content: [
            {
              type: "text",
              text: "organizationId is required (or set ICEPANEL_ORGANIZATION_ID).",
            },
          ],
          structuredContent: {
            ok: false,
            error: "missing organizationId",
          },
          isError: true,
        };
      }
      return executeReadRequest(ctx.client, {
        method: "GET",
        path: `/organizations/${orgId}/landscapes`,
      });
    },
  );

  server.registerTool(
    "versions_list",
    {
      title: "List Versions",
      description: "List versions in a landscape with optional paging/filter.",
      inputSchema: z.object({
        landscapeId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(1000).optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ landscapeId, cursor, limit, filter }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: `/landscapes/${landscapeId}/versions`,
        query: {
          cursor,
          limit,
          filter,
        },
      }),
  );

  server.registerTool(
    "model_objects_list",
    {
      title: "List Model Objects",
      description:
        "List model objects for a landscape version with optional filter/expand and paging.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
        expand: z.array(z.string()).optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ landscapeId, versionId, cursor, limit, filter, expand }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: `/landscapes/${landscapeId}/versions/${versionId}/model_objects`,
        query: {
          cursor,
          limit,
          filter,
          expand,
        },
      }),
  );

  server.registerTool(
    "diagrams_list",
    {
      title: "List Diagrams",
      description: "List diagrams for a landscape version.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ landscapeId, versionId, filter }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: `/landscapes/${landscapeId}/versions/${versionId}/diagrams`,
        query: { filter },
      }),
  );

  server.registerTool(
    "comments_list",
    {
      title: "List Comments",
      description: "List comments for a landscape version.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        status: z.array(z.string()).optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ landscapeId, versionId, status }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: `/landscapes/${landscapeId}/versions/${versionId}/comments`,
        query: { status },
      }),
  );

  server.registerTool(
    "landscape_search",
    {
      title: "Search Landscape",
      description: "Search across model objects and related architecture data.",
      inputSchema: z.object({
        landscapeId: z.string(),
        versionId: z.string(),
        search: z.string().min(1),
        includeData: z.boolean().optional(),
        maxResults: z.number().int().positive().optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
      }),
      outputSchema: outputResultSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
      },
    },
    async ({ landscapeId, versionId, search, includeData, maxResults, filter }) =>
      executeReadRequest(ctx.client, {
        method: "GET",
        path: `/landscapes/${landscapeId}/versions/${versionId}/search`,
        query: {
          search,
          includeData,
          maxResults,
          filter,
        },
      }),
  );
}
