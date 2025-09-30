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

---

## Branch and Commit Plan

Note: If a topic is too large for one commit, split it into as many small, atomic commits as needed. Keep each commit to a single logical change.

Conventions
- Branch: `<type>/<scope>-<short-desc>` (kebab-case)
- Commit: `<type>(scope): short imperative description` (≤72 chars)
- Types: feat, fix, refactor, perf, style, test, docs, build, ci, chore

Recommended roadmap branch
- docs/roadmap-1.2-hardening (rename from `improvement-plan` after review)

Planned topic branches and example commits
- fix/react-ref-type-elementref
  - fix(types): make elementRef ref compatible with React 19
- docs/public-api-xterm-props
  - docs(types): export XTermProps and re-export from index
- feat/xterm-dynamic-prop-updates
  - feat(xterm): handle addon/handler/option changes in componentDidUpdate
- build/release-use-pnpm-and-stage-changelog
  - build(release): switch to pnpm version/publish in release script
  - build(release): stage CHANGELOG.md and run biome/check in releases
- chore/devhooks-pre-push-fix
  - chore(devhooks): use pnpm lint and format in pre-push
- chore/lockfile-single-pnpm
  - chore(repo): standardize on pnpm-lock.yaml and drop package-lock.json
- build/pkg-exports-esm
  - build(pkg): declare "type": "module" and add exports map
- ci/lint-format-diff-artifact
  - ci(format): upload diff artifact when auto-fixes are applied
- docs/readme-install-scope
  - docs(readme): correct install command to @pablo-lion/xterm-react
- docs/release-notes-align
  - docs(release): align VERSION.md with CHANGELOG.md entries
- test/xterm-rtl-smoke
  - test(xterm): add RTL mount and imperative API smoke tests
Decision: CI guard-only vs local auto-fix

- CI (GitHub Actions) is a guard: check-only with `pnpm lint:no-fix --max-warnings=0`, `pnpm exec prettier --check .`, and `pnpm biome:check`. CI must not mutate files.
- Local dev hooks (pre-push) run auto-fix: `pnpm lint` and `pnpm format`, then fail the push if diffs remain. This keeps PRs clean and enforces running our tools locally.
