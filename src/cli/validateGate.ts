import { readFile } from "node:fs/promises";

import { loadConfig } from "../config.js";
import { validateGovernanceEvidence } from "../governance/gate.js";
import { loadGovernancePolicy } from "../governance/policy.js";
import type { GovernanceEvidence } from "../types.js";

export type ValidateGateCliDeps = {
  loadConfigFn: typeof loadConfig;
  loadGovernancePolicyFn: typeof loadGovernancePolicy;
  validateGovernanceEvidenceFn: typeof validateGovernanceEvidence;
  readFileFn: typeof readFile;
};

export const defaultValidateGateCliDeps: ValidateGateCliDeps = {
  loadConfigFn: loadConfig,
  loadGovernancePolicyFn: loadGovernancePolicy,
  validateGovernanceEvidenceFn: validateGovernanceEvidence,
  readFileFn: readFile,
};

export type ValidateGateCliIo = {
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  exit: (code: number) => never | void;
};

export const defaultValidateGateCliIo: ValidateGateCliIo = {
  writeStdout: (text) => {
    process.stdout.write(text);
  },
  writeStderr: (text) => {
    process.stderr.write(text);
  },
  exit: (code) => process.exit(code),
};

export async function runValidateGateCli(
  argv: string[],
  deps: ValidateGateCliDeps = defaultValidateGateCliDeps,
): Promise<{ code: number; output: string; stream: "stdout" | "stderr" }> {
  const evidenceFile = argv[2];
  if (!evidenceFile) {
    return {
      code: 2,
      output: "Usage: npm run governance:validate -- <path-to-evidence.json>\n",
      stream: "stderr",
    };
  }

  const config = deps.loadConfigFn();
  const policy = await deps.loadGovernancePolicyFn(config.governancePolicyPath);
  const content = await deps.readFileFn(evidenceFile, "utf8");
  const evidence = JSON.parse(content) as GovernanceEvidence;
  const result = deps.validateGovernanceEvidenceFn(evidence, policy);

  return {
    code: result.approved ? 0 : 1,
    output: `${JSON.stringify(result, null, 2)}\n`,
    stream: "stdout",
  };
}

export async function startValidateGateCli(
  argv: string[] = process.argv,
  deps: ValidateGateCliDeps = defaultValidateGateCliDeps,
  io: ValidateGateCliIo = defaultValidateGateCliIo,
  runner: (
    argv: string[],
    deps: ValidateGateCliDeps,
  ) => Promise<{ code: number; output: string; stream: "stdout" | "stderr" }> =
    runValidateGateCli,
): Promise<void> {
  try {
    const result = await runner(argv, deps);
    if (result.stream === "stderr") {
      io.writeStderr(result.output);
    } else {
      io.writeStdout(result.output);
    }
    io.exit(result.code);
  } catch (error) {
    io.writeStderr(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    io.exit(1);
  }
}
