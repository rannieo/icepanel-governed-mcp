import type { IcepanelRequestArgs } from "../types.js";

export type IcepanelClientConfig = {
  apiBaseUrl: string;
  apiKey?: string;
  bearerToken?: string;
};

export type IcepanelCallResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        params.append(key, String(v));
      }
      continue;
    }
    if (typeof value === "object") {
      params.set(key, JSON.stringify(value));
      continue;
    }
    params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

export class IcepanelClient {
  constructor(
    private readonly config: IcepanelClientConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request(args: IcepanelRequestArgs): Promise<IcepanelCallResult> {
    const url = `${this.config.apiBaseUrl}${args.path}${
      args.query ? toQueryString(args.query) : ""
    }`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.config.apiKey) {
      headers["X-API-Key"] = this.config.apiKey;
    }
    if (this.config.bearerToken) {
      headers.Authorization = `Bearer ${this.config.bearerToken}`;
    }
    if (args.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await this.fetchImpl(url, {
        method: args.method,
        headers,
        body: args.body !== undefined ? JSON.stringify(args.body) : undefined,
      });

      const text = await response.text();
      const data = text.length ? safeJsonParse(text) : undefined;
      if (!response.ok) {
        const message =
          (data && typeof data === "object" && "message" in data
            ? String((data as Record<string, unknown>).message)
            : undefined) ?? `${response.status} ${response.statusText}`;
        return {
          ok: false,
          status: response.status,
          data,
          error: message,
        };
      }
      return {
        ok: true,
        status: response.status,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
