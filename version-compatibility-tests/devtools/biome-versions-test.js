#!/usr/bin/env node

/**
 * Biome Version Compatibility Test (ESM)
 * Tests different versions of Biome with latest React & TypeScript
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BIOME_VERSIONS_TO_TEST = [
  { name: "Biome 1.8", version: "^1.8.3" },
  { name: "Biome 1.9", version: "^1.9.4" },
  { name: "Biome 2.0", version: "^2.0.0" },
  { name: "Biome 2.1", version: "^2.1.1" },
  { name: "Biome 2.2 (Current)", version: "^2.2.4" },
];

class BiomeVersionTester {
  constructor(opts = {}) {
    this.verbose = Boolean(opts.verbose);
    this.logDir = opts.logDir || null;
    this.results = [];
    this.originalPackageJson = null;
    this.originalBiomeConfig = null;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  execWithLog(cmd, options, logFile) {
    const logPath = this.logDir
      ? path.join(this.logDir, "biome", logFile)
      : null;
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
    console.log("🔍 Testing Biome Version Compatibility\n");

    // Backup original files
    this.originalPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf8")
    );
    if (fs.existsSync("biome.json")) {
      this.originalBiomeConfig = JSON.parse(
        fs.readFileSync("biome.json", "utf8")
      );
    }

    for (const config of BIOME_VERSIONS_TO_TEST) {
      console.log(`\n📦 Testing ${config.name}...`);
      const result = await this.testBiomeVersion(config);
      this.results.push(result);

      if (result.success) {
        console.log(`✅ ${config.name} - Compatible`);
      } else {
        console.log(`❌ ${config.name} - Issues found`);
        console.log(`   Error: ${result.error}`);
      }
    }

    // Restore original files
    this.restoreOriginalFiles();

    // Generate report
    this.generateReport();

    return this.results;
  }

  async testBiomeVersion(config) {
    try {
      // Create test package.json with specific Biome version
      const testPackageJson = { ...this.originalPackageJson };

      // Ensure latest React and TypeScript
      testPackageJson.devDependencies.react = "^19.0.0";
      testPackageJson.devDependencies["react-dom"] = "^19.0.0";
      testPackageJson.devDependencies.typescript = "^5.4.5";

      // Update Biome version
      testPackageJson.devDependencies["@biomejs/biome"] = config.version;

      // Write test package.json
      fs.writeFileSync(
        "package.json",
        JSON.stringify(testPackageJson, null, 2)
      );

      // Install dependencies
      if (this.verbose)
        console.log(`   Installing ${config.name} dependencies...`);
      const installCmd = this.verbose
        ? "pnpm install"
        : "pnpm install --silent";
      this.execWithLog(
        installCmd,
        {},
        `${this.slugify(config.name)}-install.log`
      );

      // Create compatible biome.json for this version
      await this.createCompatibleBiomeConfig(config.version);

      // Test Biome check functionality
      if (this.verbose) console.log(`   Testing Biome check...`);
      try {
        this.execWithLog(
          "pnpm run biome:check -- --max-diagnostics=5",
          { timeout: 30000 },
          `${this.slugify(config.name)}-biome-check.log`
        );
        var checkSuccess = true;
        var checkError = null;
      } catch (checkErr) {
        // Biome finding issues is expected, we just want to ensure it runs
        var checkSuccess =
          !checkErr.message.includes("command not found") &&
          !checkErr.message.includes("Cannot resolve") &&
          !checkErr.message.includes("configuration resulted in errors");
        var checkError = checkErr.message.slice(0, 100);
      }

      // Test Biome format functionality
      if (this.verbose) console.log(`   Testing Biome format...`);
      try {
        // Prefer direct exec to avoid "--" pass-through issues in scripts
        this.execWithLog(
          "pnpm exec biome format --write . --dry-run",
          { timeout: 30000 },
          `${this.slugify(config.name)}-biome-format.log`
        );
        var formatSuccess = true;
      } catch (formatErr) {
        var formatSuccess =
          !formatErr.message.includes("command not found") &&
          !formatErr.message.includes("Cannot resolve");
      }

      // Test migration if needed
      if (this.verbose) console.log(`   Testing configuration migration...`);
      try {
        this.execWithLog(
          "pnpm exec biome migrate --dry-run",
          { timeout: 15000 },
          `${this.slugify(config.name)}-biome-migrate.log`
        );
        var migrateSuccess = true;
      } catch (migrateErr) {
        var migrateSuccess =
          migrateErr.message.includes("no migration needed") ||
          migrateErr.message.includes("successfully migrated");
      }

      return {
        name: config.name,
        version: config.version,
        success: checkSuccess && formatSuccess,
        checkExecutes: checkSuccess,
        formatExecutes: formatSuccess,
        migrationSupported: migrateSuccess,
        timestamp: new Date().toISOString(),
        details: `Check: ${checkSuccess ? "OK" : "Issues"}, Format: ${
          formatSuccess ? "OK" : "Issues"
        }`,
        checkError: checkError,
      };
    } catch (error) {
      return {
        name: config.name,
        version: config.version,
        success: false,
        error: error.message.slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async createCompatibleBiomeConfig(version) {
    // Create a basic biome.json that should work with most versions
    const basicConfig = {
      linter: {
        enabled: true,
        rules: {
          recommended: true,
        },
      },
      formatter: {
        enabled: true,
        indentStyle: "space",
        indentWidth: 2,
      },
      javascript: {
        formatter: {
          quoteStyle: "double",
        },
      },
    };

    // Add version-specific schema if available
    if (version.includes("2.2")) {
      basicConfig["$schema"] = "https://biomejs.dev/schemas/2.2.4/schema.json";
    } else if (version.includes("2.1")) {
      basicConfig["$schema"] = "https://biomejs.dev/schemas/2.1.1/schema.json";
    } else if (version.includes("2.0")) {
      basicConfig["$schema"] = "https://biomejs.dev/schemas/2.0.0/schema.json";
    }

    fs.writeFileSync("biome.json", JSON.stringify(basicConfig, null, 2));
  }

  restoreOriginalFiles() {
    if (this.originalPackageJson) {
      fs.writeFileSync(
        "package.json",
        JSON.stringify(this.originalPackageJson, null, 2)
      );
    }

    if (this.originalBiomeConfig) {
      fs.writeFileSync(
        "biome.json",
        JSON.stringify(this.originalBiomeConfig, null, 2)
      );
    }

    try {
      const restoreCmd = this.verbose
        ? "pnpm install"
        : "pnpm install --silent";
      this.execWithLog(restoreCmd, {}, `restore-install.log`);
      console.log("✅ Original files restored");
    } catch (error) {
      console.error("⚠️  Warning: Failed to restore original dependencies");
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
    const reportPath = path.join(__dirname, "biome-compatibility-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    let markdown = `# Biome Version Compatibility Report\n\n`;
    markdown += `Generated: ${report.testDate}\n`;
    markdown += `Base versions: React ${report.baseVersions.react}, TypeScript ${report.baseVersions.typescript}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- Total versions tested: ${report.summary.total}\n`;
    markdown += `- ✅ Compatible: ${report.summary.passed}\n`;
    markdown += `- ❌ Issues found: ${report.summary.failed}\n\n`;
    markdown += `## Detailed Results\n\n`;

    this.results.forEach((result) => {
      markdown += `### ${result.name}\n\n`;
      markdown += `- **Version**: ${result.version}\n`;
      markdown += `- **Status**: ${
        result.success ? "✅ Compatible" : "❌ Issues found"
      }\n`;
      markdown += `- **Check Command**: ${
        result.checkExecutes ? "✅ Works" : "❌ Issues"
      }\n`;
      markdown += `- **Format Command**: ${
        result.formatExecutes ? "✅ Works" : "❌ Issues"
      }\n`;
      markdown += `- **Migration Support**: ${
        result.migrationSupported ? "✅ Supported" : "❌ Issues"
      }\n`;
      if (result.error) {
        markdown += `- **Error**: ${result.error}\n`;
      }
      if (result.checkError) {
        markdown += `- **Check Error**: ${result.checkError}\n`;
      }
      if (result.details) {
        markdown += `- **Details**: ${result.details}\n`;
      }
      markdown += `- **Tested**: ${result.timestamp}\n\n`;
    });

    const markdownPath = path.join(__dirname, "biome-compatibility-report.md");
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports generated:`);
    console.log(`- ${reportPath}`);
    console.log(`- ${markdownPath}`);
  }
}

export default BiomeVersionTester;

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const tester = new BiomeVersionTester();
  tester.testAllVersions().catch(console.error);
}
