export const ALLOWED_PACKAGES: Set<string> = new Set([
  "react",
  "react-dom",
  "typescript",
  "@types/react",
  "@types/react-dom",
  "vite",
  "@vitejs/plugin-react",
  "@biomejs/biome",
  "eslint",
  "@eslint/js",
  "@typescript-eslint/parser",
  "eslint-config-prettier",
  "prettier",
]);

export function assertAllowedPackage(name: string): void {
  if (!ALLOWED_PACKAGES.has(name)) {
    throw new Error(`Package name not allowed: ${name}`);
  }
}
