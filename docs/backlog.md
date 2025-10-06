# Backlog

## CI: Track and update to latest versions for consumer tests
- Goal: Add a CI workflow that periodically checks registry “latest” versions for key dependencies (React, ReactDOM, TypeScript, Biome, Vite/@vitejs/plugin-react).
- Trigger: Scheduled (e.g., daily/weekly) and manual dispatch.
- Action:
  - Resolve current latest versions (`pnpm view <pkg> version`).
  - If any differ from the last recorded set, open a PR that updates the consumer test pins via our pin script (or updates a versions manifest) and runs the matrix on a curated subset to validate.
  - Attach MATRIX_SUMMARY.json as artifact and summarize headline outcomes in the PR body.
- Non‑goals (initially): Do not fail the main branch on external ecosystem changes; changes should flow through reviewable PRs.
- Notes:
  - Keep exact pins for reproducibility.
  - Optionally maintain a versions.json manifest committed to the repo to diff against.
  - Ensure the workflow does not publish; it only updates test pins and artifacts.

## Addons & UI Enhancements
- Document official addon usage with this wrapper, starting with `@xterm/addon-fit`.
  - Add a short guide and React example (ResizeObserver) in `docs/` and link from README.
  - Clarify that fit must run after mount and on container resize.
- Provide a “status bar” example (not built-in to xterm):
  - Implement a small React example that renders a bottom bar outside the terminal container and updates via xterm events (resize, selection, title, bell).
  - Consider an advanced variant using `registerDecoration` for inline overlays; document trade-offs.
- Add a convenience util/hook for fitting (e.g., `useXtermFit(addon)`), optional.
- Add a consumer-app scenario that loads FitAddon and validates build + basic render.

## Notifications
- Add an optional notifier step after `compat:matrix:summary` to surface results:
  - GitHub PR comment updater (when running on a PR) with totals and a link to the summary.
  - GitHub Discussions/Issues poster for scheduled runs.
  - (Optional) Webhook integration (Slack/Teams) configured via secrets.
- Keep notifications opt-in and non-blocking; wire via a small script (e.g., `scripts/notify-compat.mjs`).

## Result History
- Goal: provide historical trend of PASS/FAIL counts and notable changes across runs.
- Storage options (for discussion):
  - Commit an aggregated `version-compatibility-tests/HISTORY.json`/`.md` updated by summarizer (pros: in-repo visibility; cons: noisy diffs).
  - Emit artifacts only (CI uploads) and maintain history off-repo (pros: clean repo; cons: harder to browse offline).
  - Hybrid: keep a compact `HISTORY.md` (totals and highlights) in repo; store full JSON summaries as CI artifacts.
- Implementation sketch:
  - Extend summarizer to append a compact record `{ date, totals, byReact, summaryPath }`.
  - Add a `scripts/history-aggregate.mjs` to rebuild markdown from JSON snapshots under `logs/`.
  - Add a README link to the history page when enabled.

## Matrix Improvements
- Incremental runs: detect unchanged scenarios and skip (hash pins + tarball version).
- Matrix pre-validation: flag incompatible tool combos before execution.
- Interactive selection: prompt to pick scenarios to run (useful locally).
- Parallel execution tuning: dynamic concurrency cap and worker reuse between batches.
- CI integration: scheduled run that uploads logs + summary as artifacts (non-blocking).
