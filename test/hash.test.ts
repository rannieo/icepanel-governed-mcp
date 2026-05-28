import { describe, expect, it } from "vitest";

import { sha256Json } from "../src/utils/hash.js";

describe("sha256Json", () => {
  it("produces stable hashes for semantically equal objects", () => {
    const a = {
      b: 2,
      a: 1,
      nested: { z: true, y: [3, { c: "x", b: "y" }] },
    };
    const b = {
      nested: { y: [3, { b: "y", c: "x" }], z: true },
      a: 1,
      b: 2,
    };
    expect(sha256Json(a)).toBe(sha256Json(b));
  });

  it("changes hash when values differ", () => {
    expect(sha256Json({ a: 1 })).not.toBe(sha256Json({ a: 2 }));
  });

  it("handles primitive, null and array inputs", () => {
    expect(typeof sha256Json("x")).toBe("string");
    expect(typeof sha256Json(null)).toBe("string");
    expect(sha256Json([3, 2, 1])).not.toBe(sha256Json([1, 2, 3]));
  });
});
