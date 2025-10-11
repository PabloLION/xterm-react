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
  - Exits non-zero when any scenario reports `FAIL` or `XPASS` (so CI and local scripts stop on regressions).
  - Automatically generates JSON + Markdown summaries in `version-compatibility-tests/logs/<timestamp>/` and updates the stable aliases below.
  - Latest summary pointer: `version-compatibility-tests/MATRIX_LATEST.json`
  - Latest Markdown summary (stable alias): `version-compatibility-tests/MATRIX_SUMMARY.md`
- Additional runtimes: `pnpm run compat:matrix -- --runtime node20,node22` (use `--runtime all` for Node 20/22/24). Bun lanes are planned; requesting `bun-stable` currently reports an unsupported-runtime warning.

## CI workflows & cadence

- **Compatibility Tests** (`.github/workflows/compatibility-tests.yml`)
  - Triggers: weekly schedule (Mondays 06:00 UTC), manual dispatch, tag pushes (`v*`), reusable `workflow_call`, and release publication.
  - Matrix lanes:
    - Scheduled/manual runs exercise both curated suites (`oldest-supported` and `latest-supported`).
    - Release/tag triggers automatically run the latest Node LTS lane (`node22` combo) to block publishes on regressions.
  - No auto-fix steps; the job surfaces failures from the curated matrix and leaves remediation to the developer.
- **Compatibility Tests (Popular Runtimes)** (`.github/workflows/compatibility-tests-extended.yml`)
  - Trigger: manual (`workflow_dispatch`) with two checkboxes (`Run baseline lane`, `Run latest lane`). Baseline is Node 20 + the oldest curated stack; latest is Node 24 + the newest stack.
  - Outputs: per-lane logs plus a combined summary artifact, uploaded via GitHub Actions artifacts for each run.
- Local helpers: `pnpm run ci:compat:baseline`, `pnpm run ci:compat:latest`, and `pnpm run ci:compat:merge-summaries` mirror the CI flow for local iteration.

### When to run each lane

| Lane                            | Trigger                         | Purpose                                                     |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Weekly scheduled (both suites)  | Mondays 06:00 UTC               | Ongoing signal for oldest/latest supported stacks.          |
| Release/tag latest-LTS smoke    | Automatic on release publication or tag push | Guarantees publish pipelines see a fresh `node22` PASS. |
| Manual extended runtimes        | On-demand with owner approval   | Validate additional Node streams (22+/24+) or targeted investigations prior to major releases. |

**Release checklist:** Before publishing, confirm the latest run of “Compatibility Tests” (release trigger) is green. If support promises include additional runtimes, run “Compatibility Tests (Popular Runtimes)” and attach the merged summary artifact (see below) to the release notes or PR.

To launch the manual workflow:

1. Open **Actions → Compatibility Tests (Extended Runtimes)**.
2. Click **Run workflow**, leave both lane checkboxes enabled for the default behavior, or uncheck the lane you want to skip.
3. The job runs the baseline lane first and the latest lane second; disable either lane by toggling the checkboxes in the dispatch form.
4. When the run finishes, download the artifacts:
   - `compatibility-baseline-logs`: raw install/build/lint logs and JSON summary for the Node 20 lane.
   - `compatibility-latest-logs`: logs and summary for the Node 24 lane.
   - `compatibility-combined-summary`: merged JSON + Markdown covering every lane that ran (use this for release notes).

### Runtime expectations & monitoring

- The scheduled/manual curated run (two suites) typically finishes in **12–18 minutes** on `ubuntu-latest`. Release invocations only execute the latest LTS lane and complete in ~8 minutes.
- Extended manual runs vary with selected runtimes; expect **10–12 minutes per Node lane**. The workflow defaults to two sequential lanes — baseline `node20` (React 18.3.1 / TS 5.2.2 / ESLint 8.57.0 / Prettier 3.3.3) followed by latest `node24` (React 19.1.1 / TS 5.9.3 / ESLint 9.13.0 / Prettier 3.6.2) — and has a 120-minute time budget to guard against runaway jobs.
- Keep an eye on GitHub Actions minutes. If extended runs become frequent, consider restricting inputs to `--quick` or a single runtime per invocation.
  - If Node 24 tooling is temporarily unavailable on the runner, uncheck `Run latest lane` in the dispatch form and run `pnpm run ci:compat:latest -- --runtime node22` locally until CI workers catch up.
- Known issue (tracked in `docs/backlog.md`): Vite 7.1.9 currently fails the consumer build with an absolute-path asset error when the latest-lane smoke is executed locally. Until resolved, expect the manual matrix command to exit with `pin-and-build` failing; collect the log path (shown in console output) to aid debugging.

### Runtime support snapshot

The current matrix runs on the host runtime (Node 18.x in CI) while we build out the runtime dimension described in Epic 5. We still track the lifecycle of the Node versions we intend to cover so we know where legacy support ends:

