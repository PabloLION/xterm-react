# XTerm React Brownfield Enhancement Architecture

## Introduction

This document outlines the architectural approach for evolving XTerm React with hardened compatibility tooling, dual consumer apps, and improved release visibility while keeping parity with the existing TypeScript + React 19 wrapper. It supplements the current repository architecture by clarifying how the new compatibility workflows, documentation system, and runtime coverage will integrate with the established library, scripts, and documentation.

## Change Log

| Change | Date | Version | Description | Author |
| --- | --- | --- | --- | --- |
| Initial draft | 2025-10-07 | 0.1.0 | Capture brownfield architecture for modernization work | Assistant |

## Existing Project Analysis

### Current Project State

- **Primary Purpose:** Ship `@pablo-lion/xterm-react`, a React 18/19 compatible wrapper around `@xterm/xterm`, plus in-repo tooling that proves ecosystem support before publishing.
- **Current Tech Stack:** TypeScript + React 19, pnpm, Vite playground, Biome for lint/format, tsx + Node test runner, Husky dev hooks, GitHub Actions linters.
- **Architecture Style:** Single-package library with supporting tools (`version-compatibility-tests`, `docs`, `scripts`) living in one repo.
- **Deployment Method:** Manual publish via `scripts/prepare-publish.sh` (npm) after local compatibility runs and documentation updates.

### Available Documentation

- README.md (library usage and install instructions)
- docs/brief.md (project brief)
- docs/prd.md (BMAD PRD with epics and stories)
- docs/compatibility-testing.md (matrix harness guide)
- docs/backlog.md (future enhancements and release tasks)
- REVIVAL_REPORT.md (historic modernization notes)

### Identified Constraints

- Matrix runs are intentionally manual today; CI only executes lint/format until the new branch stabilizes the matrix.
- Must stay ESM-first with pnpm tooling and Node ≥18 for library + scripts.
- React 17 is out of scope; focus is React 18.3.x and 19.1.x ecosystems.
- Limited maintainer bandwidth means automation must minimize manual babysitting.

## Enhancement Scope and Integration Strategy

### Enhancement Overview

**Enhancement Type:** Brownfield modernization of build/test/docs systems

**Scope:** Expand compatibility tooling (dual consumer apps, runtime column, quick vs full modes), align packaging/release scripts, and merge documentation under BMAD outputs without destabilizing the existing library.

**Integration Impact:** Medium — touches tooling, docs, and release scripts while leaving published component API stable.

### Integration Approach

**Code Integration Strategy:**

- Extend `version-compatibility-tests/scripts` to orchestrate multiple consumer apps (JS + TS) and runtime dimensions while reusing the existing pack/install pipeline.
- Retain the current TypeScript consumer and add a JavaScript counterpart, extracting shared config/utilities to avoid duplication.
- Update release scripts (`scripts/prepare-publish.sh`, history updater) to depend on summarized matrix artifacts instead of ad-hoc checks.

**Database Integration:** Not applicable (library + tooling only).

**API Integration:** No external service APIs; ensure component props/types remain backward compatible and document any refactor in `docs/`.

**UI Integration:** Consumer apps remain Vite examples; no production UI changes.

### Compatibility Requirements

- **Existing API Compatibility:** Public exports in `src/index.ts` remain unchanged; any new helpers must be additive with documented usage.
- **Database Schema Compatibility:** N/A.
- **UI/UX Consistency:** Consumer demos stay minimal; docs provide addon/status-bar guidance without modifying the core component.
- **Performance Impact:** Scripts must respect current ~10 minute “quick matrix” target and avoid increasing library bundle (≤1 KB gzipped delta).

## Tech Stack

### Existing Technology Stack

