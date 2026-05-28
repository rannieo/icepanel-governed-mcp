import { randomUUID } from "node:crypto";

import type { CallToolResult } from "@modelcontextprotocol/server";

import type { IcepanelClient } from "../icepanel/client.js";
import { writeLedgerRecord } from "../governance/ledger.js";
import { validateGovernanceEvidence } from "../governance/gate.js";
import type { GovernancePolicy } from "../governance/policy.js";
import type {
  GovernanceEvidence,
  GovernanceLedgerRecord,
  IcepanelRequestArgs,
} from "../types.js";
import { sha256Json } from "../utils/hash.js";

export type WriteExecutionContext = {
  client: IcepanelClient;
  governancePolicy: GovernancePolicy;
  governanceLedgerDir: string;
};

export type WriteOperationArgs = {
  operation: string;
  request: IcepanelRequestArgs;
  evidence: GovernanceEvidence;
};

export async function executeReadRequest(
  client: IcepanelClient,
  request: IcepanelRequestArgs,
): Promise<CallToolResult> {
  const result = await client.request(request);
  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `IcePanel API error (${result.status}): ${result.error ?? "unknown error"}`,
        },
      ],
      structuredContent: {
        ok: false,
        status: result.status,
        error: result.error,
        data: result.data,
      },
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.data),
      },
    ],
    structuredContent: {
      ok: true,
      status: result.status,
      data: result.data,
    },
  };
}

export async function executeGovernedWrite(
  ctx: WriteExecutionContext,
  args: WriteOperationArgs,
): Promise<CallToolResult> {
  const validation = validateGovernanceEvidence(
    args.evidence,
    ctx.governancePolicy,
  );

  const timestamp = new Date().toISOString();
  const id = randomUUID();
  const payloadHash = sha256Json({
    request: args.request,
    evidence: args.evidence,
  });

  const approved = validation.approved;
  const reason = approved
    ? "approved"
    : [
        validation.missingSkills.length
          ? `missing skills: ${validation.missingSkills.join(", ")}`
          : undefined,
        validation.missingReviewerRoles.length
          ? `missing reviewer roles: ${validation.missingReviewerRoles.join(", ")}`
          : undefined,
        validation.rejectionReasons.length
          ? `review rejections: ${validation.rejectionReasons.join(" | ")}`
          : undefined,
        validation.riskFlags.length
          ? `risk flags: ${validation.riskFlags.join(", ")}`
          : undefined,
      ]
        .filter(Boolean)
        .join("; ");

  const record: GovernanceLedgerRecord = {
    id,
    operation: args.operation,
    timestamp,
    approved,
    reason: reason || "blocked",
    payloadHash,
    evidence: args.evidence,
    validation,
  };

  const ledgerPath = await writeLedgerRecord(ctx.governanceLedgerDir, record);

  if (!approved) {
    return {
      content: [
        {
          type: "text",
          text: `Write blocked by governance gate: ${record.reason}. Ledger: ${ledgerPath}`,
        },
      ],
      structuredContent: {
        ok: false,
        blocked: true,
        reason: record.reason,
        validation,
        ledgerPath,
      },
      isError: true,
    };
  }

  const result = await ctx.client.request(args.request);
  if (!result.ok) {
    return {
      content: [
        {
          type: "text",
          text: `IcePanel API error (${result.status}): ${result.error ?? "unknown error"}. Ledger: ${ledgerPath}`,
        },
      ],
      structuredContent: {
        ok: false,
        blocked: false,
        status: result.status,
        error: result.error,
        data: result.data,
        ledgerPath,
      },
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Write succeeded. Ledger: ${ledgerPath}`,
      },
    ],
    structuredContent: {
      ok: true,
      status: result.status,
      data: result.data,
      ledgerPath,
    },
  };
}
