#!/usr/bin/env node
// PreToolUse(Skill): the full loop's phases run in order.
// Forward by exactly one, or backward freely, or re-enter the current phase.
// assess starts a task; feedback and prune may run on their own; atlas-ship and
// atlas-yolo are their own paths and are never gated here.
// Exit 0 allows. Exit 2 blocks, with the reason fed back to Claude.
import { PHASES, block, currentBranch, failClosed, projectDir, readState, readStdin } from "./atlas-lib.mjs";

failClosed("atlas-phase-gate");

const input = JSON.parse((await readStdin()) || "{}");
if (input.tool_name !== "Skill") process.exit(0);

const phase = String(input.tool_input?.skill ?? "")
  .replace(/^atlas:/, "")
  .replace(/^atlas-/, "");
if (!PHASES.includes(phase)) process.exit(0);

const standalone = ["assess", "feedback", "prune"].includes(phase);
const dir = projectDir();
const branch = currentBranch(dir);
if (!branch) process.exit(0); // detached HEAD or not a repo: not an atlas context

const current = readState(dir).tasks[branch]?.phase;
if (!current || current === "complete") {
  if (standalone) process.exit(0);
  block(`No atlas task on branch '${branch}'. Run /atlas-assess first, or use /atlas-ship for the single-loop path.`);
}
if (current === phase) process.exit(0);

const from = PHASES.indexOf(current);
const to = PHASES.indexOf(phase);
if (to < from || to === from + 1) process.exit(0);

block(`Cannot skip to '${phase}'. Current phase is '${current}'. Run /atlas-${PHASES[from + 1]} next.`);
