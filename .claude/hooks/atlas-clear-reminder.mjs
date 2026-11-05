#!/usr/bin/env node
// Stop hook: once a slice closes (atlas-state.mjs complete), remind once to refresh
// docs/HANDOFF.md and /clear before the next slice. Advisory only.
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { projectDir } from "./atlas-lib.mjs";

const marker = join(projectDir(), ".claude", ".atlas-clear-pending");
if (!existsSync(marker)) process.exit(0);

const branch = readFileSync(marker, "utf8").trim();
rmSync(marker);
process.stdout.write(
  `${JSON.stringify({
    systemMessage: `atlas: slice '${branch}' closed. Refresh docs/HANDOFF.md, then /clear before the next slice.`,
  })}\n`,
);
