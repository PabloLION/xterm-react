# Story 5.2 Implementation Plan – Runtime CI Strategy

**Target Branch**: `feat/story-5-2-runtime-ci-strategy`  
**Prepared**: October 9, 2025

## Objectives

- Guarantee every release build executes the compatibility matrix against the latest Node LTS lane so regressions surface before publishing.
- Provide an approved path for extended runtime coverage (older Node LTS lines and Bun) without forcing the full matrix on every PR, relying on scripted helpers instead of bespoke YAML.
- Document the cadence and ownership expectations for each runtime lane so release engineers know when to trigger additional coverage.

## Scope Summary

- **In Scope**: GitHub Actions updates for latest-LTS automation, CLI helpers for optional runtimes, documentation updates (compatibility guide, release process notes), backlog capture for Bun enablement & runtime rotation.
- **Out of Scope / Deferred**: Implementing Bun support itself, expanding matrix dimensions (React/TS/linters) beyond existing presets, performance optimizations for manual runs, telemetry on workflow duration.

## Workstreams & Key Tasks

### 1. Latest LTS Workflow Enhancements

- Update `.github/workflows/compatibility-tests.yml` so the latest Node LTS lane runs on release-oriented triggers (e.g., publish, release, or tagged pushes) in addition to the weekly schedule.
- Reuse caching and batching patterns from Story 5.1 (no `--parallel`) to keep runtime predictable.
- Ensure job naming communicates "Latest LTS" to avoid confusion with the CLI helpers.

### 2. Manual Extended Runtime Flow (CLI-based)

- Expose curated pnpm scripts (`ci:compat:baseline`, `ci:compat:latest`) for reproducible local execution.
- Document how to run the scripts sequentially, pass overrides, and capture logs for release notes.
- Drop the separate workflow once the CLI flow covers the same use cases.

### 3. Documentation & Release Guidance

- Refresh `docs/compatibility-testing.md` with a "Runtime Lanes" section describing the automated latest-LTS smoke and the CLI-based extended flow, including suggested cadence (weekly, pre-release, post-major bump).
- Update release process notes (brief/PRD references) to require the latest-LTS job to be green before tagging a release.

### 4. Backlog Follow-Ups

- Add backlog entries for Bun enablement (consumer app + workflow support) and runtime rotation automation (e.g., updating latest LTS when Node releases).
- Cross-reference relevant epics/stories for future work (Story 5.3, potential tooling improvements).

## Implementation Sequence

- Verify current workflow behavior and identify release triggers already defined in the repo.
- Implement latest-LTS job updates and dry-run via `gh workflow run` (or equivalent) to ensure triggers behave locally.
- Exercise the CLI helpers locally (`ci:compat:baseline`, `ci:compat:latest`) and capture sample output for documentation.
- Update compatibility docs and release guidance, then run `pnpm markdownlint docs`.
- Append backlog items and ensure references align with PRD Story 5.3.
- Run `pnpm check:no-fix` and `pnpm test`; capture workflow screenshots or logs for the PR description.

## Atomic Commit Breakdown

1. **ci(compat): run latest LTS smoke during release checks**

   - Extend `.github/workflows/compatibility-tests.yml` with release triggers (`release`, `workflow_call`, or tag patterns) that execute the latest Node LTS lane.
   - Confirm caching options (`actions/cache` or pnpm store) and ensure the job executes `pnpm compat:matrix -- --runtime node24 --sequential`.
   - Update job names/descriptions to highlight "Latest LTS smoke".

1. **ci(compat): manual extended runtime flow (CLI)**

   - Expose curated helpers (`pnpm run ci:compat:baseline` and `pnpm run ci:compat:latest`) backed by the matrix runner.
   - Document how to run them sequentially and capture their logs.
   - Remove the earlier workflow once the CLI path is documented.

1. **docs(release): document runtime lane expectations**

   - Update `docs/compatibility-testing.md` to document the automated latest-LTS lane and CLI helper usage, including cadence guidance.
   - Add a note to release docs (e.g., `docs/brief.md` or `docs/prd.md` release checklist) requiring a green latest-LTS job prior to tagging.
   - Mention where to find workflow logs and how to execute the manual lanes locally.

1. **docs(backlog): capture future runtime enhancements**

   - Append backlog items for Bun enablement (consumer app + workflow integration) and Node LTS rotation automation under the runtime epic.

- Reference Story 5.3 and planned follow-ups so future work has a clear entry point.

## Testing Strategy

- `pnpm check:no-fix` and `pnpm test` to guard against TypeScript/lint regressions.
- `pnpm markdownlint docs` after documentation changes.
- Trigger the updated workflow via `gh workflow run` or GitHub UI (dry-run) to confirm matrix execution and summary output.
- Inspect GitHub Actions logs to ensure runtime lanes honor sequential execution and correct script flags.

### Testing Record (updated)

- Local verification: `pnpm check:no-fix`, `pnpm test`, and `pnpm markdownlint docs` (re-run after each workflow/doc change).
- Matrix spot-check: `pnpm run compat:matrix -- --runtime node24 --linter eslint-prettier --react 19.1.1 --typescript 5.9.3 --eslint 9.13.0 --prettier 3.6.2 --quick` (2025-10-10) – fails during Vite build with Rollup complaining about an emitted asset using an absolute path. Captured log for triage (`version-compatibility-tests/logs/2025-10-10T10-39-14-737Z/...`).
- Workflow validation:
  - **Compatibility Tests** – release/tag guard logic reviewed; timeout added (60 minutes) for runaway protection.
- Manual lane verification uses the pnpm helpers (`ci:compat:baseline`, `ci:compat:latest`). After resolving the Vite asset emission issue, capture the CLI logs and attach them to this log.

## Documentation & Deliverables

- Updated `.github/workflows/compatibility-tests.yml` and removed the legacy manual workflow file.
- Revised `docs/compatibility-testing.md` (plus references in `docs/brief.md` if needed).
- Backlog entries in `docs/backlog.md` capturing remaining runtime initiatives.
- PR description summarizing workflow behavior changes and linking to example runs.

## Risks & Mitigations

- **Trigger noise**: Release workflow may fire unexpectedly on non-release events; mitigate by scoping triggers carefully and documenting expected usage.
- **Operator confusion**: Without documentation, contributors might skip manual lanes; mitigate with explicit release checklist updates and CLI examples.

## Decisions & Follow-ups

- Manual runtime verification now relies on CLI helpers; maintainers can reintroduce an approval-gated workflow later if runtime costs spike.
- Add a Dependabot-based alert/reminder to flag new Node LTS releases so the runtime catalog stays current (tracked in backlog).
