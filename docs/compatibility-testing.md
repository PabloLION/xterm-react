# Compatibility Testing Guide

This repo ships an in‑repo “consumer app” plus scripts to test the published package across multiple ecosystem versions (React, TypeScript, ESLint, Prettier, Biome). Tests run against a packed tarball of the library to mirror real consumer usage.

## What’s Included
- Consumer app: `version-compatibility-tests/consumer-app` (Vite + React) that imports `@pablo-lion/xterm-react`.
- Pin + build script: `version-compatibility-tests/scripts/consumer-pin-and-build.mjs`
  - Resolves and pins exact versions, aligns `@types/*` to the React major, installs, and builds.
  - Flags: `--react`, `--react-dom`, `--typescript`, `--vite`, `--plugin-react`, `--types-react`, `--types-react-dom`, `--tarball <path>`, `--keep-pins`.
- Matrix runner: `version-compatibility-tests/scripts/matrix-run-consumer.mjs`
  - Packs the library once, iterates a curated matrix of React×TS×ESLint×Prettier×Biome, builds the consumer app per scenario, and writes logs + a JSON summary.

## Quick Start
- Single “latest” combo (pins and restores package.json after run):
  - `pnpm run compat:consumer:build-latest`
  - Preview: `cd version-compatibility-tests/consumer-app && pnpm exec vite preview`
- Full curated matrix:
  - `pnpm run compat:matrix`
  - Latest summary pointer: `version-compatibility-tests/MATRIX_LATEST.json`
  - Per‑scenario logs and `MATRIX_SUMMARY.json`: `version-compatibility-tests/logs/<timestamp>/`

## Version Resolution Details
- React and ReactDOM are pinned to the same version per scenario.
- `@types/react` and `@types/react-dom` default to the latest patch that matches the React major (e.g., React 19.x → latest `@types/*` 19.x). This avoids stale types without forcing runtime patch parity.
- Lint/format checks are scoped to the consumer app’s `src` to keep signal clear:
  - ESLint: `eslint src`
  - Prettier: `prettier --check "src/**/*.{ts,tsx,js,jsx}"`
  - Biome: `biome check src`

## Extending the Matrix
- Edit `version-compatibility-tests/scripts/matrix-run-consumer.mjs` arrays:
  - `REACTS`, `TYPES`, `ESLINTS` (`8-ts6`, `9-ts8`, or explicit versions), `PRETTIERS`, `BIOMES`.
- Add new dimensions by expanding the pin script to accept more flags and updating the runner to pass them through.

## Status Semantics (Pass / Fail / XPass)
- Default expectation: scenarios should pass (build succeeds). Lint/format checks provide additional signal and may fail independently.
- XPass (observed‑only): for features not yet implemented, we will track scenarios as “observed” without treating their result as a blocker. In a follow‑up branch we’ll add a small config (e.g., an `xpass` list) to record these scenarios explicitly. Until then, consult the matrix summary and logs to review non‑blocking outcomes.

## Housekeeping
- Generated artifacts are ignored:
  - `version-compatibility-tests/logs/`, `version-compatibility-tests/dist/`, consumer app lockfile and build output.
- The legacy category runner and its reports were removed; the matrix output described here is the source of truth.

