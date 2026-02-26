import * as fs from "node:fs";
import * as path from "node:path";
import type { AggregatedCounts } from "../../types/compat.js";

interface WriteSummaryOptions {
  summaryPath: string;
  markdown: string;
  suiteDir: string;
}

export interface SummaryWriteResult {
  outPath: string;
  stable: string;
}

export function writeSummaryMarkdown({
  summaryPath,
  markdown,
  suiteDir,
}: WriteSummaryOptions): SummaryWriteResult {
  const dir = path.dirname(summaryPath);
  const outPath = path.join(dir, "MATRIX_SUMMARY.md");
  fs.writeFileSync(outPath, markdown);

  const stable = path.join(suiteDir, "MATRIX_SUMMARY.md");
  const header = `<!-- Auto-generated: latest summary alias. Source: ${outPath} -->\n\n`;
  fs.writeFileSync(stable, header + markdown);

  return { outPath, stable };
}

interface UpdateBadgeOptions {
  rootDir: string;
  counts: AggregatedCounts;
}

export function updateReadmeBadge({
  rootDir,
  counts,
}: UpdateBadgeOptions): boolean {
  const readmePath = path.join(rootDir, "README.md");
  if (!fs.existsSync(readmePath)) return false;

  const begin = "<!-- compat-matrix-badge:begin -->";
  const end = "<!-- compat-matrix-badge:end -->";
  const relStable = path.posix.join(
    "version-compatibility-tests",
    "MATRIX_SUMMARY.md",
  );
  const badge = `Compatibility status: PASS ${counts.PASS} · FAIL ${counts.FAIL} · XFAIL ${counts.XFAIL} · XPASS ${counts.XPASS} — latest: ${relStable}`;
  const replacement = `${begin}\n${badge}\n${end}`;

  let readme = fs.readFileSync(readmePath, "utf8");
  if (readme.includes(begin) && readme.includes(end)) {
    readme = readme.replace(
      new RegExp(`${begin}[\\n\\r\\s\\S]*?${end}`),
      replacement,
    );
  } else {
    const lines = readme.split(/\r?\n/);
    const idx = lines.findIndex((line: string) =>
      /^##\s+Compatibility\s*$/.test(line.trim()),
    );
    const insertAt = idx >= 0 ? idx + 1 : 0;
    lines.splice(insertAt, 0, replacement, "");
    readme = lines.join("\n");
  }
  fs.writeFileSync(readmePath, readme);
  return true;
}
