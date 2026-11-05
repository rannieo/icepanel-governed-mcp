import { describe, expect, it, vi } from "vitest";

import { IcepanelClient } from "../src/icepanel/client.js";

type ResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
};

function responseOf(init: {
  ok: boolean;
  status: number;
  statusText?: string;
  text?: string;
}): ResponseLike {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? "",
    text: async () => init.text ?? "",
  };
}

describe("IcepanelClient", () => {
  it("builds URL query params and request headers/body", async () => {
    const fetchImpl = vi.fn(async () =>
      responseOf({
        ok: true,
        status: 200,
        text: '{"ok":true}',
      }),
    );

    const client = new IcepanelClient(
      {
        apiBaseUrl: "https://api.example.test",
        apiKey: "api-key",
        bearerToken: "token",
      },
      fetchImpl as unknown as typeof fetch,
    );

    const result = await client.request({
      method: "POST",
      path: "/resource",
      query: {
        scalar: 1,
        bool: true,
        list: ["a", "b"],
        filter: { x: 1 },
        nil: null,
        undef: undefined,
      },
      body: { hello: "world" },
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://api.example.test/resource?");
    expect(url).toContain("scalar=1");
    expect(url).toContain("bool=true");
    expect(url).toContain("list=a");
    expect(url).toContain("list=b");
    expect(url).toContain("filter=%7B%22x%22%3A1%7D");
    expect(url).not.toContain("nil");
    expect(url).not.toContain("undef");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"hello":"world"}');
    expect(init.headers).toMatchObject({
      Accept: "application/json",
      "X-API-Key": "api-key",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { ok: true },
    });
  });

  it("returns success with undefined data when response body is empty", async () => {
    const fetchImpl = vi.fn(async () =>
      responseOf({
        ok: true,
        status: 204,
        statusText: "No Content",
        text: "",
      }),
    );
    const client = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
    );

    const result = await client.request({
      method: "GET",
      path: "/resource",
      query: { onlyNull: null },
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.test/resource");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(result).toEqual({
      ok: true,
      status: 204,
      data: undefined,
    });
  });

  it("returns raw text when JSON parsing fails on successful responses", async () => {
    const fetchImpl = vi.fn(async () =>
      responseOf({
        ok: true,
        status: 200,
        text: "not-json",
      }),
    );
    const client = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
    );

    const result = await client.request({
      method: "GET",
      path: "/resource",
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { raw: "not-json" },
    });
  });

  it("returns API error using message field when present", async () => {
    const fetchImpl = vi.fn(async () =>
      responseOf({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: '{"message":"invalid payload"}',
      }),
    );
    const client = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
    );

    const result = await client.request({
      method: "GET",
      path: "/resource",
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      data: { message: "invalid payload" },
      error: "invalid payload",
    });
  });

  it("returns API error using status text when message field is absent", async () => {
    const fetchImpl = vi.fn(async () =>
      responseOf({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: "gateway failed",
      }),
    );
    const client = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
    );

    const result = await client.request({
      method: "GET",
      path: "/resource",
    });

    expect(result).toEqual({
      ok: false,
      status: 503,
      data: { raw: "gateway failed" },
      error: "503 Service Unavailable",
    });
  });

  it("returns transport error details for thrown Error and non-Error values", async () => {
    const errorFetch = vi.fn(async () => {
      throw new Error("network unavailable");
    });
    const stringFetch = vi.fn(async () => {
      throw "socket hangup";
    });

    const client1 = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      errorFetch as unknown as typeof fetch,
    );
    const client2 = new IcepanelClient(
      { apiBaseUrl: "https://api.example.test" },
      stringFetch as unknown as typeof fetch,
    );

    await expect(
      client1.request({
        method: "GET",
        path: "/resource",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 0,
      error: "network unavailable",
    });

    await expect(
      client2.request({
        method: "GET",
        path: "/resource",
      }),
    ).resolves.toEqual({
      ok: false,
      status: 0,
      error: "socket hangup",
    });
  });
});
