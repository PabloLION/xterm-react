#!/usr/bin/env node
// NOTE: This script remains an ESM entrypoint executed via `tsx` inside CI runners.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type EslintProfile,
  filterAllowed,
  filterEslintProfiles,
  parseListArg,
  warnDeprecated,
} from "../lib/cli/args.js";
import {
  type CommandResult,
  runCommand,
  runCommandAsync,
} from "../lib/cli/run-command.js";
import {
  appDir,
  createLogsRoot,
  distDir,
  ensureWorkDir,
  type LatestSummaryPointer,
  logsPath,
  rootDir,
  suiteDir,
  writeLatestSummaryPointer,
} from "../lib/fs/paths.js";
import { buildScenarios, scenarioSlug } from "../lib/matrix/scenarios.js";
import {
  matchesXfail,
  validateXfailEntry,
  type XfailEntry,
} from "../lib/matrix/xfail.js";
import { createRuntimeController } from "../lib/runtime/activation.js";
import {
  DEFAULT_RUNTIME_IDS,
  findRuntime,
  resolveRuntimes,
  runtimeCatalog,
  runtimeIds,
} from "../lib/runtime/catalog.js";
import type {
  LinterFamily,
  RuntimeDescriptor,
  ScenarioDefinition,
  ScenarioResult,
  ScenarioResultOutcome,
} from "../types/compat.js";