| Category | Current Technology | Version | Usage in Enhancement | Notes |
| --- | --- | --- | --- | --- |
| Language | TypeScript | 5.4.5 (repo), scenarios pin 5.2/5.4/5.9 | Continue powering library & consumer harness | Explicit pins per scenario maintained via matrix scripts |
| UI Library | React | 19.1.1 primary (matrix also 18.3.x) | Library component & consumer demos | React 17 intentionally unsupported |
| Terminal Engine | @xterm/xterm | 5.5.0 | Core dependency shipped with library | Keep as dependency to unlock addons |
| Bundler | Vite | 7.1.x (library dev) / 5.x in consumer | Dev playground + consumer builds | Align consumer TS/JS projects on supported Vite majors |
| Package Manager | pnpm | 9.x | Scripts, installs, matrix | Document store reuse for faster runs |
| Lint/Format | Biome | 2.2.4 (CLI warns schema 2.2.5) | `pnpm check` and Husky hooks | Plan schema bump via `biome migrate` |
| Testing | tsx test runner + Node built-ins | n/a | Library unit tests, matrix orchestrations | Future integration tests for consumer apps |
| Docs Tooling | Markdown/markdownlint | CLI 0.45.0 | Enforce docs quality (including this file) | BMAD artifacts live in `docs/` |

### New Technology Additions

None required; enhancements reuse existing stack, with potential small utilities (e.g., shared config modules) implemented in TypeScript.

## Data Models and Schema Changes

No persistent data models. Outputs remain generated JSON/Markdown summaries and history tables stored under `version-compatibility-tests/logs/` and `docs/compatibility-matrix.md`.

## Component Architecture

### Core Components

#### Library (`src/XTerm.tsx`)

- **Purpose:** Provide idiomatic React wrapper exposing imperative terminal APIs, event handlers, and render lifecycle for xterm.js.
- **Integration:** Continues exporting through `src/index.ts` with existing ref semantics; packaging remains ESM with types bundled from `dist/`.
- **Dependencies:** React, @xterm/xterm, optional addons (fit, web links) consumed by integrators.
- **Technology Stack:** TypeScript + React 19 component.

#### Compatibility Runner (`version-compatibility-tests/scripts/matrix-run-consumer.mjs`)

- **Purpose:** Pack library once, iterate curated matrices (React, TypeScript, linter toolchain, soon runtime) using consumer app installs.
- **Integration:** Invokes `consumer-pin-and-build.mjs` per scenario, writes per-scenario logs, summary JSON/MD, updates `MATRIX_LATEST.json` pointer.
- **Dependencies:** Node child_process, pnpm CLI, summarizer script.
- **Technology Stack:** Node 18+ (ESM script), to be refactored into TypeScript `.mts` per backlog.

#### Consumer Pin & Build (`version-compatibility-tests/scripts/consumer-pin-and-build.mjs`)

- **Purpose:** Prepare consumer workspace by installing scenario-specific React/TS/lint deps, injecting packed tarball, running build/check commands.
- **Integration:** Called by matrix runner, ensures packages stay within repo tree, normalizes overrides, writes log bundles.
- **Dependencies:** Node fs/path, pnpm CLI; needs realpath normalization hardening.
- **Technology Stack:** Node 18+ ESM script (TypeScript migration planned).

#### Consumer App (`version-compatibility-tests/consumer-app`)

- **Purpose:** Vite + React example that imports the packed library to validate build-time integration.
- **Integration:** Current implementation is TypeScript; future plan introduces parallel JavaScript variant to exercise plain JS consumers.
- **Dependencies:** React, ReactDOM, Vite plugin-react, Biome + ESLint config scoped to app.
- **Technology Stack:** TypeScript SPA, minimal UI.

#### Documentation System (`docs/*.md`)

- **Purpose:** Single source of truth (brief, PRD, architecture, backlog, compatibility guide) for maintainers and contributors.
- **Integration:** README links to docs; release process updates `docs/compatibility-matrix.md` via `scripts/update-history.ts` and compatibility summaries.
- **Dependencies:** markdownlint CLI, BMAD templates.
- **Technology Stack:** Markdown + automation scripts.

### Component Interaction Diagram

```mermaid
graph TD
  A[Library Source (src/)] -->|pnpm build| B[dist/ package]
  B -->|pnpm pack| C[Packed Tarball]
  C --> D[consumer-pin-and-build]
  D -->|installs tarball + scenario deps| E[Consumer App Workspace]
  E -->|vite build / biome checks| F[Scenario Result Logs]
  F --> G[matrix-run-consumer]
  G -->|aggregates| H[MATRIX_SUMMARY.json]
  H --> I[summarize-matrix]
  I --> J[MATRIX_SUMMARY.md]
  H --> K[HISTORY update script]
  J --> L[Docs/Release Notes]
```

