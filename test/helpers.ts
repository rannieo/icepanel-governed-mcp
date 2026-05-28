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
