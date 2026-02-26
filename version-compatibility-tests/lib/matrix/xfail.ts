import type { LinterFamily, ScenarioDefinition } from "../../types/compat.js";

export interface XfailEntry {
  runtime?: string;
  react: string;
  typescript: string;
  linter: LinterFamily;
  biome?: string;
  eslint?: string;
  prettier?: string;
}

export function validateXfailEntry(
  entry: XfailEntry,
  runtimeIds?: Set<string>,
): void {
  if (!entry || typeof entry !== "object")
    throw new Error("entry must be an object");
  if (!entry.react) throw new Error('missing "react" field');
  if (!entry.typescript) throw new Error('missing "typescript" field');
  if (!entry.linter) throw new Error('missing "linter" field');
  if (entry.runtime) {
    if (typeof entry.runtime !== "string")
      throw new Error('"runtime" must be a string when provided');
    if (runtimeIds && !runtimeIds.has(entry.runtime))
      throw new Error(`runtime "${entry.runtime}" is not recognised`);
  }

  if (entry.linter === "biome") {
    if (!entry.biome)
      throw new Error('biome entries must include "biome" version');
  } else if (entry.linter === "eslint-prettier") {
    if (!entry.eslint)
      throw new Error('eslint-prettier entries must include "eslint" version');
    if (!entry.prettier)
      throw new Error(
        'eslint-prettier entries must include "prettier" version',
      );
  } else {
    throw new Error(`unsupported linter "${entry.linter}"`);
  }
}

export function matchesXfail(
  entry: XfailEntry,
  scenario: ScenarioDefinition,
): boolean {
  if (entry.runtime && entry.runtime !== scenario.runtime?.id) return false;
  if (entry.react && entry.react !== scenario.react) return false;
  if (entry.typescript && entry.typescript !== scenario.typescript)
    return false;
  const tool = scenario.linter.tool;
  if (tool === "biome") {
    if (entry.linter && entry.linter !== "biome") return false;
    if (entry.biome && entry.biome !== scenario.linter.version) return false;
    if (entry.eslint || entry.prettier) return false;
  } else {
    if (entry.linter && entry.linter !== "eslint-prettier") return false;
    if (entry.eslint && entry.eslint !== scenario.linter.eslint) return false;
    if (entry.prettier && entry.prettier !== scenario.linter.prettier)
      return false;
    if (entry.biome) return false;
  }
  return true;
}
