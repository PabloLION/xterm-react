#!/usr/bin/env node

/**
 * Version Compatibility Test Runner
 * Tests major versions of dependencies with latest React and TypeScript as base
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Define major versions to test for each dependency
const VERSION_MATRIX = {
  // Core dependencies
  core: {
    "@xterm/xterm": ["5.0.0", "5.1.0", "5.2.0", "5.3.0", "5.4.0", "5.5.0"],
    react: ["17.0.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "19.0.0"],
    "react-dom": ["17.0.0", "18.0.0", "18.1.0", "18.2.0", "18.3.0", "19.0.0"],
    typescript: ["4.9.0", "5.0.0", "5.1.0", "5.2.0", "5.3.0", "5.4.0", "5.5.0"],
  },

  // Dev tools - test with latest React and TypeScript as base
  devtools: {
    eslint: ["8.0.0", "8.57.0", "9.0.0", "9.4.0", "9.36.0"],
    "@typescript-eslint/parser": ["6.0.0", "7.0.0", "8.0.0", "8.44.1"],
    "@typescript-eslint/eslint-plugin": ["6.0.0", "7.0.0", "8.0.0", "8.44.1"],
    "eslint-plugin-prettier": ["4.0.0", "5.0.0", "5.1.3", "5.5.4"],
    prettier: ["2.8.0", "3.0.0", "3.3.0"],
    vite: ["4.0.0", "5.0.0", "6.0.0", "7.0.0", "7.1.2"],
    "@biomejs/biome": ["1.8.0", "1.9.0", "2.0.0", "2.1.0", "2.2.4"],
  },
};

const LATEST_BASE_VERSIONS = {
  react: "19.0.0",
  "react-dom": "19.0.0",
  typescript: "5.4.5",
};

class VersionTester {
  constructor() {
    this.results = {
      core: {},
      devtools: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
    };
    this.originalPackageJson = null;
  }

  async run() {
    console.log("🚀 Starting Version Compatibility Tests\n");

    // Backup original package.json
    this.originalPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf8")
    );

    try {
      // Test core dependencies
      await this.testCategory("core");

      // Test dev tools with latest React/TypeScript base
      await this.testCategory("devtools");

      // Generate report
      this.generateReport();
    } finally {
      // Restore original package.json
      this.restorePackageJson();
    }
  }

  async testCategory(category) {
    console.log(`\n📦 Testing ${category} dependencies\n`);

    const versions = VERSION_MATRIX[category];
    this.results[category] = {};

    for (const [packageName, versionList] of Object.entries(versions)) {
      console.log(`\n🔍 Testing ${packageName}:`);
      this.results[category][packageName] = {};

      for (const version of versionList) {
        const result = await this.testVersion(category, packageName, version);
        this.results[category][packageName][version] = result;
        this.results.summary.total++;

        if (result.status === "passed") {
          this.results.summary.passed++;
          console.log(`  ✅ ${version} - PASSED`);
        } else if (result.status === "failed") {
          this.results.summary.failed++;
          console.log(`  ❌ ${version} - FAILED: ${result.error}`);
        } else {
          this.results.summary.skipped++;
          console.log(`  ⏭️  ${version} - SKIPPED: ${result.reason}`);
        }
      }
    }
  }

  async testVersion(category, packageName, version) {
    try {
      // Create test package.json
      const testPackageJson = { ...this.originalPackageJson };

      if (category === "devtools") {
        // For dev tools, use latest React/TypeScript as base
        testPackageJson.devDependencies.react = LATEST_BASE_VERSIONS.react;
        testPackageJson.devDependencies["react-dom"] =
          LATEST_BASE_VERSIONS["react-dom"];
        testPackageJson.devDependencies.typescript =
          LATEST_BASE_VERSIONS.typescript;
      }

      // Update the specific package version being tested
      if (testPackageJson.dependencies[packageName]) {
        testPackageJson.dependencies[packageName] = version;
      } else if (testPackageJson.devDependencies[packageName]) {
        testPackageJson.devDependencies[packageName] = version;
      } else if (testPackageJson.peerDependencies[packageName]) {
        testPackageJson.peerDependencies[packageName] = `>=${version}`;
      }

      // Write test package.json
      fs.writeFileSync(
        "package.json",
        JSON.stringify(testPackageJson, null, 2)
      );

      // Install dependencies (with timeout and error handling)
      try {
        execSync("npm install --silent --no-audit --no-fund", {
          stdio: "pipe",
          timeout: 120000, // 2 minute timeout
        });
      } catch (installError) {
        return {
          status: "failed",
          error: `Installation failed: ${installError.message.slice(0, 100)}...`,
          timestamp: new Date().toISOString(),
        };
      }

      // Run build test
      try {
        execSync("npm run build", {
          stdio: "pipe",
          timeout: 60000, // 1 minute timeout
        });
      } catch (buildError) {
        return {
          status: "failed",
          error: `Build failed: ${buildError.message.slice(0, 100)}...`,
          timestamp: new Date().toISOString(),
        };
      }

      // Run linting test (for dev tools)
      if (
        category === "devtools" &&
        (packageName.includes("eslint") ||
          packageName === "prettier" ||
          packageName === "@biomejs/biome")
      ) {
        try {
          if (packageName === "@biomejs/biome") {
            execSync("npm run biome:check -- --max-diagnostics=1", {
              stdio: "pipe",
              timeout: 30000,
            });
          } else if (packageName.includes("prettier")) {
            execSync("npx prettier --check src/", {
              stdio: "pipe",
              timeout: 30000,
            });
          } else {
            execSync("npm run lint:no-fix", {
              stdio: "pipe",
              timeout: 30000,
            });
          }
        } catch (lintError) {
          // Linting errors are expected, we just want to ensure the tools run
          // Only fail if there's a critical error (tool not found, etc.)
          if (
            lintError.message.includes("command not found") ||
            lintError.message.includes("Cannot resolve")
          ) {
            return {
              status: "failed",
              error: `Tool execution failed: ${lintError.message.slice(0, 100)}...`,
              timestamp: new Date().toISOString(),
            };
          }
        }
      }

      return {
        status: "passed",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "failed",
        error: error.message.slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
  }

  restorePackageJson() {
    if (this.originalPackageJson) {
      fs.writeFileSync(
        "package.json",
        JSON.stringify(this.originalPackageJson, null, 2)
      );
      try {
        execSync("npm install --silent --no-audit --no-fund", {
          stdio: "pipe",
        });
      } catch (error) {
        console.error("Warning: Failed to restore original dependencies");
      }
    }
  }

  generateReport() {
    const report = {
      metadata: {
        testDate: new Date().toISOString(),
        nodeVersion: process.version,
        npmVersion: execSync("npm --version", { encoding: "utf8" }).trim(),
        platform: `${process.platform} ${process.arch}`,
      },
      summary: this.results.summary,
      results: {
        core: this.results.core,
        devtools: this.results.devtools,
      },
    };

    // Write detailed JSON report
    fs.writeFileSync(
      "version-compatibility-tests/COMPATIBILITY_REPORT.json",
      JSON.stringify(report, null, 2)
    );

    // Generate markdown summary
    this.generateMarkdownReport(report);

    console.log("\n📊 Test Summary:");
    console.log(`Total tests: ${this.results.summary.total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    console.log(`\n📄 Reports generated:`);
    console.log(`- version-compatibility-tests/COMPATIBILITY_REPORT.json`);
    console.log(`- version-compatibility-tests/COMPATIBILITY_REPORT.md`);
  }

  generateMarkdownReport(report) {
    let markdown = `# Version Compatibility Test Report\n\n`;
    markdown += `Generated: ${report.metadata.testDate}\n`;
    markdown += `Environment: Node ${report.metadata.nodeVersion}, npm ${report.metadata.npmVersion}, ${report.metadata.platform}\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `| Status | Count |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| ✅ Passed | ${report.summary.passed} |\n`;
    markdown += `| ❌ Failed | ${report.summary.failed} |\n`;
    markdown += `| ⏭️ Skipped | ${report.summary.skipped} |\n`;
    markdown += `| **Total** | **${report.summary.total}** |\n\n`;

    // Core dependencies results
    markdown += `## Core Dependencies\n\n`;
    for (const [pkg, versions] of Object.entries(report.results.core)) {
      markdown += `### ${pkg}\n\n`;
      markdown += `| Version | Status | Notes |\n`;
      markdown += `|---------|--------|---------|\n`;

      for (const [version, result] of Object.entries(versions)) {
        const status =
          result.status === "passed"
            ? "✅"
            : result.status === "failed"
              ? "❌"
              : "⏭️";
        const notes = result.error || result.reason || "OK";
        markdown += `| ${version} | ${status} | ${notes} |\n`;
      }
      markdown += `\n`;
    }

    // Dev tools results
    markdown += `## Development Tools\n\n`;
    markdown += `*Tested with React ${LATEST_BASE_VERSIONS.react} and TypeScript ${LATEST_BASE_VERSIONS.typescript} as base*\n\n`;

    for (const [pkg, versions] of Object.entries(report.results.devtools)) {
      markdown += `### ${pkg}\n\n`;
      markdown += `| Version | Status | Notes |\n`;
      markdown += `|---------|--------|---------|\n`;

      for (const [version, result] of Object.entries(versions)) {
        const status =
          result.status === "passed"
            ? "✅"
            : result.status === "failed"
              ? "❌"
              : "⏭️";
        const notes = result.error || result.reason || "OK";
        markdown += `| ${version} | ${status} | ${notes} |\n`;
      }
      markdown += `\n`;
    }

    fs.writeFileSync(
      "version-compatibility-tests/COMPATIBILITY_REPORT.md",
      markdown
    );
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new VersionTester();
  tester.run().catch(console.error);
}

module.exports = VersionTester;