| Runtime      | Lifecycle Status (Oct 2024)            | Notes                                                       |
| ------------ | -------------------------------------- | ----------------------------------------------------------- |
| Node 20.x    | Active LTS                             | Supported through April 30, 2026; current default target.   |
| Node 22.x    | Current release (enters LTS Oct 2024)  | Projected LTS support through April 30, 2027.               |
| Node 24.x    | Planned release (enters LTS Oct 2025)  | Prep coverage once GA; keep an eye on nightly/beta builds.  |
| Bun (stable) | Continuous releases                    | (lane pending) No LTS program; track stable channel.        |

> We will add the next odd-numbered Node release (e.g., Node 25) after the Foundation announces the schedule and preview builds are available.

Legacy Node 14/16/18 have exited vendor support, so they are intentionally omitted from the future matrix; we’ll focus on currently supported LTS/current streams going forward. When the runtime column lands, matrix flags such as `--runtime node20` or `--runtime node22` will select the appropriate toolchain, and the README will surface a runtime support badge. Until then, use the table above to decide which local environment to test against and consult Epic 5 for implementation progress. Bun support will land in a later iteration; until then the runner will treat bun requests as unsupported.

### Matrix Snapshot

React × TypeScript × lint families sampled by the curated matrix:

| React    | TypeScript | Linting / Formatting |
| -------- | ---------- | -------------------- |
| `18.3.1` | `5.2.2`    | Biome                |
| `19.1.1` | `5.4.5`    | ESLint+Prettier      |
|          | `5.9.3`    |                      |

Detailed lint families:

Lint families table:

| Biome   | ESLint   | Prettier |
| ------- | -------- | -------- |
| `2.0.0` | `8.57.0` | `3.3.3`  |
| `2.1.1` | `9.13.0` | `3.6.2`  |
| `2.2.4` |          |          |

_ESLint entries use matching `@eslint/js` and `@typescript-eslint/parser` majors._

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
- XPASS: listed in xfail but all steps succeed (unexpected pass; remove from xfail). The matrix command treats XPASS as a blocking condition and exits with code `1`.

## Troubleshooting Failures

- Review the per-scenario directory under `version-compatibility-tests/logs/<timestamp>/` for
  `summary.json` plus raw command output (install/build/lint). `MATRIX_SUMMARY.json` surfaces the
  failing scenario slug.
- Re-run a single scenario by filtering to that combination, for example:
  `pnpm run compat:matrix -- --linter eslint-prettier -r 19.1.1 -t 5.9.3 --eslint 9.13.0 --prettier 3.6.2`.
- Common causes: missing peer dependencies in the consumer app, incompatible TypeScript/react-dom
  pairs, or lint/format rules diverging. Fix the issue in the library or consumer harness, then
  re-run `pnpm run compat:matrix`.
- If the failure is known but unresolved, add an entry to `xfail.json` (see below) so CI summaries
  highlight it as XFAIL rather than FAIL.

### Common Issues

#### Build Fails with "Cannot find module"

If you see module resolution errors:

1. Check the consumer app's `package.json` was restored (pin script does this automatically)
2. Verify the tarball path with `--tarball ./xterm-react-x.y.z.tgz`
3. Clean consumer app: `rm -rf version-compatibility-tests/consumer-app/node_modules`

#### XPASS Detection

If a scenario passes but was marked XFAIL:

1. This indicates the underlying issue was fixed
2. Remove the entry from `version-compatibility-tests/xfail.json`
3. Commit the update to recognize the fix

## XFAIL Policy

- Treat XFAIL as an explicit waiver: only add entries when the incompatibility is understood and
  tracked (e.g. upstream React beta bug, tooling regression) and is acceptable short-term.
- Entries should be as specific as possible (React, TypeScript, linter family, and versions). Avoid
  wildcards until pattern matching is implemented.
- When a scenario unexpectedly passes (`XPASS`), remove the matching XFAIL entry in the same PR to
  keep the list tidy.
- Periodically audit `xfail.json` alongside test runs to ensure we do not regress on previously
  waived combinations.

### When to Add XFAIL

Add entries when a known incompatibility exists and:

- The issue is in an external dependency (React/TypeScript/tooling)
- Fixing requires waiting for upstream releases
- The failure is deterministic and expected

### When to Remove XFAIL

Remove entries when:

- The scenario starts passing (XPASS detected)
- The dependency combination is no longer supported
- The underlying issue has a workaround

### Format

Each entry must specify exact versions to avoid false matches.

## Migration from Legacy System

The old compatibility testing system used three separate test files:

- `core/react-versions-test.js`
- `devtools/biome-versions-test.js`
- `devtools/eslint-versions-test.js`

The new system consolidates these into a single matrix runner. To migrate:

1. Remove old test scripts and reports
2. Update CI workflows to use `pnpm run compat:matrix`
3. Configure XFAIL entries in `version-compatibility-tests/xfail.json`
4. Run matrix with `--quick` for smoke tests or full matrix for releases

## Housekeeping

- Generated artifacts are ignored:
  - `version-compatibility-tests/logs/`, `version-compatibility-tests/dist/`, consumer app lockfile and build output.
- The legacy runner and reports were removed; the JSON + Markdown outputs from the current matrix are the source of truth.
