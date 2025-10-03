import fs from "node:fs";
import path from "node:path";

interface Scenario {
  outcome?: "PASS" | "FAIL" | "XFAIL" | "XPASS";
  steps?: { pin_and_build?: boolean; build?: boolean };
  versions?: {
    react?: string;
    ts?: string;
    eslint?: string;
    prettier?: string;
    biome?: string;
  };
}

interface AggregatedVersions {
  react: string;
  typescript: string;
  eslint: string;
  prettier: string;
  biome: string;
}

const root = process.cwd();
const latestPtr = path.join(
  root,
  "version-compatibility-tests",
  "MATRIX_LATEST.json"
);
const historyPath = path.join(root, "HISTORY.md");

function loadLatestSummary(): { generatedAt: string; summaryPath: string } {
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

function aggregate(summaryPath: string): {
  pass: number;
  fail: number;
  versions: AggregatedVersions;
} {
  const scenarios: Scenario[] = JSON.parse(
    fs.readFileSync(summaryPath, "utf8")
  );

  const versionSets = {
    react: new Set<string>(),
    typescript: new Set<string>(),
    eslint: new Set<string>(),
    prettier: new Set<string>(),
    biome: new Set<string>(),
  };

  let pass = 0;
  let fail = 0;

  for (const scenario of scenarios) {
    const outcome =
      scenario.outcome ||
      (scenario.steps?.build && scenario.steps.pin_and_build ? "PASS" : "FAIL");
    if (outcome === "PASS") pass += 1;
    else if (outcome === "FAIL") fail += 1;

    if (scenario.versions?.react) {
      versionSets.react.add(scenario.versions.react);
    }
    if (scenario.versions?.ts) {
      versionSets.typescript.add(scenario.versions.ts);
    }
    if (scenario.versions?.eslint) {
      versionSets.eslint.add(scenario.versions.eslint);
    }
    if (scenario.versions?.prettier) {
      versionSets.prettier.add(scenario.versions.prettier);
    }
    if (scenario.versions?.biome) {
      versionSets.biome.add(scenario.versions.biome);
    }
  }

  return {
    pass,
    fail,
    versions: {
      react: formatSet(versionSets.react),
      typescript: formatSet(versionSets.typescript),
      eslint: formatSet(versionSets.eslint),
      prettier: formatSet(versionSets.prettier),
      biome: formatSet(versionSets.biome),
    },
  };
}

function buildRow(
  dateIso: string,
  pass: number,
  fail: number,
  versions: AggregatedVersions
): string {
  return `| ${dateIso} | ${pass} | ${fail} | \`${versions.react}\` | \`${versions.typescript}\` | \`${versions.eslint}\` | \`${versions.prettier}\` | \`${versions.biome}\` |`;
}

function insertRow(table: string[], row: string, dateIso: string): string[] {
  const headerIndex = table.findIndex((line) => line.startsWith("| Date"));
  if (headerIndex === -1) {
    throw new Error("Unable to locate history table header in HISTORY.md");
  }

  const startOfRows = headerIndex + 2; // skip header + separator
  let insertIndex = startOfRows;

  while (
    insertIndex < table.length &&
    table[insertIndex].startsWith("| ") &&
    table[insertIndex].trim() !== "|"
  ) {
    const existingDate = table[insertIndex].split("|")[1]?.trim();
    if (existingDate === dateIso) {
      return table; // already recorded
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
    "Z"
  );
  const newRow = buildRow(dateIso, pass, fail, versions);
  const updated = insertRow(historyLines, newRow, dateIso).join("\n");

  fs.writeFileSync(historyPath, updated);
  console.log("HISTORY.md updated for run at", dateIso);
}

main();