## API Design and Integration

No new runtime APIs or endpoints; existing React component API remains intact. Document any additive props in release notes when introduced.

## External API Integration

Not applicable; tooling interacts only with local pnpm registry operations.

## Source Tree

### Existing Project Structure

```text
xterm-react/
├── src/
│   └── XTerm.tsx
├── version-compatibility-tests/
│   ├── consumer-app/
│   ├── scripts/
│   ├── logs/
│   └── xfail.json
├── scripts/
│   ├── prepare-publish.sh
│   └── update-history.ts
├── docs/
│   ├── brief.md
│   ├── prd.md
│   └── compatibility-testing.md
└── tests/
```

### New File Organization (planned additions)

_Planned additions; italic entries denote future work._

```text
xterm-react/
├── version-compatibility-tests/
│   ├── consumer-app/                 # Existing TS consumer
│   ├── _consumer-app-js_/            # Planned JS consumer (Vite + JSX)
│   ├── _shared_/                     # Planned utilities shared by runners/consumers
│   ├── scripts/
│   │   ├── consumer-pin-and-build.mjs
│   │   ├── matrix-run-consumer.mjs
│   │   └── summarize-matrix.mjs
│   └── logs/
├── docs/
│   ├── architecture.md               # This document
│   ├── _index.md_                    # Planned navigation entry point (Epic 2)
│   └── _guides/_                     # Planned addon/status-bar recipes
```

### Integration Guidelines

- **File Naming:** Continue using kebab-case for scripts, PascalCase for components, `.mts`/`.ts` for TypeScript modules.
- **Folder Organization:** Keep consumer apps under `version-compatibility-tests/` with shared utilities extracted to avoid duplication.
- **Import/Export Patterns:** Prefer named exports from shared utilities; maintain ESM syntax across scripts.

## Infrastructure and Deployment Integration

### Existing Infrastructure

**Current Deployment:** Manual npm publish after local verification.

**Infrastructure Tools:** pnpm, npm registry, GitHub Actions for lint/format, Husky for local pre-push `pnpm check`.

**Environments:** Local developer machines; GitHub-hosted runners for guard rails.

### Enhancement Deployment Strategy

**Deployment Approach:** Keep publish script authoritative; enforce that latest `MATRIX_SUMMARY.md` is fresh before allowing `scripts/prepare-publish.sh` to finish.

**Infrastructure Changes:** Add optional quick-mode matrix job callable in CI (manual trigger) once matrix stabilizes. Document how to cache pnpm store for speed.

**Pipeline Integration:** Update workflows to reference new scripts (e.g., `pnpm compat:matrix`) when manual gate is ready; ensure lint/format remains verify-only.

### Rollback Strategy

**Rollback Method:** Standard npm dist-tag rollback plus revert commits if compatibility regression detected.

**Risk Mitigation:** Require maintainers to review matrix summary diff before publish; keep `xfail.json` curated to highlight unexpected passes.

**Monitoring:** Inspect `version-compatibility-tests/logs/<timestamp>/` and `docs/compatibility-matrix.md` for anomalies; optionally wire future GitHub comment bot to summarize results.

## Coding Standards

### Existing Standards Compliance

- **Code Style:** TypeScript + React with 2-space indent, enforced by Biome.
- **Linting Rules:** `pnpm check` (Biome write mode) and `pnpm check:no-fix` for verification.
- **Testing Patterns:** `tsx --test` for unit tests; compatibility matrix as integration harness.
- **Documentation Style:** Markdown with markdownlint; BMAD docs live in `docs/`.

### Critical Integration Rules

- **Existing API Compatibility:** New exports must be additive; document any refactor in CHANGELOG and README.
- **Database Integration:** N/A.
- **Error Handling:** Scripts should surface actionable errors (e.g., diff detection, pnpm failures) and avoid silent skips.
- **Logging Consistency:** Prefix script logs (`[matrix]`, `[pin]`) to aid troubleshooting; keep summary generator consistent.

## Testing Strategy

### Integration with Existing Tests

