# 20251018 – Fix Vite build asset path during matrix runs

## Objective

Ensure compatibility matrix scenarios can build the consumer app under isolated worker directories without Rollup complaining about absolute asset paths.

## Plan (atomic steps)

1. **worker-clone:update-file-handling**  
   Adjust `prepareWorkerDir` in `matrix-run-consumer.ts` so key project files/directories (e.g., `index.html`, `src`, `tsconfig.json`, `vite.config.ts`, `eslint.config.mjs`) are copied instead of symlinked. This deliberately favors copies despite the earlier symlink optimization (see reviewer note) because ESLint 8 rejects glob patterns that traverse symlinked `src/` trees. The copy keeps the worker app self-contained and avoids absolute paths when Vite emits assets.

2. **worker-clone:verify-matrix**  
   Run the targeted scenario locally:  
   `pnpm compat:matrix -- --runtime node20 --linter eslint-prettier --react 18.3.1 --typescript 5.2.2 --eslint 8.57.0 --prettier 3.3.3`  
   Confirm build succeeds (matrix reports PASS). If failures persist, capture the new logs and iterate, but keep each adjustment to its own commit.

3. **docs:log-known-issue-status (optional if PASS)**  
   Update the dev log/backlog to reflect whether the Vite asset issue is resolved or note any remaining edge cases.

## Outcome

- 2025-10-20: Confirmed the worker clone copies `index.html`, `src/`, `tsconfig.json`, `vite.config.ts`, and `eslint.config.mjs` so ESLint/Vite operate inside worker directories without symlink issues.
- 2025-10-20: `pnpm compat:matrix -- --runtime node20 --linter eslint-prettier --react 18.3.1 --typescript 5.2.2 --eslint 8.57.0 --prettier 3.3.3` now passes locally; build artifacts emit relative asset paths.
- Backlog entry “Runtime Coverage – Investigate Vite asset emission regression” remains marked resolved; no additional follow-up required.
