# Repository Guidelines

## Project Structure & Module Organization

Source resides in `src/` with `XTerm.tsx` implementing the React wrapper and `index.ts` exporting the public API. Built artifacts are emitted to `dist/` by TypeScript; never edit them directly. Example playgrounds and manual demos live under `dev/`. End-to-end scaffolding is grouped in `e2e/` and `e2e-build/`. Compatibility harnesses that exercise multiple React, ESLint, and Biome versions are nested in `version-compatibility-tests/`. Shared configs (`vite.config.mjs`, `eslint.config.mjs`, `biome.json`) sit at the repository root.

## Build, Test, and Development Commands

Use `pnpm install` to sync dependencies (lockfiles for npm and pnpm exist, but pnpm is the primary workflow). Run `pnpm dev` for the Vite-powered example playground. Create production bundles with `pnpm build`, which clears `dist/` and transpiles TypeScript. Lint with `pnpm lint` (auto-fixes) or `pnpm lint:no-fix` to review findings. `pnpm biome:check` mirrors CI validation, while `pnpm biome:fix` and `pnpm format` apply project-wide formatting. Version compatibility suites run via `pnpm test:versions` or the narrower `test:react`, `test:eslint`, and `test:biome` scripts.

## Coding Style & Naming Conventions

Write TypeScript with React 19 patterns and functional components. Favor explicit return types in public APIs. Prettier (via `prettier --write .`) and Biome enforce two-space indentation, trailing commas in ES5 contexts, and double-quoted strings. ESLint rules extend `@typescript-eslint` defaults; resolve warnings before submitting. Name components with PascalCase (`XTerm`), hooks with `use*`, and exported helpers with camelCase.

## Testing Guidelines

The library relies on the compatibility suites rather than unit tests; keep them green before publishing. When adding coverage, colocate new tests beside their subject under `version-compatibility-tests/**` and name files `*.test.ts`. Verify interactive behavior manually in `pnpm dev` and document noteworthy scenarios in PR descriptions.

## Commit & Pull Request Guidelines

Prefer imperative, present-tense commit messages (`fix: align cursor events`) and keep subjects under 72 characters. The history mixes Conventional-style `chore(deps)` entries with descriptive fixes—match whichever best fits your change, but be consistent within a PR. For pull requests, include: scope summary, linked issues, screenshots or terminal logs for UI/build changes, and a checklist of commands executed (lint, build, compatibility tests). Draft releases should note any breaking API changes in `docs.md` or `VERSION.md` as part of the review.

## Security & Configuration Notes

Avoid checking credentials or production emulator configs into `dev/`. The published package exports only what `src/index.ts` exposes, so confirm new modules are re-exported intentionally. When adjusting Vite or TypeScript settings, ensure compatibility scripts continue to target the documented React versions.
