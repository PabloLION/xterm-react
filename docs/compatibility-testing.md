# Compatibility Testing Guide

This repo ships an in‑repo “consumer app” plus scripts to test the published package across multiple ecosystem versions. Each scenario packs the library and installs it into the consumer app, then exercises React, TypeScript, and linting/formatting toolchains (Biome or ESLint + Prettier).

## What’s Included

- Consumer app: `version-compatibility-tests/consumer-app` (Vite + React) that imports `@pablo-lion/xterm-react`.
- Pin + build script: `version-compatibility-tests/scripts/consumer-pin-and-build.mjs`
  - Resolves and pins exact versions, aligns `@types/*` to the React major, installs, and builds.
  - Flags: `--react`, `--react-dom`, `--typescript`, `--vite`, `--plugin-react`, `--types-react`, `--types-react-dom`, `--biome`, `--eslint`, `--eslint-js`, `--ts-eslint-parser`, `--prettier`, `--eslint-config-prettier`, `--tarball <path>`, `--app-dir <dir>`, `--keep-pins`.
- Matrix runner: `version-compatibility-tests/scripts/matrix-run-consumer.mjs`
  - Packs the library once, iterates curated React × TypeScript × lint-tool scenarios (Biome and ESLint + Prettier families), builds the consumer app, runs the relevant lint/format checks, and emits per-scenario logs plus a JSON summary.

## Quick Start

- Single “latest” combo (pins and restores package.json after run):
  - `pnpm run compat:consumer:build-latest`
  - Preview: `cd version-compatibility-tests/consumer-app && pnpm exec vite preview`
- Full curated matrix:
  - `pnpm run compat:matrix`
  - Latest summary pointer: `version-compatibility-tests/MATRIX_LATEST.json`
  - Latest Markdown summary (stable alias): `version-compatibility-tests/MATRIX_SUMMARY.md`
  - Per‑scenario logs and `MATRIX_SUMMARY.json`: `version-compatibility-tests/logs/<timestamp>/`

### Matrix Snapshot

React × TypeScript × lint families sampled by the curated matrix:

| React    | TypeScript | Linting / Formatting |
| -------- | ---------- | -------------------- |
| `18.3.1` | `5.2.2`    | Biome                |
| `19.1.1` | `5.4.5`    | ESLint+Prettier      |
|          | `5.9.3`    |                      |

Detailed lint families:

Lint families table:

| Biome    | ESLint   | Prettier |
| -------- | -------- | -------- |
| `2.0.0`  | `8.57.0` | `3.3.3`  |
| `2.1.1`  | `9.13.0` | `3.6.2`  |
| `2.2.4`  |          |          |

*ESLint entries use matching `@eslint/js` and `@typescript-eslint/parser` majors.*

### Filters and quick mode

- Run a reduced set (latest of each dimension):
  - `QUICK=1 pnpm run compat:matrix` or `pnpm run compat:matrix -- --quick`
- Filter specific versions (comma-separated, must exist in the predefined arrays):
  - React / TypeScript: `--react` (`-r`), `--typescript` (`-t`)
  - Linter family: `--linter biome` or `--linter eslint-prettier` (omit to run both)
  - Biome versions: `--biome` (`-b`)
  - ESLint + Prettier versions: `--eslint`, `--prettier`
  - Example: `pnpm run compat:matrix -- --linter eslint-prettier -r 19.1.1 -t 5.9.3 --eslint 9.13.0 --prettier 3.6.2`

### Parallel mode (opt‑in)

- Run scenarios concurrently using isolated worker app directories (still packs once):
  - `PARALLEL=3 pnpm run compat:matrix` or `pnpm run compat:matrix -- --parallel 3`
- Defaults to `1` (serial). Cap concurrency to avoid overloading (typical sweet spot: 2–4).
- Logs and summary format are unchanged; workers reuse pnpm’s global store.

## Version Resolution Details

- Scope: the matrix targets React 18 and 19; React 17 is out of scope.
- React and ReactDOM are pinned to identical versions per scenario.
- `@types/react` and `@types/react-dom` default to the latest patch that matches the React major (e.g., React 19.x → latest `@types/*` 19.x).
- Biome scenarios pin `@biomejs/biome` and run `pnpm exec biome check --config-path biome.json .` against TS + JS sources in the consumer app.
- ESLint + Prettier scenarios pin:
  - `eslint`, `@eslint/js`, and `@typescript-eslint/parser` (aligned to the selected ESLint version)
  - `prettier` and `eslint-config-prettier`
  - Checks run separately: `pnpm exec eslint --config eslint.config.mjs ...` and `pnpm exec prettier --check ...`.
- The pin script restores `package.json` after each run unless `--keep-pins` is supplied.

## Extending the Matrix

- Edit `version-compatibility-tests/scripts/matrix-run-consumer.mjs` arrays:
  - `DEFAULT_REACTS`, `DEFAULT_TYPESCRIPT`, `DEFAULT_BIOMES`, `DEFAULT_ESLINTS`, `DEFAULT_PRETTIERS`.
- Add new linter families by extending the runner’s `listScenarios()` helper and teaching `consumer-pin-and-build.mjs` how to pin/install the required packages.

## Status Semantics (PASS / FAIL / XFAIL / XPASS)

- Default expectation: every scenario (install + build + lint/format) should PASS.
- Expected failures live in `version-compatibility-tests/xfail.json` as exact combos, e.g.:

  ```json
  [
    {
      "react": "19.1.1",
      "typescript": "5.9.3",
      "linter": "eslint-prettier",
      "eslint": "9.13.0",
      "prettier": "3.6.2"
    },
    {
      "react": "18.3.1",
      "typescript": "5.4.5",
      "linter": "biome",
      "biome": "2.2.4"
    }
  ]
  ```

- Outcomes:
  - PASS: not in xfail and all steps succeed.
  - FAIL: not in xfail and any step fails.
  - XFAIL: listed in xfail and a step fails (known, non‑blocking).
  - XPASS: listed in xfail but all steps succeed (unexpected pass; remove from xfail).

## Housekeeping

- Generated artifacts are ignored:
  - `version-compatibility-tests/logs/`, `version-compatibility-tests/dist/`, consumer app lockfile and build output.
- The legacy runner and reports were removed; the JSON + Markdown outputs from the current matrix are the source of truth.
