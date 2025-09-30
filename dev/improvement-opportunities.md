# Improvement Opportunities (temporary notes)

## Fix Build and Type Issues

- Update `elementRef` typing in `src/XTerm.tsx` so `tsc` accepts `ref={elementRef}`.
- Export `XTermProps` (and optional ref helpers) to improve consumer TypeScript support.
- Add prop-change handling (e.g., `componentDidUpdate`) to detach/re-register addons and event handlers when props change.

## Tooling & Release Process

- Update `scripts/prepare-publish.sh` to use pnpm (`pnpm version`, `pnpm publish`), stage `CHANGELOG.md`, and run `pnpm biome:check`/`pnpm test:versions`.
- Fix `dev/git-hooks/pre-push` to call existing scripts (`pnpm lint`, `pnpm format`) or reintroduce a lint-staged config; remove the missing `lint:fix` script reference.
- Decide on a single lockfile—currently both `package-lock.json` and `pnpm-lock.yaml` are committed.
- Declare the package format explicitly (e.g., add `"type": "module"` and an `exports` map) so Node consumers resolve the published dist correctly.

## CI & Automation

- Enhance `.github/workflows/lint-and-format.yml` to surface auto-fix diffs (artifact or check-first strategy) rather than silently fixing and failing.
- Schedule or gate a workflow that runs the version compatibility suites under `version-compatibility-tests/`.

## Docs & Testing

- Correct README install command to `npm install @pablo-lion/xterm-react` and clean up lingering TODOs.
- Align `VERSION.md` and `CHANGELOG.md` so release notes stay consistent.
- Add a small React Testing Library suite that mounts `XTerm` and exercises the imperative API to prevent regressions.
