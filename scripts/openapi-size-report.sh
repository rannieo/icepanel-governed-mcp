#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_FILE="$ROOT_DIR/openapi/source/openapi.json"
BUNDLE_FILE="$ROOT_DIR/dist/openapi.bundle.json"
SLIM_FILE="$ROOT_DIR/dist/openapi.slim.json"

size_of() {
  local file="$1"
  if [[ -f "$file" ]]; then
    wc -c <"$file" | tr -d '[:space:]'
  else
    echo ""
  fi
}

percent_delta() {
  local before="$1"
  local after="$2"
  awk "BEGIN { if ($before == 0) { print \"n/a\" } else { printf \"%.2f\", (($after-$before)/$before)*100 } }"
}

source_size="$(size_of "$SOURCE_FILE")"
bundle_size="$(size_of "$BUNDLE_FILE")"
slim_size="$(size_of "$SLIM_FILE")"

echo "OpenAPI size report (bytes)"
if [[ -n "$source_size" ]]; then
  echo "  source : $source_size  ($SOURCE_FILE)"
else
  echo "  source : missing  ($SOURCE_FILE)"
fi

if [[ -n "$bundle_size" ]]; then
  echo "  bundle : $bundle_size  ($BUNDLE_FILE)"
else
  echo "  bundle : missing  ($BUNDLE_FILE)"
fi

if [[ -n "$slim_size" ]]; then
  echo "  slim   : $slim_size  ($SLIM_FILE)"
else
  echo "  slim   : missing  ($SLIM_FILE)"
fi

if [[ -n "$source_size" && -n "$bundle_size" ]]; then
  echo "  delta bundle vs source: $(percent_delta "$source_size" "$bundle_size")%"
fi

if [[ -n "$bundle_size" && -n "$slim_size" ]]; then
  echo "  delta slim vs bundle : $(percent_delta "$bundle_size" "$slim_size")%"
fi

if [[ -n "$source_size" && -n "$slim_size" ]]; then
  echo "  delta slim vs source : $(percent_delta "$source_size" "$slim_size")%"
fi
