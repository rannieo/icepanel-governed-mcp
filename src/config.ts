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

export function loadConfig(): IcepanelServerConfig {
  return {
    apiBaseUrl: process.env.ICEPANEL_API_BASE_URL ?? "https://api.icepanel.io",
    apiKey: process.env.ICEPANEL_API_KEY,
    bearerToken: process.env.ICEPANEL_BEARER_TOKEN,
    organizationId: process.env.ICEPANEL_ORGANIZATION_ID,
    landscapeId: process.env.ICEPANEL_LANDSCAPE_ID,
    governancePolicyPath:
      process.env.GOVERNANCE_POLICY_PATH ??
      ".governance/policies/write-gate-policy.json",
    governanceLedgerDir:
      process.env.GOVERNANCE_LEDGER_DIR ?? ".governance/reviews",
  };
}
