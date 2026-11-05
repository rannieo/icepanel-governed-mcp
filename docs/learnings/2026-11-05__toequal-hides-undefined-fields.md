---
type: gotcha
created: 2026-11-05
files_touched: ['test/write-tools.test.ts', 'src/tools/common.ts']
key_tokens: ['toEqual', 'undefined', 'ledger', 'target', 'query', 'leak', 'mutation']
---

## What

`toEqual` treats a property whose value is `undefined` as absent. So a test asserting a record has *no* field `X`
proves nothing unless the input actually gives `X` a value.

## Why it matters

The ledger-target spec says records never store the query. Every ledger test used `toEqual` on `target`, and every
write in them had `query: undefined`. Mutating `src/tools/common.ts` to store
`{ method, path, query: args.request.query }` left all of them green except one: the test that sends a real query
(`updateViewedAt: true` on `diagram_content_update`). Measured 2026-11-05 with
`npx vitest run --coverage.enabled=false test/write-tools.test.ts`: 1 failed, 10 passed.

## How to apply

- When a criterion says "never contains X", the test must **send** a real X (a marker value, or a distinctive key
  name) and assert it is absent from the serialized output (`raw` file or JSON string), not only from the object.
- Use `toStrictEqual` where `undefined`-valued keys must count.
- Before trusting a "no leak" test, mutate the code to leak and watch it go red.
