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
  - Follow-up: once the curated matrix is stable, hook a lightweight GitHub Actions job (latest-only scenario) into the main branch to guard regressions.

## Addons & UI Enhancements

- Document official addon usage with this wrapper, starting with `@xterm/addon-fit`.
  - Add a short guide and React example (ResizeObserver) in `docs/` and link from README.
  - Clarify that fit must run after mount and on container resize.
- Provide a “status bar” example (not built-in to xterm):
  - Implement a small React example that renders a bottom bar outside the terminal container and updates via xterm events (resize, selection, title, bell).
  - Consider an advanced variant using `registerDecoration` for inline overlays; document trade-offs.
- Add a convenience util/hook for fitting (e.g., `useXtermFit(addon)`), optional.
- Add a consumer-app scenario that loads FitAddon and validates build + basic render.

## Release Signals

- Lightweight CI job to ensure `MATRIX_LATEST.json` (or summary path) is newer than the last release tag.
- Require manual approval/override when summary is stale instead of auto-running the full matrix in CI.
- Integrate release checklist output (from pm-checklist) into the PRD and make the release script enforce completion.

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

## Consumer App Architecture

- Investigate migrating compatibility scripts (`consumer-pin-and-build`, `matrix-run-consumer`, `summarize-matrix`) from `.mjs` to TypeScript:
  - Decide on build flow (tsc output, distribution paths) and ensure CI keeps zero-build execution simple.
  - Retain current JS entry points until the TypeScript toolchain is solid to avoid workflow breakage.
- Evaluate maintaining dual consumer apps (JS + TS) to exercise both ecosystems:
  - Ensure each app is a full React project using `.jsx` / `.tsx` files as appropriate.
  - Reuse shared configuration where possible; document differences in `docs/compatibility-testing.md`.
- Capture outcomes in the future BMAD roadmap once the process tooling is ready; for now track progress here.

## Documentation System

- Merge the legacy docs (`README.md`, `docs/component-reference.md`, existing guides) with the BMAD-generated structure (PRD, architecture, stories folders):
  - Define single navigation hierarchy under `docs/` and update links.
  - Decide how BMAD outputs and handcrafted guides coexist (naming conventions, index page).
  - Update contributor guidance so new documents land in the unified system.

## Runtime Coverage

- Expand the compatibility matrix with a runtime dimension covering Node 14.x, Node 16.x, Node 18 LTS, Node 20 LTS, Node 24.x (current), Node 25+ (current branch), plus Bun release channels (stable and preview/nightly where applicable).
- Expose CLI flags to target specific runtimes (default to latest Node LTS) and document curated subsets to avoid combinatorial explosion.
- CI strategy: run latest Node LTS lane by default; provide manual/approval jobs (or local scripts) for the remaining Node/Bun runtimes; document when each lane should be exercised (pre-release, nightly, manual verification).
- Provide Bun smoke tests and document any limitations or polyfills.
- Update README/docs with runtime support statement; track future targets (e.g., Deno) here.
