/*
  Append a row to HISTORY.md based on the latest matrix run.
  - Reads version-compatibility-tests/MATRIX_LATEST.json to find summary JSON
  - Aggregates totals and unique version sets per dimension
  - Parses HISTORY.md (first table) and appends a new row if the date is new
*/
import fs from "node:fs";
import path from "node:path";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { visit } from "unist-util-visit";
import type {
  InlineCode,
  PhrasingContent,
  Root,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";

const root = process.cwd();
const latestPtr = path.join(
  root,
  "version-compatibility-tests",
  "MATRIX_LATEST.json"
);
const historyPath = path.join(root, "HISTORY.md");

function loadLatestSummaryPath(): { generatedAt: string; summaryPath: string } {
  if (!fs.existsSync(latestPtr))
    throw new Error("Missing MATRIX_LATEST.json at " + latestPtr);
  const p = JSON.parse(fs.readFileSync(latestPtr, "utf8"));
  if (!p.summaryPath || !fs.existsSync(p.summaryPath))
    throw new Error("Invalid summaryPath in MATRIX_LATEST.json");
  return { generatedAt: p.generatedAt, summaryPath: p.summaryPath };
}

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

function aggregate(summaryPath: string) {
  const arr: Scenario[] = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const counts = { PASS: 0, FAIL: 0, XFAIL: 0, XPASS: 0 };
  const sets = {
    react: new Set<string>(),
    ts: new Set<string>(),
    eslint: new Set<string>(),
    prettier: new Set<string>(),
    biome: new Set<string>(),
  };
  for (const s of arr) {
    const outcome =
      s.outcome || (s.steps?.build && s.steps?.pin_and_build ? "PASS" : "FAIL");
    const key = outcome as keyof typeof counts;
    counts[key] += 1;
    if (s.versions?.react) sets.react.add(s.versions.react);
    if (s.versions?.ts) sets.ts.add(s.versions.ts);
    if (s.versions?.eslint) sets.eslint.add(s.versions.eslint);
    if (s.versions?.prettier) sets.prettier.add(s.versions.prettier);
    if (s.versions?.biome) sets.biome.add(s.versions.biome);
  }
  function fmt(set: Set<string>) {
    return Array.from(set).sort().join(", ");
  }
  return {
    counts,
    react: fmt(sets.react),
    typescript: fmt(sets.ts),
    eslint: fmt(sets.eslint),
    prettier: fmt(sets.prettier),
    biome: fmt(sets.biome),
  };
}

function code(value: string): InlineCode {
  return { type: "inlineCode", value };
}
function text(value: string): Text {
  return { type: "text", value };
}
function cell(children: PhrasingContent[]): TableCell {
  return { type: "tableCell", children };
}

function appendRow(
  historyMd: string,
  dateIso: string,
  agg: ReturnType<typeof aggregate>
) {
  const ast = fromMarkdown(historyMd, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as Root;
  let tableFound = false;
  visit<Table>(ast, "table", (node) => {
    if (tableFound) return;
    tableFound = true;
    // Detect duplicate date
    const exists = node.children?.some((row, idx) => {
      if (idx === 0) return false;
      const firstCell = row.children?.[0];
      const firstValue = firstCell?.children?.[0];
      return firstValue?.type === "text" && firstValue.value === dateIso;
    });
    if (exists) return;
    const row: TableRow = {
      type: "tableRow",
      children: [
        cell([text(dateIso)]),
        cell([text(String(agg.counts.PASS))]),
        cell([text(String(agg.counts.FAIL))]),
        cell([code(agg.react)]),
        cell([code(agg.typescript)]),
        cell([code(agg.eslint)]),
        cell([code(agg.prettier)]),
        cell([code(agg.biome)]),
      ],
    };
    node.children.push(row);
    return undefined;
  });
  return toMarkdown(ast, { extensions: [gfmToMarkdown()] });
}

function main() {
  const { generatedAt, summaryPath } = loadLatestSummaryPath();
  const agg = aggregate(summaryPath);
  const md = fs.readFileSync(historyPath, "utf8");
  const out = appendRow(
    md,
    (generatedAt || new Date().toISOString()).replace(/\..*Z$/, "Z"),
    agg
  );
  fs.writeFileSync(historyPath, out);
  console.log("HISTORY.md updated for run at", generatedAt);
}

main();
