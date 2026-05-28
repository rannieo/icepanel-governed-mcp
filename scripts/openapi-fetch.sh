#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/openapi/source"
SOURCE_FILE="$SOURCE_DIR/openapi.json"

mkdir -p "$SOURCE_DIR"

curl -sS -L "https://api.icepanel.io/" -o "$SOURCE_FILE"
jq empty "$SOURCE_FILE"

echo "Fetched and validated: $SOURCE_FILE"
