import assert from "node:assert/strict";
import test from "node:test";

import { matchesXfail } from "../version-compatibility-tests/scripts/matrix-run-consumer.mjs";

test("matchesXfail recognises biome combos", () => {
  const entry = {
    react: "19.1.1",
    typescript: "5.4.5",
    linter: "biome",
    biome: "2.2.4",
  };
  const scenario = {
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
