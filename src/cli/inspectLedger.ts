import { loadConfig } from "../config.js";
import { readLedgerRecords, summarizeLedger } from "../governance/ledger.js";

export type InspectLedgerCliDeps = {
  loadConfigFn: typeof loadConfig;
  readLedgerRecordsFn: typeof readLedgerRecords;
  summarizeLedgerFn: typeof summarizeLedger;
};

export const defaultInspectLedgerCliDeps: InspectLedgerCliDeps = {
  loadConfigFn: loadConfig,
  readLedgerRecordsFn: readLedgerRecords,
  summarizeLedgerFn: summarizeLedger,
};

export type InspectLedgerCliIo = {
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  exit: (code: number) => never | void;
};

export const defaultInspectLedgerCliIo: InspectLedgerCliIo = {
  writeStdout: (text) => {
    process.stdout.write(text);
  },
  writeStderr: (text) => {
    process.stderr.write(text);
  },
  exit: (code) => process.exit(code),
};

export async function runInspectLedgerCli(
  argv: string[],
  deps: InspectLedgerCliDeps = defaultInspectLedgerCliDeps,
): Promise<string> {
  const showFull = argv.includes("--full");
  const config = deps.loadConfigFn();

  if (showFull) {
    const records = await deps.readLedgerRecordsFn(config.governanceLedgerDir);
    return `${JSON.stringify(records, null, 2)}\n`;
  }

  const summary = await deps.summarizeLedgerFn(config.governanceLedgerDir);
  return `${JSON.stringify(summary, null, 2)}\n`;
}

export async function startInspectLedgerCli(
  argv: string[] = process.argv,
  deps: InspectLedgerCliDeps = defaultInspectLedgerCliDeps,
  io: InspectLedgerCliIo = defaultInspectLedgerCliIo,
  runner: (argv: string[], deps: InspectLedgerCliDeps) => Promise<string> =
    runInspectLedgerCli,
): Promise<void> {
  try {
    const output = await runner(argv, deps);
    io.writeStdout(output);
  } catch (error) {
    io.writeStderr(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    io.exit(1);
  }
}
