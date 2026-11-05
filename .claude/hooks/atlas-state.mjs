#!/usr/bin/env node
// Advance the atlas state machine for the current branch.
//
//   node .claude/hooks/atlas-state.mjs <phase> [checkpoint|-] [agent|dev]
//
// phase: assess|spec|plan|build|review|feedback|prune|complete
// checkpoint: a short note. Pass `-` and send the note on stdin through a single-quoted
//   heredoc whenever it contains backticks or `$`, so the shell never expands it:
//     node .claude/hooks/atlas-state.mjs build - agent <<'NOTE'
//     WHAT: ...
//     NOTE
// A checkpoint carrying all seven explain-back labels is kept as `explain_back`,
// which is what the push gate reads.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  PHASES,
  currentBranch,
  missingLabels,
  projectDir,
  readState,
  readStdin,
  writeState,
} from "./atlas-lib.mjs";

const STALE_DAYS = Number(process.env.ATLAS_STALE_DAYS ?? 21);
const BASE_BRANCHES = ["main"];

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

const [phase, rawCheckpoint = "", mode = ""] = process.argv.slice(2);
if (!phase || ![...PHASES, "complete"].includes(phase)) {
  fail(`phase must be one of ${[...PHASES, "complete"].join("|")} (got '${phase ?? ""}').`);
}
if (mode && mode !== "agent" && mode !== "dev") {
  fail(`mode must be 'agent' or 'dev' (got '${mode}'). Usage: atlas-state.mjs <phase> [checkpoint|-] [agent|dev]`);
}
const checkpoint = rawCheckpoint === "-" ? (await readStdin()).trim() : rawCheckpoint;

const dir = projectDir();
const branch = currentBranch(dir);
if (!branch) {
  process.stderr.write("WARNING: no current git branch (detached HEAD?). State not updated.\n");
  process.exit(0);
}

const state = readState(dir);
const now = new Date();

// assess/spec/plan often run on main before the feature branch exists: carry that task
// onto the branch on its first write there, so one task never splits across two keys.
for (const base of BASE_BRANCHES) {
  const parked = state.tasks[base];
  if (branch !== base && parked && !state.tasks[branch] && parked.phase !== "complete") {
    state.tasks[branch] = parked;
    delete state.tasks[base];
  }
}

// Nothing legitimately sits mid-loop for three weeks; drop it so the file stays a live queue.
// The current branch is always kept, so a long slice never loses its own gate state.
const cutoff = new Date(now.getTime() - STALE_DAYS * 86_400_000).toISOString();
for (const [key, task] of Object.entries(state.tasks)) {
  if (key !== branch && (task.updated ?? "9999") < cutoff) delete state.tasks[key];
}

const task = state.tasks[branch] ?? {};
if (phase === "assess") delete task.explain_back; // a new task never pushes on the last one's explain-back
task.phase = phase;
task.updated = now.toISOString();
if (checkpoint) task.checkpoint = checkpoint;
if (mode) task.mode = mode;
if (checkpoint && missingLabels(checkpoint).length === 0) task.explain_back = checkpoint;
state.tasks[branch] = task;
writeState(dir, state);

if (phase === "complete") {
  // One-time nudge for the Stop hook: refresh HANDOFF, then /clear before the next slice.
  const marker = join(dir, ".claude", ".atlas-clear-pending");
  if (!existsSync(marker)) writeFileSync(marker, branch);
}
process.stdout.write(`atlas: ${branch} → ${phase}\n`);
