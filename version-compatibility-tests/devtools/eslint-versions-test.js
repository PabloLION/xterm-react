#!/usr/bin/env node

/**
 * ESLint Ecosystem Version Compatibility Test (ESM)
 * Tests different versions of ESLint and related tools with latest React & TypeScript
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ESLINT_VERSIONS_TO_TEST = [
  {
    name: "ESLint 8 + TypeScript-ESLint 6",
    versions: {
      eslint: "^8.57.0",
      "@typescript-eslint/parser": "^6.21.0",
      "@typescript-eslint/eslint-plugin": "^6.21.0",
      "typescript-eslint": "^6.21.0",
    },
  },
  {
    name: "ESLint 9 + TypeScript-ESLint 7",
    versions: {
      eslint: "^9.0.0",
      "@typescript-eslint/parser": "^7.18.0",
      "@typescript-eslint/eslint-plugin": "^7.18.0",
      "typescript-eslint": "^7.18.0",
    },
  },
  {
    name: "ESLint 9 + TypeScript-ESLint 8 (Current)",
    versions: {
      eslint: "^9.36.0",
      "@typescript-eslint/parser": "^8.44.1",
      "@typescript-eslint/eslint-plugin": "^8.44.1",
      "typescript-eslint": "^8.44.1",
    },
  },
];

const PRETTIER_VERSIONS_TO_TEST = [
  { name: "Prettier 2.8", version: "^2.8.8", pluginVersion: "^4.2.1" },
  { name: "Prettier 3.0", version: "^3.0.0", pluginVersion: "^5.0.0" },
  {
    name: "Prettier 3.3 (Current)",
    version: "^3.3.0",
    pluginVersion: "^5.5.4",
  },
];

class ESLintVersionTester {
  constructor(opts = {}) {
    this.verbose = Boolean(opts.verbose);
    this.logDir = opts.logDir || null;
    this.results = [];
    this.originalPackageJson = null;
  }

  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  execWithLog(cmd, options, logFile) {
    const logPath = this.logDir ? path.join(this.logDir, "eslint", logFile) : null;
    try {
      const out = execSync(cmd, { ...options, stdio: "pipe" });
      if (logPath) {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, out);
      }
      if (this.verbose) {
        const txt = out.toString();
        const lines = txt.split(/\r?\n/);
        const tail = lines.slice(-40).join("\n");
        console.log(`[verbose] ${cmd} -> ${logFile}`);
        if (tail.trim()) console.log(tail);
      }
      return true;
    } catch (err) {
      const stdout = err.stdout ? err.stdout.toString() : "";
      const stderr = err.stderr ? err.stderr.toString() : "";
      const combined = stdout + (stderr ? "\n" + stderr : "");
      if (logPath) {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, combined);
      }
      if (this.verbose) {
        console.error(`[verbose] FAILED: ${cmd} -> ${logFile}`);
        const lines = combined.split(/\r?\n/);
        const tail = lines.slice(-60).join("\n");
        if (tail.trim()) console.error(tail);
      }
      throw err;
    }
  }

  async testAllVersions() {
    console.log("🔍 Testing ESLint Ecosystem Version Compatibility\n");

    // Backup original package.json
    this.originalPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf8"),
    );

    // Test ESLint versions
    for (const config of ESLINT_VERSIONS_TO_TEST) {
      console.log(`\n📦 Testing ${config.name}...`);
      const result = await this.testESLintVersion(config);
      this.results.push(result);

      if (result.success) {
        console.log(`✅ ${config.name} - Compatible`);
      } else {
        console.log(`❌ ${config.name} - Issues found`);
        console.log(`   Error: ${result.error}`);
      }
    }

    // Test Prettier versions
    for (const config of PRETTIER_VERSIONS_TO_TEST) {
      console.log(`\n📦 Testing ${config.name}...`);
      const result = await this.testPrettierVersion(config);
      this.results.push(result);

      if (result.success) {
        console.log(`✅ ${config.name} - Compatible`);
      } else {
        console.log(`❌ ${config.name} - Issues found`);
        console.log(`   Error: ${result.error}`);
      }
    }

    // Restore original package.json
    this.restoreOriginalDependencies();

    // Generate report
    this.generateReport();

    return this.results;
  }

  async testESLintVersion(config) {
    try {
      // Create test package.json with specific ESLint versions
      const testPackageJson = { ...this.originalPackageJson };

      // Ensure latest React and TypeScript
      testPackageJson.devDependencies.react = "^19.0.0";
      testPackageJson.devDependencies["react-dom"] = "^19.0.0";
      testPackageJson.devDependencies.typescript = "^5.4.5";

      // Update ESLint versions
      Object.assign(testPackageJson.devDependencies, config.versions);

      // Write test package.json
      fs.writeFileSync(
        "package.json",
        JSON.stringify(testPackageJson, null, 2),
      );

      // Install dependencies
      console.log(`   Installing ${config.name} dependencies...`);
      const installCmd = this.verbose ? "pnpm install" : "pnpm install --silent";
      this.execWithLog(installCmd, {}, `${this.slugify(config.name)}-install.log`);

      // Test ESLint functionality
      console.log(`   Testing ESLint execution...`);
      try {
        this.execWithLog("pnpm run lint:no-fix", {}, `${this.slugify(config.name)}-lint.log`);
        var lintSuccess = true;
      } catch (lintError) {
        // ESLint finding issues is OK, we just want to ensure it runs
        var lintSuccess =
          !lintError.message.includes("command not found") &&
          !lintError.message.includes("Cannot resolve");
      }

      // Test build with new ESLint setup
      console.log(`   Testing build compatibility...`);
      this.execWithLog("pnpm run build", {}, `${this.slugify(config.name)}-build.log`);

      return {
        category: "ESLint",
        name: config.name,
        versions: config.versions,
        success: true,
        lintExecutes: lintSuccess,
        buildSuccess: true,
        timestamp: new Date().toISOString(),
        details: `ESLint ${
          lintSuccess ? "executes" : "has execution issues"
        }, build successful`,
      };
    } catch (error) {
      return {
        category: "ESLint",
        name: config.name,
        versions: config.versions,
        success: false,
        error: error.message.slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async testPrettierVersion(config) {
    try {
      // Create test package.json with specific Prettier version
      const testPackageJson = { ...this.originalPackageJson };

      // Ensure latest React and TypeScript
      testPackageJson.devDependencies.react = "^19.0.0";
      testPackageJson.devDependencies["react-dom"] = "^19.0.0";
      testPackageJson.devDependencies.typescript = "^5.4.5";

      // Update Prettier versions
      testPackageJson.devDependencies.prettier = config.version;
      testPackageJson.devDependencies["eslint-plugin-prettier"] =
        config.pluginVersion;

      // Write test package.json
      fs.writeFileSync(
        "package.json",
        JSON.stringify(testPackageJson, null, 2),
      );

      // Install dependencies
      console.log(`   Installing ${config.name} dependencies...`);
      const installCmd2 = this.verbose ? "pnpm install" : "pnpm install --silent";
      this.execWithLog(installCmd2, {}, `${this.slugify(config.name)}-install.log`);

      // Test Prettier functionality
      console.log(`   Testing Prettier execution...`);
      try {
        this.execWithLog("pnpm exec prettier --check src/", {}, `${this.slugify(config.name)}-prettier-check.log`);
        var prettierSuccess = true;
      } catch (prettierError) {
        // Prettier finding formatting issues is OK, we just want to ensure it runs
        var prettierSuccess =
          !prettierError.message.includes("command not found") &&
          !prettierError.message.includes("Cannot resolve");
      }

      // Test format command
      console.log(`   Testing format command...`);
      try {
        this.execWithLog("pnpm run format", {}, `${this.slugify(config.name)}-format.log`);
        var formatSuccess = true;
      } catch (formatError) {
        var formatSuccess = false;
      }

      return {
        category: "Prettier",
        name: config.name,
        version: config.version,
        pluginVersion: config.pluginVersion,
        success: true,
        prettierExecutes: prettierSuccess,
        formatSuccess: formatSuccess,
        timestamp: new Date().toISOString(),
        details: `Prettier ${
          prettierSuccess ? "executes" : "has execution issues"
        }, format ${formatSuccess ? "works" : "issues"}`,
      };
    } catch (error) {
      return {
        category: "Prettier",
        name: config.name,
        version: config.version,
        success: false,
        error: error.message.slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
  }

  restoreOriginalDependencies() {
    if (this.originalPackageJson) {
      fs.writeFileSync(
        "package.json",
        JSON.stringify(this.originalPackageJson, null, 2),
      );
      try {
        const restoreCmd = this.verbose ? "pnpm install" : "pnpm install --silent";
        this.execWithLog(restoreCmd, {}, `restore-install.log`);
        console.log("✅ Original dependencies restored");
      } catch (error) {
        console.error("⚠️  Warning: Failed to restore original dependencies");
      }
    }
  }

  generateReport() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const report = {
      testDate: new Date().toISOString(),
      baseVersions: {
        react: "^19.0.0",
        typescript: "^5.4.5",
      },
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.success).length,
        failed: this.results.filter((r) => !r.success).length,
      },
      results: this.results,
    };

    // Write JSON report
    const reportPath = path.join(__dirname, "eslint-compatibility-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    let markdown = `# ESLint Ecosystem Version Compatibility Report\n\n`;
    markdown += `Generated: ${report.testDate}\n`;
    markdown += `Base versions: React ${report.baseVersions.react}, TypeScript ${report.baseVersions.typescript}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- Total configurations tested: ${report.summary.total}\n`;
    markdown += `- ✅ Compatible: ${report.summary.passed}\n`;
    markdown += `- ❌ Issues found: ${report.summary.failed}\n\n`;

    // Group results by category
    const eslintResults = this.results.filter((r) => r.category === "ESLint");
    const prettierResults = this.results.filter(
      (r) => r.category === "Prettier",
    );

    if (eslintResults.length > 0) {
      markdown += `## ESLint Versions\n\n`;
      eslintResults.forEach((result) => {
        markdown += `### ${result.name}\n\n`;
        markdown += `- **Status**: ${
          result.success ? "✅ Compatible" : "❌ Issues found"
        }\n`;
        markdown += `- **Versions**: ${JSON.stringify(
          result.versions,
          null,
          2,
        )}\n`;
        markdown += `- **Lint Execution**: ${
          result.lintExecutes ? "✅ Works" : "❌ Issues"
        }\n`;
        markdown += `- **Build**: ${
          result.buildSuccess ? "✅ Success" : "❌ Failed"
        }\n`;
        if (result.error) {
          markdown += `- **Error**: ${result.error}\n`;
        }
        if (result.details) {
          markdown += `- **Details**: ${result.details}\n`;
        }
        markdown += `- **Tested**: ${result.timestamp}\n\n`;
      });
    }

    if (prettierResults.length > 0) {
      markdown += `## Prettier Versions\n\n`;
      prettierResults.forEach((result) => {
        markdown += `### ${result.name}\n\n`;
        markdown += `- **Status**: ${
          result.success ? "✅ Compatible" : "❌ Issues found"
        }\n`;
        markdown += `- **Prettier Version**: ${result.version}\n`;
        markdown += `- **Plugin Version**: ${result.pluginVersion}\n`;
        markdown += `- **Prettier Execution**: ${
          result.prettierExecutes ? "✅ Works" : "❌ Issues"
        }\n`;
        markdown += `- **Format Command**: ${
          result.formatSuccess ? "✅ Works" : "❌ Issues"
        }\n`;
        if (result.error) {
          markdown += `- **Error**: ${result.error}\n`;
        }
        if (result.details) {
          markdown += `- **Details**: ${result.details}\n`;
        }
        markdown += `- **Tested**: ${result.timestamp}\n\n`;
      });
    }

    const markdownPath = path.join(__dirname, "eslint-compatibility-report.md");
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports generated:`);
    console.log(`- ${reportPath}`);
    console.log(`- ${markdownPath}`);
  }
}

export default ESLintVersionTester;

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const tester = new ESLintVersionTester();
  tester.testAllVersions().catch(console.error);
}
