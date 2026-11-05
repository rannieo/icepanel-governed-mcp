#!/usr/bin/env node
// PreToolUse(Bash): an atlas branch cannot `git push` or `gh pr create` until
//   1. the task reached feedback (the compound step cannot be skipped), and
//   2. a code change carries the author's explain-back: all seven labels, a KILLS that
//      names a test file that exists, and a SOURCE that names a spec that exists or
//      says `none: <reason>`.
// Docs-only branches skip step 2. Branches with no atlas task are not gated.
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  PHASES,
  block,
  currentBranch,
  failClosed,
  git,
  missingLabels,
  projectDir,
  readState,
  readStdin,
} from "./atlas-lib.mjs";

failClosed("atlas-push-gate");

const input = JSON.parse((await readStdin()) || "{}");
if (input.tool_name !== "Bash") process.exit(0);
const command = String(input.tool_input?.command ?? "");
if (!/\bgit\s+push\b|\bgh\s+pr\s+create\b/.test(command)) process.exit(0);

const dir = projectDir();
const branch = currentBranch(dir);
const task = branch ? readState(dir).tasks[branch] : undefined;
if (!task) process.exit(0);

const reached = task.phase === "complete" || PHASES.indexOf(task.phase) >= PHASES.indexOf("feedback");
if (!reached) {
  block(
    `atlas push gate: branch '${branch}' is at '${task.phase}'. Run /atlas-feedback (or finish /atlas-ship step 5) before pushing.`,
  );
}

function changedFiles() {
  for (const base of ["origin/main", "main"]) {
    try {
      const mergeBase = git(dir, "merge-base", base, "HEAD");
      return git(dir, "diff", "--name-only", mergeBase, "HEAD").split("\n").filter(Boolean);
    } catch {
      // try the next base
    }
  }
  return null; // unknown: treat as code, the safe side
}

const files = changedFiles();
const docsOnly = files !== null && files.every((file) => file.startsWith("docs/") || file.endsWith(".md"));
if (docsOnly) process.exit(0);

const note = task.explain_back ?? "";
const missing = missingLabels(note);
if (missing.length) {
  block(
    `atlas push gate: no complete explain-back for '${branch}' (missing: ${missing.join(", ")}). ` +
      "The author writes the seven labels (see atlas-build, The explain-back); record them with " +
      "`node .claude/hooks/atlas-state.mjs feedback - <<'NOTE'`.",
  );
}

const line = (label) => note.match(new RegExp(`^${label}:\\s*(.*)$`, "m"))?.[1] ?? "";
const paths = (text) => [...text.matchAll(/[\w./-]+\.(?:ts|mjs|js|json)\b/g)].map((m) => m[0]);

const kills = paths(line("KILLS")).filter((path) => path.includes("test"));
if (!kills.some((path) => existsSync(join(dir, path)))) {
  block("atlas push gate: KILLS must name the test file that goes red when the line is broken, and that file must exist.");
}

const source = line("SOURCE");
const specs = [...source.matchAll(/docs\/specs\/[\w.-]+\.md/g)].map((m) => m[0]);
if (!/^none:\s*\S/.test(source) && !specs.some((path) => existsSync(join(dir, path)))) {
  block("atlas push gate: SOURCE must name an existing docs/specs/<file>.md, or say `none: <reason>`.");
}