const LOG_PREFIX = "[matrix]";
const MAX_INLINE_LOG_LINES = 1000;
const root = rootDir;
const logsRoot = createLogsRoot();
const argv = process.argv.slice(2);
const originalPnpmHome = process.env.PNPM_HOME;
const originalPath = process.env.PATH || "";
let runtimePnpmHome: string | null = null;
try {
  const tmpPrefix = path.join(os.tmpdir(), "xterm-react-pnpm-");
  runtimePnpmHome = fs.mkdtempSync(tmpPrefix);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `${LOG_PREFIX} Failed to allocate temp PNPM home: ${message}. Falling back to local cache.`,
  );
  runtimePnpmHome = path.join(suiteDir, ".pnpm-runtime");
  fs.mkdirSync(runtimePnpmHome, { recursive: true });
}
if (!runtimePnpmHome) {
  throw new Error(`${LOG_PREFIX} Unable to configure temporary PNPM home`);
}
if (!originalPath.split(path.delimiter).includes(runtimePnpmHome)) {
  process.env.PATH =
    runtimePnpmHome + (originalPath ? `${path.delimiter}${originalPath}` : "");
}
process.env.PNPM_HOME = runtimePnpmHome;
const RUNTIME_CATALOG = runtimeCatalog();
const RUNTIME_IDS = new Set<string>(runtimeIds());
const xfailPath = path.join(suiteDir, "xfail.json");
const XFAIL: XfailEntry[] = (() => {
  if (!fs.existsSync(xfailPath)) return [];
  const raw = JSON.parse(fs.readFileSync(xfailPath, "utf8")) as unknown[];
  if (!Array.isArray(raw)) {
    throw new Error(
      `${LOG_PREFIX} xfail.json must contain an array of entries`,
    );
  }
  return raw.map((entry, index) => {
    try {
      validateXfailEntry(entry as XfailEntry, RUNTIME_IDS);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${LOG_PREFIX} Invalid xfail entry at index ${index}: ${message}`,
      );
    }
    return entry as XfailEntry;
  });
})();

interface ScenarioCounts {
  total: number;
  pass: number;
  fail: number;
  xfail: number;
  xpass: number;
}

const DEFAULT_REACTS: string[] = ["18.3.1", "19.1.1"];
const DEFAULT_TYPESCRIPT: string[] = ["5.2.2", "5.4.5", "5.9.3"];
const DEFAULT_BIOMES: string[] = ["2.0.0", "2.1.1", "2.2.4"];
const DEFAULT_ESLINTS: EslintProfile[] = [
  { eslint: "8.57.0", eslintJs: "8.57.0", tsParser: "8.45.0" },
  { eslint: "9.13.0", eslintJs: "9.13.0", tsParser: "8.45.0" },
];
const DEFAULT_PRETTIERS: string[] = ["3.3.3", "3.6.2"];

let REACTS: string[] = [...DEFAULT_REACTS];
let TYPESCRIPT_VERSIONS: string[] = [...DEFAULT_TYPESCRIPT];
let BIOME_VERSIONS: string[] = [...DEFAULT_BIOMES];
let ESLINT_VERSIONS: EslintProfile[] = [...DEFAULT_ESLINTS];
let PRETTIER_VERSIONS: string[] = [...DEFAULT_PRETTIERS];
let LINTER_FAMILIES: Set<LinterFamily> = new Set<LinterFamily>([
  "biome",
  "eslint-prettier",
]);
let RUNTIMES: RuntimeDescriptor[] = resolveRuntimes(DEFAULT_RUNTIME_IDS);

const { ensureRuntime, restoreRuntime } = createRuntimeController({
  rootDir: root,
  logsRoot,
  logPrefix: LOG_PREFIX,
});

const quick = process.env.QUICK === "1" || process.argv.includes("--quick");
if (quick) {
  REACTS = [REACTS[REACTS.length - 1]];
  TYPESCRIPT_VERSIONS = [TYPESCRIPT_VERSIONS[TYPESCRIPT_VERSIONS.length - 1]];
  BIOME_VERSIONS = [BIOME_VERSIONS[BIOME_VERSIONS.length - 1]];
  ESLINT_VERSIONS = [ESLINT_VERSIONS[ESLINT_VERSIONS.length - 1]];
  PRETTIER_VERSIONS = [PRETTIER_VERSIONS[PRETTIER_VERSIONS.length - 1]];
}

const reactArg = parseListArg(argv, ["--react", "-r"]);
const tsArg = parseListArg(argv, ["--typescript", "-t"]);
const biomeArg = parseListArg(argv, ["--biome", "-b"]);
const eslintArg = parseListArg(argv, ["--eslint"]);
const prettierArg = parseListArg(argv, ["--prettier"]);
const linterFamilyArg = parseListArg(argv, ["--linter", "-l"]);
const runtimeArg = parseListArg(argv, ["--runtime"]);

if (reactArg) REACTS = filterAllowed(LOG_PREFIX, "react", REACTS, reactArg);
if (tsArg)
  TYPESCRIPT_VERSIONS = filterAllowed(
    LOG_PREFIX,
    "typescript",
    TYPESCRIPT_VERSIONS,
    tsArg,
  );
if (biomeArg)
  BIOME_VERSIONS = filterAllowed(LOG_PREFIX, "biome", BIOME_VERSIONS, biomeArg);
if (eslintArg)
  ESLINT_VERSIONS = filterEslintProfiles(
    LOG_PREFIX,
    eslintArg,
    ESLINT_VERSIONS,
  );
if (prettierArg)
  PRETTIER_VERSIONS = filterAllowed(
    LOG_PREFIX,
    "prettier",
    PRETTIER_VERSIONS,
    prettierArg,
  );
if (linterFamilyArg) {
  const allowedValues: LinterFamily[] = ["biome", "eslint-prettier"];
  const allowed = new Set<LinterFamily>(allowedValues);
  const next = new Set<LinterFamily>();
  for (const entry of linterFamilyArg) {
    const entryValue = entry as LinterFamily;
    if (allowed.has(entryValue)) next.add(entryValue);
    else
      console.warn(
        `${LOG_PREFIX} Ignoring unsupported linter family: ${entry}`,
      );
  }
  if (next.size) LINTER_FAMILIES = next;
}

if (runtimeArg) {
  let requested = runtimeArg;
  if (runtimeArg.includes("all")) {
    requested = RUNTIME_CATALOG.map((runtime) => runtime.id);
  }
  const filtered: RuntimeDescriptor[] = [];
  const seen = new Set<string>();
  for (const id of requested) {
    if (id === "all" || seen.has(id)) continue;
    const runtime = findRuntime(id);
    if (!runtime) {
      console.warn(`${LOG_PREFIX} Ignoring unsupported runtime: ${id}`);
      continue;
    }
    filtered.push(runtime);
    seen.add(id);
  }
  if (filtered.length) {
    RUNTIMES = filtered;
  } else {
    console.warn(
      `${LOG_PREFIX} Falling back to default runtime set (${DEFAULT_RUNTIME_IDS.join(", ")})`,
    );
    RUNTIMES = resolveRuntimes(DEFAULT_RUNTIME_IDS);
  }
}

warnDeprecated(argv, LOG_PREFIX, "reacts", "react");
warnDeprecated(argv, LOG_PREFIX, "types", "typescript");

function shellQuote(value: string): string {
  if (!value || /^[A-Za-z0-9_.\-/]+$/.test(value)) return value;
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function readLogTail(
  logFile: string | undefined,
  label: string,
  maxLines: number = MAX_INLINE_LOG_LINES,
): void {
  if (!logFile) return;
  try {
    const content = fs.readFileSync(logFile, "utf8");
    const lines = content.split(/\r?\n/);
    const tail = lines.slice(-maxLines).join("\n");
    console.log(`${LOG_PREFIX} ----- ${label} (tail) -----`);
    console.log(tail);
    console.log(`${LOG_PREFIX} ----- end ${label} -----`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Failed to read ${label} log: ${message}`);
  }
}

function sh(cmd: string, cwd: string, logFile?: string): CommandResult {
  return runCommand(cmd, { cwd, logFile });
}

function shAsync(
  cmd: string,
  cwd: string,
  logFile: string | undefined,
  label: string,
): Promise<CommandResult> {
  return runCommandAsync(cmd, {
    cwd,
    logFile,
    onFailure: () => {
      if (logFile && label) {
        readLogTail(logFile, label);
      }
    },
  }).then((result) => ({
    ok: result.ok,
    out: result.out,
    error: result.error,
  }));
}

/**
 * Run a single test scenario
 * @param {Object} scenario - Test scenario configuration
 * @param {string} scenario.react - React version
 * @param {string} scenario.typescript - TypeScript version
 * @param {Object} scenario.linter - Linter configuration
 * @param {string} tarballName - Name of the tarball file to install
 * @param {string} appDirForRun - Consumer app directory for this scenario
 * @returns {Promise<Object>} Scenario result with outcome and version info
 */
async function runScenario(
  scenario: ScenarioDefinition,
  tarballName: string,
  appDirForRun: string,
): Promise<ScenarioResult> {
  const { runtime, react, typescript, linter } = scenario;
  const scenarioId = scenarioSlug(scenario);
  const dir = path.join(logsRoot, scenarioId);
  fs.mkdirSync(dir, { recursive: true });

  const tarballPath = path.isAbsolute(tarballName)
    ? tarballName
    : path.join("version-compatibility-tests", "dist", tarballName);
  const tarballArg = shellQuote(tarballPath);

  const args = [
    `--react ${react}`,
    `--react-dom ${react}`,
    `--typescript ${typescript}`,
    `--tarball ${tarballArg}`,
    `--app-dir ${path.relative(root, appDirForRun)}`,
  ];

  if (linter.tool === "biome") {
    args.push(`--biome ${linter.version}`);
  } else {
    args.push(`--eslint ${linter.eslint}`);
    args.push(`--eslint-js ${linter.eslintJs}`);
    args.push(`--ts-eslint-parser ${linter.tsParser}`);
    args.push(`--prettier ${linter.prettier}`);
  }

  const pinCmd = `tsx version-compatibility-tests/scripts/consumer-pin-and-build.ts ${args.join(" ")}`;
  const pinLog = path.join(dir, "pin-and-build.log");
  const pinRes = await shAsync(
    pinCmd,
    root,
    pinLog,
    `${scenarioId} pin-and-build`,
  );

  const buildLog = path.join(dir, "build.log");
  const buildRes = await shAsync(
    "pnpm exec vite build",
    appDirForRun,
    buildLog,
    `${scenarioId} vite-build`,
  );

  const lintSteps: Record<string, CommandResult> = {};
  if (linter.tool === "biome") {
    lintSteps.biome = await shAsync(
      "pnpm exec biome check src",
      appDirForRun,
      path.join(dir, "biome.log"),
      `${scenarioId} biome`,
    );
  } else {
    lintSteps.eslint = await shAsync(
      'pnpm exec eslint --config eslint.config.mjs "src/**/*.{ts,tsx,js,jsx}"',
      appDirForRun,
      path.join(dir, "eslint.log"),
      `${scenarioId} eslint`,
    );
    lintSteps.prettier = await shAsync(
      'pnpm exec prettier --config .prettierrc.json --check "src/**/*.{ts,tsx,js,jsx}"',
      appDirForRun,
      path.join(dir, "prettier.log"),
      `${scenarioId} prettier`,
    );
  }

  const steps: Record<string, boolean> = {
    pin_and_build: pinRes.ok,
    build: buildRes.ok,
  };
  for (const [key, value] of Object.entries(lintSteps)) {
    steps[key] = value.ok;
  }

  const allStepsSucceeded = Object.values(steps).every(Boolean);
  const expectedFail = XFAIL.some((entry) => matchesXfail(entry, scenario));
  const outcome: ScenarioResultOutcome = expectedFail
    ? allStepsSucceeded
      ? "XPASS"
      : "XFAIL"
    : allStepsSucceeded
      ? "PASS"
      : "FAIL";

  const summary: ScenarioResult = {
    scenario: scenarioId,
    versions: {
      runtime: {
        id: runtime.id,
        tool: runtime.tool,
        version: runtime.versionSpec,
      },
      react,
      typescript,
      linter:
        linter.tool === "biome"
          ? { tool: "biome", version: linter.version }
          : {
              tool: "eslint-prettier",
              eslint: linter.eslint,
              prettier: linter.prettier,
              eslintJs: linter.eslintJs,
              tsParser: linter.tsParser,
            },
    },
    steps,
    expected_fail: expectedFail,
    outcome,
    logs: dir,
  };

  fs.writeFileSync(
    path.join(dir, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(`${LOG_PREFIX} ${scenarioId}:`, steps);
  return summary;
}

function parseParallel(): number {
  const idx = process.argv.indexOf("--parallel");
  let value =
    idx !== -1
      ? parseInt(process.argv[idx + 1] ?? "1", 10)
      : parseInt(process.env.PARALLEL ?? "1", 10);
  if (!Number.isFinite(value) || value < 1) value = 1;
  value = Math.min(value, MAX_PARALLEL_WORKERS);
  return value;
}

const MAX_PARALLEL_WORKERS = 8;

const WORKER_ALWAYS_COPY = new Set<string>([
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "eslint.config.mjs",
  "src",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
]);
const WORKER_SKIP = new Set<string>(["node_modules", "dist"]);

function symlinkOrCopy(
  source: string,
  target: string,
  isDirectory: boolean,
): void {
  try {
    fs.symlinkSync(source, target, isDirectory ? "dir" : "file");
  } catch {
    if (isDirectory) {
      fs.cpSync(source, target, { recursive: true });
    } else {
      fs.copyFileSync(source, target);
    }
  }
}

function prepareWorkerDir(workRoot: string, i: number): string {
  const workerDir = path.join(workRoot, `w-${i}`, "consumer-app");
  fs.rmSync(path.dirname(workerDir), { recursive: true, force: true });
  fs.mkdirSync(workerDir, { recursive: true });

  const entries = fs.readdirSync(appDir, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name;
    if (WORKER_SKIP.has(name)) continue;
    const sourcePath = path.join(appDir, name);
    const targetPath = path.join(workerDir, name);

    if (entry.isSymbolicLink()) {
      let resolvedTarget: string | null = null;
      let targetStat: fs.Stats | null = null;
      try {
        const linkTarget = fs.readlinkSync(sourcePath);
        resolvedTarget = path.isAbsolute(linkTarget)
          ? linkTarget
          : path.resolve(path.dirname(sourcePath), linkTarget);
        targetStat = fs.statSync(resolvedTarget);
        symlinkOrCopy(resolvedTarget, targetPath, targetStat.isDirectory());
      } catch (error) {
        if (!resolvedTarget || !targetStat) {
          try {
            resolvedTarget = fs.realpathSync(sourcePath);
            targetStat = fs.statSync(resolvedTarget);
          } catch (innerError) {
            const innerMessage =
              innerError instanceof Error
                ? innerError.message
                : String(innerError);
            console.warn(
              `${LOG_PREFIX} Failed to resolve symlink ${sourcePath}: ${innerMessage}`,
            );
          }
        }
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `${LOG_PREFIX} Failed to recreate symlink ${sourcePath}: ${message}. Falling back to copy.`,
        );
        const fallbackSource = resolvedTarget || sourcePath;
        let fallbackStat: fs.Stats | null = targetStat;
        if (!fallbackStat) {
          try {
            fallbackStat = fs.statSync(fallbackSource);
          } catch (statError) {
            const statMessage =
              statError instanceof Error
                ? statError.message
                : String(statError);
            console.warn(
              `${LOG_PREFIX} Failed to stat fallback source ${fallbackSource}: ${statMessage}`,
            );
          }
        }
        if (fallbackStat?.isDirectory()) {
          fs.cpSync(fallbackSource, targetPath, {
            recursive: true,
            dereference: true,
          });
        } else {
          fs.copyFileSync(fallbackSource, targetPath);
        }
      }
      continue;
    }

    if (WORKER_ALWAYS_COPY.has(name)) {
      if (entry.isDirectory()) {
        fs.cpSync(sourcePath, targetPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
      continue;
    }

    if (entry.isDirectory()) {
      symlinkOrCopy(sourcePath, targetPath, true);
    } else if (entry.isFile()) {
      symlinkOrCopy(sourcePath, targetPath, false);
    }
  }
  return workerDir;
}

async function main(): Promise<void> {
  let summaryPath = "";
  let counts: ScenarioCounts | null = null;
  let hasBlockingOutcome = false;
  try {
    // Safety check: ensure distDir is exactly the expected directory
    const expectedDistDir = path.join(suiteDir, "dist");
    const resolvedDistDir = path.resolve(distDir);
    const resolvedExpectedDistDir = path.resolve(expectedDistDir);
    if (resolvedDistDir !== resolvedExpectedDistDir) {
      throw new Error(
        `${LOG_PREFIX} Refusing to delete unexpected distDir: ${distDir}`,
      );
    }
    if (resolvedDistDir === root || resolvedDistDir === suiteDir) {
      throw new Error(
        `${LOG_PREFIX} Refusing to delete root or suiteDir: ${distDir}`,
      );
    }
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });

    const buildLog = path.join(logsRoot, "package-build.log");
    const buildRes = sh("pnpm build", root, buildLog);
    if (!buildRes.ok) {
      throw new Error(`${LOG_PREFIX} pnpm build failed (see ${buildLog})`);
    }

    const packLog = path.join(logsRoot, "pack.log");
    const packRes = sh(
      "pnpm pack --pack-destination version-compatibility-tests/dist",
      root,
      packLog,
    );
    if (!packRes.ok) {
      throw new Error(`${LOG_PREFIX} pnpm pack failed (see ${packLog})`);
    }
    const packOutputLines = packRes.out.trim().split(/\r?\n/).filter(Boolean);
    let tgzPath: string | null = packOutputLines.at(-1) ?? null;
    if (tgzPath && !tgzPath.endsWith(".tgz")) tgzPath = null;
    if (tgzPath && !path.isAbsolute(tgzPath)) {
      tgzPath = path.resolve(root, tgzPath);
    }
    if (!tgzPath || !fs.existsSync(tgzPath)) {
      const tarballs = fs
        .readdirSync(distDir)
        .filter((f) => f.endsWith(".tgz"));
      if (tarballs.length === 1) {
        tgzPath = path.join(distDir, tarballs[0]);
      } else {
        const reason = tarballs.length
          ? `multiple candidates: ${tarballs.join(", ")}`
          : "no tarballs were produced";
        throw new Error(
          `${LOG_PREFIX} Could not determine packed tarball path (${reason}). Clean version-compatibility-tests/dist and retry.`,
        );
      }
    }
    const tgz = tgzPath!;

    const scenarios = buildScenarios({
      runtimes: RUNTIMES,
      reacts: REACTS,
      typescriptVersions: TYPESCRIPT_VERSIONS,
      linterFamilies: LINTER_FAMILIES,
      biomeVersions: BIOME_VERSIONS,
      eslintProfiles: ESLINT_VERSIONS,
      prettierVersions: PRETTIER_VERSIONS,
    });
    const scenariosByRuntime = new Map<string, ScenarioDefinition[]>();
    for (const scenario of scenarios) {
      const list = scenariosByRuntime.get(scenario.runtime.id) || [];
      list.push(scenario);
      scenariosByRuntime.set(scenario.runtime.id, list);
    }

    const requestedParallel = parseParallel();
    const results: ScenarioResult[] = [];

    for (const runtime of RUNTIMES) {
      const runtimeBatch = scenariosByRuntime.get(runtime.id);
      if (!runtimeBatch || !runtimeBatch.length) continue;

      if (!ensureRuntime(runtime)) {
        console.warn(
          `${LOG_PREFIX} Skipping scenarios for runtime ${runtime.label}`,
        );
        continue;
      }

      const parallel = Math.min(requestedParallel, runtimeBatch.length);
      console.log(
        `${LOG_PREFIX} Runtime ${runtime.label}: ${runtimeBatch.length} scenarios (parallel ${parallel})`,
      );

      const workRoot = ensureWorkDir(runtime.id, logsRoot);
      const workerAppDirs = Array.from({ length: parallel }, (_, i) =>
        prepareWorkerDir(workRoot, i),
      );

      const resolvedBatch = runtimeBatch;
      let next = 0;
      const batchResults: ScenarioResult[] = [];

      async function runWorker(workerIndex: number): Promise<void> {
        const appDirForRun = workerAppDirs[workerIndex];
        while (true) {
          const currentIndex = next++;
          if (currentIndex >= resolvedBatch.length) break;
          const scenario = resolvedBatch[currentIndex];
          try {
            const res = await runScenario(scenario, tgz, appDirForRun);
            batchResults.push(res);
          } catch (error) {
            const scenarioId = scenarioSlug(scenario);
            console.error(
              `${LOG_PREFIX} ${scenarioId}: unexpected error`,
              error,
            );
            throw error;
          }
        }
      }

      const workers = Array.from({ length: parallel }, (_, i) => runWorker(i));
      await Promise.all(workers);
      results.push(...batchResults);
    }

    summaryPath = logsPath(logsRoot, "MATRIX_SUMMARY.json");
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

    counts = {
      total: results.length,
      pass: results.filter((s) => s.outcome === "PASS").length,
      fail: results.filter((s) => s.outcome === "FAIL").length,
      xfail: results.filter((s) => s.outcome === "XFAIL").length,
      xpass: results.filter((s) => s.outcome === "XPASS").length,
    };

    if (!counts) {
      throw new Error(`${LOG_PREFIX} Failed to aggregate scenario counts`);
    }

    const pointerPayload: LatestSummaryPointer = {
      generatedAt: new Date().toISOString(),
      summaryPath,
      totals: counts,
    };
    writeLatestSummaryPointer(pointerPayload);
    console.log(`${LOG_PREFIX}\nMatrix results written to ${summaryPath}`);
    console.log(
      `${LOG_PREFIX} Latest summary pointer written to version-compatibility-tests/MATRIX_LATEST.json`,
    );

    const summaryLog = logsPath(logsRoot, "summarize.log");
    const summarizeCmd = `tsx version-compatibility-tests/scripts/summarize-matrix.ts ${summaryPath}`;
    const summaryRes = sh(summarizeCmd, root, summaryLog);
    if (!summaryRes.ok) {
      console.error(
        `${LOG_PREFIX} Failed to generate Markdown summary. See ${summaryLog}`,
      );
      const error = new Error("Markdown summary generation failed") as Error & {
        summaryLog: string;
      };
      error.summaryLog = summaryLog;
      throw error;
    }

    hasBlockingOutcome = counts.fail > 0 || counts.xpass > 0;
    if (hasBlockingOutcome) {
      console.error(
        `${LOG_PREFIX} Blocking scenarios detected (FAIL=${counts.fail}, XPASS=${counts.xpass}). See logs under ${logsRoot}`,
      );
      const error = new Error("Blocking scenarios detected") as Error & {
        summaryPath: string;
        counts: ScenarioCounts;
      };
      error.summaryPath = summaryPath;
      error.counts = counts as ScenarioCounts;
      throw error;
    }

    if (counts.xfail > 0) {
      console.warn(
        `${LOG_PREFIX} ${counts.xfail} scenarios marked as expected failures.`,
      );
    }
  } finally {
    restoreRuntime();
    if (originalPnpmHome !== undefined)
      process.env.PNPM_HOME = originalPnpmHome;
    else delete process.env.PNPM_HOME;
    process.env.PATH = originalPath;
    if (runtimePnpmHome) {
      const tmpRoot = os.tmpdir();
      const normalizedHome = path.resolve(runtimePnpmHome);
      const normalizedTmp = path.resolve(tmpRoot);
      if (normalizedHome.startsWith(normalizedTmp)) {
        try {
          fs.rmSync(runtimePnpmHome, { recursive: true, force: true });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `${LOG_PREFIX} Failed to clean temporary PNPM home: ${message}`,
          );
        }
      }
    }

    if (hasBlockingOutcome && summaryPath && counts) {
      console.error(
        `${LOG_PREFIX} Blocking scenarios detected (FAIL=${counts.fail}, XPASS=${counts.xpass}). Summary: ${summaryPath}`,
      );
      try {
        const summaryRaw = fs.readFileSync(summaryPath, "utf8");
        const lines = summaryRaw.split(/\r?\n/);
        if (lines.length <= MAX_INLINE_LOG_LINES) {
          console.error(`${LOG_PREFIX} ===== MATRIX SUMMARY BEGIN =====`);
          console.error(summaryRaw);
          console.error(`${LOG_PREFIX} ===== MATRIX SUMMARY END =====`);
        } else {
          console.error(
            `${LOG_PREFIX} Summary has ${lines.length} lines; showing first ${MAX_INLINE_LOG_LINES} lines:`,
          );
          console.error(lines.slice(0, MAX_INLINE_LOG_LINES).join("\n"));
          console.error(`${LOG_PREFIX} ===== TRUNCATED MATRIX SUMMARY =====`);
        }

        const logDir = path.dirname(summaryPath);
        const scenarioLogs = fs
          .readdirSync(logDir)
          .filter(
            (name) =>
              name.startsWith("runtime") ||
              name.endsWith(".log") ||
              name.endsWith(".txt"),
          );
        for (const logName of scenarioLogs) {
          const logPath = path.join(logDir, logName);
          if (!fs.existsSync(logPath) || !fs.statSync(logPath).isFile())
            continue;
          const logContent = fs.readFileSync(logPath, "utf8");
          const logLines = logContent.split(/\r?\n/);
          console.error(`${LOG_PREFIX} ===== ${logName} =====`);
          if (logLines.length <= MAX_INLINE_LOG_LINES) {
            console.error(logContent);
          } else {
            console.error(logLines.slice(0, MAX_INLINE_LOG_LINES).join("\n"));
            console.error(`${LOG_PREFIX} ===== ${logName} (truncated) =====`);
          }
        }
      } catch (logError) {
        const message =
          logError instanceof Error ? logError.message : String(logError);
        console.error(`${LOG_PREFIX} Failed to print matrix logs: ${message}`);
      }
    }
  }
}

const invokedAsScript = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsScript) {
  main().catch((error) => {
    console.error(`${LOG_PREFIX} Unhandled error`, error);
    process.exit(1);
  });
}
