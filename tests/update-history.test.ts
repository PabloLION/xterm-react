import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  aggregate,
  buildRow,
  formatSet,
  insertRow,
  summarizeLintSets,
} from "../scripts/update-history";

function writeSummaryFile(data: unknown[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xterm-history-"));
  const file = path.join(tmpDir, "summary.json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

test("aggregate summarises counts and versions", () => {
  const summaryPath = writeSummaryFile([
    {
      outcome: "PASS",
      versions: {
        react: "19.1.1",
        typescript: "5.4.5",
        linter: { tool: "biome", version: "2.2.4" },
      },
    },
    {
      steps: { pin_and_build: true, build: true },
      versions: {
        react: "19.1.1",
        typescript: "5.4.5",
        linter: {
          tool: "eslint-prettier",
          eslint: "9.13.0",
          prettier: "3.6.2",
        },
      },
    },
    {
      steps: { pin_and_build: false },
      versions: { react: "18.3.1", typescript: "5.2.2" },
    },
  ]);

  const result = aggregate(summaryPath);

  assert.equal(result.pass, 2);
  assert.equal(result.fail, 1);
  assert.equal(result.versions.react, "18.3.1, 19.1.1");
  assert.equal(result.versions.typescript, "5.2.2, 5.4.5");
  assert.equal(
    result.versions.linting,
    "biome: 2.2.4 | eslint: 9.13.0 | prettier: 3.6.2",
  );
});

test("formatSet formats version set correctly", () => {
  const versions = new Set(["19.1.1", "18.3.1"]);
  assert.equal(formatSet(versions), "18.3.1, 19.1.1");
});

test("summarizeLintSets formats lint tools correctly", () => {
  const lintSets = {
    biome: new Set(["2.2.4"]),
    eslint: new Set(["9.13.0"]),
    prettier: new Set(["3.6.2"]),
  };
  assert.equal(
    summarizeLintSets(lintSets),
    "biome: 2.2.4 | eslint: 9.13.0 | prettier: 3.6.2",
  );
});

test("buildRow formats row correctly", () => {
  const date = "2025-10-06T12:00:00Z";
  const result = buildRow(date, 100, 5, {
    react: "18.3.1, 19.1.1",
    typescript: "5.4.5, 5.9.3",
    linting: "biome: 2.2.4",
  });
  assert.equal(
    result,
    "| 2025-10-06T12:00:00Z | 100 | 5 | `18.3.1, 19.1.1` | `5.4.5, 5.9.3` | `biome: 2.2.4` |",
  );
});

test("insertRow appends row at end when no existing dates", () => {
  const lines = [
    "| Date | PASS | FAIL |",
    "| ---- | ---: | ---: |",
  ];
  const row =
    "| 2025-10-05T00:00:00Z | 100 | 0 | `18.3.1` | `5.4.5` | `biome: 2.2.4` |";

  const result = insertRow([...lines], row, "2025-10-05T00:00:00Z");

  assert.equal(result.length, 3);
  assert.equal(
    result[2],
    "| 2025-10-05T00:00:00Z | 100 | 0 | `18.3.1` | `5.4.5` | `biome: 2.2.4` |",
  );
});

test("insertRow throws on duplicate without force", () => {
  const lines = [
    "| Date | PASS | FAIL |",
    "| ---- | ---: | ---: |",
    "| 2025-10-06T12:00:00Z | 100 | 0 | `18.3.1` | `5.4.5` | `biome: 2.2.4` |",
  ];
  const row =
    "| 2025-10-06T12:00:00Z | 105 | 2 | `19.1.1` | `5.9.3` | `biome: 2.2.4` |";

  assert.throws(
    () => insertRow(lines, row, "2025-10-06T12:00:00Z"),
    /already exists/,
  );
});

test("insertRow replaces duplicate with force flag", () => {
  const lines = [
    "| Date | PASS | FAIL |",
    "| ---- | ---: | ---: |",
    "| 2025-10-06T12:00:00Z | 100 | 0 | `18.3.1` | `5.4.5` | `biome: 2.2.4` |",
  ];
  const row =
    "| 2025-10-06T12:00:00Z | 105 | 2 | `19.1.1` | `5.9.3` | `biome: 2.2.4` |";

  const result = insertRow(lines, row, "2025-10-06T12:00:00Z", true);

  assert.equal(result.length, 3);
  assert.equal(
    result[2],
    "| 2025-10-06T12:00:00Z | 105 | 2 | `19.1.1` | `5.9.3` | `biome: 2.2.4` |",
  );
});
