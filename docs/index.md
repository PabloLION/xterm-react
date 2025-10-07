# XTerm React Documentation Index

## Overview

| Document | Purpose |
| --- | --- |
| [Project Brief](./brief.md) | Executive summary, goals, and background context for the modernization effort. |
| [Product Requirements (PRD)](./prd.md) | Functional/non-functional requirements, epics, and stories guiding the roadmap. |
| [Architecture](./architecture.md) | Brownfield integration plan covering tooling, consumers, runtime coverage, and release visibility. |
| [Compatibility Harness Guide](./compatibility-testing.md) | How to run the matrix, interpret results, and maintain the consumer app tooling. |
| [Backlog](./backlog.md) | Deferred work, follow-up tasks, and future enhancements. |
| [Component Reference](../docs.md) | Current `XTerm` prop table, addon examples, and usage notes (to be migrated into this folder). |

## Getting Started

1. Read the [Project Brief](./brief.md) for context.
2. Review the [PRD](./prd.md) to understand scope and priorities.
3. Follow the [Architecture](./architecture.md) plan before implementing significant changes.
4. Consult the [Compatibility Harness Guide](./compatibility-testing.md) prior to running matrix scripts.
5. Use the [Component Reference](../docs.md) for API details until it is relocated under `docs/`.

## Contribution Checklist (High Level)

- Run `pnpm check` and `pnpm build` before committing changes.
- For compatibility work, prefer `pnpm compat:matrix -- --quick` locally and document full runs in PRs.
- Keep documentation synchronized: update relevant entries in this folder whenever features or scripts change.
- Record matrix summaries via `pnpm compat:matrix:summary` and update HISTORY/release notes as needed.

_This index will expand as additional guides (addons, status bar recipes, runtime coverage) land in future iterations._
