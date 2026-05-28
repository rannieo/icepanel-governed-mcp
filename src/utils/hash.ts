import { createHash } from "node:crypto";

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stableSort(v)]),
    );
  }
  return value;
}

export function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableSort(value))).digest("hex");
}
