---
type: gotcha
created: 2026-11-05
files_touched: ['src/config.ts', '.env.example', 'test/config.test.ts']
key_tokens: ['dotenv', 'env', 'nullish', '??', 'empty string', 'base url', '/v1', '.env.example']
---

## What

A blank `.env` line (`KEY=`) reaches `process.env` as `""`, and `??` keeps `""`. So `process.env.X ?? default` never
uses the default for a user who copied `.env.example` and left a line blank.

## Why it matters

First live run, 2026-11-05: `.env` had `ICEPANEL_API_BASE_URL=` (copied from `.env.example`), so the base URL was `""`.
The intended default was also wrong: IcePanel's spec server is `https://api.icepanel.io/v1`
(`jq -c '.servers' openapi/source/openapi.json`), and the code defaulted to `https://api.icepanel.io`.

## How to apply

- Read env through `env()` in `src/config.ts` (`process.env[name] || undefined`), never `process.env.X ?? ...`.
- A base URL or path default comes from the OpenAPI spec's `servers`, not memory.
- `test/config.test.ts` loads `.env.example` through `dotenv.parse` and asserts no config value is `""`, so a blank
  line in the example fails CI.
