# IcePanel OpenAPI Modularization Implementation Plan

**Goal:** Add a repeatable local workflow to fetch IcePanel's OpenAPI spec, split it into modular files with `$ref`, and produce bundled JSON outputs (normal and slim) for downstream tools.

**Architecture:** Treat `https://api.icepanel.io/` as the source of truth. Store a fetched source snapshot in `openapi/source/`, generate editable modular structure in `openapi/src/` with `redocly split`, then produce distributable artifacts under `dist/` with `redocly bundle`. Include size checks so output impact is visible on every run.

**Tech Stack:** Bash, Node.js/npm scripts, `@redocly/cli`, `curl`, `jq`

---

### Task 1: Project scaffolding for OpenAPI workflow

**Files:**
- Create: `package.json`
- Create: `redocly.yaml`
- Create: `.gitignore`
- Create: `openapi/source/.gitkeep`
- Create: `openapi/src/.gitkeep`
- Create: `dist/.gitkeep`

- [ ] **Step 1: Add npm scripts and CLI dependency**
  - Add `@redocly/cli` as `devDependency`.
  - Add scripts:
    - `openapi:fetch`
    - `openapi:split`
    - `openapi:bundle`
    - `openapi:bundle:slim`
    - `openapi:size`
    - `openapi:build` (pipeline)

- [ ] **Step 2: Add Redocly config**
  - Configure `redocly.yaml` with one API alias pointing to `openapi/src/openapi.json`.
  - Keep lint rules minimal for now to avoid blocking first setup.

- [ ] **Step 3: Add ignores for generated artifacts**
  - Ignore:
    - `openapi/source/openapi.json`
    - `dist/*.json`
  - Keep directory placeholders committed.

### Task 2: Fetch and validate source OpenAPI JSON

**Files:**
- Create: `scripts/openapi-fetch.sh`

- [ ] **Step 1: Implement fetch script**
  - Download `https://api.icepanel.io/` to `openapi/source/openapi.json`.
  - Use `curl -sS -L`.

- [ ] **Step 2: Validate downloaded JSON**
  - Run `jq empty openapi/source/openapi.json`.
  - Fail fast if invalid JSON.

- [ ] **Step 3: Make script executable and test**
  - Run: `bash scripts/openapi-fetch.sh`
  - Expected: valid JSON file exists in `openapi/source/`.

### Task 3: Split and bundle modular OpenAPI artifacts

**Files:**
- Create: `scripts/openapi-build.sh`
- Modify: `package.json`

- [ ] **Step 1: Implement split step**
  - Run `redocly split openapi/source/openapi.json --outDir openapi/src`.
  - Result: modular files in `openapi/src/` (`paths/`, `components/`, root file).

- [ ] **Step 2: Implement normal bundle**
  - Run `redocly bundle openapi/src/openapi.json --output dist/openapi.bundle.json --ext json`.
  - This remains the "full fidelity" distributable output.

- [ ] **Step 3: Implement slim bundle**
  - Run `redocly bundle openapi/src/openapi.json --output dist/openapi.slim.json --ext json --remove-unused-components`.
  - Keep non-dereferenced output to avoid expansion from inlining refs.

- [ ] **Step 4: Create single-command pipeline**
  - `openapi:build` should run: fetch -> split -> bundle -> slim bundle -> size report.

### Task 4: Size observability and usage docs

**Files:**
- Create: `scripts/openapi-size-report.sh`
- Create: `README.md`

- [ ] **Step 1: Add size report script**
  - Print byte sizes for:
    - `openapi/source/openapi.json`
    - `dist/openapi.bundle.json`
    - `dist/openapi.slim.json`
  - Print percent deltas between outputs where possible.

- [ ] **Step 2: Document workflow**
  - Add README usage:
    - install deps
    - run build pipeline
    - explain output files and when to use each
  - Include note: modularization improves maintainability; payload reduction comes from how `dist/openapi.slim.json` is published.

- [ ] **Step 3: Verification run**
  - Run:
    - `npm install`
    - `npm run openapi:build`
  - Expected:
    - `openapi/src/` populated
    - `dist/openapi.bundle.json` created
    - `dist/openapi.slim.json` created
    - size report printed successfully

### Notes and assumptions

- This folder currently is not a git repository; commit steps are intentionally omitted.
- The plan assumes the split root path is `openapi/src/openapi.json`. If Redocly emits a different root filename, update `redocly.yaml` and npm scripts accordingly during implementation.
- This setup is local build automation; publishing the slim artifact to production endpoint is out of scope for this directory unless deployment config is provided.
