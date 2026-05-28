#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_FILE="$ROOT_DIR/openapi/source/openapi.json"
SPLIT_DIR="$ROOT_DIR/openapi/src"
DIST_DIR="$ROOT_DIR/dist"

detect_split_root() {
  if [[ -f "$SPLIT_DIR/openapi.json" ]]; then
    echo "$SPLIT_DIR/openapi.json"
    return 0
  fi
  if [[ -f "$SPLIT_DIR/openapi.yaml" ]]; then
    echo "$SPLIT_DIR/openapi.yaml"
    return 0
  fi
  if [[ -f "$SPLIT_DIR/openapi.yml" ]]; then
    echo "$SPLIT_DIR/openapi.yml"
    return 0
  fi

  echo "Could not find split OpenAPI root in $SPLIT_DIR (expected openapi.json/yaml/yml)." >&2
  return 1
}

run_split() {
  mkdir -p "$SPLIT_DIR"
  find "$SPLIT_DIR" -mindepth 1 ! -name ".gitkeep" -exec rm -rf {} +
  npx redocly split "$SOURCE_FILE" --outDir "$SPLIT_DIR"
}

run_bundle() {
  local split_root
  split_root="$(detect_split_root)"
  mkdir -p "$DIST_DIR"
  npx redocly bundle "$split_root" --output "$DIST_DIR/openapi.bundle.json" --ext json
}

run_bundle_slim() {
  local split_root
  split_root="$(detect_split_root)"
  mkdir -p "$DIST_DIR"
  npx redocly bundle "$split_root" --output "$DIST_DIR/openapi.slim.json" --ext json --remove-unused-components
}

run_all() {
  bash "$ROOT_DIR/scripts/openapi-fetch.sh"
  run_split
  run_bundle
  run_bundle_slim
  bash "$ROOT_DIR/scripts/openapi-size-report.sh"
}

mode="${1:-build}"
case "$mode" in
  build)
    run_all
    ;;
  split)
    run_split
    ;;
  bundle)
    run_bundle
    ;;
  bundle-slim)
    run_bundle_slim
    ;;
  *)
    echo "Unknown mode: $mode" >&2
    echo "Usage: bash scripts/openapi-build.sh [build|split|bundle|bundle-slim]" >&2
    exit 1
    ;;
esac
