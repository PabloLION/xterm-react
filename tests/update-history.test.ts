import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { aggregate } from "../scripts/update-history";

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
