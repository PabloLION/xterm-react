# Changelog

All notable changes to this project will be documented in this file.

## \[1.2.0] - 2025-09-30

### Added

- React 19 compatibility as the default peer dependency target, plus updated TypeScript 5 builds.
- Claude GitHub workflows for automated reviews and `@claude` mentions.
- `AGENTS.md` contributor guidelines and this changelog for easier onboarding.
- pnpm-based lint/format workflow with enforced auto-fix support.

### Changed

- Locked the `@claude` mention workflow to trusted commenters.
- Routed `pnpm publish` through `scripts/prepare-publish.sh` to keep releases reproducible.

### Fixed

- Lint-and-format CI now fails when auto-fixes modify tracked files before verification, preventing unformatted PRs.

## \[1.1.2] - 2024-07-15

### Changed in 1.1.2

- Updated package metadata after an incorrect publish.
- Adjusted demo terminal themes to match the `ITheme` interface.

## \[1.1.0] - 2024-07-13

### Fixed in 1.1.0

- Resolved React strict-mode issues in the component and demo setup.

## \[1.0.2] - 2024-07-08

### Changed in 1.0.2

- Refreshed development configuration for the demo environment.

## \[1.0.1] - 2024-06-07

### Changed in 1.0.1

- Simplified the Vite build script in project metadata.

## \[1.0.0] - 2024-06-06

### Added in 1.0.0

- Initial release of the xterm.js React wrapper component.
