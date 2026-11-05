import dotenv from "dotenv";

// Keep MCP stdio stdout clean for clients like Claude/Codex.
dotenv.config({ quiet: true });

export type IcepanelServerConfig = {
  apiBaseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  organizationId?: string;
  landscapeId?: string;
  governancePolicyPath: string;
  governanceLedgerDir: string;
};

/** A blank `.env` line (`KEY=`) reaches process.env as "", which must count as unset. */
function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function loadConfig(): IcepanelServerConfig {
  return {
    // IcePanel's OpenAPI spec declares its server as https://api.icepanel.io/v1.
    apiBaseUrl: env("ICEPANEL_API_BASE_URL") ?? "https://api.icepanel.io/v1",
    apiKey: env("ICEPANEL_API_KEY"),
    bearerToken: env("ICEPANEL_BEARER_TOKEN"),
    organizationId: env("ICEPANEL_ORGANIZATION_ID"),
    landscapeId: env("ICEPANEL_LANDSCAPE_ID"),
    governancePolicyPath:
      env("GOVERNANCE_POLICY_PATH") ?? ".governance/policies/write-gate-policy.json",
    governanceLedgerDir: env("GOVERNANCE_LEDGER_DIR") ?? ".governance/reviews",
  };
}
