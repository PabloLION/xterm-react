# Compatibility Matrix History

| Date (UTC)           | PASS | FAIL | React            | TypeScript            | Biome                 |
| -------------------- | ---: | ---: | ---------------- | --------------------- | --------------------- |
| 2025-10-01T11:04:39Z |  108 |    0 | `18.3.1, 19.1.1` | `5.2.2, 5.4.5, 5.9.3` | `2.0.0, 2.1.1, 2.2.4` |

## Notes

- Runs summarize the curated matrix at the time of execution. Totals reflect build outcomes (checks may warn separately).
- To reproduce a full run locally, use filters with compat:matrix, for example:
  - Flags (long): `--react 18.3.1,19.1.1 --typescript 5.2.2,5.4.5,5.9.3 --biome 2.0.0,2.1.1,2.2.4`
  - Flags (short): `-r 18.3.1,19.1.1 -t 5.2.2,5.4.5,5.9.3 -b 2.0.0,2.1.1,2.2.4`
  - Command: `pnpm run compat:matrix -- [flags]`
