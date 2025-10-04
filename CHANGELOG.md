# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- `HISTORY.md` to capture compatibility matrix results, plus `scripts/update-history.ts` for automated updates.
- Opt-in parallel execution and short CLI aliases for the compatibility matrix runner.

### Security

- Allowlisted npm package names in the consumer pin/build script to mitigate typosquatting.

### Tooling

- Husky pre-push hook that runs `pnpm check` (Biome auto-apply) before allowing pushes.
- Replaced ESLint/Prettier with Biome for linting and formatting (`pnpm check` / `pnpm check:no-fix`).

## [1.2.0] - 2025-09-30

### Added

- React 19 is now the default peer dependency target; TypeScript 5 builds remain supported.
- Claude-based GitHub review workflows and AGENTS.md contributor guide.
- Version compatibility harness scripts under `version-compatibility-tests/`.

### Changed

- CI lint/format is guard-only (no auto-fix): runs `pnpm check:no-fix`.
- Standardized on `pnpm`; removed `package-lock.json` in favor of `pnpm-lock.yaml`.
- Release helper now uses `pnpm version` / `pnpm publish` and stages `CHANGELOG.md` alongside `VERSION.md`.
- README install instructions updated to `@pablo-lion/xterm-react`.

### Fixed

- Ensured pnpm setup precedes Node cache in CI; resolved missing `pnpm` executable issues.

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
