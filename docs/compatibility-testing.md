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

## Status Semantics (PASS / FAIL / XFAIL / XPASS)
- Default expectation: scenarios should PASS (build succeeds). Lint/format checks are additional signal.
- Expected failures are declared in `version-compatibility-tests/xfail.json` as an array of exact combos, e.g.:
  ```json
  [
    { "react": "19.1.1", "typescript": "5.9.3", "eslint": "9-ts8", "prettier": "3.3", "biome": "2.2.4" }
  ]
  ```
- Outcomes:
  - PASS: not in xfail and build succeeds.
  - FAIL: not in xfail and build fails.
  - XFAIL: in xfail and build fails (known, non‑blocking).
  - XPASS: in xfail but build succeeds (unexpected pass; remove from xfail).

## Housekeeping
- Generated artifacts are ignored:
  - `version-compatibility-tests/logs/`, `version-compatibility-tests/dist/`, consumer app lockfile and build output.
- The legacy category runner and its reports were removed; the matrix output described here is the source of truth.
