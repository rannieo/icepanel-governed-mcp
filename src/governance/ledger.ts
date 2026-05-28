import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import type { GovernanceLedgerRecord } from "../types.js";

export async function writeLedgerRecord(
  ledgerDir: string,
  record: GovernanceLedgerRecord,
): Promise<string> {
  await mkdir(ledgerDir, { recursive: true });
  const filePath = join(ledgerDir, `${record.timestamp}-${record.id}.json`);
  await writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  return filePath;
}

export async function readLedgerRecords(
  ledgerDir: string,
): Promise<GovernanceLedgerRecord[]> {
  await mkdir(ledgerDir, { recursive: true });
  const entries = await readdir(ledgerDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(ledgerDir, entry.name))
    .sort();

  const records = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      return JSON.parse(content) as GovernanceLedgerRecord;
    }),
  );

  return records;
}

export async function summarizeLedger(
  ledgerDir: string,
): Promise<
  Array<{
    file: string;
    timestamp: string;
    operation: string;
    approved: boolean;
    reason: string;
  }>
> {
  const records = await readLedgerRecords(ledgerDir);
  return records.map((record) => ({
    file: `${record.timestamp}-${record.id}.json`,
    timestamp: record.timestamp,
    operation: record.operation,
    approved: record.approved,
    reason: record.reason,
  }));
}

export function getLedgerFileName(record: GovernanceLedgerRecord): string {
  return basename(`${record.timestamp}-${record.id}.json`);
}
