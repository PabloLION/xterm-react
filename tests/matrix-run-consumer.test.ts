import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesXfail,
  validateXfailEntry,
} from "../version-compatibility-tests/scripts/matrix-run-consumer.mjs";

const runtime = {
  id: "node20",
  tool: "node",
  versionSpec: "20",
  label: "node20",
};

test("matchesXfail recognises biome combos", () => {
  const entry = {
    react: "19.1.1",
    typescript: "5.4.5",
    linter: "biome",
    biome: "2.2.4",
  };
  const scenario = {
    runtime,
    react: "19.1.1",
    typescript: "5.4.5",
    linter: { tool: "biome", version: "2.2.4" },
  };

  assert.equal(matchesXfail(entry, scenario), true);
});

test("matchesXfail rejects mismatched linter families", () => {
  const entry = {
    react: "19.1.1",
    typescript: "5.4.5",
    linter: "biome",
    biome: "2.2.4",
  };
  const scenario = {
    runtime,
    react: "19.1.1",
    typescript: "5.4.5",
    linter: {
      tool: "eslint-prettier",
      eslint: "9.13.0",
      prettier: "3.6.2",
      eslintJs: "9.13.0",
      tsParser: "8.45.0",
    },
  };

  assert.equal(matchesXfail(entry, scenario), false);
});

test("matchesXfail enforces eslint and prettier version matches", () => {
  const entry = {
    react: "19.1.1",
    typescript: "5.4.5",
    linter: "eslint-prettier",
    eslint: "8.57.0",
  };
  const scenario = {
    runtime,
    react: "19.1.1",
    typescript: "5.4.5",
    linter: {
      tool: "eslint-prettier",
      eslint: "9.13.0",
      prettier: "3.6.2",
      eslintJs: "9.13.0",
      tsParser: "8.45.0",
    },
  };

  assert.equal(matchesXfail(entry, scenario), false);
});

test("matchesXfail respects runtime qualifier", () => {
  const entry = {
    runtime: "node22",
    react: "19.1.1",
    typescript: "5.4.5",
    linter: "biome",
    biome: "2.2.4",
  };
  const scenario = {
    runtime,
    react: "19.1.1",
    typescript: "5.4.5",
    linter: { tool: "biome", version: "2.2.4" },
  };

  assert.equal(matchesXfail(entry, scenario), false);
});

test("validateXfailEntry accepts optional runtime", () => {
  assert.doesNotThrow(() =>
    validateXfailEntry({
      runtime: "node20",
      react: "19.1.1",
      typescript: "5.4.5",
      linter: "biome",
      biome: "2.2.4",
    }),
  );
});

test("validateXfailEntry rejects unknown runtime id", () => {
  assert.throws(() =>
    validateXfailEntry({
      runtime: "bun-stable",
      react: "19.1.1",
      typescript: "5.4.5",
      linter: "biome",
      biome: "2.2.4",
    }),
  );
});
