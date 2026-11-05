import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

// The atlas hooks are plain node scripts the harness runs; these tests run them the
// same way, against a throwaway git repo, so a gate that fails open goes red here.
const HOOKS = resolve(__dirname, "../.claude/hooks");

let repo: string;

function sh(...args: string[]) {
  execFileSync("git", args, { cwd: repo, stdio: "ignore" });
}

function run(script: string, args: string[] = [], stdin = "") {
  const result = spawnSync("node", [join(HOOKS, script), ...args], {
    cwd: repo,
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo },
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const state = (phase: string, note?: string) =>
  run("atlas-state.mjs", note === undefined ? [phase] : [phase, "-"], note ?? "");
const skill = (name: string) =>
  run("atlas-phase-gate.mjs", [], JSON.stringify({ tool_name: "Skill", tool_input: { skill: name } }));
const push = (command = "git push -u origin HEAD") =>
  run("atlas-push-gate.mjs", [], JSON.stringify({ tool_name: "Bash", tool_input: { command } }));
const tasks = () =>
  JSON.parse(readFileSync(join(repo, ".claude/atlas-state.json"), "utf8")).tasks as Record<
    string,
    Record<string, string>
  >;

function commit(file: string, content = "x") {
  mkdirSync(join(repo, file, ".."), { recursive: true });
  writeFileSync(join(repo, file), content);
  sh("add", file);
  sh("commit", "-qm", `add ${file}`);
}

const EXPLAIN = `WHAT: deletes need confirm
WHY-THIS-SHAPE: id match over a yes flag, which an agent sets blindly
KILLS: drop the confirm check in writeTools.ts; test/write-tools.test.ts goes red
UNSURE: whether clients show the hint
RULE: nobody deletes architecture by accident
SOURCE: docs/specs/2026-11-05__confirm.md
PRINCIPLE: fail closed at the trust boundary`;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "atlas-hooks-"));
  sh("init", "-q", "-b", "main");
  sh("config", "user.email", "t@t");
  sh("config", "user.name", "t");
  commit("README.md");
});

describe("atlas-state", () => {
  it("records phase, mode and a complete explain-back from stdin", () => {
    expect(run("atlas-state.mjs", ["build", "-", "dev"], EXPLAIN).code).toBe(0);
    expect(tasks().main).toMatchObject({ phase: "build", mode: "dev", explain_back: EXPLAIN });
  });

  it("does not keep a partial note as the explain-back", () => {
    state("feedback", "WHAT: only one label");
    expect(tasks().main.explain_back).toBeUndefined();
  });

  it("rejects an unknown phase or mode", () => {
    expect(state("ship").code).toBe(1);
    expect(run("atlas-state.mjs", ["build", "", "-"]).err).toContain("mode must be 'agent' or 'dev'");
  });

  it("carries a task parked on main onto the new feature branch", () => {
    state("spec");
    sh("checkout", "-qb", "feat/x");
    state("plan");
    expect(tasks()).not.toHaveProperty("main");
    expect(tasks()["feat/x"]?.phase).toBe("plan");
  });

  it("leaves the clear-reminder marker on complete, which fires once", () => {
    state("complete");
    expect(existsSync(join(repo, ".claude/.atlas-clear-pending"))).toBe(true);
    expect(run("atlas-clear-reminder.mjs").out).toContain("Refresh docs/HANDOFF.md");
    expect(run("atlas-clear-reminder.mjs").out).toBe("");
  });
});

describe("atlas-phase-gate", () => {
  it("only lets assess, feedback and prune start without a task", () => {
    expect(skill("atlas-spec").code).toBe(2);
    expect(skill("atlas-assess").code).toBe(0);
    expect(skill("atlas-feedback").code).toBe(0);
    expect(skill("atlas-ship").code).toBe(0); // its own path, never gated
  });

  it("allows +1, re-entry and going back, and blocks a skip", () => {
    state("spec");
    expect(skill("atlas-plan").code).toBe(0);
    expect(skill("atlas-spec").code).toBe(0);
    expect(skill("atlas-assess").code).toBe(0);
    const skip = skill("atlas:build");
    expect(skip.code).toBe(2);
    expect(skip.err).toContain("Run /atlas-plan next.");
  });

  it("fails closed on a corrupt state file", () => {
    mkdirSync(join(repo, ".claude"), { recursive: true });
    writeFileSync(join(repo, ".claude/atlas-state.json"), "{not json");
    expect(skill("atlas-plan").code).toBe(2);
  });
});

describe("atlas-push-gate", () => {
  beforeEach(() => {
    sh("checkout", "-qb", "feat/x");
  });

  it("ignores commands that are not a push and branches with no task", () => {
    expect(push("git status").code).toBe(0);
    expect(push().code).toBe(0);
  });

  it("blocks a push before feedback", () => {
    state("build");
    const result = push("gh pr create --fill");
    expect(result.code).toBe(2);
    expect(result.err).toContain("Run /atlas-feedback");
  });

  it("lets a docs-only branch through without an explain-back", () => {
    commit("docs/learnings/x.md");
    state("feedback");
    expect(push().code).toBe(0);
  });

  it("requires a complete explain-back whose KILLS and SOURCE resolve for code", () => {
    commit("src/x.ts");
    state("feedback");
    expect(push().err).toContain("missing: WHAT");

    state("feedback", EXPLAIN);
    expect(push().err).toContain("KILLS must name the test file");

    commit("test/write-tools.test.ts");
    expect(push().err).toContain("SOURCE must name an existing docs/specs");

    commit("docs/specs/2026-11-05__confirm.md");
    expect(push().code).toBe(0);
  });

  it("skips the explain-back for an exempt pusher, but still requires feedback", () => {
    commit("src/x.ts");
    mkdirSync(join(repo, ".claude"), { recursive: true });
    writeFileSync(
      join(repo, ".claude/atlas-exempt.json"),
      JSON.stringify({ exempt: [{ email: "T@T" }] }),
    );
    state("build");
    expect(push().code).toBe(2); // exemption never skips the feedback phase
    state("feedback");
    expect(push().code).toBe(0);

    sh("config", "user.email", "someone-else@t");
    expect(push().err).toContain("missing: WHAT");
  });

  it("accepts SOURCE none: <reason>", () => {
    commit("src/x.ts");
    commit("test/write-tools.test.ts");
    state("feedback", EXPLAIN.replace(/^SOURCE: .*$/m, "SOURCE: none: tooling-only change"));
    expect(push().code).toBe(0);
  });
});
