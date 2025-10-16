# Compatibility Matrix

This document captures historical snapshots of the full compatibility matrix. The curated matrix exercises React × TypeScript × linting combinations across the supported runtime lane(s). When we publish a new snapshot, we append details to the table at the bottom of this file rather than rewriting earlier entries.

## How to Record a Snapshot

1. Run the full matrix (optionally with filters):
   - Full run: `pnpm run compat:matrix`
   - Biome only: `pnpm run compat:matrix -- --linter biome`
   - ESLint + Prettier only: `pnpm run compat:matrix -- --linter eslint-prettier`
2. Append the results: `pnpm run compat:matrix:record`
   - Use `--force` to overwrite the most recent entry for the same timestamp if needed.

## Notes

- Totals reflect build outcomes; individual scenario logs remain under `version-compatibility-tests/logs/<timestamp>/`.
- Curated matrices may change over time as we adjust supported toolchains. Each row lists the versions included in that run.

## Historical Runs

| Date (UTC)           | PASS | FAIL | React            | TypeScript            | Linting                                 |
| -------------------- | ---: | ---: | ---------------- | --------------------- | ---------------------------------------- |
| 2025-10-01T11:04:39Z |  108 |    0 | `18.3.1, 19.1.1` | `5.2.2, 5.4.5, 5.9.3` | `biome: 2.0.0, 2.1.1, 2.2.4`            |