- **Existing Test Framework:** Node test runner via `tsx --test` plus compatibility matrix scripts.
- **Test Organization:** Unit tests in `tests/`; matrix artifacts under `version-compatibility-tests/logs/`.
- **Coverage Requirements:** Aim to cover imperative APIs (focus/blur/write) in unit tests; matrix verifies install/build across environments.

### New Testing Requirements

#### Unit Tests for New Components

- **Framework:** tsx Node test runner.
- **Location:** `tests/` (e.g., add coverage for script utilities once converted to TS).
- **Coverage Target:** ≥80% for new utilities; ensure critical parsing/validation paths have assertions.
- **Integration with Existing:** Run alongside existing test suite via `pnpm test`.

#### Integration Tests

- **Scope:** Consumer app smoke tests (JS + TS) ensuring bundle builds and renders XTerm container.
- **Existing System Verification:** Verify library import path and imperative APIs respond within consumer app.
- **New Feature Testing:** Target runtime dimension (Node/Bun) with quick scenarios before full matrix.

#### Regression Testing

- **Existing Feature Verification:** Matrix quick mode must include baseline React 19 + TS 5.4 + Biome combo.
- **Automated Regression Suite:** `pnpm compat:matrix` (full) and `pnpm compat:matrix -- --quick` (planned) tracked in logs.
- **Manual Testing Requirements:** Maintain manual pass for addon/status-bar examples until automated coverage lands.

## Security Integration

### Existing Security Measures

- **Authentication:** Not applicable (library). Rely on npm auth for publishing.
- **Authorization:** GitHub repo permissions govern CI and merges.
- **Data Protection:** No persistent user data; ensure tarballs only contain intended files.
- **Security Tools:** Dependabot/GitHub advisories (implicit), Biome catching obvious issues.

### Enhancement Security Requirements

- **New Security Measures:** Harden path validation in scripts with `realpath` to avoid traversal; ensure tarball selection uses deterministic ordering.
- **Integration Points:** Consumer workspace cleanup, verifying adhesives before install.
- **Compliance Requirements:** OSS MIT license; no additional compliance obligations.

### Security Testing

- **Existing Security Tests:** None automated beyond linting.
- **New Security Test Requirements:** Add script unit tests covering path guardrails and tarball selection tie-breakers.
- **Penetration Testing:** Not applicable.

## Checklist Results Report

**Architect Checklist Summary:**

- Requirements alignment: Functional and non-functional needs from `docs/prd.md` are addressed via dual consumer strategy, release gating, and runtime coverage; no unmet requirements identified.
- Architecture fundamentals: Components and interactions documented (Section “Component Architecture” + Mermaid). Separation of tooling vs library remains clean; upcoming shared utilities reduce duplication risk.
- Technical stack & decisions: All technologies already in repo; plan confirms specific versions (React 18.3.1/19.1.1, TS 5.2/5.4/5.9, Biome 2.2.4). No new frameworks introduced.
- Frontend/backend/data considerations: Library-focused; no backend/data layers to adjust. Frontend consumer apps remain lightweight Vite projects.
- Risks noted: Matrix runtime length, need to migrate scripts to TypeScript for stronger safety, future CI strategy once matrix stabilizes.

## Next Steps

### Story Manager Handoff

Create stories for Epic 1 & 5 first:

- Reference this architecture (docs/architecture.md) and PRD epics.
- Emphasize shared scripting updates (TypeScript conversion, runtime dimension) and documentation touchpoints.
- Highlight constraints: manual matrix runs today, ESM packaging guardrails, path hardening for scripts.
- First story: “Introduce JS consumer app and extend matrix runner flags for consumer selection,” including acceptance criteria for quick-mode subset.

### Developer Handoff

For implementing teams:

- Work from this architecture alongside coding standards (Biome, TypeScript strictness) and compatibility guide.
- Begin with extracting shared utilities, adding JS consumer, and converting scripts to `.mts` with type coverage.
- Verify each change via `pnpm build`, `pnpm check`, targeted `pnpm compat:matrix -- --quick`, and documentation updates (README/docs index).
- Sequence work to keep library stable: update docs + scripts first, add consumer, then broaden runtime coverage, ending with release gating automation.
