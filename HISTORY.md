# Compatibility Matrix History

| Date (UTC)           | PASS | FAIL | React            | TypeScript            | Linting                                 |
| -------------------- | ---: | ---: | ---------------- | --------------------- | ---------------------------------------- |
| 2025-10-01T11:04:39Z |  108 |    0 | `18.3.1, 19.1.1` | `5.2.2, 5.4.5, 5.9.3` | `biome: 2.0.0, 2.1.1, 2.2.4`            |

## Notes

- Runs summarize the curated matrix at the time of execution. Totals reflect build outcomes (checks may warn separately).
- To reproduce a full run locally, use filters with compat:matrix, for example:
  - Biome focus: `pnpm run compat:matrix -- --linter biome -r 18.3.1,19.1.1 -t 5.2.2,5.4.5,5.9.3 -b 2.0.0,2.1.1,2.2.4`
  - ESLint + Prettier focus: `pnpm run compat:matrix -- --linter eslint-prettier -r 18.3.1,19.1.1 -t 5.4.5,5.9.3 --eslint 9.13.0 --prettier 3.6.2`
  - Full matrix: omit `--linter` to include both families.
