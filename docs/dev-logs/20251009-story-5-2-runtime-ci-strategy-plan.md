# Story 5.2 Implementation Plan – Runtime CI Strategy

**Target Branch**: `feat/story-5-2-runtime-ci-strategy`  
**Prepared**: October 9, 2025

## Objectives

- Guarantee every release build executes the compatibility matrix against the latest Node LTS lane so regressions surface before publishing.
- Provide an approved workflow for extended runtime coverage (older Node LTS lines and Bun) without forcing the full matrix on every PR.
- Document the cadence and ownership expectations for each runtime lane so release engineers know when to trigger additional coverage.

## Scope Summary

- **In Scope**: GitHub Actions updates for latest-LTS automation, a manual dispatch workflow for optional runtimes, documentation updates (compatibility guide, release process notes), backlog capture for Bun enablement & runtime rotation.
- **Out of Scope / Deferred**: Implementing Bun support itself, expanding matrix dimensions (React/TS/linters) beyond existing presets, performance optimizations for manual runs, telemetry on workflow duration.

## Workstreams & Key Tasks

### 1. Latest LTS Workflow Enhancements

- Update `.github/workflows/compatibility-tests.yml` so the latest Node LTS lane runs on release-oriented triggers (e.g., publish, release, or tagged pushes) in addition to the weekly schedule.
- Reuse caching and batching patterns from Story 5.1 (no `--parallel`) to keep runtime predictable.
- Ensure job naming communicates "Latest LTS" to avoid confusion with the manual workflow.

### 2. Manual Extended Runtime Workflow

- Author a new workflow (likely `.github/workflows/compatibility-tests-extended.yml`) with `workflow_dispatch` + required reviewer/approval.
- Accept inputs for runtime (default `node20`), React preset, TypeScript preset, and optional verbosity toggle.
- Iterate requested runtimes sequentially, invoking `pnpm compat:matrix -- --runtime <lane>` so operators do not edit YAML.
- Emit clear summaries (steps or artifacts) highlighting PASS/FAIL counts per runtime.

### 3. Documentation & Release Guidance

- Refresh `docs/compatibility-testing.md` with a "Runtime Lanes" section describing the automated latest-LTS smoke and the manual extended workflow, including suggested cadence (weekly, pre-release, post-major bump).
- Update release process notes (brief/PRD references) to require the latest-LTS job to be green before tagging a release.

### 4. Backlog Follow-Ups

- Add backlog entries for Bun enablement (consumer app + workflow support) and runtime rotation automation (e.g., updating latest LTS when Node releases).
- Cross-reference relevant epics/stories for future work (Story 5.3, potential tooling improvements).

## Implementation Sequence

1. Verify current workflow behavior and identify release triggers already defined in the repo.
2. Implement latest-LTS job updates and dry-run via `gh workflow run` (or equivalent) to ensure triggers behave locally.
3. Draft and test the manual workflow using `workflow_dispatch` locally (if possible) and document expected inputs.
4. Update compatibility docs and release guidance, then run `pnpm markdownlint docs`.
5. Append backlog items and ensure references align with PRD Story 5.3.
6. Run `pnpm check:no-fix` and `pnpm test`; capture workflow screenshots or logs for the PR description.

## Atomic Commit Breakdown

1. **ci(compat): run latest LTS smoke during release checks**

   - Extend `.github/workflows/compatibility-tests.yml` with release triggers (`release`, `workflow_call`, or tag patterns) that execute the latest Node LTS lane.
   - Confirm caching options (`actions/cache` or pnpm store) and ensure the job executes `pnpm compat:matrix -- --runtime node22 --sequential`.
   - Update job names/descriptions to highlight \"Latest LTS smoke\".

2. **ci(compat): add manual extended runtime workflow**

   - Add `.github/workflows/compatibility-tests-extended.yml` with two curated lanes (baseline Node 20 + oldest stack, latest Node 24 + latest stack) executed sequentially.
   - Expose simple toggles to skip either lane; rely on pnpm scripts (`ci:compat:baseline`, `ci:compat:latest`) so CI YAML stays declarative.
   - Require reviewer approval (environment protection or `workflow_dispatch` with `required_reviewers`) before execution.

3. **docs(release): document runtime lane expectations**

   - Update `docs/compatibility-testing.md` to document the automated latest-LTS lane and manual workflow usage, including cadence guidance.
   - Add a note to release docs (e.g., `docs/brief.md` or `docs/prd.md` release checklist) requiring a green latest-LTS job prior to tagging.
   - Mention where to find workflow logs and how to trigger the manual run.

4. **docs(backlog): capture future runtime enhancements**
   - Append backlog items for Bun enablement (consumer app + workflow integration) and Node LTS rotation automation under the runtime epic.

- Reference Story 5.3 and planned follow-ups so future work has a clear entry point.

## Testing Strategy

- `pnpm check:no-fix` and `pnpm test` to guard against TypeScript/lint regressions.
- `pnpm markdownlint docs` after documentation changes.
- Trigger the updated workflows via `gh workflow run` or GitHub UI (dry-run) to confirm inputs, matrix execution, and summary output.
- Inspect GitHub Actions logs to ensure runtime lanes honor sequential execution and correct script flags.

### Testing Record (updated)

- Local verification: `pnpm check:no-fix`, `pnpm test`, and `pnpm markdownlint docs` (re-run after each workflow/doc change).
- Matrix spot-check: `pnpm run compat:matrix -- --runtime node22 --linter eslint-prettier --react 19.1.1 --typescript 5.9.3 --eslint 9.13.0 --prettier 3.6.2 --quick` (2025-10-10) – fails during Vite build with Rollup complaining about an emitted asset using an absolute path. Captured log for triage (`version-compatibility-tests/logs/2025-10-10T10-39-14-737Z/...`).
- Workflow validation:
  - **Compatibility Tests** – release/tag guard logic reviewed; timeout added (60 minutes) for runaway protection.
  - **Compatibility Tests (Popular Runtimes)** – validated sequential lane execution via the new pnpm helpers (`pnpm run ci:compat:baseline`, `pnpm run ci:compat:latest`); workflow enforces a 120-minute timeout and uploads per-lane plus combined artifacts.
- Manual workflow execution is pending environment approval (`runtime-extended`). After resolving the Vite asset emission issue, rerun the dispatched workflow (targeting `node20,node22`) and attach the artifact to this log.

## Documentation & Deliverables

- Updated `.github/workflows/compatibility-tests.yml` and new manual workflow file.
- Revised `docs/compatibility-testing.md` (plus references in `docs/brief.md` if needed).
- Backlog entries in `docs/backlog.md` capturing remaining runtime initiatives.
- PR description summarizing workflow behavior changes and linking to example runs.

## Risks & Mitigations

- **Trigger noise**: Release workflow may fire unexpectedly on non-release events; mitigate by scoping triggers carefully and documenting expected usage.
- **Workflow drift**: Manual workflow inputs could diverge from supported presets; mitigate with validation and README instructions.
- **Operator confusion**: Without documentation, contributors might skip manual lanes; mitigate with explicit release checklist updates.

## Decisions & Follow-ups

- Manual runtime workflow will require repository owner approval before execution (use protected environment or required reviewers).
- Add a Dependabot-based alert/reminder to flag new Node LTS releases so the runtime catalog stays current (tracked in backlog).
