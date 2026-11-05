// Shared helpers for the atlas hooks. Node, not bash+jq: this repo already needs
// node, so the gates cannot fail open on a missing binary.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const PHASES = ["assess", "spec", "plan", "build", "review", "feedback", "prune"];

/** The seven explain-back labels the author writes before a code push. */
export const EXPLAIN_LABELS = [
  "WHAT",
  "WHY-THIS-SHAPE",
  "KILLS",
  "UNSURE",
  "RULE",
  "SOURCE",
  "PRINCIPLE",
];

export function projectDir() {
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  try {
    return git(process.cwd(), "rev-parse", "--show-toplevel");
  } catch {
    return process.cwd();
  }
}

export function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function currentBranch(dir) {
  try {
    return git(dir, "branch", "--show-current");
  } catch {
    return "";
  }
}

export function statePath(dir) {
  return join(dir, ".claude", "atlas-state.json");
}

export function readState(dir) {
  const file = statePath(dir);
  if (!existsSync(file)) return { tasks: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeState(dir, state) {
  const file = statePath(dir);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}

/** Missing labels, in order. A note is a complete explain-back when this is empty. */
export function missingLabels(note) {
  return EXPLAIN_LABELS.filter(
    (label) => !new RegExp(`^${label}:\\s*\\S`, "m").test(note ?? ""),
  );
}

export async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

/** PreToolUse block: exit 2 with the reason on stderr is fed back to Claude. */
export function block(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

/**
 * A PreToolUse hook blocks only on exit 2; a crash (exit 1) lets the call through.
 * Gates call this first so a corrupt state file or a git failure blocks instead.
 */
export function failClosed(name) {
  const onError = (error) =>
    block(`${name} could not evaluate the gate (${error?.message ?? error}). Blocking rather than allowing; fix the cause and retry.`);
  process.on("uncaughtException", onError);
  process.on("unhandledRejection", onError);
}
