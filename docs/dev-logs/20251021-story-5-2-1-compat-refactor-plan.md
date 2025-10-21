# 20251021 – Story 5.2.1 Compatibility Tooling Refactor Plan

## Objectives

- Break the matrix runner toolchain into focused modules so we can add automated coverage in Story 5.2.2 without reworking core logic again.
- Preserve the current CLI contracts (`pnpm compat:*` scripts, same flags, same logs) while improving readability and maintainability.
- Surface other oversized files so we can log follow-up work or fold them into this refactor if time allows.
- Execute the refactor in two stages: first reorganise the existing ESM JavaScript into smaller files, then migrate those modules to TypeScript with shared type definitions.

## Target layout & ownership

**Stage 1 (ESM JS, post-split)** – keep `.mjs` entry points so existing `node …/script.mjs` calls continue to run while we refactor internals.

```text
version-compatibility-tests/
  lib/
    cli/
      args.mjs              # shared flag parsing + deprecation warnings
      logging.mjs           # prefix/tag formatting, inline log truncation helpers
      run-command.mjs       # exec wrappers (shared buffer limits, error tagging)
    fs/
      paths.mjs             # root/app/dist/log path helpers, pointer writers
      worker-clone.mjs      # prepareWorkerDir, copy/symlink policy, cleanup
    runtime/
      catalog.mjs           # runtime catalogue + validation helpers
      activation.mjs        # pnpm env activation/restore (process-scoped)
    matrix/
      config.mjs            # default version sets & quick mode handling
      scenarios.mjs         # cartesian product builder, slug/label helpers
      executor.mjs          # scenario loop, xfail/xpass detection, summary data
    consumer/
      pin-config.mjs        # allowed package list + validation
      resolve-versions.mjs  # pnpm view wrappers + major matching logic
      apply-pins.mjs        # package.json mutation + lock handling
      build.mjs             # install/build steps for the consumer app
    summary/
      render.mjs            # markdown + json summary formatters
      artifacts.mjs         # HISTORY.md append + badge updates (if any)
  scripts/
    matrix-run-consumer.mjs     # thin CLI: parse args -> call lib/matrix executor
    consumer-pin-and-build.mjs  # thin CLI: args -> consumer helpers
    summarize-matrix.mjs        # thin CLI: delegates to summary helpers
```

**Stage 2 (TypeScript finish line)** – rename the same layout to `.ts` modules, introduce a lean build/`tsx` runner for CLI execution, and centralise types under `version-compatibility-tests/types/`.

## Work plan (atomic-friendly sequencing)

1. **Baseline & guardrails**

   - [x] Capture current behavior: run `pnpm compat:matrix -- --runtime node20 --linter eslint-prettier --react 18.3.1 --typescript 5.2.2 --eslint 8.57.0 --prettier 3.3.3` and stash the generated summary/log names for parity checks.
   - [x] Add TODO markers in existing scripts where functionality will move (e.g., runtime switching, worker preparation, summary writing).

2. **Extract shared utilities**

   - [x] Create `lib/cli/run-command.mjs` and move `execSync`/`exec` wrappers with buffer limits and logging.
   - [x] Create `lib/fs/paths.mjs` for `suiteDir`, `appDir`, `distDir`, log folder creation, pointer writers.
   - [x] Update scripts to import from these helpers; ensure no behavior change (commit: `refactor(shared): extract CLI+FS helpers`).

3. **Module-ise matrix runner**

   - [x] Move runtime catalogue + validation to `runtime/catalog.mjs`; implement process-scoped activation in `runtime/activation.mjs` (no more `pnpm env use --global`).
   - [x] Extract argument parsing + quick mode to `cli/args.mjs`; scenarios/cartesian logic to `matrix/scenarios.mjs`; executor loop (including xfail/xpass) to `matrix/executor.mjs`.
   - [ ] Keep `matrix-run-consumer.ts` lean (target <300 lines) by delegating orchestration to lib helpers; continue breaking out worker and summary coordination in follow-up stories.

4. **Restructure consumer pin & build**

   - [x] Split parsing/validation, version resolution, package mutation, and build execution as per `consumer/` layout.
   - [x] Ensure tarball handling (quoted path) lives in shared helper if reused elsewhere.
  - [x] Maintain help text and CLI contract. Commit: `refactor(consumer): modularize pin-and-build`.

5. **Align summarizer with shared modules**

   - [x] Reuse `fs/paths.mjs` and `summary/render.mjs`; ensure markdown/json outputs unaffected.
   - [x] Prepare hooks so Story 5.2.2 can snapshot summary objects before file IO.

6. **Stage 2 – migrate modules to TypeScript**

   - [x] Add a dedicated `tsconfig.compat.json` covering `version-compatibility-tests/lib/**/*.ts` and CLI entry points; wire `pnpm compat:*` scripts to invoke `tsx` (or `ts-node/tsup`) using that config.
   - [x] Create `version-compatibility-tests/types/` with exported interfaces for scenarios, runtimes, pin instructions, summaries, and CLI options; update Stage 1 helpers to consume these types.
   - [x] Rename Stage 1 `.mjs` helpers to `.ts` (no `.mts` – compiler emits ESM via `module: "NodeNext"`); fix relative import paths and ensure build output remains ESM.
   - [x] Convert the CLI shims in `scripts/` to `.ts` thin wrappers, adjusting shebang execution via `node --loader tsx` or compiled artifacts.
   - [x] Update linting (Biome/ESLint), formatting, and test configuration to include the new TypeScript sources and add a `pnpm compat:typecheck` command that runs `tsc --noEmit` against the compat tsconfig.

7. **Repository-wide follow-ups**

   - [ ] Flag additional large files for future work:
     - `src/XTerm.tsx` (~600 lines total / ~200 executable): predominantly inline documentation; keep whole-file type visibility, no split planned.
     - `scripts/update-history.ts` (~240 lines): consider `scripts/history/` folder with shared helpers.
   - [ ] Update `docs/backlog.md` with these targets if not already present.

8. **Regression checks**
   - [x] Re-run representative matrix scenarios post-refactor (latest + oldest lanes) and compare summaries.
   - [x] Ensure CI scripts (`pnpm compat:*`) only require updated entrypoints (no path churn).

## Testing hooks for Story 5.2.2

- Export pure functions from each new module (e.g., `buildScenarioMatrix`, `applyPins`, `activateRuntime`) so tests can import without invoking CLI side effects.
- Provide fixtures for sample scenario definitions under `tests/fixtures/compat/` to keep future tests deterministic.
- Keep logging + file-system helpers parameterizable (accept injected `fs`/`exec` shims) to enable unit testing without hitting the real environment.

## Risks & mitigations

- **Behavior drift**: Mitigate by running narrow matrix smoke after each major extraction and diffing `MATRIX_SUMMARY.json`.
- **Import cycles**: Avoid by keeping modules layered (`cli`/`runtime`/`matrix` only depend on lower-level helpers).
- **Timeline creep**: If breaking down reveals unexpected complexity, pause and log follow-up in backlog rather than landing partial rewrites.
