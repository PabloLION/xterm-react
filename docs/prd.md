# XTerm React Modernization Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Deliver a predictable React 18/19 + TypeScript 5.x terminal wrapper that installs cleanly and exposes modern APIs.
- Keep the curated compatibility matrix green for every release and surface the results transparently.
- Unify project documentation (README, guides, BMAD artifacts) so contributors and consumers have a single source of truth.
- Expand platform coverage with dual consumer apps (JS + TS) to validate multiple ecosystems without duplicating manual work.

### Background Context

The XTerm React library fills the gap left by stagnant wrappers such as `xterm-for-react`. Recent revival work introduced an in-repo consumer app and compatibility matrix that validates key React, TypeScript, and linting combinations before publishing. The next stage focuses on solidifying those foundations—formalizing documentation, extending the harness to cover both JavaScript and TypeScript consumers, and preparing release workflows so downstream products can rely on the package without trial-and-error validation.

### Change Log

| Date       | Version | Description                       | Author    |
| ---------- | ------- | --------------------------------- | --------- |
| 2025-10-07 | 0.1.0   | Initial PRD draft from BMAD brief | Assistant |

## Requirements

### Functional

1. **FR1:** The compatibility harness must run curated scenarios for React 18.3.x & 19.1.x with TypeScript 5.2/5.4/5.9 and emit JSON + Markdown summaries.
2. **FR2:** The npm package must ship ESM-friendly metadata (`type`, `exports`, `sideEffects`) and pass install tests in fresh React 19 + TypeScript 5 projects with no manual tweaks.
3. **FR3:** Documentation must be consolidated into a single system that links README, compatibility guides, BMAD artifacts, and release notes.
4. **FR4:** Provide dual consumer apps (JavaScript + TypeScript) sharing automation so each compatibility run can target either ecosystem.
5. **FR5:** Compatibility results must be surfaced to maintainers (e.g., via summary scripts or future notifications) prior to release sign-off.

### Non Functional

1. **NFR1:** Provide a documented "quick" matrix mode that completes within an acceptable local window (≈10 minutes on a developer machine) while full curated runs remain scheduled/approval-gated in CI.
2. **NFR2:** Library bundle size increase from new tooling must remain negligible (<1 KB gzipped) to avoid punishing consumers.
3. **NFR3:** Documentation updates should accompany every feature release (no stale sections at publish time).
4. **NFR4:** Processes must support Node 18+ and pnpm-based workflows to remain consistent with the repository toolchain.

## User Interface Design Goals

_No dedicated end-user UI is required. Documentation pages (README/docs site) will house guidance, but detailed UI design is out of scope for this library-focused release._

## Technical Assumptions

### Repository Structure: Monorepo

Single repository containing the library, compatibility harness, docs, and scripts. No plan to split into multiple repos.

### Service Architecture

Library-first architecture. The published package exposes React components while the compatibility harness remains an internal tool. No backend/microservices are introduced.

### Testing Requirements

Adopt a pyramid anchored by automated compatibility matrix runs plus unit/integration tests where applicable. Manual verification occurs only for exploratory addon scenarios.

### Additional Technical Assumptions and Requests

- Continue targeting ESM output while providing type definitions through `dist/`.
- Maintain pnpm as the package manager; ensure scripts remain cross-platform friendly.
- Document required Node version (>=18) and recommend using Volta/nvm for consistency.

## Epic List

1. **Epic 1 – Compatibility & Packaging Foundation:** Harden the compatibility harness, lock down ESM packaging, and ensure release scripts gate on green matrix runs.
2. **Epic 2 – Documentation & Guidance Overhaul:** Merge legacy docs with BMAD outputs, publish centralized guides, and add addon/status-bar examples.
3. **Epic 3 – Dual Consumer Ecosystem:** Introduce JavaScript + TypeScript consumer apps with shared automation and update the matrix to target both tracks.
4. **Epic 4 – Release Visibility & Checklist Automation:** Surface matrix status to maintainers (e.g., PR summaries) and wire the release checklist into the PRD before publishing.
5. **Epic 5 – Runtime Coverage (Node & Bun):** Validate the library and consumer apps across supported Node LTS versions and Bun, updating docs and tooling accordingly.

## Epic 1 – Compatibility & Packaging Foundation

Objective: Ensure every release is backed by reproducible compatibility runs and ESM packaging passes smoke tests.

### Story 1.1 Compatibility matrix guardrail

As a maintainer,
I want the curated matrix to run automatically and fail on unexpected diffs,
so that releases only proceed when all targeted scenarios pass.

Acceptance Criteria:

