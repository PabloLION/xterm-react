import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Outcome = "PASS" | "FAIL" | "XFAIL" | "XPASS";

interface LinterVersionBase {
  tool?: string;
  version?: string;
  eslint?: string;
  prettier?: string;
  [key: string]: unknown;
}

interface Scenario {
  outcome?: Outcome;
  steps?: Record<string, boolean>;
  versions?: {
    react?: string;
    typescript?: string;
    linter?: LinterVersionBase;
  };
}

interface AggregatedVersions {
  react: string;
  typescript: string;
  linting: string;
}

const root = process.cwd();
const latestPtr = path.join(
  root,
  "version-compatibility-tests",
  "MATRIX_LATEST.json",
);
const matrixDocPath = path.join(root, "docs", "compatibility-matrix.md");
const LOG_PREFIX = "[matrix]";

type LatestSummary = { generatedAt: string; summaryPath: string };

type LintSets = {
  biome: Set<string>;
  eslint: Set<string>;
  prettier: Set<string>;
};

function parseFlags(argv: string[]): { force: boolean } {
  let force = false;
  for (const arg of argv) {
    if (arg === "--force") {
      force = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`${LOG_PREFIX} Usage: pnpm compat:matrix:record [--force]`);
      process.exit(0);
    }
  }
  return { force };
}

function loadLatestSummary(): LatestSummary {
  if (!fs.existsSync(latestPtr)) {
    throw new Error(`Missing MATRIX_LATEST.json at ${latestPtr}`);
  }
  const payload = JSON.parse(fs.readFileSync(latestPtr, "utf8"));
  if (!payload.summaryPath || !fs.existsSync(payload.summaryPath)) {
    throw new Error("Invalid summaryPath in MATRIX_LATEST.json");
  }
  return {
    generatedAt: payload.generatedAt,
    summaryPath: payload.summaryPath,
  };
}

export function formatSet(values: Set<string>): string {
  return Array.from(values).sort().join(", ");
}

export function summarizeLintSets(lintSets: LintSets): string {
  const parts: string[] = [];
  if (lintSets.biome.size) {
    parts.push(`biome: ${formatSet(lintSets.biome)}`);
  }
  if (lintSets.eslint.size) {
    parts.push(`eslint: ${formatSet(lintSets.eslint)}`);
  }
  if (lintSets.prettier.size) {
    parts.push(`prettier: ${formatSet(lintSets.prettier)}`);
  }
  return parts.length ? parts.join(" | ") : "—";
}

export function aggregate(summaryPath: string): {
  pass: number;
  fail: number;
  versions: AggregatedVersions;
} {
  const scenarios: Scenario[] = JSON.parse(
    fs.readFileSync(summaryPath, "utf8"),
  );

  const versionSets = {
    react: new Set<string>(),
    typescript: new Set<string>(),
  };
  const lintSets: LintSets = {
    biome: new Set<string>(),
    eslint: new Set<string>(),
    prettier: new Set<string>(),
  };

  let pass = 0;
  let fail = 0;

  for (const scenario of scenarios) {
    const outcome: Outcome =
      scenario.outcome ||
      (Object.values(scenario.steps ?? {}).every(Boolean) ? "PASS" : "FAIL");
    if (outcome === "PASS" || outcome === "XPASS") pass += 1;
    if (outcome === "FAIL" || outcome === "XFAIL") fail += 1;

    if (scenario.versions?.react) {
      versionSets.react.add(scenario.versions.react);
    }
    if (scenario.versions?.typescript) {
      versionSets.typescript.add(scenario.versions.typescript);
    }

    const linter = scenario.versions?.linter;
    if (linter?.tool === "biome" && typeof linter.version === "string") {
      lintSets.biome.add(linter.version);
    } else if (linter?.tool === "eslint-prettier") {
      if (typeof linter.eslint === "string") {
        lintSets.eslint.add(linter.eslint);
      }
      if (typeof linter.prettier === "string") {
        lintSets.prettier.add(linter.prettier);
      }
    }
  }

  return {
    pass,
    fail,
    versions: {
      react: formatSet(versionSets.react),
      typescript: formatSet(versionSets.typescript),
      linting: summarizeLintSets(lintSets),
    },
  };
}

export function buildRow(
  dateIso: string,
  pass: number,
  fail: number,
  versions: AggregatedVersions,
): string {
  return `| ${dateIso} | ${pass} | ${fail} | \`${versions.react}\` | \`${versions.typescript}\` | \`${versions.linting}\` |`;
}

export function insertRow(
  lines: string[],
  row: string,
  dateIso: string,
  force = false,
): string[] {
  const headerIndex = lines.findIndex((line) => line.startsWith("| Date"));
  if (headerIndex === -1) {
    throw new Error(
      "Unable to locate history table header in docs/compatibility-matrix.md",
    );
  }

  const firstDataIndex = headerIndex + 2;
  let insertIndex = firstDataIndex;

  for (let i = firstDataIndex; i < lines.length; i += 1) {
    const current = lines[i];
    if (!current.trim().startsWith("|")) {
      insertIndex = i;
      break;
    }
    const existingDate = current.split("|")[1]?.trim();
    if (existingDate === dateIso) {
      if (!force) {
        throw new Error(
          `Row with date ${dateIso} already exists. Use --force to overwrite.`,
        );
      }
      console.log(
        `${LOG_PREFIX} Replacing existing entry for ${dateIso} (--force enabled)`,
      );
      lines.splice(i, 1, row);
      return lines;
    }
    insertIndex = i + 1;
  }

  // If the table currently has only the header and separator, append after them.
  if (insertIndex < firstDataIndex) {
    insertIndex = firstDataIndex;
  }

  lines.splice(insertIndex, 0, row);
  return lines;
}

export function main(argv: string[] = process.argv): void {
  const { force } = parseFlags(argv.slice(2));
  const { generatedAt, summaryPath } = loadLatestSummary();
  const { pass, fail, versions } = aggregate(summaryPath);
  const docLines = fs.readFileSync(matrixDocPath, "utf8").split("\n");

  const dateIso = (generatedAt || new Date().toISOString()).replace(
    /\..*Z$/,
    "Z",
  );
  const newRow = buildRow(dateIso, pass, fail, versions);
  const updated = insertRow(docLines, newRow, dateIso, force).join("\n");

  fs.writeFileSync(matrixDocPath, updated);
  console.log(
    `${LOG_PREFIX} compatibility-matrix.md updated for run at ${dateIso}`,
  );
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
  main(process.argv);
}
