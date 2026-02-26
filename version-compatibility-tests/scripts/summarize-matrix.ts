#!/usr/bin/env node
import * as fs from "node:fs";
import {
  latestPointerPath,
  logsDir,
  rootDir,
  suiteDir,
} from "../lib/fs/paths.js";
import {
  updateReadmeBadge,
  writeSummaryMarkdown,
} from "../lib/summary/artifacts.js";
import { findLatestSummary } from "../lib/summary/files.js";
import { aggregateResults, renderMarkdown } from "../lib/summary/render.js";
import type { ScenarioResult } from "../types/compat.js";

function resolveSummaryPath(arg: string | undefined): string {
  if (arg && fs.existsSync(arg)) {
    return arg;
  }
  return findLatestSummary({
    logsDir,
    latestPointerPath,
  });
}

function main(): void {
  const summaryPath = resolveSummaryPath(process.argv[2]);
  const results = JSON.parse(
    fs.readFileSync(summaryPath, "utf8"),
  ) as ScenarioResult[];
  const aggregates = aggregateResults(results);
  const markdown = renderMarkdown(summaryPath, aggregates);

  const { outPath, stable } = writeSummaryMarkdown({
    summaryPath,
    markdown,
    suiteDir,
  });
  console.log("Markdown summary written to", outPath);
  console.log("Stable alias updated at", stable);

  try {
    if (updateReadmeBadge({ rootDir, counts: aggregates.counts })) {
      console.log("README badge updated");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("Failed to update README badge:", message);
  }

  console.log("\n---\n");
  console.log(markdown);
}

main();
