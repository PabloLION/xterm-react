export type LinterFamily = "biome" | "eslint-prettier";

export interface RuntimeDescriptor {
  id: string;
  tool: string;
  versionSpec: string;
  label: string;
}

export interface RuntimeCatalogEntry extends RuntimeDescriptor {}

export interface RuntimeRecord {
  id: string;
  tool: string;
  version: string;
}

export interface BiomeLinterConfig {
  tool: "biome";
  version: string;
}

export interface EslintPrettierConfig {
  tool: "eslint-prettier";
  eslint: string;
  eslintJs: string;
  tsParser: string;
  prettier: string;
}

export type LinterConfig = BiomeLinterConfig | EslintPrettierConfig;

export interface ScenarioDefinition {
  runtime: RuntimeDescriptor;
  react: string;
  typescript: string;
  linter: LinterConfig;
}

export type ScenarioResultOutcome = "PASS" | "FAIL" | "XFAIL" | "XPASS";

export interface ScenarioResult {
  scenario: string;
  versions: {
    runtime: RuntimeRecord;
    react: string;
    typescript: string;
    linter: BiomeLinterConfig | EslintPrettierConfig;
  };
  steps: Record<string, boolean>;
  expected_fail: boolean;
  outcome: ScenarioResultOutcome;
  logs: string;
}

export interface AggregatedCounts {
  total: number;
  PASS: number;
  FAIL: number;
  XFAIL: number;
  XPASS: number;
}
