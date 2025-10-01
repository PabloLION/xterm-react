# Backlog

## CI: Track and update to latest versions for consumer tests
- Goal: Add a CI workflow that periodically checks npm “latest” versions for key dependencies (React, ReactDOM, TypeScript, ESLint/@typescript-eslint, Prettier, Biome, Vite/@vitejs/plugin-react).
- Trigger: Scheduled (e.g., daily/weekly) and manual dispatch.
- Action:
  - Resolve current latest versions (npm view <pkg> version).
  - If any differ from the last recorded set, open a PR that updates the consumer test pins via our pin script (or updates a versions manifest) and runs the matrix on a curated subset to validate.
  - Attach MATRIX_SUMMARY.json as artifact and summarize headline outcomes in the PR body.
- Non‑goals (initially): Do not fail the main branch on external ecosystem changes; changes should flow through reviewable PRs.
- Notes:
  - Keep exact pins for reproducibility.
  - Optionally maintain a versions.json manifest committed to the repo to diff against.
  - Ensure the workflow does not publish; it only updates test pins and artifacts.

