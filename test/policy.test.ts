import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { defaultPolicy, loadGovernancePolicy } from "../src/governance/policy.js";

describe("loadGovernancePolicy", () => {
  it("returns default policy when file does not exist", async () => {
    const result = await loadGovernancePolicy("/definitely/missing/file.json");
    expect(result).toEqual(defaultPolicy);
  });

  it("returns default policy when JSON is invalid", async () => {
    const dir = await mkdtemp(join(tmpdir(), "policy-"));
    const path = join(dir, "policy.json");
    await writeFile(path, "{invalid-json", "utf8");
    const result = await loadGovernancePolicy(path);
    expect(result).toEqual(defaultPolicy);
  });

  it("merges provided values with defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "policy-"));
    const path = join(dir, "policy.json");
    await writeFile(
      path,
      JSON.stringify({
        requiredSkills: ["a", "b"],
        requireValidationActors: false,
      }),
      "utf8",
    );

    const result = await loadGovernancePolicy(path);
    expect(result.requiredSkills).toEqual(["a", "b"]);
    expect(result.requireValidationActors).toBe(false);
    expect(result.requiredReviewerRoles).toEqual(defaultPolicy.requiredReviewerRoles);
    expect(result.maxRiskFlagsBeforeBlock).toBe(defaultPolicy.maxRiskFlagsBeforeBlock);
  });

  it("uses explicit reviewer roles and risk threshold when provided", async () => {
    const dir = await mkdtemp(join(tmpdir(), "policy-"));
    const path = join(dir, "policy.json");
    await writeFile(
      path,
      JSON.stringify({
        requiredReviewerRoles: ["grill-me"],
        maxRiskFlagsBeforeBlock: 3,
      }),
      "utf8",
    );

    const result = await loadGovernancePolicy(path);
    expect(result.requiredSkills).toEqual(defaultPolicy.requiredSkills);
    expect(result.requiredReviewerRoles).toEqual(["grill-me"]);
    expect(result.requireValidationActors).toBe(defaultPolicy.requireValidationActors);
    expect(result.maxRiskFlagsBeforeBlock).toBe(3);
  });
});
