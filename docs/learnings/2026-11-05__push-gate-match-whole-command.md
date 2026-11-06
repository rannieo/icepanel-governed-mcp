---
type: gotcha
created: 2026-11-05
files_touched: ['.claude/hooks/atlas-push-gate.mjs', 'test/atlas-hooks.test.ts']
key_tokens: ['push gate', 'git -c', 'git -C', 'gh --repo', 'regex', 'bypass', 'fail closed']
---

## What

The push gate matched `\bgit\s+push\b|\bgh\s+pr\s+create\b`, so it only fired when `push` came right after `git`
(and `pr create` right after `gh`). Global options go between them: `git -c credential.helper=… push`,
`git -C dir push`, `git --no-pager push`, `gh --repo o/r pr create`. None of those were gated. The handoff's own
push command for the `rannieo` account (`git -c credential.helper= … push`) went straight through. Fixed in PR #4
(`feae75a`, shipped via `atlas-yolo`).

## Why it matters

A gate that guards a command must cover every way to spell it. The CLI grammar allows options before the
subcommand, and the bypass was the exact form we use day to day, not some unusual edge case.

## How to apply

- When gating a CLI by matching its command text, match across the whole command
  (`/\bgit\b[\s\S]*\bpush\b/`), not an adjacent word pair. Quoted option values can contain `;` or `&&`, so don't
  try to split the command on separators.
- Accept false positives (`echo "git push"` is gated too). Failing closed is cheaper than a bypass.
- Test the option forms (`-c k=v`, `-C dir`, `--no-pager`, `--repo`), not just the plain form. See
  `test/atlas-hooks.test.ts`.
