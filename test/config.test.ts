import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("loadConfig", () => {
  it("returns defaults when env vars are not set", () => {
    delete process.env.ICEPANEL_API_BASE_URL;
    delete process.env.ICEPANEL_API_KEY;
    delete process.env.ICEPANEL_BEARER_TOKEN;
    delete process.env.ICEPANEL_ORGANIZATION_ID;
    delete process.env.ICEPANEL_LANDSCAPE_ID;
    delete process.env.GOVERNANCE_POLICY_PATH;
    delete process.env.GOVERNANCE_LEDGER_DIR;

    const result = loadConfig();
    expect(result).toEqual({
      apiBaseUrl: "https://api.icepanel.io",
      apiKey: undefined,
      bearerToken: undefined,
      organizationId: undefined,
      landscapeId: undefined,
      governancePolicyPath: ".governance/policies/write-gate-policy.json",
      governanceLedgerDir: ".governance/reviews",
    });
  });

  it("uses env overrides when provided", () => {
    process.env.ICEPANEL_API_BASE_URL = "https://custom.example";
    process.env.ICEPANEL_API_KEY = "k";
    process.env.ICEPANEL_BEARER_TOKEN = "b";
    process.env.ICEPANEL_ORGANIZATION_ID = "org";
    process.env.ICEPANEL_LANDSCAPE_ID = "land";
    process.env.GOVERNANCE_POLICY_PATH = "/tmp/policy.json";
    process.env.GOVERNANCE_LEDGER_DIR = "/tmp/ledger";

    const result = loadConfig();
    expect(result).toEqual({
      apiBaseUrl: "https://custom.example",
      apiKey: "k",
      bearerToken: "b",
      organizationId: "org",
      landscapeId: "land",
      governancePolicyPath: "/tmp/policy.json",
      governanceLedgerDir: "/tmp/ledger",
    });
  });
});
