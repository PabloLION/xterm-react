#!/usr/bin/env node

/**
 * React Version Compatibility Test (ESM)
 * Tests major React versions with current TypeScript setup
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REACT_VERSIONS_TO_TEST = [
  {
    react: "^17.0.0",
    reactDom: "^17.0.0",
    reactTypes: "^17.0.0",
    name: "React 17",
  },
  {
    react: "^18.0.0",
    reactDom: "^18.0.0",
    reactTypes: "^18.0.0",
    name: "React 18",
  },
  {
    react: "^19.0.0",
    reactDom: "^19.0.0",
    reactTypes: "^19.0.0",
    name: "React 19",
  },
];

class ReactVersionTester {
  constructor(opts = {}) {
    this.verbose = Boolean(opts.verbose);
    this.logDir = opts.logDir || null;
    this.results = [];
    this.originalPackageJson = null;
  }

  slugFor(versionName) {
    return versionName.toLowerCase().replace(/\s+/g, "-");
  }

  execWithLog(cmd, options, logFile) {
    const logPath = this.logDir
      ? path.join(this.logDir, "react", logFile)
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
    console.log("🔍 Testing React Version Compatibility\n");

    // Backup original package.json
    this.originalPackageJson = JSON.parse(
      fs.readFileSync("package.json", "utf8")
    );

    for (const versionConfig of REACT_VERSIONS_TO_TEST) {
      console.log(`\n📦 Testing ${versionConfig.name}...`);
      const result = await this.testReactVersion(versionConfig);
      this.results.push(result);

      if (result.success) {
        console.log(`✅ ${versionConfig.name} - Compatible`);
      } else {
        console.log(`❌ ${versionConfig.name} - Issues found`);
        console.log(`   Error: ${result.error}`);
      }
    }

    // Restore original package.json
    this.restoreOriginalDependencies();

    // Generate report
    this.generateReport();

    return this.results;
  }

  async testReactVersion(versionConfig) {
    try {
      // Create test package.json with specific React version
      const testPackageJson = { ...this.originalPackageJson };

      // Update React versions
      testPackageJson.devDependencies.react = versionConfig.react;
      testPackageJson.devDependencies["react-dom"] = versionConfig.reactDom;
      testPackageJson.devDependencies["@types/react"] =
        versionConfig.reactTypes;
      testPackageJson.devDependencies["@types/react-dom"] =
        versionConfig.reactTypes;

      // Update peer dependencies
      testPackageJson.peerDependencies.react = versionConfig.react;
      testPackageJson.peerDependencies["react-dom"] = versionConfig.reactDom;

      // Write test package.json
      fs.writeFileSync(
        "package.json",
        JSON.stringify(testPackageJson, null, 2)
      );

      // Install dependencies
      if (this.verbose) console.log(`   Installing ${versionConfig.name} dependencies...`);
      const installCmd = this.verbose
        ? "pnpm install"
        : "pnpm install --silent";
      this.execWithLog(
        installCmd,
        {},
        `${this.slugFor(versionConfig.name)}-install.log`
      );

      // Test TypeScript compilation
      if (this.verbose) console.log(`   Testing TypeScript compilation...`);
      this.execWithLog(
        "pnpm run build",
        {},
        `${this.slugFor(versionConfig.name)}-build.log`
      );

      // Test if e2e example still works
      if (this.verbose) console.log(`   Testing e2e compatibility...`);
      const buildResult = await this.testE2EBuild();

      return {
        name: versionConfig.name,
        version: versionConfig.react,
        success: true,
        buildSuccess: true,
        e2eSuccess: buildResult.success,
        timestamp: new Date().toISOString(),
        details: `Build successful, e2e ${
          buildResult.success ? "compatible" : "has issues"
        }`,
      };
    } catch (error) {
      return {
        name: versionConfig.name,
        version: versionConfig.react,
        success: false,
        error: error.message.slice(0, 200),
        timestamp: new Date().toISOString(),
      };
    }
  }

  async testE2EBuild() {
    try {
      // Try to build the e2e project with Vite
      this.execWithLog(
        "pnpm exec vite build",
        { cwd: process.cwd(), timeout: 60000 },
        `${this.slugFor(versionConfig.name)}-e2e-build.log`
      );
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message.slice(0, 100),
      };
    }
  }

  restoreOriginalDependencies() {
    if (this.originalPackageJson) {
      fs.writeFileSync(
        "package.json",
        JSON.stringify(this.originalPackageJson, null, 2)
      );
      try {
        const restoreCmd = this.verbose
          ? "pnpm install"
          : "pnpm install --silent";
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
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.success).length,
        failed: this.results.filter((r) => !r.success).length,
      },
      results: this.results,
    };

    // Write JSON report
    const reportPath = path.join(__dirname, "react-compatibility-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    let markdown = `# React Version Compatibility Report\n\n`;
    markdown += `Generated: ${report.testDate}\n\n`;
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
      markdown += `- **Build**: ${
        result.buildSuccess ? "✅ Success" : "❌ Failed"
      }\n`;
      markdown += `- **E2E**: ${
        result.e2eSuccess ? "✅ Compatible" : "❌ Issues"
      }\n`;
      if (result.error) {
        markdown += `- **Error**: ${result.error}\n`;
      }
      if (result.details) {
        markdown += `- **Details**: ${result.details}\n`;
      }
      markdown += `- **Tested**: ${result.timestamp}\n\n`;
    });

    const markdownPath = path.join(__dirname, "react-compatibility-report.md");
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Reports generated:`);
    console.log(`- ${reportPath}`);
    console.log(`- ${markdownPath}`);
  }
}

export default ReactVersionTester;

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const tester = new ReactVersionTester();
  tester.testAllVersions().catch(console.error);
}
