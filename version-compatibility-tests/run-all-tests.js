#!/usr/bin/env node

/**
 * Master Test Runner for Version Compatibility Tests (ESM)
 * Runs all version compatibility tests and generates comprehensive report
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import test modules
import ReactVersionTester from "./core/react-versions-test.js";
import ESLintVersionTester from "./devtools/eslint-versions-test.js";
import BiomeVersionTester from "./devtools/biome-versions-test.js";

// CLI flags
const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose") || argv.includes("-v");
const SUMMARY_ONLY = argv.includes("--summary") || argv.includes("-s");

// Resolve this file's directory for logs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const LOG_DIR = path.join(__dirname, "logs", timestamp);
fs.mkdirSync(LOG_DIR, { recursive: true });

class MasterTestRunner {
  constructor() {
    this.allResults = {
      metadata: {
        testDate: new Date().toISOString(),
        nodeVersion: process.version,
        platform: `${process.platform} ${process.arch}`,
      },
      summary: {
        totalCategories: 0,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
      },
      results: {
        react: null,
        eslint: null,
        biome: null,
      },
    };
  }

  async runAllTests() {
    if (VERBOSE) {
      console.log("[verbose] Mode ON");
      try {
        console.log(`[verbose] Node: ${process.version}`);
        const pnpmVersion = execSync("pnpm --version", { stdio: "pipe" })
          .toString()
          .trim();
        console.log(`[verbose] pnpm: ${pnpmVersion}`);
      } catch (e) {
        console.log("[verbose] pnpm not found on PATH or failed to run.");
      }
    }
    console.log("🚀 Starting Comprehensive Version Compatibility Tests\n");
    console.log("=".repeat(60));

    try {
      // Run React version tests
      console.log("\n🔍 Phase 1: React Version Compatibility");
      console.log("-".repeat(40));
      const reactTester = new ReactVersionTester({
        verbose: VERBOSE && !SUMMARY_ONLY,
        logDir: LOG_DIR,
      });
      const reactResults = await reactTester.testAllVersions();
      this.allResults.results.react = reactResults;
      this.allResults.summary.totalCategories++;

      // Run ESLint ecosystem tests
      console.log("\n🔍 Phase 2: ESLint Ecosystem Compatibility");
      console.log("-".repeat(40));
      const eslintTester = new ESLintVersionTester({
        verbose: VERBOSE && !SUMMARY_ONLY,
        logDir: LOG_DIR,
      });
      const eslintResults = await eslintTester.testAllVersions();
      this.allResults.results.eslint = eslintResults;
      this.allResults.summary.totalCategories++;

      // Run Biome version tests
      console.log("\n🔍 Phase 3: Biome Version Compatibility");
      console.log("-".repeat(40));
      const biomeTester = new BiomeVersionTester({
        verbose: VERBOSE && !SUMMARY_ONLY,
        logDir: LOG_DIR,
      });
      const biomeResults = await biomeTester.testAllVersions();
      this.allResults.results.biome = biomeResults;
      this.allResults.summary.totalCategories++;

      // Calculate totals
      this.calculateTotals();

      // Generate master report
      this.generateMasterReport();

      console.log("\n" + "=".repeat(60));
      console.log("🎉 All tests completed successfully!");
      console.log(`📊 Total: ${this.allResults.summary.totalTests} tests`);
      console.log(`✅ Passed: ${this.allResults.summary.totalPassed}`);
      console.log(`❌ Failed: ${this.allResults.summary.totalFailed}`);
    } catch (error) {
      console.error(
        "\n❌ Test runner failed:",
        VERBOSE ? error : error.message
      );
      throw error;
    }
  }

  calculateTotals() {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    // Count React results
    if (this.allResults.results.react) {
      totalTests += this.allResults.results.react.length;
      totalPassed += this.allResults.results.react.filter(
        (r) => r.success
      ).length;
      totalFailed += this.allResults.results.react.filter(
        (r) => !r.success
      ).length;
    }

    // Count ESLint results
    if (this.allResults.results.eslint) {
      totalTests += this.allResults.results.eslint.length;
      totalPassed += this.allResults.results.eslint.filter(
        (r) => r.success
      ).length;
      totalFailed += this.allResults.results.eslint.filter(
        (r) => !r.success
      ).length;
    }

    // Count Biome results
    if (this.allResults.results.biome) {
      totalTests += this.allResults.results.biome.length;
      totalPassed += this.allResults.results.biome.filter(
        (r) => r.success
      ).length;
      totalFailed += this.allResults.results.biome.filter(
        (r) => !r.success
      ).length;
    }

    this.allResults.summary.totalTests = totalTests;
    this.allResults.summary.totalPassed = totalPassed;
    this.allResults.summary.totalFailed = totalFailed;
  }

  generateMasterReport() {
    // Write comprehensive JSON report
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const jsonReportPath = path.join(
      __dirname,
      "MASTER_COMPATIBILITY_REPORT.json"
    );
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.allResults, null, 2));

    // Generate comprehensive markdown report
    this.generateMasterMarkdownReport();

    console.log(`\n📄 Master reports generated:`);
    console.log(`- ${jsonReportPath}`);
    console.log(`- ${path.join(__dirname, "MASTER_COMPATIBILITY_REPORT.md")}`);
  }

  generateMasterMarkdownReport() {
    let markdown = `# Comprehensive Version Compatibility Test Report\n\n`;

    // Metadata
    markdown += `**Generated:** ${this.allResults.metadata.testDate}\n`;
    markdown += `**Environment:** Node ${this.allResults.metadata.nodeVersion}, ${this.allResults.metadata.platform}\n`;
    markdown += `**Repository:** xterm-react\n\n`;

    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `This report covers comprehensive version compatibility testing for the xterm-react repository, `;
    markdown += `validating compatibility with major versions of core dependencies and development tools.\n\n`;

    markdown += `### Overall Results\n\n`;
    markdown += `| Category | Total Tests | ✅ Passed | ❌ Failed | Success Rate |\n`;
    markdown += `|----------|-------------|-----------|-----------|-------------|\n`;

    const reactStats = this.getStatsForCategory(this.allResults.results.react);
    const eslintStats = this.getStatsForCategory(
      this.allResults.results.eslint
    );
    const biomeStats = this.getStatsForCategory(this.allResults.results.biome);

    markdown += `| React Versions | ${reactStats.total} | ${reactStats.passed} | ${reactStats.failed} | ${reactStats.successRate}% |\n`;
    markdown += `| ESLint Ecosystem | ${eslintStats.total} | ${eslintStats.passed} | ${eslintStats.failed} | ${eslintStats.successRate}% |\n`;
    markdown += `| Biome Versions | ${biomeStats.total} | ${biomeStats.passed} | ${biomeStats.failed} | ${biomeStats.successRate}% |\n`;
    markdown += `| **TOTAL** | **${this.allResults.summary.totalTests}** | **${
      this.allResults.summary.totalPassed
    }** | **${this.allResults.summary.totalFailed}** | **${Math.round(
      (this.allResults.summary.totalPassed /
        this.allResults.summary.totalTests) *
        100
    )}%** |\n\n`;

    // React Results
    if (
      this.allResults.results.react &&
      this.allResults.results.react.length > 0
    ) {
      markdown += `## React Version Compatibility\n\n`;
      markdown += `Testing compatibility with major React versions while maintaining TypeScript 5 support.\n\n`;

      this.allResults.results.react.forEach((result) => {
        const status = result.success ? "✅" : "❌";
        markdown += `### ${status} ${result.name}\n\n`;
        markdown += `- **Version**: ${result.version}\n`;
        markdown += `- **Build**: ${
          result.buildSuccess ? "✅ Success" : "❌ Failed"
        }\n`;
        markdown += `- **E2E**: ${
          result.e2eSuccess ? "✅ Compatible" : "❌ Issues"
        }\n`;
        if (result.error) markdown += `- **Error**: ${result.error}\n`;
        if (result.details) markdown += `- **Details**: ${result.details}\n`;
        markdown += `\n`;
      });
    }

    // ESLint Results
    if (
      this.allResults.results.eslint &&
      this.allResults.results.eslint.length > 0
    ) {
      markdown += `## ESLint Ecosystem Compatibility\n\n`;
      markdown += `Testing with latest React 19 and TypeScript 5 as base configuration.\n\n`;

      const eslintResults = this.allResults.results.eslint.filter(
        (r) => r.category === "ESLint"
      );
      const prettierResults = this.allResults.results.eslint.filter(
        (r) => r.category === "Prettier"
      );

      if (eslintResults.length > 0) {
        markdown += `### ESLint & TypeScript-ESLint Versions\n\n`;
        eslintResults.forEach((result) => {
          const status = result.success ? "✅" : "❌";
          markdown += `#### ${status} ${result.name}\n\n`;
          markdown += `- **Lint Execution**: ${
            result.lintExecutes ? "✅ Works" : "❌ Issues"
          }\n`;
          markdown += `- **Build**: ${
            result.buildSuccess ? "✅ Success" : "❌ Failed"
          }\n`;
          if (result.error) markdown += `- **Error**: ${result.error}\n`;
          if (result.details) markdown += `- **Details**: ${result.details}\n`;
          markdown += `\n`;
        });
      }

      if (prettierResults.length > 0) {
        markdown += `### Prettier Versions\n\n`;
        prettierResults.forEach((result) => {
          const status = result.success ? "✅" : "❌";
          markdown += `#### ${status} ${result.name}\n\n`;
          markdown += `- **Prettier Execution**: ${
            result.prettierExecutes ? "✅ Works" : "❌ Issues"
          }\n`;
          markdown += `- **Format Command**: ${
            result.formatSuccess ? "✅ Works" : "❌ Issues"
          }\n`;
          if (result.error) markdown += `- **Error**: ${result.error}\n`;
          if (result.details) markdown += `- **Details**: ${result.details}\n`;
          markdown += `\n`;
        });
      }
    }

    // Biome Results
    if (
      this.allResults.results.biome &&
      this.allResults.results.biome.length > 0
    ) {
      markdown += `## Biome Version Compatibility\n\n`;
      markdown += `Testing Biome versions for type checking and linting with latest React 19 and TypeScript 5.\n\n`;

      this.allResults.results.biome.forEach((result) => {
        const status = result.success ? "✅" : "❌";
        markdown += `### ${status} ${result.name}\n\n`;
        markdown += `- **Version**: ${result.version}\n`;
        markdown += `- **Check Command**: ${
          result.checkExecutes ? "✅ Works" : "❌ Issues"
        }\n`;
        markdown += `- **Format Command**: ${
          result.formatExecutes ? "✅ Works" : "❌ Issues"
        }\n`;
        markdown += `- **Migration Support**: ${
          result.migrationSupported ? "✅ Supported" : "❌ Issues"
        }\n`;
        if (result.error) markdown += `- **Error**: ${result.error}\n`;
        if (result.checkError)
          markdown += `- **Check Error**: ${result.checkError}\n`;
        if (result.details) markdown += `- **Details**: ${result.details}\n`;
        markdown += `\n`;
      });
    }

    // Recommendations
    markdown += `## Recommendations\n\n`;

    if (this.allResults.summary.totalFailed === 0) {
      markdown += `🎉 **Excellent Compatibility!** All tested versions are compatible with the current codebase.\n\n`;
      markdown += `### Recommended Versions\n\n`;
      markdown += `Based on the test results, the following versions are recommended:\n\n`;

      // Add specific recommendations based on results
      const latestReactResult = this.allResults.results.react?.find((r) =>
        r.name.includes("React 19")
      );
      if (latestReactResult && latestReactResult.success) {
        markdown += `- **React**: ${latestReactResult.version} ✅\n`;
      }

      markdown += `- **TypeScript**: ^5.4.5 ✅ (tested as base version)\n`;
      markdown += `- **ESLint**: ^9.36.0 with @typescript-eslint ^8.44.1 ✅\n`;
      markdown += `- **Prettier**: ^3.3.0 with eslint-plugin-prettier ^5.5.4 ✅\n`;

      const latestBiomeResult = this.allResults.results.biome?.find((r) =>
        r.name.includes("Current")
      );
      if (latestBiomeResult && latestBiomeResult.success) {
        markdown += `- **Biome**: ${latestBiomeResult.version} ✅\n`;
      }
    } else {
      markdown += `⚠️ **Some Compatibility Issues Found**\n\n`;
      markdown += `${this.allResults.summary.totalFailed} out of ${this.allResults.summary.totalTests} tests failed. `;
      markdown += `Review the detailed results above to understand which versions have issues.\n\n`;
    }

    markdown += `\n### Next Steps\n\n`;
    markdown += `1. Review any failed tests to understand compatibility limitations\n`;
    markdown += `2. Update documentation with supported version ranges\n`;
    markdown += `3. Consider adding automated CI testing for critical version combinations\n`;
    markdown += `4. Re-run tests periodically as new versions are released\n\n`;

    // Footer
    markdown += `---\n`;
    markdown += `*This report was automatically generated by the version compatibility test suite.*`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const markdownPath = path.join(__dirname, "MASTER_COMPATIBILITY_REPORT.md");
    fs.writeFileSync(markdownPath, markdown);
  }

  getStatsForCategory(results) {
    if (!results || results.length === 0) {
      return { total: 0, passed: 0, failed: 0, successRate: 0 };
    }

    const total = results.length;
    const passed = results.filter((r) => r.success).length;
    const failed = total - passed;
    const successRate = Math.round((passed / total) * 100);

    return { total, passed, failed, successRate };
  }
}

export default MasterTestRunner;

// Run all tests if called directly
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  const runner = new MasterTestRunner();
  runner.runAllTests().catch((error) => {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  });
}