1. Matrix run returns non-zero exit code on any scenario failure.
2. Summary JSON/Markdown files are generated and committed to `version-compatibility-tests/logs/`.
3. CI workflow references the matrix script and halts the pipeline on failure.

### Story 1.2 Packaging smoke validation

As a maintainer,
I want an automated install/test script for the published package,
so that ESM metadata issues are caught before release.

Acceptance Criteria:

1. Script builds tarball, installs into a temp React 19 + TypeScript 5 project, and runs `pnpm build` without errors.
2. Script checks for absence of duplicate `react`/`react-dom` versions in the lockfile.
3. Documentation references the validation script for release checklists.

### Story 1.3 Release script gating

As a release engineer,
I want the publish script to require a green matrix summary,
so that accidental publishes without compatibility data are blocked.

Acceptance Criteria:

1. `scripts/prepare-publish.sh` verifies latest matrix summary timestamp is within a configurable window (e.g., 24h).
2. If summary is missing/stale, the script exits with an actionable message.
3. Optionally accepts `--skip-matrix` override requiring manual confirmation.

## Epic 2 – Documentation & Guidance Overhaul

Objective: Provide a unified documentation system that helps consumers and contributors navigate the project.

### Story 2.1 Documentation system merge

As a maintainer,
I want legacy docs and BMAD outputs merged into a single navigation tree,
so that contributors have one place to find architecture, PRDs, and guides.

Acceptance Criteria:

1. Create docs index linking README, compatibility guide, PRD, architecture, and backlog.
2. Update README to reference the new docs index.
3. Add contributor note describing where new docs should live.

### Story 2.2 Addon & status bar examples

As a consumer,
I want ready-made examples for common terminal addons and status bars,
so that I can implement advanced features without starting from scratch.

Acceptance Criteria:

1. Provide documented example integrating FitAddon and at least one other addon (e.g., WebLinks).
2. Document optional status bar overlay with event-driven updates.
3. Update compatibility matrix to include at least one addon scenario smoke test.

### Story 2.3 Release notes automation

As a maintainer,
I want release history and summaries generated from the matrix logs,
so that release notes accurately reflect compatibility coverage.

Acceptance Criteria:

1. Script reads the latest matrix summary and updates HISTORY.md or equivalent.
2. Add instructions to the release checklist referencing the history update command.
3. Document how to regenerate summaries in docs/compatibility-testing.md.

## Epic 3 – Dual Consumer Ecosystem

Objective: Validate both JavaScript and TypeScript consumers without duplicating manual steps.

### Story 3.1 TypeScript consumer scaffolding

As a maintainer,
I want a TypeScript consumer app mirroring the JS example,
so that the matrix can iterate over both ecosystems.

Acceptance Criteria:

1. Create `version-compatibility-tests/consumer-app-ts` (or shared config) with Vite + TS.
2. Ensure pnpm scripts can target JS-only, TS-only, or both via flags.
3. Update docs describing when to run each consumer target.

### Story 3.2 Shared automation & quick modes

As a maintainer,
I want shared tooling that selects JS/TS and quick subsets,
so that local runs remain fast.

Acceptance Criteria:

1. Extend matrix CLI flags to select consumer type and quick run profile.
2. Document new flags in the compatibility-testing guide.
3. Provide cached workspace or reuse strategy to avoid redundant installs.

### Story 3.3 Matrix documentation updates

As a user,
I want documentation explaining the dual consumer strategy,
so that I understand how compatibility coverage is organized.

Acceptance Criteria:

1. Add section to docs/compatibility-testing.md describing JS vs TS paths.
2. Update README compatibility badge explanation.
3. Add notes to backlog about future expansion (e.g., optional React 17 support research).

## Epic 4 – Release Checklist Enforcement

Objective: Ensure the matrix summary and release checklist are current before any publish, providing clear signals without running the full matrix in CI.

### Story 4.1 Matrix summary freshness gate

As a maintainer,
I want CI to verify that the matrix summary was refreshed for the release,
so that stale compatibility data can’t slip through.

Acceptance Criteria:

1. Lightweight CI job compares `version-compatibility-tests/MATRIX_LATEST.json` (or summary path) against the previous release tag.
2. If the summary is missing or older than a configurable window (e.g., 24h), the job fails with guidance to run the matrix locally.
3. Release workflow (or merge gate) requires successful completion or an explicit override/approval.

### Story 4.2 Release checklist integration

As a release engineer,
I want the release checklist captured in the PRD before publishing,
so that we track completion of docs updates, history update, and matrix run before release.

Acceptance Criteria:

1. Populate the PRD “Checklist Results Report” from the pm-checklist task.
2. Document which steps are mandatory vs optional and reference them in the release instructions.
3. Ensure `scripts/prepare-publish.sh` (or equivalent release script) checks for checklist completion and aborts if items remain unchecked.

