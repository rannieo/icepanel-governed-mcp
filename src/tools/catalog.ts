// Every MCP tool this server exposes, as data. Path params, query params and the
// request-body schema are derived from the IcePanel OpenAPI index at registration
// time, so adding a tool is one entry here. test/catalog.test.ts fails if any
// entry points at an endpoint the current spec no longer has.

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  method: HttpMethod;
  /** OpenAPI path template, e.g. /landscapes/{landscapeId}/versions/{versionId}/adrs */
  path: string;
  /** Fields merged under the caller's body (e.g. comment_resolve defaults status). */
  bodyDefaults?: Record<string, unknown>;
};

const V = "/landscapes/{landscapeId}/versions/{versionId}";

function read(name: string, title: string, path: string, description: string): ToolDef {
  return { name, title, description, method: "GET", path };
}

function write(
  name: string,
  title: string,
  method: Exclude<HttpMethod, "GET">,
  path: string,
  description: string,
  extra: Partial<ToolDef> = {},
): ToolDef {
  return { name, title, description, method, path, ...extra };
}

export const READ_TOOLS: ToolDef[] = [
  // Organization / landscape / version
  read("organizations_list", "List Organizations", "/organizations", "List organizations visible to the API key/bearer."),
  read("organization_landscapes_list", "List Organization Landscapes", "/organizations/{organizationId}/landscapes", "List landscapes under an organization."),
  read("versions_list", "List Versions", "/landscapes/{landscapeId}/versions", "List versions in a landscape with optional paging/filter."),
  // Model
  read("model_objects_list", "List Model Objects", `${V}/model/objects`, "List model objects (systems, apps, stores, components...) with optional filter/expand and paging."),
  read("model_object_get", "Get Model Object", `${V}/model/objects/{modelObjectId}`, "Get one model object by id."),
  read("model_connections_list", "List Model Connections", `${V}/model/connections`, "List model connections (relationships between objects)."),
  read("model_connection_get", "Get Model Connection", `${V}/model/connections/{modelConnectionId}`, "Get one model connection by id."),
  read("model_dependencies_list", "List Model Dependencies", `${V}/model/dependencies`, "List upstream/downstream dependencies across the model."),
  read("landscape_search", "Search Landscape", `${V}/search`, "Search across model objects and related architecture data."),
  // Diagrams / flows
  read("diagrams_list", "List Diagrams", `${V}/diagrams`, "List diagrams for a landscape version."),
  read("diagram_get", "Get Diagram", `${V}/diagrams/{diagramId}`, "Get one diagram's metadata."),
  read("diagram_content_get", "Get Diagram Content", `${V}/diagrams/{diagramId}/content`, "Get the objects and connections placed on a diagram."),
  read("flows_list", "List Flows", `${V}/flows`, "List flows (step-by-step sequences over a diagram)."),
  read("flow_get", "Get Flow", `${V}/flows/{flowId}`, "Get one flow with its steps."),
  read("flow_export_mermaid", "Export Flow as Mermaid", `${V}/flows/{flowId}/export/mermaid`, "Export a flow as a Mermaid sequence diagram."),
  // Domains / tags / teams / technology
  read("domains_list", "List Domains", `${V}/domains`, "List domains in a landscape version."),
  read("domain_get", "Get Domain", `${V}/domains/{domainId}`, "Get one domain by id."),
  read("tags_list", "List Tags", `${V}/tags`, "List tags."),
  read("tag_groups_list", "List Tag Groups", `${V}/tag-groups`, "List tag groups."),
  read("teams_list", "List Teams", "/organizations/{organizationId}/teams", "List teams in an organization."),
  read("team_model_objects_list", "List Team Model Objects", "/organizations/{organizationId}/teams/{teamId}/model/objects", "List model objects owned by a team."),
  read("organization_technologies_list", "List Organization Technologies", "/organizations/{organizationId}/technologies", "List the technology choices configured for an organization."),
  // Decision records
  read("adrs_list", "List ADRs", `${V}/adrs`, "List architecture decision records."),
  read("adr_get", "Get ADR", `${V}/adrs/{adrId}`, "Get one architecture decision record."),
  // Drafts / comments (not offered by the official IcePanel MCP)
  read("drafts_list", "List Drafts", `${V}/drafts`, "List drafts (proposed changes) on a version."),
  read("draft_get", "Get Draft", `${V}/drafts/{draftId}`, "Get one draft."),
  read("comments_list", "List Comments", `${V}/comments`, "List comments for a landscape version."),
  read("comment_get", "Get Comment", `${V}/comments/{commentId}`, "Get one comment."),
  read("comment_replies_list", "List Comment Replies", `${V}/comments/{commentId}/replies`, "List replies in a comment thread."),
];

export const WRITE_TOOLS: ToolDef[] = [
  // Original governed writes (names kept for client compatibility)
  write("diagram_create", "Create Diagram", "POST", `${V}/diagrams`, "Create a diagram in a version."),
  write("draft_create", "Create Draft", "POST", `${V}/drafts`, "Create a draft under a version."),
  write("version_create", "Create Version", "POST", "/landscapes/{landscapeId}/versions", "Create a new landscape version."),
  write("comment_create", "Create Comment", "POST", `${V}/comments`, "Create a comment on a version."),
  write("comment_resolve", "Resolve Comment", "PATCH", `${V}/comments/{commentId}`, "Resolve/update a comment by id. Body defaults to {status: \"resolved\"}.", {
    bodyDefaults: { status: "resolved" },
  }),
  write("model_object_create", "Create Model Object", "POST", `${V}/model/objects`, "Create a model object in a version."),
  write("model_connection_create", "Create Model Connection", "POST", `${V}/model/connections`, "Create a model connection in a version."),
  write("organization_create", "Create Organization", "POST", "/organizations", "Create an organization."),
  // Updates
  write("model_object_update", "Update Model Object", "PATCH", `${V}/model/objects/{modelObjectId}`, "Patch a model object."),
  write("model_connection_update", "Update Model Connection", "PATCH", `${V}/model/connections/{modelConnectionId}`, "Patch a model connection."),
  write("diagram_content_update", "Update Diagram Content", "PATCH", `${V}/diagrams/{diagramId}/content`, "Patch the objects/connections placed on a diagram."),
  write("adr_create", "Create ADR", "POST", `${V}/adrs`, "Record an architecture decision."),
  write("adr_update", "Update ADR", "PATCH", `${V}/adrs/{adrId}`, "Patch an architecture decision record (e.g. change status)."),
  write("draft_update", "Update Draft", "PATCH", `${V}/drafts/{draftId}`, "Patch a draft."),
  write("draft_merge", "Merge Draft", "POST", `${V}/drafts/{draftId}/merge`, "Merge a draft into its version."),
  write("comment_reply_create", "Reply to Comment", "POST", `${V}/comments/{commentId}/replies`, "Reply in a comment thread."),
  // Deletes: also require `confirm` to equal the target id
  write("model_object_delete", "Delete Model Object", "DELETE", `${V}/model/objects/{modelObjectId}`, "Delete a model object."),
  write("model_connection_delete", "Delete Model Connection", "DELETE", `${V}/model/connections/{modelConnectionId}`, "Delete a model connection."),
  write("adr_delete", "Delete ADR", "DELETE", `${V}/adrs/{adrId}`, "Delete an architecture decision record."),
  write("comment_delete", "Delete Comment", "DELETE", `${V}/comments/{commentId}`, "Delete a comment."),
];
