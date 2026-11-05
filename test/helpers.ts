export type RegisteredTool = {
  name: string;
  config: unknown;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
};

export class FakeMcpServer {
  public readonly tools: RegisteredTool[] = [];

  registerTool(name: string, config: unknown, handler: RegisteredTool["handler"]): {} {
    this.tools.push({ name, config, handler });
    return {};
  }
}

export function getTool(server: FakeMcpServer, name: string): RegisteredTool {
  const tool = server.tools.find((item) => item.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  return tool;
}

import type { CallToolResult } from "@modelcontextprotocol/server";
import type { Mock } from "vitest";

import type { IcepanelClient } from "../src/icepanel/client.js";

/** IcepanelClient whose `request` is a vitest mock, so tests can read `.mock.calls`. */
export type MockClient = IcepanelClient & { request: Mock };

export function textOf(result: unknown): string {
  const first = (result as CallToolResult).content[0];
  return first?.type === "text" ? first.text : "";
}
