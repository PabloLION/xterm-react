import fs from "node:fs";
import path from "node:path";

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
const historyPath = path.join(root, "HISTORY.md");

type LatestSummary = { generatedAt: string; summaryPath: string };

type LintSets = {
  biome: Set<string>;
  eslint: Set<string>;
  prettier: Set<string>;
};

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

function formatSet(values: Set<string>): string {
  return Array.from(values).sort().join(", ");
}

function summarizeLintSets(lintSets: LintSets): string {
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

function aggregate(summaryPath: string): {
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

function buildRow(
  dateIso: string,
  pass: number,
  fail: number,
  versions: AggregatedVersions,
): string {
  return `| ${dateIso} | ${pass} | ${fail} | \`${versions.react}\` | \`${versions.typescript}\` | \`${versions.linting}\` |`;
}

function insertRow(table: string[], row: string, dateIso: string): string[] {
  const headerIndex = table.findIndex((line) => line.startsWith("| Date"));
  if (headerIndex === -1) {
    throw new Error("Unable to locate history table header in HISTORY.md");
  }

  const startOfRows = headerIndex + 2;
  let insertIndex = startOfRows;

  while (
    insertIndex < table.length &&
    table[insertIndex].startsWith("| ") &&
    table[insertIndex].trim() !== "|"
  ) {
    const existingDate = table[insertIndex].split("|")[1]?.trim();
    if (existingDate === dateIso) {
      return table;
    }
    insertIndex += 1;
  }

  table.splice(insertIndex, 0, row);
  return table;
}

function main(): void {
  const { generatedAt, summaryPath } = loadLatestSummary();
  const { pass, fail, versions } = aggregate(summaryPath);
  const historyLines = fs.readFileSync(historyPath, "utf8").split("\n");

  const dateIso = (generatedAt || new Date().toISOString()).replace(
    /\..*Z$/,
    "Z",
  );
  const newRow = buildRow(dateIso, pass, fail, versions);
  const updated = insertRow(historyLines, newRow, dateIso).join("\n");

  fs.writeFileSync(historyPath, updated);
  console.log("HISTORY.md updated for run at", dateIso);
}

main();