## Epic 5 – Runtime Coverage (Node & Bun)

Objective: Extend compatibility validation to cover Node LTS releases and Bun so consumers know the supported runtimes.

### Story 5.1 Runtime matrix column

Status: **Implemented** (branch `feat/story-5-1-runtime-matrix`, smoke checks: `pnpm compat:matrix -- --runtime node20 --linter eslint-prettier --react 19.1.1 --typescript 5.9.3 --eslint 9.13.0 --prettier 3.6.2`)

As a maintainer,
I want the compatibility matrix to include a runtime dimension (Node LTS and Bun),
so that we can validate the library across the environments we claim to support.

Acceptance Criteria:

1. Extend matrix configuration to add a “runtime” dimension covering Node 14.x (legacy support), Node 16.x (maintenance), Node 18 LTS, Node 20 LTS, Node 24.x (current), Node 25+ (“current” branch), plus Bun stable releases.
2. Provide CLI flags to select runtime(s) for local runs (e.g., `--runtime node20`, `--runtime bun-stable`), with a sensible default (latest Node LTS).
3. Document how runtimes combine with consumer type (JS/TS) so the matrix doesn’t explode; support curated subsets and guard against unsupported combinations.

### Story 5.2 CI/Lab strategy for runtimes

As a release engineer,
I want a practical CI strategy for runtime coverage,
so that we balance signal quality with runtime duration.

Acceptance Criteria:

1. GitHub Actions (or equivalent) run the matrix on the latest Node LTS as part of release checks.
2. Provide manual/approval jobs (or local scripts) for the remaining Node runtime lanes (14, 16, 18, 24, 25) and Bun, rather than running everything on every PR.
3. Release documentation spells out when to run each runtime lane (e.g., nightly, pre-release, manual verification) and how to request overrides.

#### Implementation Plan

- Branch: `feat/story-5-2-runtime-ci-strategy`
- Commit outline:
  1. `ci(compat): run latest LTS smoke during release checks`
     - Extend compatibility workflows so the latest Node LTS lane (currently `node22`) runs automatically on release/publish triggers in addition to the scheduled weekly job.
     - Share pnpm caches with the scheduled job and keep runtime batches sequential (no `--parallel` flag).
  2. `ci(compat): add manual extended runtime workflow`
     - Add a workflow-dispatch job (with approval gate) that iterates optional Node lanes (`node24`, `node25`, future current/LTS) plus the Bun placeholder once support lands.
     - Expose inputs for selecting runtime/react/ts presets without editing YAML.
  3. `docs(release): document runtime lane expectations`
     - Update `docs/compatibility-testing.md` and related release docs with guidance on when to run each lane and the required approvals.
     - Add a release checklist note that the latest LTS smoke must pass and link to the manual workflow for additional lanes.
  4. `docs(backlog): log future runtime enhancements`
     - Capture follow-ups for Bun enablement and runtime rotation cadence so later stories (e.g., Story 5.3) have explicit entry points.
- Validation: `pnpm check:no-fix`, `pnpm test`, run `pnpm markdownlint docs` after doc edits, and trigger affected workflows via GitHub UI (or `act`) when feasible.

### Story 5.3 Bun validation

As a maintainer,
I want Bun-specific smoke tests for the consumer apps,
so that we either verify or explicitly mark Bun support as “experimental.”

Acceptance Criteria:

1. Matrix runtime dimension includes Bun entries (JS & TS consumer) for all Bun release channels officially advertised (current stable and preview/nightly if available) with smoke build/test steps.
2. Document any incompatibilities or required polyfills in README/docs.
3. Provide a script/flag for local Bun validation and note that CI runs are optional/manual.

### Story 5.4 Runtime documentation updates

As a user,
I want documentation describing runtime support,
so that I know which environments are tested and how to reproduce the checks.

Acceptance Criteria:

1. Update docs/compatibility-testing.md with runtime matrix instructions (Node LTS list, Bun guidance).
2. Add runtime support badge/statement to README.
3. Track future runtime expansion ideas (e.g., Deno) in docs/backlog.md.

## Checklist Results Report

Checklist execution is pending. Complete after final PRD review and before release handoff.

## Next Steps

### UX Expert Prompt

“Please review docs/brief.md and docs/prd.md to determine whether any UX guidance is needed. Focus on documentation presentation rather than UI design, since this release targets library improvements.”

### Architect Prompt

“Using docs/brief.md and docs/prd.md, produce the architecture plan covering repository structure, build tooling, scripts, and compatibility harness evolution. Pay special attention to dual consumer apps and documentation consolidation requirements.”
