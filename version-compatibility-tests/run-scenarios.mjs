#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const fragmentsRoot = path.join(repoRoot, 'scenarios', 'fragments');
const logsRoot = path.join(repoRoot, 'logs', new Date().toISOString().replace(/[:.]/g, '-'));

function parseArgs(argv) {
  const args = { verbose: false, react: null, ts: null, eslint: null, prettier: null, biome: null, out: logsRoot };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const val = argv[i + 1];
    if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--react') { args.react = val; i++; }
    else if (a === '--ts') { args.ts = val; i++; }
    else if (a === '--eslint') { args.eslint = val; i++; }
    else if (a === '--prettier') { args.prettier = val; i++; }
    else if (a === '--biome') { args.biome = val; i++; }
    else if (a === '--out') { args.out = path.resolve(val); i++; }
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node version-compatibility-tests/run-scenarios.mjs [options]\n\n` +
    `Options:\n` +
    `  --react <17|18|19>            React/ReactDOM (+ types) version\n` +
    `  --ts <5.4>                   TypeScript version (optional)\n` +
    `  --eslint <8-ts6|9-ts7|9-ts8> ESLint + @typescript-eslint combo\n` +
    `  --prettier <2.8|3.0|3.3>     Prettier + plugin combo\n` +
    `  --biome <1.8|1.9|2.0|2.1|2.2> Biome version\n` +
    `  --out <dir>                  Log directory (default: timestamped)\n` +
    `  -v, --verbose                Stream command output\n`);
}

function readFragment(category, key) {
  const file = path.join(fragmentsRoot, category, `${key}.json`);
  if (!fs.existsSync(file)) throw new Error(`Fragment not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function mergeOverrides(parts) {
  return parts.reduce((acc, part) => Object.assign(acc, part), {});
}

function slug(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}-${String(v).replace(/[^a-z0-9.]+/gi, '-')}`)
    .join('+')
    .toLowerCase();
}

function exec(cmd, opts, verbose, logPath) {
  try {
    const out = execSync(cmd, { ...opts, stdio: verbose ? 'inherit' : 'pipe' });
    if (!verbose && logPath) fs.writeFileSync(logPath, out);
    return { ok: true };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    if (logPath) fs.writeFileSync(logPath, stdout + (stderr ? `\n${stderr}` : ''));
    return { ok: false, error: err.message };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.react && !args.eslint && !args.prettier && !args.biome && !args.ts) {
    printHelp();
    process.exit(1);
  }

  fs.mkdirSync(args.out, { recursive: true });
  const dims = { react: args.react, ts: args.ts, eslint: args.eslint, prettier: args.prettier, biome: args.biome };
  const scenario = slug(dims);
  const worktree = path.resolve('.compat-worktree', scenario);

  // Build overrides
  const fragments = [];
  if (args.react) fragments.push(readFragment('react', args.react));
  if (args.ts) fragments.push({ typescript: `^${args.ts}.0` });
  if (args.eslint) fragments.push(readFragment('eslint', args.eslint));
  if (args.prettier) fragments.push(readFragment('prettier', args.prettier));
  if (args.biome) fragments.push(readFragment('biome', args.biome));
  const overrides = mergeOverrides(fragments);

  const logDir = path.join(args.out, scenario);
  fs.mkdirSync(logDir, { recursive: true });

  // Prepare worktree
  exec(`git worktree add -f ${JSON.stringify(worktree)} HEAD`, { cwd: process.cwd() }, args.verbose, path.join(logDir, 'worktree-add.log'));

  try {
    const pkgPath = path.join(worktree, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.overrides = Object.assign({}, pkg.pnpm.overrides || {}, overrides);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    // Install
    const installRes = exec('pnpm install --prefer-offline', { cwd: worktree }, args.verbose, path.join(logDir, 'install.log'));

    // Commands: build if react set; lint, prettier, biome based on dimensions
    const results = {};
    if (args.react) results.build = exec('pnpm run build', { cwd: worktree }, args.verbose, path.join(logDir, 'build.log'));
    if (args.eslint) results.lint = exec('pnpm run lint:no-fix', { cwd: worktree }, args.verbose, path.join(logDir, 'lint.log'));
    if (args.prettier) results.prettier = exec('pnpm exec prettier --check .', { cwd: worktree }, args.verbose, path.join(logDir, 'prettier.log'));
    if (args.biome) results.biome = exec('pnpm run biome:check', { cwd: worktree }, args.verbose, path.join(logDir, 'biome.log'));

    // Summary
    const summary = {
      scenario,
      overrides,
      install: installRes.ok,
      results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok])),
      logDir,
    };
    fs.writeFileSync(path.join(logDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('Scenario:', scenario);
    console.log('Logs:', logDir);
    console.log('Install:', installRes.ok ? 'OK' : 'FAIL');
    for (const [k, v] of Object.entries(results)) console.log(`${k}: ${v.ok ? 'OK' : 'FAIL'}`);
  } finally {
    exec(`git worktree remove -f ${JSON.stringify(worktree)}`, { cwd: process.cwd() }, args.verbose, path.join(logDir, 'worktree-remove.log'));
  }
}

main().catch((e) => {
  console.error('Runner error:', e);
  process.exit(1);
});

