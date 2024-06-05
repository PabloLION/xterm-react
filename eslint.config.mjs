import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import jsLint from "@eslint/js";
import tsLint from "typescript-eslint";

export default tsLint.config(
  jsLint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  ...tsLint.configs.strict,
  ...tsLint.configs.stylistic,
  {
    files: ["vite.config.mjs"],
    languageOptions: {
      globals: { __dirname: "readonly" },
    },
  },
  {
    ignores: ["dist/*"],
  },
);
